# CI/CD — HealthAI Coach (MSPR TPRE601)

Documentation du pipeline d'intégration et de livraison continues. La chaîne est
définie dans [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) et
s'exécute sur GitHub Actions. Le déploiement cible un **environnement local**
(exigence MSPR : démonstration reproductible sur poste local, pas de VPS).

## Vue d'ensemble

```
push / PR sur main
      │
  Stage 1 — Sécurité (fail fast)
      ├── dependency-audit   pip-audit (ETL, backend, reco) + npm audit (2 fronts)
      ├── python-sast        Bandit (etl, services, orchestration)
      └── trivy-fs           scan vulnérabilités du système de fichiers
      │
  Stage 2 — Tests & builds
      ├── tests-coverage     ETL + Django + nutrition-api + reco-engine (seuil 70%)
      ├── etl-smoke          run_pipeline + monitoring + contrôle etl_run
      ├── frontend-admin     lint + build
      └── frontend-user      lint + test (vitest) + build
      │
  Stage 3 — Images
      ├── trivy-images-core  build + scan etl / backend / reco-engine
      └── publish-images     build + push GHCR (push sur main uniquement)   ← CD
      │
  Stage 4 — Scans étendus (cron hebdo / manuel)
      ├── dependency-audit-ml, trivy-images-full, trivy-base-images
```

## Déclencheurs

| Événement | Comportement |
|---|---|
| `pull_request` → main | Stages 1 → 3 (scan), **pas** de publication d'images |
| `push` → main | Stages 1 → 3 + **publish-images** (CD vers GHCR) |
| `schedule` (lundi 06:00) | Scans étendus (Stage 4) |
| `workflow_dispatch` | Manuel, inclut Stage 4 |

## Qualité de code — SonarQube (local)

SonarQube tourne en local (profil Docker `sonar`), conformément à l'exigence
« tout local » de la MSPR. Configuration : [`sonar-project.properties`](../../sonar-project.properties).

```bash
# 1. Démarrer SonarQube (UI http://localhost:9000, login admin/admin)
#    Prérequis Linux : sudo sysctl -w vm.max_map_count=262144
docker compose --profile sonar up -d sonarqube

# 2. Générer un token : My Account > Security > Generate Token
export SONAR_TOKEN=xxxxxxxx

# 3. (optionnel) couverture à jour pour Sonar
./run_coverage.sh        # produit coverage.xml + apps/frontend-user/coverage/lcov.info

# 4. Lancer l'analyse
./infra/scripts/sonar-scan.sh
```

Le rapport est disponible sur `http://localhost:9000/dashboard?id=healthai-coach`.
> ⚠️ La base H2 embarquée convient à la démo, **pas** à la production.

## Livraison continue — Images GHCR

Sur chaque `push` vers `main`, le job `publish-images` build et publie 7 images
sur le GitHub Container Registry via le `GITHUB_TOKEN` intégré (aucun compte
tiers requis) :

| Service | Image |
|---|---|
| ETL | `ghcr.io/<owner>/mspr-etl` |
| Backend | `ghcr.io/<owner>/mspr-backend` |
| nutrition-api | `ghcr.io/<owner>/mspr-nutrition-api` |
| reco-engine | `ghcr.io/<owner>/mspr-reco-engine` |
| frontend-admin | `ghcr.io/<owner>/mspr-frontend-admin` |
| frontend-user | `ghcr.io/<owner>/mspr-frontend-user` |
| Airflow | `ghcr.io/<owner>/mspr-airflow` |

Tags : `latest` + `sha-<court>` (traçabilité du commit déployé).

## Déploiement local depuis le registry

Le script [`infra/scripts/deploy.sh`](../../infra/scripts/deploy.sh) déploie la
stack à partir des images GHCR (override
[`infra/compose/docker-compose.ghcr.yml`](../../infra/compose/docker-compose.ghcr.yml)) :

```bash
# Authentification (images privées par défaut)
echo "$GHCR_TOKEN" | docker login ghcr.io -u <user> --password-stdin

# Déploiement (tag latest)
./infra/scripts/deploy.sh

# Un tag précis / un autre owner
TAG=sha-abc1234 REGISTRY=ghcr.io/<owner> ./infra/scripts/deploy.sh
```

Le script fait `docker compose pull` puis `up -d --no-build`, et attend que
l'API réponde sur `http://localhost:8000`.

## Artefacts produits

| Artefact | Source | Rétention |
|---|---|---|
| `coverage-reports` (HTML + `coverage.xml`) | tests-coverage | 14 j |
| `etl-reports` (`reports/`, `mspr_etl.db`) | etl-smoke | 14 j |
| `frontend-admin-dist`, `frontend-user-dist` | builds front | 14 j |
| `bandit-report` | python-sast | 14 j |
| SARIF Trivy (onglet *Security*) | trivy-* | — |

## Maintenance

- **Seuil de couverture** : `fail_under = 70` dans [`.coveragerc`](../../.coveragerc).
- **Ajouter un service au CD** : ajouter une entrée à la matrice `publish-images`
  (name/context/dockerfile) et au besoin à `docker-compose.ghcr.yml`.
- **Versions d'actions** épinglées (Trivy `v0.36.0`, actions Docker v3/v5/v6) :
  mettre à jour de façon contrôlée.
- **Chemins** : la CI suit l'arborescence monorepo (`etl/`, `services/*`,
  `apps/*`, `orchestration/airflow`). Tout déplacement de dossier doit être
  répercuté dans `ci.yml`.
