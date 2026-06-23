#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
docker compose -p mspr_perf \
  -f docker-compose.yml \
  -f infra/compose/docker-compose.perf.yml \
  up --build -d \
  etl app-postgres backend frontend-user "$@"
