# Alytha - React/Vite/Tailwind + Django REST

Aplicacao full-stack sem mocks: frontend em React (Vite + Tailwind) consumindo API em Django REST Framework.

## Requisitos
- Node.js 18+
- Python 3.10+

## Backend (Django REST)
1) Instalar dependencias
   `pip install -r backend/requirements.txt`
2) Migrar banco e popular dados demo
   `python backend/manage.py migrate`
   `python backend/manage.py seed_demo`
   `python backend/manage.py seed_demo --orders-per-side 3`
3) Subir API
   `python backend/manage.py runserver 0.0.0.0:8000`

## Frontend (React/Vite)
Dentro de `frontend/`:
1) Instalar pacotes
   `cd frontend && npm install`
2) Rodar em desenvolvimento (proxy para Django em :8000)
   `cd frontend && npm run dev`
3) Build estatico
   `cd frontend && npm run build`

## Variaveis de ambiente
Copiar `frontend/.env.example` para `frontend/.env` e ajustar:
- `VITE_API_BASE_URL` (opcional) - base da API em producao. Padrao `/api` (usa proxy local).
- `VITE_API_PROXY_TARGET` (opcional) - URL de proxy no dev. Padrao `http://localhost:8000`.
- `VITE_GOOGLE_ANALYTICS_ID` (opcional) - ID da tag do Google Analytics/Google tag, por exemplo `G-XXXXXXXXXX`.
- `GEMINI_API_KEY` - apenas se voce usar integracoes Gemini ja existentes.

## Credenciais de demonstracao
Apos `python backend/manage.py seed_demo`, use as credenciais abaixo (senha padrao `seed123`):
- Corretor: `nix@agro.com`
- Vendedores: `venda1@agro.com`, `venda2@agro.com`, `venda3@agro.com`
- Compradores: `compra1@agro.com`, `compra2@agro.com`, `compra3@agro.com`

## Endpoints principais
- `GET /api/offers` - ofertas ativas (usar `?all=true` para listar todas).
- `POST /api/offers` - cria oferta (campos compativeis com `src/types.ts`).
- `DELETE /api/offers/:id`
- `GET /api/users` e `DELETE /api/users/:id`
- `GET /api/negotiations`
- `POST /api/negotiations/match` - cria negociacao a partir de `buyOfferId`/`sellOfferId`.
- `PATCH /api/negotiations/:id` - atualiza status (`pendente|aceita|recusada`) e fecha ofertas quando aceita.

## Observacoes
- O mock server Node foi aposentado; use o backend Django para dados reais.
- A seed cria usuarios base (corretor + compradores + vendedores) e ofertas auto-geradas.
- Padrao da seed: 3 compras + 3 vendas para cada grao listado na plataforma (Soja, Milho e Sorgo).

## Rotas do frontend (demo)
- Landing Produtor: `/lp/produtor`
- Landing Comprador: `/lp/comprador`
- Cadastro Transportador: `/lp/cadastro_transportador`
- Cadastro Armazenagem: `/lp/cadastro_armazenagem`
- App Cliente: `/app/cliente`
- Trading Desk (Corretor): `/app/tradingdesk/:corretorId`
- Backoffice: `/app/admin/backoffice`
