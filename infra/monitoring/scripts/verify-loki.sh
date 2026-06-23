#!/usr/bin/env bash
# Vérifie Loki (logs) + règles d'alerte Prometheus.
set -euo pipefail

LOKI_URL="${LOKI_URL:-http://localhost:3100}"
PROM_URL="${PROM_URL:-http://localhost:9090}"
ALERT_URL="${ALERT_URL:-http://localhost:9093}"

echo "==> Loki ready"
for i in $(seq 1 30); do
  if curl -sf "${LOKI_URL}/ready" 2>/dev/null | grep -q "ready"; then
    echo "OK: Loki ready"
    break
  fi
  sleep 2
  if [ "$i" -eq 30 ]; then
    echo "FAIL: Loki not ready after 60s"
    exit 1
  fi
done

echo ""
echo "==> Generate fresh backend log line"
curl -sf http://localhost:8000/api/schema/ > /dev/null
sleep 8

echo ""
echo "==> Promtail shipping (query recent backend logs)"
END=$(date +%s)000000000
START=$((END - 3600000000000))
curl -sf -G "${LOKI_URL}/loki/api/v1/query_range" \
  --data-urlencode 'query={service="backend"}' \
  --data-urlencode "start=${START}" \
  --data-urlencode "end=${END}" \
  --data-urlencode 'limit=5' | python -c "
import json, sys
data = json.load(sys.stdin)
results = data.get('data', {}).get('result', [])
assert results, 'no backend logs in Loki'
print('OK: backend logs found, streams:', len(results))
"

echo ""
echo "==> Prometheus alert rules loaded"
curl -sf "${PROM_URL}/api/v1/rules" | python -c "
import json, sys
data = json.load(sys.stdin)
groups = data.get('data', {}).get('groups', [])
names = [r['name'] for g in groups for r in g.get('rules', [])]
assert 'BackendDown' in names, names
print('OK: alert rules:', names)
"

echo ""
echo "==> Alertmanager"
curl -sf "${ALERT_URL}/-/ready" && echo " OK: Alertmanager ready"

echo ""
echo "All Loki/alert checks passed."
