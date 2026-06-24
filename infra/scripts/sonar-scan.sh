#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Analyse qualité de code (SonarQube local).
#
# Prérequis :
#   1. SonarQube démarré (service seul, pas toute la stack) :
#        docker compose --profile sonar up -d sonarqube
#      UI : http://localhost:9002  (port 9002 — 9000 souvent pris par Portainer)
#   2. (optionnel) couverture à jour :  ./run_coverage.sh
#
# Usage :
#   ./infra/scripts/sonar-scan.sh
#   SONAR_TOKEN=xxx ./infra/scripts/sonar-scan.sh   # token manuel
# ---------------------------------------------------------------------------
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

SONAR_PORT="${SONAR_PORT:-9002}"
SONAR_HOST="${SONAR_HOST_URL:-http://localhost:$SONAR_PORT}"

# Le scanner tourne dans un conteneur ; sur Docker Desktop, l'hôte est joignable
# via host.docker.internal. Sous Linux on ajoute --add-host pour le mapper.
SCAN_HOST="${SONAR_HOST/localhost/host.docker.internal}"
SCAN_HOST="${SCAN_HOST/127.0.0.1/host.docker.internal}"

if [ -z "${SONAR_TOKEN:-}" ]; then
  echo "==> SONAR_TOKEN absent — génération automatique..."
  SONAR_HOST_URL="$SONAR_HOST" SONAR_TOKEN="$(bash "$ROOT/infra/scripts/sonar-ci-bootstrap.sh")"
  export SONAR_TOKEN
fi

if ! curl -sf "$SONAR_HOST/api/system/status" | grep -q '"status":"UP"'; then
  echo "ERREUR: SonarQube n'est pas accessible sur $SONAR_HOST" >&2
  echo "  Démarre-le avec :" >&2
  echo "    docker compose --profile sonar up -d sonarqube" >&2
  exit 1
fi

echo "==> Analyse en cours..."
docker run --rm \
  --add-host=host.docker.internal:host-gateway \
  -e SONAR_HOST_URL="$SCAN_HOST" \
  -e SONAR_TOKEN="$SONAR_TOKEN" \
  -v "$ROOT:/usr/src" \
  sonarsource/sonar-scanner-cli:latest

echo "OK: analyse terminée — résultats sur $SONAR_HOST/dashboard?id=healthai-coach"
