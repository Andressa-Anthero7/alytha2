#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ALYTHA_ENV_FILE:-/srv/alytha/backend/.env}"
BACKUP_DIR="${ALYTHA_BACKUP_DIR:-/srv/alytha/backups/postgres}"
RETENTION_DAYS="${ALYTHA_BACKUP_RETENTION_DAYS:-30}"
S3_URI="${ALYTHA_BACKUP_S3_URI:-}"

if [[ -z "${DATABASE_URL:-}" && -f "$ENV_FILE" ]]; then
  DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | tail -n 1 | cut -d '=' -f 2-)"
  DATABASE_URL="${DATABASE_URL%\"}"
  DATABASE_URL="${DATABASE_URL#\"}"
  DATABASE_URL="${DATABASE_URL%\'}"
  DATABASE_URL="${DATABASE_URL#\'}"
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL nao encontrada. Defina no ambiente ou em $ENV_FILE." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date +%F-%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/alytha-$TIMESTAMP.dump"

echo "Gerando backup PostgreSQL: $BACKUP_FILE"
pg_dump "$DATABASE_URL" --format=custom --file="$BACKUP_FILE"

echo "Removendo backups locais com mais de $RETENTION_DAYS dias..."
find "$BACKUP_DIR" -type f -name 'alytha-*.dump' -mtime +"$RETENTION_DAYS" -delete

if [[ -n "$S3_URI" ]]; then
  if ! command -v aws >/dev/null 2>&1; then
    echo "ALYTHA_BACKUP_S3_URI definido, mas aws CLI nao esta instalado." >&2
    exit 1
  fi
  echo "Copiando backup para S3: $S3_URI"
  aws s3 cp "$BACKUP_FILE" "$S3_URI/"
fi

echo "Backup finalizado."
