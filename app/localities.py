"""Read simplified Brazilian administrative areas from IBGE."""

import gzip
import json
import re
from functools import lru_cache
from urllib.request import Request, urlopen

BASE = "https://servicodados.ibge.gov.br/api"


@lru_cache(maxsize=256)
def fetch_ibge(path):
    request = Request(BASE + path, headers={"Accept": "application/json", "User-Agent": "Alytha-LotMonitoring/1.0"})
    with urlopen(request, timeout=25) as response:
        body = response.read()
    if body.startswith(b"\x1f\x8b"):
        body = gzip.decompress(body)
    return json.loads(body)


def location_data(path):
    if path == "/api/locations/states":
        return fetch_ibge("/v1/localidades/estados?orderBy=nome")
    match = re.fullmatch(r"/api/locations/states/([0-9]{2})/municipalities", path)
    if match:
        return fetch_ibge(f"/v1/localidades/estados/{match[1]}/municipios?orderBy=nome")
    match = re.fullmatch(r"/api/locations/boundaries/(states|municipalities)/([0-9]+)", path)
    if match:
        kind, code = match.groups()
        if len(code) != (2 if kind == "states" else 7):
            raise ValueError("Código IBGE inválido.")
        resource = "estados" if kind == "states" else "municipios"
        return fetch_ibge(f"/v3/malhas/{resource}/{code}?formato=application/vnd.geo%2Bjson&qualidade=minima")
    raise ValueError("Localidade ou código IBGE inválido.")
