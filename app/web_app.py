#!/usr/bin/env python3
"""Serve a local browser UI and proxy read-only Copernicus STAC searches."""

from __future__ import annotations

import json
import math
import os
import argparse
import re
from argparse import Namespace
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit, parse_qs
from urllib.request import Request, urlopen

from .catalog_search import DEFAULT_COLLECTION, DEFAULT_ENDPOINT, extract_geometry, request_items, validate_date
from .localities import location_data
from . import storage, data_sources, municipalities, inactive_soy, research, assistant, municipal_activity, satellite_learning, spatial_activity


ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "web"
APP_ENV = ROOT / ".env"
CDSE_TOKEN_URL = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
CDSE_STATS_URL = "https://sh.dataspace.copernicus.eu/statistics/v1"

NDVI_EVALSCRIPT = """//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "SCL", "dataMask"] }],
    output: [
      { id: "ndvi", bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1 }
    ]
  };
}
function evaluatePixel(samples) {
  const denominator = samples.B08 + samples.B04;
  const excludedClasses = [3, 6, 8, 9, 10, 11];
  const valid = samples.dataMask && denominator !== 0 && !excludedClasses.includes(samples.SCL);
  const value = denominator === 0 ? 0 : (samples.B08 - samples.B04) / denominator;
  return { ndvi: [value], dataMask: [valid ? 1 : 0] };
}"""

NDVI_MAP_EVALSCRIPT = """//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "SCL", "dataMask"] }],
    output: { bands: 4, sampleType: "AUTO" }
  };
}
function evaluatePixel(samples) {
  const denominator = samples.B08 + samples.B04;
  const excludedClasses = [3, 6, 8, 9, 10, 11];
  if (!samples.dataMask || denominator === 0 || excludedClasses.includes(samples.SCL)) return [0, 0, 0, 0];
  const ndvi = (samples.B08 - samples.B04) / denominator;
  if (ndvi < 0.15) return [0.72, 0.48, 0.32, 0.68];
  if (ndvi < 0.35) return [0.94, 0.82, 0.35, 0.72];
  if (ndvi < 0.55) return [0.58, 0.76, 0.29, 0.76];
  return [0.12, 0.48, 0.22, 0.82];
}"""


def read_map_config():
    env = read_app_env()
    return {
        "google_maps_api_key": env.get("GOOGLE_MAPS_API_KEY", ""),
        "google_maps_map_id": env.get("GOOGLE_MAPS_MAP_ID", ""),
    }


def read_app_env():
    values = {}
    lines = APP_ENV.read_text(encoding="utf-8-sig").splitlines() if APP_ENV.is_file() else []
    for line in lines:
        name, separator, value = line.partition("=")
        if separator and not name.lstrip().startswith("#"):
            values[name.strip()] = value.strip().strip('"').strip("'")
    values.update({key: os.environ[key] for key in (
        "GOOGLE_MAPS_API_KEY", "GOOGLE_MAPS_MAP_ID", "CDSE_CLIENT_ID", "CDSE_CLIENT_SECRET", "GEE_PROJECT_ID", "EMBRAPA_ACCESS_TOKEN", "OPENAI_API_KEY", "OPENAI_MODEL"
    ) if key in os.environ})
    return values


def project_to_web_mercator(geometry):
    import math

    def project(node):
        if isinstance(node, (list, tuple)) and len(node) >= 2 and isinstance(node[0], (int, float)):
            longitude, latitude = node[:2]
            if not -180 <= longitude <= 180 or not -85.05112878 <= latitude <= 85.05112878:
                raise ValueError("Coordenadas fora dos limites válidos para GeoJSON/WGS84.")
            radius = 6378137
            x = radius * math.radians(longitude)
            y = radius * math.log(math.tan(math.pi / 4 + math.radians(latitude) / 2))
            return [x, y]
        return [project(value) for value in node]

    return {"type": geometry["type"], "coordinates": project(geometry["coordinates"]) }


def geometry_bbox(geometry):
    points = []

    def collect(node):
        if isinstance(node, list) and len(node) >= 2 and isinstance(node[0], (int, float)):
            points.append(node)
        elif isinstance(node, list):
            for item in node:
                collect(item)

    collect(geometry["coordinates"])
    return [min(p[0] for p in points), min(p[1] for p in points), max(p[0] for p in points), max(p[1] for p in points)]


def request_ndvi_map(geometry, acquisition_date):
    bbox = geometry_bbox(geometry)
    midpoint_lat = (bbox[1] + bbox[3]) / 2
    meters_per_degree_lat = 111320
    meters_per_degree_lon = max(1, meters_per_degree_lat * math.cos(math.radians(midpoint_lat)))
    width = max(1, round((bbox[2] - bbox[0]) * meters_per_degree_lon / 10))
    height = max(1, round((bbox[3] - bbox[1]) * meters_per_degree_lat / 10))
    scale = min(1, 1800 / max(width, height))
    width, height = max(1, round(width * scale)), max(1, round(height * scale))
    process_request = {
        "input": {
            "bounds": {
                "bbox": bbox,
                "geometry": geometry,
                "properties": {"crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"},
            },
            "data": [{
                "type": "sentinel-2-l2a",
                "dataFilter": {
                    "timeRange": {"from": f"{acquisition_date}T00:00:00Z", "to": f"{acquisition_date}T23:59:59Z"},
                    "maxCloudCoverage": 80,
                    "mosaickingOrder": "leastCC",
                },
            }],
        },
        "output": {
            "width": width,
            "height": height,
            "responses": [{"identifier": "default", "format": {"type": "image/png"}}],
        },
        "evalscript": NDVI_MAP_EVALSCRIPT,
    }
    request = Request(
        "https://sh.dataspace.copernicus.eu/process/v1",
        data=json.dumps(process_request).encode("utf-8"),
        headers={"Authorization": f"Bearer {get_cdse_access_token()}", "Content-Type": "application/json", "Accept": "image/png"},
        method="POST",
    )
    with urlopen(request, timeout=120) as response:
        image = response.read()
    return image, bbox


def get_cdse_access_token():
    env = read_app_env()
    client_id = env.get("CDSE_CLIENT_ID", "").strip()
    client_secret = env.get("CDSE_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        raise ValueError("Configure CDSE_CLIENT_ID e CDSE_CLIENT_SECRET no arquivo .env na raiz do projeto para processar NDVI.")
    request = Request(
        CDSE_TOKEN_URL,
        data=urlencode({"grant_type": "client_credentials", "client_id": client_id, "client_secret": client_secret}).encode("utf-8"),
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    with urlopen(request, timeout=30) as response:
        token_response = json.load(response)
    access_token = token_response.get("access_token")
    if not access_token:
        raise ValueError("O serviço Copernicus não retornou um token de acesso.")
    return access_token


def request_ndvi_series(geometry, date_from, date_to):
    projected_geometry = project_to_web_mercator(geometry)
    bbox = geometry_bbox(projected_geometry)
    width = max(1, (bbox[2] - bbox[0]) / 10)
    height = max(1, (bbox[3] - bbox[1]) / 10)
    if width > 2500 or height > 2500 or width * height > 4_000_000:
        raise ValueError("Talhão grande demais para esta PoC em resolução de 10 m. Divida o polígono em áreas menores.")
    stats_request = {
        "input": {
            "bounds": {
                "geometry": projected_geometry,
                "properties": {"crs": "http://www.opengis.net/def/crs/EPSG/0/3857"},
            },
            "data": [{
                "type": "sentinel-2-l2a",
                "dataFilter": {"mosaickingOrder": "leastCC", "maxCloudCoverage": 80},
            }],
        },
        "aggregation": {
            "timeRange": {"from": f"{date_from}T00:00:00Z", "to": f"{date_to}T23:59:59Z"},
            "aggregationInterval": {"of": "P5D"},
            "evalscript": NDVI_EVALSCRIPT,
            "resx": 10,
            "resy": 10,
        },
    }
    request = Request(
        CDSE_STATS_URL,
        data=json.dumps(stats_request).encode("utf-8"),
        headers={"Authorization": f"Bearer {get_cdse_access_token()}", "Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )
    with urlopen(request, timeout=120) as response:
        payload = json.load(response)
    points = []
    for interval in payload.get("data", []):
        stats = interval.get("outputs", {}).get("ndvi", {}).get("bands", {}).get("B0", {}).get("stats", {})
        mean = stats.get("mean")
        sample_count = stats.get('sampleCount',0)
        valid_count = max(0, sample_count - stats.get('noDataCount',0))
        if mean is None or not isinstance(mean,(int,float)) or not math.isfinite(mean) or not valid_count:
            continue
        geometry_count = interval.get('geometryPixelCount',sample_count)
        points.append({
            "date": interval.get("interval", {}).get("from", "")[:10],
            "ndvi_mean": mean,
            "valid_pixels": valid_count,
            "valid_fraction": min(1,valid_count/geometry_count) if geometry_count else 0,
        })
    return {"source": "Sentinel-2 L2A", "resolution_m": 10, "aggregation_days": 5, "points": points}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB), **kwargs)

    def end_headers(self):
        if not self.path.startswith("/api/"):
            self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        parsed=urlsplit(self.path)
        activity_map_match=re.fullmatch(r'/api/soy-activity/municipality/([a-f0-9]{64})/map',parsed.path)
        if activity_map_match:
            try:
                query=parse_qs(parsed.query)
                processed=int(query['processed'][0]) if 'processed' in query else None
                self._send_json(municipal_activity.map_assessment(activity_map_match[1],query.get('geometry',['1'])==['1'],processed))
            except ValueError as exc: self._send_json({'error':str(exc)},status=400)
            return
        spatial_match=re.fullmatch(r'/api/spatial-activity/([a-f0-9]{64})',self.path)
        if spatial_match:
            try: self._send_json(spatial_activity.get(spatial_match[1]))
            except ValueError as exc: self._send_json({'error':str(exc)},status=400)
            return
        municipal_match=re.fullmatch(r'/api/soy-activity/municipality/([a-f0-9]{64})',self.path)
        if municipal_match:
            try: self._send_json(municipal_activity.get(municipal_match[1]))
            except ValueError as exc: self._send_json({'error':str(exc)},status=400)
            return
        match=re.fullmatch(r'/api/research/history/([a-f0-9]{64})',self.path)
        if match:
            try: self._send_json(research.restore_history(match[1]))
            except ValueError as exc: self._send_json({'error':str(exc)},status=400)
            return
        if self.path=='/api/research/status':
            reference=storage.source_snapshot('research:sorriso:pilot')
            self._send_json({'openai_configured':bool(read_app_env().get('OPENAI_API_KEY')),'ml':research.model_status(),'satellite':satellite_learning.status(),'pilot':reference['result'] if reference else None})
            return
        if self.path=='/api/research/events':
            self._send_json(research.events());return
        match = re.fullmatch(r'/api/inactive-soy/([a-f0-9]{64})',self.path)
        if match:
            try: self._send_json(inactive_soy.get(match[1]))
            except ValueError as exc: self._send_json({'error':str(exc)},status=400)
            return
        match = re.fullmatch(r'/api/municipalities/([0-9]{7})', self.path)
        if match:
            try: self._send_json(municipalities.request(match[1]))
            except ValueError as exc: self._send_json({'error':str(exc)},status=400)
            return
        if self.path == '/api/sources/status':
            self._send_json({'satveg_configured': bool(read_app_env().get('EMBRAPA_ACCESS_TOKEN'))})
            return
        if urlsplit(self.path).path == '/api/sources/conab':
            try:
                query = parse_qs(urlsplit(self.path).query)
                self._send_json(data_sources.conab(query.get('uf',[''])[0], query.get('crop',[''])[0]))
            except ValueError as exc:
                self._send_json({'error': str(exc)}, status=400)
            except (OSError, URLError) as exc:
                self._send_json({'error': 'CONAB indisponível. Tente novamente mais tarde.'}, status=502)
            return
        if self.path == '/api/areas' or self.path.startswith('/api/areas/'):
            try:
                if self.path == '/api/areas':
                    self._send_json(storage.list_areas())
                else:
                    match = re.fullmatch(r'/api/areas/([0-9]+)(/history)?', self.path)
                    if not match:
                        raise ValueError('Consulta de área inválida.')
                    area_id = int(match[1])
                    self._send_json(storage.history(area_id) if match[2] else storage.get_area(area_id))
            except ValueError as exc:
                self._send_json({'error': str(exc)}, status=400)
            return
        if self.path.startswith("/api/locations/"):
            try:
                self._send_json(location_data(self.path))
            except ValueError as exc:
                self._send_json({"error": str(exc)}, status=400)
            except (OSError, HTTPError, URLError, TimeoutError) as exc:
                self._send_json({"error": "Não foi possível consultar o IBGE. Tente novamente em instantes."}, status=502)
            return
        if self.path == "/api/config":
            config = read_map_config()
            config["ndvi_configured"] = all(read_app_env().get(key) for key in ("CDSE_CLIENT_ID", "CDSE_CLIENT_SECRET"))
            self._send_json(config)
            return
        if self.path == "/":
            self.path = "/index.html"
        super().do_GET()

    def do_POST(self):
        if self.path in ('/api/spatial-activity','/api/research/history','/api/research/pilot','/api/research/events','/api/research/train','/api/research/satellite-learning','/api/research/analyze','/api/assistant','/api/soy-activity','/api/soy-activity/municipality'):
            try:
                size=int(self.headers.get('Content-Length','0'))
                if not 0<size<=2_000_000: raise ValueError('Pedido inválido.')
                data=json.loads(self.rfile.read(size))
                if not isinstance(data,dict): raise ValueError('Informe um objeto JSON.')
                if self.path in ('/api/spatial-activity','/api/research/history','/api/research/pilot','/api/soy-activity','/api/soy-activity/municipality') and not all(read_app_env().get(key) for key in ('CDSE_CLIENT_ID','CDSE_CLIENT_SECRET')): raise ValueError('Histórico Sentinel-2 indisponível no momento.')
                if self.path=='/api/spatial-activity': result=spatial_activity.start(data)
                elif self.path=='/api/research/history': result=research.start_history(data)
                elif self.path=='/api/research/pilot': result=research.pilot()
                elif self.path=='/api/research/events': result=research.add_event(data)
                elif self.path=='/api/research/train': result=research.train()
                elif self.path=='/api/research/satellite-learning': result=satellite_learning.train(str(data.get('municipality_code','5107925')))
                elif self.path=='/api/research/analyze': result=research.analyze(data.get('dataset_id'),data.get('date'))
                elif self.path=='/api/soy-activity': result=inactive_soy.activity(data)
                elif self.path=='/api/soy-activity/municipality': result=municipal_activity.start(data)
                else: result=assistant.ask(data,read_app_env())
                self._send_json(result)
            except (ValueError,TypeError,ImportError) as exc: self._send_json({'error':str(exc)},status=400)
            except Exception: self._send_json({'error':'Não foi possível concluir esta operação. Verifique os dados e tente novamente.'},status=502)
            return
        if self.path == '/api/inactive-soy':
            try:
                size=int(self.headers.get('Content-Length','0'))
                if not 0<size<=2_000_000: raise ValueError('Pedido inválido.')
                if not all(read_app_env().get(key) for key in ('CDSE_CLIENT_ID','CDSE_CLIENT_SECRET')):
                    raise ValueError('Monitoramento Sentinel-2 indisponível no momento.')
                self._send_json(inactive_soy.start(json.loads(self.rfile.read(size))))
            except ValueError as exc: self._send_json({'error':str(exc)},status=400)
            except Exception: self._send_json({'error':'Não foi possível iniciar a triagem. Tente novamente.'},status=502)
            return
        if self.path in ('/api/sources/mapbiomas', '/api/sources/satveg'):
            try:
                size = int(self.headers.get('Content-Length','0'))
                if not 0 < size <= 2_000_000: raise ValueError('Tamanho do pedido inválido.')
                data = json.loads(self.rfile.read(size))
                if not isinstance(data, dict): raise ValueError('Informe um objeto JSON.')
                result = data_sources.mapbiomas(data) if self.path.endswith('mapbiomas') else data_sources.satveg(data, read_app_env().get('EMBRAPA_ACCESS_TOKEN',''))
                self._send_json(result)
            except ValueError as exc:
                self._send_json({'error':str(exc)}, status=400)
            except Exception:
                self._send_json({'error':'Não foi possível consultar a fonte. Verifique sua conexão e configuração e tente novamente.'}, status=502)
            return
        if self.path == '/api/areas':
            try:
                size = int(self.headers.get('Content-Length', '0'))
                if not 0 < size <= 2_000_000:
                    raise ValueError('Tamanho do cadastro inválido.')
                self._send_json(storage.save_area(json.loads(self.rfile.read(size))), status=201)
            except (ValueError, OSError) as exc:
                self._send_json({'error': str(exc)}, status=400)
            return
        if self.path == "/api/ndvi-series":
            self._handle_ndvi_series()
            return
        if self.path == "/api/ndvi-map":
            self._handle_ndvi_map()
            return
        if self.path != "/api/search":
            self.send_error(404)
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size <= 0 or size > 2_000_000:
                raise ValueError("Tamanho do pedido inválido.")
            data = json.loads(self.rfile.read(size))
            geometry = extract_geometry(data.get("geojson"))
            area_id = storage.validate_analysis_area(data, geometry)
            date_from = data.get("from")
            date_to = data.get("to")
            max_cloud = float(data.get("max_cloud", 40))
            if not isinstance(date_from, str) or not isinstance(date_to, str):
                raise ValueError("Informe as datas inicial e final.")

            if validate_date(date_to, "Data final") < validate_date(date_from, "Data inicial"):
                raise ValueError("A data final deve ser igual ou posterior à inicial.")
            if not 0 <= max_cloud <= 100:
                raise ValueError("O limite de nuvens deve ficar entre 0 e 100%.")
            args = Namespace(
                endpoint=DEFAULT_ENDPOINT,
                collection=DEFAULT_COLLECTION,
                date_from=date_from,
                date_to=date_to,
                max_cloud=max_cloud,
                limit=100,
            )
            result = request_items(args, geometry)
            storage.save_analysis(area_id, 'catalog', {'from': date_from, 'to': date_to, 'max_cloud': max_cloud}, result)
            self._send_json(result)
        except (OSError, json.JSONDecodeError, ValueError, HTTPError, URLError, TimeoutError) as exc:
            self._send_json({"error": str(exc)}, status=400)

    def _handle_ndvi_series(self):
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size <= 0 or size > 2_000_000:
                raise ValueError("Tamanho do pedido inválido.")
            data = json.loads(self.rfile.read(size))
            geometry = extract_geometry(data.get("geojson"))
            area_id = storage.validate_analysis_area(data, geometry)
            date_from = data.get("from")
            date_to = data.get("to")
            if not isinstance(date_from, str) or not isinstance(date_to, str):
                raise ValueError("Informe o período de análise.")

            start, end = validate_date(date_from, "Data inicial"), validate_date(date_to, "Data final")
            if end < start:
                raise ValueError("A data final deve ser igual ou posterior à inicial.")
            if (end - start).days > 365:
                raise ValueError("Selecione no máximo um ano por consulta nesta PoC.")
            result = request_ndvi_series(geometry, date_from, date_to)
            storage.save_analysis(area_id, 'ndvi', {'from': date_from, 'to': date_to}, result)
            self._send_json(result)
        except HTTPError as exc:
            message = exc.read(2000).decode("utf-8", errors="replace")
            self._send_json({"error": f"Copernicus retornou HTTP {exc.code}: {message}"}, status=502)
        except (OSError, json.JSONDecodeError, ValueError, URLError, TimeoutError) as exc:
            self._send_json({"error": str(exc)}, status=400)

    def _handle_ndvi_map(self):
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size <= 0 or size > 2_000_000:
                raise ValueError("Tamanho do pedido inválido.")
            data = json.loads(self.rfile.read(size))
            geometry = extract_geometry(data.get("geojson"))
            acquisition_date = data.get("date")
            if not isinstance(acquisition_date, str):
                raise ValueError("Informe a data da cena.")

            validate_date(acquisition_date, "Data da cena")
            image, bbox = request_ndvi_map(geometry, acquisition_date)
            self._send_image(image, bbox)
        except HTTPError as exc:
            message = exc.read(2000).decode("utf-8", errors="replace")
            self._send_json({"error": f"Copernicus retornou HTTP {exc.code}: {message}"}, status=502)
        except (OSError, json.JSONDecodeError, ValueError, URLError, TimeoutError) as exc:
            self._send_json({"error": str(exc)}, status=400)

    def _send_json(self, value, status=200):
        body = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _send_image(self, body, bbox):
        self.send_response(200)
        self.send_header("Content-Type", "image/png")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Image-Bounds", json.dumps(bbox, separators=(",", ":")))
        self.end_headers()
        self.wfile.write(body)


def main():
    parser = argparse.ArgumentParser(description="Monitoramento de lotes: servidor local independente.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    address = (args.host, args.port)
    server = ThreadingHTTPServer(address, Handler)
    print(f"PoC Alytha disponível em http://{address[0]}:{address[1]}")
    print("Servidor local; Ctrl+C para encerrar.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor encerrado.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
