#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
docker compose -f docker-compose.yml -f infra/compose/docker-compose.offline.yml up --build -d \
  etl app-postgres mongo nutrition-api reco-engine backend frontend frontend-user "$@"
