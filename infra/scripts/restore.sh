#!/usr/bin/env bash
# Restaure une sauvegarde produite par backup.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if [ $# -lt 1 ]; then
  echo "Usage: $0 <chemin-backup>" >&2
  exit 1
fi

SRC="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
COMPOSE="${COMPOSE:-docker compose}"

if [ ! -f "$SRC/app-postgres.sql" ]; then
  echo "Backup invalide: app-postgres.sql manquant dans $SRC" >&2
  exit 1
fi

sqlite_volume() {
  docker volume ls -q | grep 'mspr_etl.*sqlite_data' | head -1 \
    || docker volume ls -q | grep sqlite_data | head -1
}

restore_sqlite() {
  if [ ! -f "$SRC/mspr_etl.db" ]; then
    return 0
  fi
  echo "SQLite ETL..."
  VOL="$(sqlite_volume)"
  MSYS_NO_PATHCONV=1 docker run --rm \
    -v "${VOL}:/data" \
    -v "${SRC}:/backup:ro" \
    alpine sh -c "cp /backup/mspr_etl.db /data/mspr_etl.db && rm -f /data/mspr_etl.db-wal /data/mspr_etl.db-shm"
}

echo "==> Restore from $SRC"
echo "Arrêt de la stack..."
$COMPOSE down

echo "Redémarrage des bases..."
$COMPOSE up -d app-postgres mongo airflow-postgres 2>/dev/null || $COMPOSE up -d app-postgres mongo
for i in $(seq 1 30); do
  if $COMPOSE exec -T app-postgres pg_isready -U healthai -q 2>/dev/null; then
    break
  fi
  sleep 2
done

echo "Postgres (app)..."
cat "$SRC/app-postgres.sql" | $COMPOSE exec -T app-postgres psql -U healthai -d healthai -q

if [ -f "$SRC/airflow-postgres.sql" ] && $COMPOSE ps airflow-postgres -q 2>/dev/null | grep -q .; then
  echo "Postgres (airflow)..."
  cat "$SRC/airflow-postgres.sql" | $COMPOSE exec -T airflow-postgres psql -U airflow -d airflow -q
fi

if [ -f "$SRC/mongo.archive.gz" ] && $COMPOSE ps mongo -q 2>/dev/null | grep -q .; then
  echo "Mongo..."
  cat "$SRC/mongo.archive.gz" | $COMPOSE exec -T mongo mongorestore --archive --gzip \
    --username "${MONGO_ROOT_USER:-healthai}" \
    --password "${MONGO_ROOT_PASSWORD:-healthai}" \
    --authenticationDatabase admin --drop
fi

echo "Relance stack (ETL régénère SQLite, puis écrasement par le backup)..."
$COMPOSE up -d

if $COMPOSE ps etl -q 2>/dev/null | grep -q .; then
  echo "Attente fin ETL..."
  docker wait "$($COMPOSE ps -q etl)" 2>/dev/null || true
fi

restore_sqlite

if [ -d "$SRC/media" ]; then
  echo "Médias..."
  sleep 3
  BACKEND_ID="$($COMPOSE ps -q backend 2>/dev/null | head -1)"
  if [ -n "$BACKEND_ID" ]; then
    docker cp "$SRC/media/." "${BACKEND_ID}:/app/media/"
  fi
fi

echo "Redémarrage services consommateurs SQLite..."
$COMPOSE restart backend nutrition-api reco-engine 2>/dev/null || true

for i in $(seq 1 40); do
  if curl -sf http://localhost:8000/api/schema/ > /dev/null 2>&1; then
    break
  fi
  sleep 3
done

echo "OK: restore complete"
