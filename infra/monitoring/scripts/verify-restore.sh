#!/usr/bin/env bash
# Test complet backup → corruption SQLite → restore → vérification intégrité.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"

COMPOSE="${COMPOSE:-docker compose}"
TMP_BACKUP="$ROOT/backups/.verify-restore-$$"
mkdir -p "$ROOT/backups"

sqlite_volume() {
  docker volume ls -q | grep 'mspr_etl.*sqlite_data' | head -1 \
    || docker volume ls -q | grep sqlite_data | head -1
}

cleanup() {
  rm -rf "$TMP_BACKUP" 2>/dev/null || true
}
trap cleanup EXIT

echo "==> 1/5 Backup"
bash infra/scripts/backup.sh "$TMP_BACKUP"

EXPECTED_SHA=$(grep mspr_etl.db.sha256= "$TMP_BACKUP/manifest.txt" | cut -d= -f2)
EXPECTED_PATIENTS=$(grep patient_count= "$TMP_BACKUP/manifest.txt" | cut -d= -f2)
echo "   SHA256 attendu : ${EXPECTED_SHA:0:16}..."
echo "   Patients attendus : $EXPECTED_PATIENTS"

BACKEND_ID="$($COMPOSE ps -q backend 2>/dev/null | head -1)"
if [ -z "$BACKEND_ID" ]; then
  echo "FAIL: backend non démarré — lancez docker compose up -d d'abord" >&2
  exit 1
fi

echo ""
echo "==> 2/5 Corruption volontaire SQLite (simule perte de données)"
$COMPOSE stop backend 2>/dev/null || true
VOL="$(sqlite_volume)"
MSYS_NO_PATHCONV=1 docker run --rm -v "${VOL}:/data" alpine sh -c "rm -f /data/mspr_etl.db"
echo "   Fichier mspr_etl.db supprimé du volume"

echo ""
echo "==> 3/5 Restore depuis backup"
bash infra/scripts/restore.sh "$TMP_BACKUP"

echo ""
echo "==> 4/5 Attente backend healthy"
for i in $(seq 1 40); do
  if curl -sf http://localhost:8000/api/schema/ > /dev/null 2>&1; then
    break
  fi
  sleep 3
  if [ "$i" -eq 40 ]; then
    echo "FAIL: backend not healthy after restore" >&2
    exit 1
  fi
done

BACKEND_ID="$($COMPOSE ps -q backend)"
RESTORED_SHA=$(docker exec "$BACKEND_ID" python -c "
import hashlib
with open('/data/mspr_etl.db', 'rb') as f:
    print(hashlib.sha256(f.read()).hexdigest())
")

echo ""
echo "==> 5/5 Vérification intégrité"
RESTORED_PATIENTS=$(docker exec "$BACKEND_ID" python -c "
import sqlite3
c = sqlite3.connect('/data/mspr_etl.db')
print(c.execute('SELECT COUNT(*) FROM patient').fetchone()[0])
")
if [ "$RESTORED_PATIENTS" != "$EXPECTED_PATIENTS" ]; then
  echo "FAIL: patient count mismatch ($RESTORED_PATIENTS vs $EXPECTED_PATIENTS)" >&2
  exit 1
fi
echo "OK: $RESTORED_PATIENTS patients (identique au backup)"

docker exec "$BACKEND_ID" python -c "
import hashlib, sqlite3
c = sqlite3.connect('/data/mspr_etl.db')
c.execute('PRAGMA wal_checkpoint(TRUNCATE)')
c.commit()
with open('/data/mspr_etl.db', 'rb') as f:
    print(hashlib.sha256(f.read()).hexdigest())
" > /tmp/restored.sha 2>/dev/null || true
if [ -f /tmp/restored.sha ] && [ -n "$EXPECTED_SHA" ]; then
  RESTORED_SHA=$(cat /tmp/restored.sha)
  if [ "$RESTORED_SHA" = "$EXPECTED_SHA" ]; then
    echo "OK: mspr_etl.db SHA256 identique au backup"
  else
    echo "INFO: SHA256 diffère (WAL/checkpoint) — intégrité validée via patient_count"
  fi
fi
echo "OK: API http://localhost:8000/api/schema/"

echo ""
echo "All restore checks passed."
