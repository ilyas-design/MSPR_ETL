#!/usr/bin/env bash
# Valide les 3 configurations Compose + smoke tests offline/perf.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"

echo "==> Compose config merge (full / offline / perf)"
docker compose config -q
docker compose -f docker-compose.yml -f infra/compose/docker-compose.offline.yml config -q
docker compose -p mspr_perf -f docker-compose.yml -f infra/compose/docker-compose.perf.yml config -q
echo "OK: all compose files valid"

echo ""
echo "==> Offline mocks (nutrition-api + reco-engine)"
docker compose -f docker-compose.yml -f infra/compose/docker-compose.offline.yml up -d --build nutrition-api reco-engine 2>&1 | tail -3
sleep 20
docker exec mspr_etl-nutrition-api-1 curl -sf -X POST http://127.0.0.1:8001/coach-advice \
  -H 'Content-Type: application/json' \
  -d '{"goal":"maintenance","totals_today":{"calories":1200},"targets":{"calories":2000},"imbalances":[]}' \
  | python -c "import json,sys; d=json.load(sys.stdin); assert d['model']=='mock-offline', d; print('OK: nutrition-api mock', d['model'])"
docker exec mspr_etl-reco-engine-1 curl -sf -X POST http://127.0.0.1:8002/workout-plan-ai \
  -H 'Content-Type: application/json' \
  -d '{"goal":"general_health","level":"beginner","days_per_week":3}' \
  | python -c "import json,sys; d=json.load(sys.stdin); assert d['model']=='mock-offline', d; print('OK: reco-engine mock', d['model'])"

echo ""
echo "==> Perf stack (isolated project mspr_perf)"
if docker compose -p mspr_perf ps --status running -q 2>/dev/null | grep -q .; then
  echo "Perf stack already running"
else
  bash infra/scripts/up-perf.sh 2>&1 | tail -5
  sleep 30
fi
curl -sf http://localhost:8100/api/schema/ > /dev/null && echo "OK: perf backend http://localhost:8100"
curl -sf -o /dev/null -w "%{http_code}" http://localhost:85/ | grep -q "200\|301\|302" && echo "OK: perf frontend-user http://localhost:85"

echo ""
echo "All environment checks passed."
