#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Analyse qualité de code (SonarQube local).
#
# Prérequis :
#   1. SonarQube démarré :  docker compose --profile sonar up -d sonarqube
#      (UI http://localhost:9000, login initial admin/admin)
#   2. Un token : Sonar > My Account > Security > Generate Token
#      puis :  export SONAR_TOKEN=xxxxxxxx
#   3. (optionnel) couverture à jour :  ./run_coverage.sh   # génère coverage.xml
#
# Usage :
#   ./infra/scripts/sonar-scan.sh
# ---------------------------------------------------------------------------
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

SONAR_HOST="${SONAR_HOST_URL:-http://localhost:9000}"

# Le scanner tourne dans un conteneur ; sur Docker Desktop, l'hôte est joignable
# via host.docker.internal. Sous Linux on ajoute --add-host pour le mapper.
SCAN_HOST="${SONAR_HOST/localhost/host.docker.internal}"

if [ -z "${SONAR_TOKEN:-}" ]; then
  echo "ERREUR: SONAR_TOKEN n'est pas défini." >&2
  echo "  Génère un token dans SonarQube (My Account > Security) puis :" >&2
  echo "    export SONAR_TOKEN=xxxxxxxx" >&2
  exit 1
fi

echo "==> Attente de SonarQube ($SONAR_HOST)..."
for _ in $(seq 1 30); do
  if curl -sf "$SONAR_HOST/api/system/status" | grep -q '"status":"UP"'; then
    echo "  SonarQube est UP."
    break
  fi
  sleep 5
done

echo "==> Analyse en cours..."
docker run --rm \
  --add-host=host.docker.internal:host-gateway \
  -e SONAR_HOST_URL="$SCAN_HOST" \
  -e SONAR_TOKEN="$SONAR_TOKEN" \
  -v "$ROOT:/usr/src" \
  sonarsource/sonar-scanner-cli:latest

echo "OK: analyse terminée — résultats sur $SONAR_HOST/dashboard?id=healthai-coach"
