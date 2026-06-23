#!/usr/bin/env bash
# Vérifie Grafana : API health + datasource Prometheus + dashboard provisionné.
set -euo pipefail

GRAFANA_URL="${GRAFANA_URL:-http://localhost:3000}"
GRAFANA_USER="${GRAFANA_USER:-admin}"
GRAFANA_PASSWORD="${GRAFANA_PASSWORD:-admin}"

echo "==> Grafana health"
curl -sf "${GRAFANA_URL}/api/health" | python -c "
import json, sys
h = json.load(sys.stdin)
assert h.get('database') == 'ok', h
print('OK: Grafana health', h)
"

echo ""
echo "==> Datasource Prometheus"
curl -sf -u "${GRAFANA_USER}:${GRAFANA_PASSWORD}" "${GRAFANA_URL}/api/datasources/name/Prometheus" | python -c "
import json, sys
ds = json.load(sys.stdin)
assert ds.get('type') == 'prometheus', ds
print('OK: datasource', ds['name'], '->', ds['url'])
"

echo ""
echo "==> Dashboard HealthAI Coach — Stack"
curl -sf -u "${GRAFANA_USER}:${GRAFANA_PASSWORD}" "${GRAFANA_URL}/api/search?query=HealthAI" | python -c "
import json, sys
items = json.load(sys.stdin)
uids = [i.get('uid') for i in items]
assert 'healthai-stack' in uids, items
print('OK: dashboard healthai-stack found')
"

echo ""
echo "All Grafana checks passed."
