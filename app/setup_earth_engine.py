#!/usr/bin/env python3
"""Authenticate this local workstation to the configured Google Earth Engine project."""

from __future__ import annotations

from .web_app import read_app_env


def main() -> int:
    project_id = read_app_env().get("GEE_PROJECT_ID", "").strip()
    if not project_id or project_id == "seu-project-id":
        print("Defina GEE_PROJECT_ID no arquivo .env na raiz do projeto.")
        return 2

    try:
        import ee
    except ImportError:
        print("Dependencia ausente. Instale com:")
        print("python -m pip install -r requirements-earth-engine.txt")
        return 2

    print(f"Projeto Earth Engine: {project_id}")
    print("O navegador sera aberto para autorizar sua Conta Google. Nao compartilhe codigos ou chaves privadas.")
    ee.Authenticate(auth_mode="localhost:0", force=True)
    ee.Initialize(project=project_id)
    print("Autenticacao e inicializacao do Earth Engine concluidas.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
