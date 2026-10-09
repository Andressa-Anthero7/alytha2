#!/usr/bin/env python3
"""Explore Sentinel-2 scene metadata intersecting a GeoJSON field geometry."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import date
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


DEFAULT_ENDPOINT = "https://stac.dataspace.copernicus.eu/v1/search"
DEFAULT_COLLECTION = "sentinel-2-l2a"
DEFAULT_GEOJSON = Path(__file__).resolve().parents[1] / "data" / "sample-field.geojson"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Busca metadados Sentinel-2 para um talhão GeoJSON; não baixa imagens."
    )
    parser.add_argument("--geojson", type=Path, default=DEFAULT_GEOJSON, help="Arquivo GeoJSON (default: polígono fictício).")
    parser.add_argument("--from", dest="date_from", required=True, help="Data inicial inclusiva (AAAA-MM-DD).")
    parser.add_argument("--to", dest="date_to", required=True, help="Data final inclusiva (AAAA-MM-DD).")
    parser.add_argument("--max-cloud", type=float, default=40, help="Cobertura máxima de nuvens em %% (default: 40).")
    parser.add_argument("--limit", type=int, default=100, help="Máximo de cenas a solicitar (default: 100).")
    parser.add_argument("--endpoint", default=DEFAULT_ENDPOINT, help="Endpoint STAC Item Search.")
    parser.add_argument("--collection", default=DEFAULT_COLLECTION, help="Identificador da coleção STAC.")
    return parser.parse_args()


def validate_date(value: str, option: str) -> date:
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise ValueError(f"{option} deve usar o formato AAAA-MM-DD: {value}") from exc


def extract_geometry(document: Any) -> dict[str, Any]:
    if not isinstance(document, dict):
        raise ValueError("GeoJSON deve ser um objeto JSON.")
    kind = document.get("type")
    if kind == "Feature":
        geometry = document.get("geometry")
    elif kind == "FeatureCollection":
        features = document.get("features", [])
        if len(features) != 1:
            raise ValueError("FeatureCollection deve conter exatamente uma Feature.")
        geometry = features[0].get("geometry")
    elif kind in {"Polygon", "MultiPolygon"}:
        geometry = document
    else:
        raise ValueError("Informe uma geometria Polygon/MultiPolygon, Feature ou FeatureCollection.")
    if not isinstance(geometry, dict) or geometry.get("type") not in {"Polygon", "MultiPolygon"}:
        raise ValueError("A geometria deve ser Polygon ou MultiPolygon.")
    if not geometry.get("coordinates"):
        raise ValueError("A geometria não contém coordenadas.")
    return geometry


def request_items(args: argparse.Namespace, geometry: dict[str, Any]) -> dict[str, Any]:
    payload = {
        "collections": [args.collection],
        "datetime": f"{args.date_from}T00:00:00Z/{args.date_to}T23:59:59Z",
        "intersects": geometry,
        "query": {"eo:cloud_cover": {"lte": args.max_cloud}},
        "limit": args.limit,
        "sortby": [{"field": "properties.datetime", "direction": "desc"}],
    }
    request = Request(
        args.endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "Accept": "application/geo+json"},
        method="POST",
    )
    with urlopen(request, timeout=45) as response:
        result = json.load(response)
    if not isinstance(result, dict) or not isinstance(result.get("features"), list):
        raise ValueError("O catálogo retornou uma resposta STAC inesperada.")
    return result


def summarize(result: dict[str, Any]) -> list[dict[str, Any]]:
    scenes = []
    for item in result["features"]:
        properties = item.get("properties") or {}
        scenes.append(
            {
                "id": item.get("id"),
                "datetime": properties.get("datetime"),
                "cloud_cover_percent": properties.get("eo:cloud_cover"),
                "collection": item.get("collection"),
                "metadata_url": next(
                    (link.get("href") for link in item.get("links", []) if link.get("rel") == "self"),
                    None,
                ),
            }
        )
    return scenes


def main() -> int:
    args = parse_args()
    try:
        start = validate_date(args.date_from, "--from")
        end = validate_date(args.date_to, "--to")
        if end < start:
            raise ValueError("--to deve ser igual ou posterior a --from.")
        if not 0 <= args.max_cloud <= 100:
            raise ValueError("--max-cloud deve ficar entre 0 e 100.")
        if args.limit < 1 or args.limit > 500:
            raise ValueError("--limit deve ficar entre 1 e 500.")
        with args.geojson.open(encoding="utf-8") as source:
            geometry = extract_geometry(json.load(source))
        result = request_items(args, geometry)
        scenes = summarize(result)
    except (OSError, json.JSONDecodeError, ValueError, HTTPError, URLError, TimeoutError) as exc:
        print(f"Erro na busca STAC: {exc}", file=sys.stderr)
        return 2

    print(f"Coleção: {args.collection} | cenas encontradas: {len(scenes)}")
    print("Metadados apenas; nenhuma imagem foi baixada.")
    if not scenes:
        print("Nenhuma cena atende ao polígono, período e limite de nuvens informados.")
    for scene in scenes:
        cloud = scene["cloud_cover_percent"]
        cloud_text = f"{cloud:.1f}%" if isinstance(cloud, (int, float)) else "não informado"
        print(f"- {scene['datetime'] or 'data ausente'} | nuvens {cloud_text} | {scene['id']}")
        if scene["metadata_url"]:
            print(f"  {scene['metadata_url']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
