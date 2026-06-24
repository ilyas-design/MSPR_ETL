#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Déploiement local depuis les images GHCR publiées par la CI.
# Cible = poste local (la MSPR exige un environnement reproductible LOCAL).
#
# Usage :
#   ./infra/scripts/deploy.sh                 # tag latest
#   TAG=sha-abc1234 ./infra/scripts/deploy.sh # un tag précis
#   REGISTRY=ghcr.io/<owner> ./infra/scripts/deploy.sh
#
# Auth registry (images privées par défaut) :
#   echo $GHCR_TOKEN | docker login ghcr.io -u <user> --password-stdin
# ---------------------------------------------------------------------------
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

REGISTRY="${REGISTRY:-ghcr.io/ilyas-design}"
TAG="${TAG:-latest}"
export REGISTRY TAG
# L'image Airflow est paramétrable directement dans le compose de base.
export AIRFLOW_IMAGE_NAME="${AIRFLOW_IMAGE_NAME:-$REGISTRY/mspr-airflow:$TAG}"

COMPOSE_FILES=(-f docker-compose.yml -f infra/compose/docker-compose.ghcr.yml)

echo "==> Déploiement local depuis $REGISTRY (tag: $TAG)"

echo "==> Récupération des images..."
docker compose "${COMPOSE_FILES[@]}" pull

echo "==> Démarrage de la stack (sans build)..."
docker compose "${COMPOSE_FILES[@]}" up -d --no-build

echo "==> Attente de la santé du backend..."
for _ in $(seq 1 30); do
  if curl -sf http://localhost:8000/api/schema/ >/dev/null 2>&1; then
    echo "  backend OK"
    break
  fi
  sleep 3
done

echo "OK: déploiement terminé."
echo "  Frontend admin : http://localhost"
echo "  API            : http://localhost:8000"
docker compose "${COMPOSE_FILES[@]}" ps
