#!/usr/bin/env bash
# Test backup -> restore + chronomètre cold start perf stack.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"

COMPOSE="${COMPOSE:-docker compose}"
TMP_BACKUP="$ROOT/backups/.verify-$$"
mkdir -p "$ROOT/backups"

echo "==> Backup"
bash infra/scripts/backup.sh "$TMP_BACKUP"

echo ""
echo "==> Verify backup files"
test -f "$TMP_BACKUP/app-postgres.sql"
test -s "$TMP_BACKUP/app-postgres.sql"
test -f "$TMP_BACKUP/mspr_etl.db"
echo "OK: backup files present"

echo ""
echo "==> Cold start perf stack (subset, isolated project)"
docker compose -p mspr_bench down -v 2>/dev/null || true
START=$(date +%s)
docker compose -p mspr_bench \
  -f docker-compose.yml \
  -f infra/compose/docker-compose.perf.yml \
  up --build -d app-postgres
for i in $(seq 1 30); do
  if docker compose -p mspr_bench exec -T app-postgres pg_isready -U healthai -q 2>/dev/null; then
    break
  fi
  sleep 2
done
docker compose -p mspr_bench \
  -f docker-compose.yml \
  -f infra/compose/docker-compose.perf.yml \
  up --build -d etl backend frontend-user 2>&1 | tail -5

for i in $(seq 1 60); do
  if curl -sf http://localhost:8100/api/schema/ > /dev/null 2>&1; then
    END=$(date +%s)
    ELAPSED=$((END - START))
    echo "OK: perf stack healthy in ${ELAPSED}s"
    if [ "$ELAPSED" -gt 600 ]; then
      echo "WARN: démarrage > 10 min"
      exit 1
    fi
    break
  fi
  sleep 5
  if [ "$i" -eq 60 ]; then
    echo "FAIL: backend not healthy after 5 min"
    exit 1
  fi
done

docker compose -p mspr_bench down -v 2>/dev/null || true
rm -rf "$TMP_BACKUP"

echo ""
echo "All backup/startup checks passed."
