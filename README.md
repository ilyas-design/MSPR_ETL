# HealthAI Coach

Plateforme de coaching santé et d’activité physique : pipeline ETL, API REST, microservices IA, applications web et mobile. Projet MSPR — **TPRE501/502** (data & web) et **TPRE601** (industrialisation & mobile).

Environnement de démonstration **100 % local** (Docker Compose sur poste développeur).

---

## Sommaire

- [Vue d’ensemble](#vue-densemble)
- [Démarrage rapide](#démarrage-rapide)
- [Services & URLs](#services--urls)
- [Architecture](#architecture)
- [Configurations](#configurations)
- [Application mobile](#application-mobile)
- [Développement natif](#développement-natif)
- [Tests & qualité](#tests--qualité)
- [Documentation](#documentation)
- [Structure du dépôt](#structure-du-dépôt)

---

## Vue d’ensemble

| Couche | Rôle |
|--------|------|
| **ETL** (Python / Pandas) | Ingestion CSV/JSON → base SQLite normalisée |
| **Backend** (Django REST + JWT) | API métier, auth, réseau social, proxy IA |
| **Microservices IA** (FastAPI) | Reconnaissance alimentaire, plans repas/sport (LLM) |
| **Frontends** (React / Vite) | Back-office admin + parcours utilisateur |
| **Mobile** (Expo / React Native) | Mini réseau social (fil, publications, profil) |
| **Airflow** | Orchestration du pipeline ETL (quotidien 02h00) |
| **Monitoring** (optionnel) | Prometheus, Grafana, Loki |

**Flux de données :**

```
CSV / JSON  →  ETL  →  SQLite (mspr_etl.db)  →  API Django  →  Web / Mobile
                              ↓
                    PostgreSQL (comptes, social)
                              ↓
                         MongoDB (plans IA)
```

---

## Démarrage rapide

### Prérequis

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (recommandé)
- Fichier d’environnement : `cp .env.example .env` puis renseigner au minimum `SECRET_KEY`

### Stack complète (une commande)

```bash
docker compose up --build
```

Au premier lancement, l’ETL génère la base SQLite ; le backend et les frontends démarrent une fois les dépendances saines.

### Avec monitoring (TPRE601)

```bash
docker compose --profile monitoring up --build -d
```

Scripts de vérification : `infra/monitoring/scripts/verify-*.sh`

---

## Services & URLs

| Service | URL locale | Identifiants / notes |
|---------|------------|----------------------|
| Frontend admin | http://localhost | nginx |
| Frontend utilisateur | http://localhost:81 | nginx |
| API Django | http://localhost:8000 | Swagger : `/api/schema/swagger-ui/` |
| Airflow | http://localhost:8080 | `airflow` / `airflow` |
| Grafana *(monitoring)* | http://localhost:3000 | `admin` / `admin` |
| Prometheus *(monitoring)* | http://localhost:9090 | — |

L’API est exposée sur le port **8000** pour permettre à l’**app mobile** (Expo Go) de joindre le backend via l’IP LAN du PC.

---

## Architecture

```
                    ┌─────────────┐     ┌──────────────┐
                    │ frontend    │     │ frontend-user│
                    │   :80       │     │    :81       │
                    └──────┬──────┘     └──────┬───────┘
                           └────────┬──────────┘
                                    │ /api/*
                           ┌────────▼────────┐
                           │    backend      │ :8000
                           └───┬───┬────┬────┘
                               │   │    │
              ┌────────────────┘   │    └────────────────┐
              ▼                    ▼                     ▼
       app-postgres          nutrition-api         reco-engine
       (PostgreSQL)          (FastAPI :8001)        (FastAPI :8002)
              │                    │                     │
              │                    └──────────┬──────────┘
              │                               ▼
              │                    SQLite /data/mspr_etl.db
              │                               ▲
              │                               │ (volume partagé)
              └───────────────────────────────┤
                                              │
                                         etl (one-shot)
                                              │
                                         mongo (plans IA)

     Airflow (scheduler, DAG mspr_daily_etl) ──► relance ETL planifiée
     Profile monitoring ──► Prometheus · Grafana · Loki · Promtail
```

### Bases de données

| Base | Moteur | Contenu |
|------|--------|---------|
| ETL | SQLite (`mspr_etl.db`) | Patients, santé, nutrition, activité, exercices — schéma `etl/sql/BDD.sql` |
| App | PostgreSQL | Auth Django, profils, repas analysés, réseau social |
| Plans IA | MongoDB | Plans repas / sport générés par LLM |
| Airflow | PostgreSQL *(dédié)* | Métadonnées orchestration uniquement |

---

## Configurations

Trois profils reproductibles (exigence TPRE601) :

| Configuration | Commande | Usage |
|---------------|----------|--------|
| **Complète** | `docker compose up --build -d` | Tous les services + IA + Airflow |
| **Offline** | `./infra/scripts/up-offline.sh` | Mocks IA, sans OpenRouter |
| **Performance** | `./infra/scripts/up-perf.sh` | Stack minimale (ports 8100 / 85) |

Détails : [`infra/compose/README.md`](infra/compose/README.md)

### Sauvegarde & restauration

```bash
./infra/scripts/backup.sh
./infra/scripts/restore.sh backups/<horodatage>
./infra/scripts/reset.sh --yes          # remise à zéro (supprime les volumes)
```

Guide : [`docs/deployment/BACKUP.md`](docs/deployment/BACKUP.md)

---

## Application mobile

Mini réseau social Expo (Android / iOS) : fil de publications, likes, commentaires, profil.

```bash
cd apps/mobile
cp .env.example .env    # EXPO_PUBLIC_API_BASE_URL → IP LAN ou 10.0.2.2 (Android)
npm install
npx expo start
```

| Mode | Variable |
|------|----------|
| API réelle | `EXPO_PUBLIC_USE_MOCKS=0` + backend joignable sur le réseau local |
| Offline / démo | `EXPO_PUBLIC_USE_MOCKS=1` |

Documentation complète : [`apps/mobile/README.md`](apps/mobile/README.md)

---

## Développement natif

Alternative sans Docker (ETL → backend → frontend) :

```bash
./run.sh                    # pipeline + backend + frontend admin
./run.sh --skip-pipeline    # si mspr_etl.db existe déjà
```

Étapes manuelles :

```bash
# ETL
pip install -r etl/requirements.txt
python etl/run_pipeline.py

# Backend
cd services/backend && pip install -r requirements.txt
python manage.py migrate && python manage.py runserver

# Frontend
cd apps/frontend-admin && npm install && npm run dev
```

Variables : voir [`.env.example`](.env.example).

---

## Tests & qualité

```bash
# ETL
cd etl && python -m unittest discover -s tests -v

# Backend Django
cd services/backend && python manage.py test -v 2

# Couverture globale
./run_coverage.sh
./run_coverage.sh --html
```

CI GitHub Actions : audit dépendances, SAST, Trivy, builds et tests (voir [`.github/workflows/ci.yml`](.github/workflows/ci.yml)).

---

## Documentation

| Sujet | Fichier |
|-------|---------|
| Soutenance & architecture détaillée | [`docs/README_SOUTENANCE.md`](docs/README_SOUTENANCE.md) |
| Docker (topologie, volumes) | [`docs/DOCKER.md`](docs/DOCKER.md) |
| Monitoring | [`docs/monitoring/README.md`](docs/monitoring/README.md) |
| Environnements Compose | [`infra/compose/README.md`](infra/compose/README.md) |
| Backup / restore | [`docs/deployment/BACKUP.md`](docs/deployment/BACKUP.md) |
| Reste à faire TPRE601 | [`docs/MSPR3_TPRE601_RESTE_A_FAIRE.md`](docs/MSPR3_TPRE601_RESTE_A_FAIRE.md) |

---

## Structure du dépôt

```
apps/
  frontend-admin/     Back-office React
  frontend-user/      Parcours utilisateur React
  mobile/             App Expo (réseau social)
services/
  backend/            API Django REST
  nutrition-api/      IA nutrition (FastAPI)
  reco-engine/        Recommandations & plans sport (FastAPI)
etl/                  Pipeline, données sources, tests
orchestration/airflow/  DAGs et orchestration ETL
infra/
  monitoring/         Prometheus, Grafana, Loki
  compose/            Overrides multi-environnement
  scripts/            up-full, up-offline, backup, restore, reset
docs/                 Documentation projet & soutenance
docker-compose.yml    Stack principale
.env.example          Variables d'environnement documentées
```

---

## Licence & contexte

Projet académique MSPR (B3 CDA/DIADS — EPSI). Données de démonstration fournies dans `etl/data/`. Ne pas utiliser en production sans durcissement sécurité (secrets, HTTPS, bases managées).
