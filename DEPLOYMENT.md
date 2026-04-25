# Checklist de producao Alytha

## Ambiente

- Backend: criar `backend/.env` a partir de `backend/.env.example`.
- Frontend: configurar as variaveis do build a partir de `frontend/.env.production.example`.
- Nunca usar `frontend/.env` de desenvolvimento para gerar o build de producao.
- Rodar o backend com `DJANGO_ENV=production`, `DJANGO_DEBUG=false` e `ALYTHA_EXPOSE_PASSWORD_RESET_TOKEN=false`.

## Banco de dados

- Usar PostgreSQL em producao via `DATABASE_URL`.
- Manter backup automatico diario, retencao minima de 30 dias e teste mensal de restauracao.
- Antes de deploy com migracoes: executar backup, aplicar `python manage.py migrate` e validar `python manage.py check --deploy`.

## Segurança

- Usar HTTPS em todo o dominio `plataforma.alytha.agr.br`.
- Manter `DJANGO_ALLOWED_HOSTS`, `DJANGO_CORS_ALLOWED_ORIGINS` e `DJANGO_CSRF_TRUSTED_ORIGINS` restritos ao dominio oficial.
- Configurar SMTP real para recuperacao de senha. O token de redefinicao nunca deve ser exibido em resposta publica em producao.

## Release

- Antes de publicar: `npm run lint`, `npm run build`, `python manage.py test market`, `python manage.py makemigrations --check --dry-run`, `python manage.py check --deploy`.
- Criar commit/tag de release depois dos testes passarem.
