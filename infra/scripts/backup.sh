#!/usr/bin/env bash
# Sauvegarde Postgres (app + Airflow), Mongo, SQLite ETL et médias backend.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

COMPOSE="${COMPOSE:-docker compose}"
STAMP="$(date +%Y%m%d-%H%M%S)"
DEST="${1:-$ROOT/backups/$STAMP}"
mkdir -p "$DEST"

echo "==> Backup -> $DEST"

$COMPOSE exec -T app-postgres pg_dump -U healthai --clean --if-exists healthai > "$DEST/app-postgres.sql"
echo "  app-postgres.sql"

$COMPOSE exec -T airflow-postgres pg_dump -U airflow --clean --if-exists airflow > "$DEST/airflow-postgres.sql" 2>/dev/null \
  || echo "  (skip airflow-postgres — stack Airflow non démarrée)"

$COMPOSE exec -T mongo mongodump --archive --gzip \
  --username "${MONGO_ROOT_USER:-healthai}" \
  --password "${MONGO_ROOT_PASSWORD:-healthai}" \
  --authenticationDatabase admin \
  > "$DEST/mongo.archive.gz" 2>/dev/null \
  || echo "  (skip mongo — conteneur absent)"

SQLITE_VOL="$($COMPOSE ps -q etl 2>/dev/null | head -1)"
BACKEND_ID="$($COMPOSE ps -q backend 2>/dev/null | head -1)"
if [ -n "$BACKEND_ID" ]; then
  docker exec "$BACKEND_ID" python -c "
import sqlite3
c = sqlite3.connect('/data/mspr_etl.db')
c.execute('PRAGMA wal_checkpoint(TRUNCATE)')
c.commit()
" 2>/dev/null || true
  docker cp "${BACKEND_ID}:/data/mspr_etl.db" "$DEST/mspr_etl.db"
  echo "  mspr_etl.db"
elif [ -n "$SQLITE_VOL" ]; then
  VOL="$(docker volume ls -q | grep sqlite_data | head -1)"
  docker run --rm \
    -v "${VOL}:/data:ro" \
    -v "$DEST:/backup" \
    alpine cp /data/mspr_etl.db /backup/mspr_etl.db
  echo "  mspr_etl.db (via volume)"
fi

if [ -n "$BACKEND_ID" ]; then
  mkdir -p "$DEST/media"
  docker cp "${BACKEND_ID}:/app/media/." "$DEST/media/" 2>/dev/null || true
  echo "  media/ (si présent)"
fi

cat > "$DEST/manifest.txt" <<EOF
HealthAI Coach backup
Date: $(date -Iseconds)
Compose project: ${COMPOSE_PROJECT_NAME:-mspr_etl}
EOF

if [ -f "$DEST/mspr_etl.db" ]; then
  if command -v sha256sum >/dev/null 2>&1; then
    SHA=$(sha256sum "$DEST/mspr_etl.db" | awk '{print $1}')
  else
    SHA=$(shasum -a 256 "$DEST/mspr_etl.db" | awk '{print $1}')
  fi
  echo "mspr_etl.db.sha256=$SHA" >> "$DEST/manifest.txt"
fi

if [ -n "${BACKEND_ID:-}" ]; then
  PATIENTS=$(docker exec "$BACKEND_ID" python -c "
import sqlite3
c = sqlite3.connect('/data/mspr_etl.db')
print(c.execute('SELECT COUNT(*) FROM patient').fetchone()[0])
" 2>/dev/null || echo "0")
  echo "patient_count=$PATIENTS" >> "$DEST/manifest.txt"
fi

echo "OK: backup complete in $DEST"
