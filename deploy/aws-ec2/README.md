# Deploy Alytha em AWS EC2

Este roteiro assume Ubuntu 22.04/24.04 na EC2, domínio `plataforma.alytha.agr.br`, Nginx servindo o frontend e Gunicorn servindo o Django em `127.0.0.1:8000`.

## Arquitetura recomendada

- EC2: aplicação Django + build estático do frontend + Nginx.
- PostgreSQL: preferencialmente AWS RDS PostgreSQL.
- SMTP: AWS SES, Google Workspace, SendGrid, Mailgun ou outro provedor SMTP real.
- Backup: RDS automated backups ou `pg_dump` diário para S3.

Se o orçamento exigir, PostgreSQL pode rodar na própria EC2 no começo, mas RDS é mais seguro para produção.

## Security group

Liberar entrada:

- `22/tcp`: SSH, restrito ao seu IP.
- `80/tcp`: HTTP público, necessário para Let's Encrypt.
- `443/tcp`: HTTPS público.

Não expor `5432/tcp` publicamente. Se usar RDS, liberar o RDS apenas para o security group da EC2.

## Preparar servidor

```bash
sudo apt update
sudo apt install -y python3-venv python3-pip nginx git nodejs npm certbot python3-certbot-nginx
sudo mkdir -p /srv/alytha
sudo chown -R ubuntu:www-data /srv/alytha
```

Clonar ou copiar o projeto para `/srv/alytha`.

## Backend

```bash
cd /srv/alytha/backend
python3 -m venv .venv
. .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

Criar `/srv/alytha/backend/.env` baseado em `backend/.env.example`.

Campos obrigatórios para EC2:

```env
DJANGO_ENV=production
DJANGO_DEBUG=false
DJANGO_SECRET_KEY=gere-uma-chave-longa-e-aleatoria
DJANGO_ALLOWED_HOSTS=plataforma.alytha.agr.br
DJANGO_CORS_ALLOWED_ORIGINS=https://plataforma.alytha.agr.br
DJANGO_CSRF_TRUSTED_ORIGINS=https://plataforma.alytha.agr.br
DATABASE_URL=postgresql://usuario:senha@host-rds-ou-local:5432/alytha
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

Na máquina de build ou na própria EC2:

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

Copiar serviço:

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

## Nginx e HTTPS

Se a EC2 ainda nao tiver Nginx/SSL, use o fluxo completo abaixo. Se ela ja tem a pagina de "aguarde inauguracao" com dominio e certificado ativo, pule para "Aproveitar Nginx/SSL existente".

Antes do certificado novo, apontar o DNS `plataforma.alytha.agr.br` para o Elastic IP da EC2.

Instalar config:

```bash
sudo cp /srv/alytha/deploy/aws-ec2/nginx-alytha.conf /etc/nginx/sites-available/alytha
sudo ln -s /etc/nginx/sites-available/alytha /etc/nginx/sites-enabled/alytha
sudo nginx -t
```

Gerar certificado:

```bash
sudo certbot --nginx -d plataforma.alytha.agr.br
sudo nginx -t
sudo systemctl reload nginx
```

### Aproveitar Nginx/SSL existente

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

4. Mantenha as linhas atuais de certificado, por exemplo:

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

## Backup

Se usar RDS, habilitar backup automático com retenção mínima de 30 dias.

Se usar PostgreSQL na EC2, instalar AWS CLI e agendar `pg_dump` para S3. Exemplo:

```bash
mkdir -p /srv/alytha/backups
pg_dump "$DATABASE_URL" --format=custom --file="/srv/alytha/backups/alytha-$(date +%F-%H%M).dump"
aws s3 cp /srv/alytha/backups/ s3://seu-bucket-backup-alytha/ --recursive
```

Restaurar mensalmente em banco separado para validar os backups.
