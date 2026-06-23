#!/usr/bin/env bash
# Remise à zéro : volumes Docker + relance stack propre (ETL régénère SQLite).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

COMPOSE="${COMPOSE:-docker compose}"

if [ "${1:-}" != "--yes" ]; then
  echo "ATTENTION: supprime tous les volumes du projet Compose (BDD, SQLite, médias)."
  echo "Relance avec: $0 --yes"
  exit 1
fi

echo "==> Reset stack"
$COMPOSE down -v --remove-orphans
$COMPOSE up --build -d

echo "OK: reset complete — ETL a régénéré mspr_etl.db"
