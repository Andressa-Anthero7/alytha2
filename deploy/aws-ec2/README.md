# Deploy Alytha em AWS EC2

Roteiro para Ubuntu 22.04/24.04 em EC2, dominio `plataforma.alytha.agr.br`, Nginx ja instalado com SSL ativo, frontend estatico e Django/Gunicorn em `127.0.0.1:8000`.

## Arquitetura escolhida

- EC2: Django + Gunicorn + Nginx + build estatico do frontend.
- PostgreSQL: dentro da propria EC2 para reduzir custo inicial.
- SMTP: AWS SES, Google Workspace, SendGrid, Mailgun ou outro provedor SMTP real.
- Backup: `pg_dump` diario, com copia externa em S3 quando possivel.

RDS e mais seguro, mas PostgreSQL local atende o inicio se a porta `5432` nao for exposta e se existir backup externo.

## Security group

Liberar entrada:

- `22/tcp`: SSH, restrito ao seu IP.
- `80/tcp`: HTTP publico, ja usado pelo Nginx/Let's Encrypt.
- `443/tcp`: HTTPS publico.

Nao liberar `5432/tcp` publicamente. O Django deve acessar o PostgreSQL por `127.0.0.1:5432`.

## Preparar servidor

```bash
sudo apt update
sudo apt install -y python3-venv python3-pip nginx git nodejs npm certbot python3-certbot-nginx postgresql-client
sudo mkdir -p /srv/alytha
sudo chown -R ubuntu:www-data /srv/alytha
```

Clonar ou copiar o projeto para `/srv/alytha`.

## PostgreSQL local na EC2

Instalar e criar o banco local:

```bash
cd /srv/alytha
export ALYTHA_DB_NAME=alytha
export ALYTHA_DB_USER=alytha
export ALYTHA_DB_PASSWORD='troque-por-uma-senha-forte-do-banco'
bash deploy/aws-ec2/setup-local-postgres.sh
```

Depois coloque no `/srv/alytha/backend/.env`:

```env
DATABASE_URL=postgresql://alytha:troque-por-uma-senha-forte-do-banco@127.0.0.1:5432/alytha
DJANGO_DB_CONN_MAX_AGE=60
```

Regras importantes:

- Nao abrir porta `5432` no Security Group.
- Nao configurar PostgreSQL para escutar IP publico.
- Fazer backup diario e copiar para fora da EC2, preferencialmente S3.

## Backend

```bash
cd /srv/alytha/backend
python3 -m venv .venv
. .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

Criar `/srv/alytha/backend/.env` baseado em `backend/.env.example`.

Campos obrigatorios para EC2:

```env
DJANGO_ENV=production
DJANGO_DEBUG=false
DJANGO_SECRET_KEY=gere-uma-chave-longa-e-aleatoria
DJANGO_ALLOWED_HOSTS=plataforma.alytha.agr.br
DJANGO_CORS_ALLOWED_ORIGINS=https://plataforma.alytha.agr.br
DJANGO_CSRF_TRUSTED_ORIGINS=https://plataforma.alytha.agr.br
DATABASE_URL=postgresql://alytha:senha-forte@127.0.0.1:5432/alytha
ALYTHA_PUBLIC_SITE_URL=https://plataforma.alytha.agr.br
ALYTHA_SHARE_IMAGE_URL=https://plataforma.alytha.agr.br/logo.png
ALYTHA_EXPOSE_PASSWORD_RESET_TOKEN=false
DJANGO_EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
DJANGO_EMAIL_HOST=smtp.seu-provedor.com.br
DJANGO_EMAIL_PORT=587
DJANGO_EMAIL_USE_TLS=true
DJANGO_EMAIL_HOST_USER=nao-responda@alytha.agr.br
DJANGO_EMAIL_HOST_PASSWORD=senha-smtp
DJANGO_DEFAULT_FROM_EMAIL=Alytha <nao-responda@alytha.agr.br>
DJANGO_SECURE_SSL_REDIRECT=true
DJANGO_SESSION_COOKIE_SECURE=true
DJANGO_CSRF_COOKIE_SECURE=true
DJANGO_SECURE_HSTS_SECONDS=31536000
DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS=true
DJANGO_SECURE_HSTS_PRELOAD=true
DJANGO_SECURE_PROXY_SSL_HEADER=true
ALYTHA_INITIAL_BACKOFFICE_EMAIL=admin@alytha.agr.br
ALYTHA_INITIAL_BACKOFFICE_NAME=Backoffice Alytha
ALYTHA_INITIAL_BACKOFFICE_PASSWORD=senha-forte-inicial
ALYTHA_BACKUP_DIR=/srv/alytha/backups/postgres
ALYTHA_BACKUP_RETENTION_DAYS=30
ALYTHA_BACKUP_S3_URI=s3://seu-bucket-backup-alytha/postgres
```

Aplicar banco e criar backoffice inicial:

```bash
cd /srv/alytha/backend
. .venv/bin/activate
python manage.py migrate
python manage.py ensure_backoffice_user --superuser
python manage.py collectstatic --noinput
```

## Frontend

Na EC2 ou em uma maquina de build:

```bash
cd /srv/alytha/frontend
npm ci
cp .env.production.example .env.production
npm run lint
npm run build
```

Confirmar que `.env.production` aponta para:

```env
VITE_API_BASE_URL=https://plataforma.alytha.agr.br/api
VITE_PUBLIC_SITE_URL=https://plataforma.alytha.agr.br
VITE_SHARE_BASE_URL=https://plataforma.alytha.agr.br
```

## Gunicorn/systemd

Copiar servico:

```bash
sudo cp /srv/alytha/deploy/aws-ec2/alytha.service /etc/systemd/system/alytha.service
sudo systemctl daemon-reload
sudo systemctl enable alytha
sudo systemctl start alytha
sudo systemctl status alytha
```

Logs:

```bash
journalctl -u alytha -f
```

## Nginx e SSL existente

Como o dominio e o certificado ja estao funcionando na instancia, nao rode `certbot` de novo sem necessidade. O caminho mais seguro e editar o server block HTTPS atual da pagina de "aguarde inauguracao".

1. Localize o arquivo ativo:

```bash
sudo nginx -T | grep -n "server_name plataforma.alytha.agr.br" -B 20 -A 80
ls -la /etc/nginx/sites-enabled/
```

2. Faca backup da configuracao atual:

```bash
sudo cp /etc/nginx/sites-available/SEU_ARQUIVO_ATUAL /etc/nginx/sites-available/SEU_ARQUIVO_ATUAL.backup-$(date +%F-%H%M)
```

3. Dentro do `server { listen 443 ssl ... }` existente, substitua o bloco que aponta para a pagina de aguarde pelo conteudo de:

```bash
/srv/alytha/deploy/aws-ec2/nginx-existing-ssl-snippet.conf
```

4. Mantenha as linhas atuais de certificado:

```nginx
ssl_certificate /etc/letsencrypt/live/plataforma.alytha.agr.br/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/plataforma.alytha.agr.br/privkey.pem;
```

5. Valide e recarregue:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

6. Se precisar voltar para a pagina de aguarde, restaure o backup e recarregue o Nginx.

## Backup PostgreSQL

Valide manualmente:

```bash
bash /srv/alytha/deploy/aws-ec2/backup-postgres.sh
```

Depois instale o timer systemd:

```bash
sudo cp /srv/alytha/deploy/aws-ec2/alytha-postgres-backup.service /etc/systemd/system/
sudo cp /srv/alytha/deploy/aws-ec2/alytha-postgres-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now alytha-postgres-backup.timer
systemctl list-timers | grep alytha-postgres-backup
```

Para enviar para S3, instale/configure AWS CLI e defina no `.env`:

```env
ALYTHA_BACKUP_S3_URI=s3://seu-bucket-backup-alytha/postgres
```

Se ainda nao tiver S3, manter backup local temporariamente, mas nao considerar isso suficiente para producao por muito tempo.

## Checklist final

```bash
cd /srv/alytha/backend
. .venv/bin/activate
python manage.py predeploy_check
python manage.py check_smtp seu-email-de-teste@dominio.com.br
```

Validar no navegador:

- `https://plataforma.alytha.agr.br/home`
- `https://plataforma.alytha.agr.br/login`
- `https://plataforma.alytha.agr.br/app/admin/backoffice`
- `https://plataforma.alytha.agr.br/mesa-operacional`
- `https://plataforma.alytha.agr.br/share/oportunidades/1`

Restaurar backup mensalmente em banco separado para validar os arquivos `.dump`.
