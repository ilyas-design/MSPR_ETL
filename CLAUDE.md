# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**HealthAI Coach (MSPT ETL 2)** — academic MSPR project. Three-tier stack: a Python/Pandas ETL pipeline that turns heterogeneous CSV/JSON health datasets into a normalized SQLite DB, a Django REST API (JWT) that exposes the DB, and a React/Vite frontend. Orchestrated by Apache Airflow and packaged with Docker Compose.

`README_SOUTENANCE.md` is the canonical reference for architecture, design decisions, and the oral defense narrative — read it before making non-trivial changes.

## Commands

### Run the full stack

```bash
# Docker (recommended) — runs ETL → backend → frontend + Airflow stack
docker compose up --build      # frontend: http://localhost, Airflow: http://localhost:8080

# Native — ETL then backend (bg) then frontend (fg)
./run.sh                       # supports --skip-pipeline / --skip-backend / --skip-frontend / --skip-install
```

### ETL pipeline

```bash
python run_pipeline.py                       # generates mspr_etl.db at repo root + reports/etl_report_*.json
python run_pipeline.py --db-path custom.db --no-validate --no-report
python run_monitoring.py                     # produces etl_monitoring_latest.json from the latest report
```

### Backend (Django)

```bash
cd backend
python manage.py migrate                     # only creates Django-internal tables (auth, etc.) — business tables come from BDD.sql via ETL
python manage.py runserver                   # http://localhost:8000, Swagger at /api/schema/swagger-ui/
python manage.py test -v 2                   # all backend tests
python manage.py test api.tests.SomeTestCase # single test class/method
```

### Frontend (React/Vite)

```bash
cd frontend
npm install
npm run dev                                  # http://localhost:5173, proxies /api → :8000
npm run build
npm run lint
```

### Tests & coverage

```bash
python -m unittest discover -s tests -v      # ETL unit tests only
python -m unittest tests.test_etl_pipeline   # single module
./run_coverage.sh                            # ETL + Django tests under coverage
./run_coverage.sh --html                     # also writes htmlcov/
```

## Architecture

### Data flow

```
CSV/JSON sources → Pipelines/pipeline.py → SQLite (mspr_etl.db) → Django REST API → React frontend
                                       ↘ reports/etl_report_*.json
```

The ETL is orchestrated by `Pipelines/pipeline.py` (`ETLPipeline.run`) and follows: `extract → clean → transform → reconcile FKs → validate → load → metrics → report`. Airflow's `mspr_daily_etl` DAG (`airflow/dags/mspr_daily_etl.py`) runs each step as a separate task via `airflow/run_etl_step.py`, scheduled daily at 02:00 Europe/Paris.

### Schema is owned by the ETL, not Django

`BDD.sql` is the source of truth for the 7 business tables (`patient`, `sante`, `nutrition`, `activite_physique`, `gym_session`, `food_log`, `exercise`) plus `etl_run`. The ETL applies it with `CREATE TABLE IF NOT EXISTS`, then truncates in FK-reverse order and reloads via Pandas.

Consequently, **Django models in `backend/api/models.py` are `managed = False`** — `python manage.py migrate` only handles Django-internal tables (auth, sessions). Never add Django migrations for the business tables; change `BDD.sql` and the corresponding transformer instead.

### Patient identifier reconciliation

Datasets use inconsistent patient ID formats (e.g. `P001` vs `P00001`). `ETLPipeline._reconcile_foreign_keys()` realigns IDs and drops rows whose `patient_id` has no match in the `patient` table. This step must run **before validation/load**, otherwise FK constraints fail. `food_log` is intentionally NOT linked to `patient` — its `User_ID` comes from an unrelated dataset.

### Backend layout (`backend/api/`)

- `models.py` — unmanaged models mirroring the ETL schema, plus `PendingChange` (Django-managed).
- `views.py` — DRF ViewSets per table + KPI endpoints (`/api/kpis/`, `/api/engagement/`, `/api/conversion/`, `/api/satisfaction/`, `/api/data-quality/`).
- `permissions.py` — supervisor vs. normal user. Non-supervisors editing ETL tables don't write directly; they create a `PendingChange` that a supervisor approves/rejects via `/api/pending-changes/`.
- `pagination.py` — pagination is **disabled on the ETL ViewSets** (see commit `ce1258a`); frontend expects full lists.
- Auth: JWT via `/api/auth/token/`, refresh at `/api/auth/token/refresh/`, current user at `/api/auth/me/`.

### Frontend (`frontend/src/`)

- `services/api.js` centralizes Axios, JWT storage, refresh-token logic, pagination handling, and admin/approval calls. Use it for every API call; don't add ad-hoc fetches.
- Pages map 1:1 to API resources (`Patients`, `Health`, `Nutrition`, `Activity`, `Analytics`, `Admin`, `Dashboard`).
- Vite dev proxy sends `/api` → `http://localhost:8000`; in Docker, nginx serves the build and proxies to the `backend` service.

### Docker topology

`docker-compose.yml` defines two stacks sharing the `sqlite_data` volume (mounted at `/data`):

1. **App**: `etl` (one-shot, must succeed first) → `backend` → `frontend` (nginx on port 80).
2. **Airflow**: `airflow-postgres` (metadata only — *not* business data) + `airflow-init`, `airflow-apiserver` (port 8080), `airflow-scheduler`, `airflow-dag-processor`, `airflow-triggerer`. The repo is bind-mounted at `/opt/airflow/project` so DAG tasks can `import` from `Pipelines/`.

## Conventions

- The business DB path is `/data/mspr_etl.db` inside containers, `./mspr_etl.db` natively. The `DB_PATH` env var controls it.
- Add a new ETL table: update `BDD.sql`, add a transformer in `Pipelines/transformers.py`, register it in `ETLPipeline`, add validators in `Pipelines/rules.py` + `validators.py`, then add an unmanaged Django model + ViewSet + serializer.
- Don't run `makemigrations` for changes to business tables — only for Django-managed models like `PendingChange` or `auth`.
