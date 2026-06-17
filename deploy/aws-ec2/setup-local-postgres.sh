#!/usr/bin/env bash
set -euo pipefail

DB_NAME="${ALYTHA_DB_NAME:-alytha}"
DB_USER="${ALYTHA_DB_USER:-alytha}"
DB_PASSWORD="${ALYTHA_DB_PASSWORD:-}"

if [[ -z "$DB_PASSWORD" ]]; then
  echo "Defina ALYTHA_DB_PASSWORD antes de rodar este script." >&2
  echo "Exemplo: export ALYTHA_DB_PASSWORD='uma-senha-forte-aqui'" >&2
  exit 1
fi

validate_identifier() {
  local value="$1"
  if [[ ! "$value" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
    echo "Identificador invalido: $value" >&2
    echo "Use apenas letras, numeros e underline; o primeiro caractere deve ser letra ou underline." >&2
    exit 1
  fi
}

sql_escape() {
  printf "%s" "$1" | sed "s/'/''/g"
}

validate_identifier "$DB_NAME"
validate_identifier "$DB_USER"

DB_PASSWORD_ESCAPED="$(sql_escape "$DB_PASSWORD")"
DB_PASSWORD_URL="$(python3 -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$DB_PASSWORD")"

echo "Instalando PostgreSQL..."
sudo apt update
sudo apt install -y postgresql postgresql-contrib postgresql-client

echo "Habilitando PostgreSQL..."
sudo systemctl enable --now postgresql

echo "Criando/atualizando usuario do banco..."
if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname = '$DB_USER'" | grep -q 1; then
  sudo -u postgres psql -c "ALTER ROLE \"$DB_USER\" WITH LOGIN PASSWORD '$DB_PASSWORD_ESCAPED';"
else
  sudo -u postgres psql -c "CREATE ROLE \"$DB_USER\" WITH LOGIN PASSWORD '$DB_PASSWORD_ESCAPED';"
fi

echo "Criando banco, se necessario..."
if sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1; then
  echo "Banco $DB_NAME ja existe."
else
  sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"
fi

echo "Ajustando permissoes..."
sudo -u postgres psql -d "$DB_NAME" -c "ALTER SCHEMA public OWNER TO \"$DB_USER\";"
sudo -u postgres psql -d "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO \"$DB_USER\";"
sudo -u postgres psql -d "$DB_NAME" -c "GRANT ALL PRIVILEGES ON DATABASE \"$DB_NAME\" TO \"$DB_USER\";"

echo "Verificando escuta local..."
sudo ss -ltnp | grep ':5432' || true

cat <<EOF

PostgreSQL local pronto.

Use esta DATABASE_URL no /srv/alytha/backend/.env:

DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD_URL@127.0.0.1:5432/$DB_NAME

Proximo passo:
cd /srv/alytha/backend
. .venv/bin/activate
python manage.py migrate
python manage.py ensure_backoffice_user --superuser
python manage.py predeploy_check
EOF
