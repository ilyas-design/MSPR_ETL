#!/usr/bin/env bash
# Bootstrap SonarQube for CI: wait until UP, set admin password, emit a scan token.
# Logs on stderr ; only the token is printed on stdout (safe for $(...) capture).
# Usage: SONAR_HOST=http://localhost:9000 ./infra/scripts/sonar-ci-bootstrap.sh
set -euo pipefail

SONAR_HOST="${SONAR_HOST_URL:-http://localhost:9000}"
ADMIN_USER="${SONAR_ADMIN_USER:-admin}"
ADMIN_PASS="${SONAR_ADMIN_PASS:-admin}"
CI_PASS="${SONAR_CI_ADMIN_PASS:-CiAdminPass123!}"

echo "==> Attente de SonarQube ($SONAR_HOST)..." >&2
for _ in $(seq 1 60); do
  if curl -sf "$SONAR_HOST/api/system/status" | grep -q '"status":"UP"'; then
    echo "  SonarQube est UP." >&2
    break
  fi
  sleep 10
done

if ! curl -sf "$SONAR_HOST/api/system/status" | grep -q '"status":"UP"'; then
  echo "ERREUR: SonarQube indisponible après 10 min." >&2
  exit 1
fi

echo "==> Configuration du compte admin..." >&2
curl -sf -u "$ADMIN_USER:$ADMIN_PASS" -X POST \
  "$SONAR_HOST/api/users/change_password" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d "login=$ADMIN_USER&previousPassword=$ADMIN_PASS&password=$CI_PASS" \
  >/dev/null 2>&1 || true

AUTH_PASS="$CI_PASS"
if ! curl -sf -u "$ADMIN_USER:$AUTH_PASS" "$SONAR_HOST/api/authentication/validate" | grep -q '"valid":true'; then
  AUTH_PASS="$ADMIN_PASS"
fi

echo "==> Génération du token CI..." >&2
RESP=$(curl -sf -u "$ADMIN_USER:$AUTH_PASS" -X POST \
  "$SONAR_HOST/api/user_tokens/generate" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d "name=gha-ci-$(date +%s)")

TOKEN=$(echo "$RESP" | sed -n 's/.*"token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
if [ -z "$TOKEN" ] && command -v python3 >/dev/null 2>&1; then
  TOKEN=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
elif [ -z "$TOKEN" ] && command -v python >/dev/null 2>&1; then
  TOKEN=$(echo "$RESP" | python -c "import sys,json; print(json.load(sys.stdin)['token'])")
fi

if [ -z "$TOKEN" ]; then
  echo "ERREUR: impossible de générer un token SonarQube." >&2
  exit 1
fi

# stdout uniquement — pour TOKEN=$(...) en CI
echo "$TOKEN"
