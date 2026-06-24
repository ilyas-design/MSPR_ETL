#!/usr/bin/env bash
# Vérifie que Prometheus scrape les cibles attendues.
set -euo pipefail

PROM_URL="${PROM_URL:-http://localhost:9090}"
BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"

echo "==> Backend /metrics"
curl -sf "${BACKEND_URL}/metrics" | head -5
echo "... (truncated)"
curl -sf "${BACKEND_URL}/metrics" | grep -qE "django_http_requests_total(_by_method_total)?" \
  && echo "OK: django HTTP request metrics present" \
  || echo "WARN: django HTTP metrics not found yet (may appear after first request)"

echo ""
echo "==> Prometheus targets"
curl -sf "${PROM_URL}/api/v1/targets" | python -c "
import json, sys
data = json.load(sys.stdin)
targets = data.get('data', {}).get('activeTargets', [])
expected = {'django-backend', 'cadvisor', 'node-exporter', 'postgres-app', 'postgres-airflow', 'prometheus'}
found = {t['labels']['job'] for t in targets}
missing = expected - found
down = [t['labels']['job'] for t in targets if t['health'] != 'up']
print('Jobs found:', sorted(found))
if missing:
    print('MISSING jobs:', sorted(missing))
    sys.exit(1)
if down:
    print('DOWN jobs:', down)
    sys.exit(1)
print('OK: all expected targets UP')
"
