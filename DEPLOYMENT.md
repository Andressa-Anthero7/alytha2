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

### PostgreSQL local ou staging

Com Docker instalado, suba um PostgreSQL local/staging:

```powershell
docker compose -f docker-compose.postgres.yml up -d
```

Para usar esse banco no Django local, copie `backend/.env.postgres.example` para `backend/.env` e rode:

```powershell
cd backend
.\alytha_dev_venv\Scripts\python.exe manage.py migrate
.\alytha_dev_venv\Scripts\python.exe manage.py audit_documents --fix
.\alytha_dev_venv\Scripts\python.exe manage.py check
```

### Migração SQLite para PostgreSQL

1. Gere um backup lógico do SQLite atual:

```powershell
cd backend
.\alytha_dev_venv\Scripts\python.exe manage.py dumpdata --natural-foreign --natural-primary --exclude contenttypes --exclude auth.permission --indent 2 > alytha-sqlite-backup.json
```

2. Configure `DATABASE_URL` apontando para PostgreSQL.
3. Aplique as migrations no PostgreSQL:

```powershell
.\alytha_dev_venv\Scripts\python.exe manage.py migrate
```

4. Importe os dados:

```powershell
.\alytha_dev_venv\Scripts\python.exe manage.py loaddata alytha-sqlite-backup.json
```

5. Audite documentos e normalize os unicos:

```powershell
.\alytha_dev_venv\Scripts\python.exe manage.py audit_documents --fix
```

Se o comando reportar CPF/CNPJ duplicado, resolver manualmente no backoffice antes de abrir producao.

### Backup PostgreSQL

No servidor, manter `pg_dump` agendado diariamente. Exemplo:

```bash
pg_dump "$DATABASE_URL" --format=custom --file="backups/alytha-$(date +%F-%H%M).dump"
```

Validar restauracao mensalmente em banco separado:

```bash
pg_restore --clean --if-exists --dbname "$DATABASE_URL_TESTE_RESTORE" backups/arquivo.dump
```

## Segurança

- Usar HTTPS em todo o dominio `plataforma.alytha.agr.br`.
- Manter `DJANGO_ALLOWED_HOSTS`, `DJANGO_CORS_ALLOWED_ORIGINS` e `DJANGO_CSRF_TRUSTED_ORIGINS` restritos ao dominio oficial.
- Configurar SMTP real para recuperacao de senha. O token de redefinicao nunca deve ser exibido em resposta publica em producao.

## Release

- Antes de publicar: `npm run lint`, `npm run build`, `python manage.py test market`, `python manage.py makemigrations --check --dry-run`, `python manage.py check --deploy`.
- Criar commit/tag de release depois dos testes passarem.
