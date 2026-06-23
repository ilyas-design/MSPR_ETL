# Environnements Docker Compose — TPRE601

Trois configurations reproductibles en local (sans VPS).

## 1. Configuration complète (défaut)

Tous les services : ETL, backend, 2 frontends, IA, Mongo, Postgres, Airflow.

```bash
docker compose up --build -d
```

Monitoring optionnel :

```bash
docker compose --profile monitoring up --build -d
```

| Service | URL |
|---------|-----|
| Frontend admin | http://localhost |
| Frontend user | http://localhost:81 |
| Backend API | http://localhost:8000 |
| Airflow | http://localhost:8080 |
| Grafana | http://localhost:3000 (profile monitoring) |
| Prometheus | http://localhost:9090 (profile monitoring) |

## 2. Configuration offline

Mocks IA (`MOCK_IA=true`), pas d'appels OpenRouter/USDA. Airflow exclu.

```bash
./infra/scripts/up-offline.sh
```

Équivalent manuel :

```bash
docker compose -f docker-compose.yml -f infra/compose/docker-compose.offline.yml up --build -d \
  etl app-postgres mongo nutrition-api reco-engine backend frontend frontend-user
```

## 3. Configuration performance

Stack minimale : ETL + Postgres + backend + frontend user. Ports alternatifs (8100/85) pour ne pas entrer en conflit avec la stack complète.

```bash
./infra/scripts/up-perf.sh
```

Projet Compose isolé (`mspr_perf`) pour volumes et réseau séparés.

## Vérification

```bash
./infra/monitoring/scripts/verify-environments.sh
```
