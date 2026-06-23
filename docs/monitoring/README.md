# Monitoring HealthAI Coach (TPRE601)

Stack locale Prometheus + Grafana + Loki, activée via le profile Compose `monitoring`.

## Lancement

```bash
docker compose --profile monitoring up -d --build
```

| Service | URL | Identifiants |
|---------|-----|--------------|
| Grafana | http://localhost:3000 | admin / admin |
| Prometheus | http://localhost:9090 | — |
| Alertmanager | http://localhost:9093 | — |
| Loki | http://localhost:3100 | — |

## Métriques collectées

| Job Prometheus | Source | Exemples |
|----------------|--------|----------|
| `django-backend` | `/metrics` (django-prometheus) | `django_http_requests_total`, latence DB |
| `cadvisor` | conteneurs Docker | CPU, mémoire par conteneur |
| `node-exporter` | hôte (conteneur) | CPU, disque, mémoire |
| `postgres-app` | postgres-exporter | connexions, taille BDD `healthai` |
| `postgres-airflow` | postgres-exporter | métriques BDD Airflow |
| `prometheus` | auto-scrape | santé du collecteur |

## Logs (Loki)

Promtail collecte les logs Docker du projet `mspr_etl` (label `service` = nom du service Compose).

Requête Grafana Explore : `{service="backend"}`

## Alertes

Règles dans `infra/monitoring/prometheus/alerts.yml` :

- `BackendDown` — cible Django absente 1 min
- `PostgresExporterDown` — exporter app indisponible 2 min

## Vérification automatisée

```bash
bash infra/monitoring/scripts/verify-prometheus.sh
bash infra/monitoring/scripts/verify-grafana.sh
bash infra/monitoring/scripts/verify-loki.sh
bash infra/monitoring/scripts/verify-environments.sh
bash infra/monitoring/scripts/verify-backup.sh
bash infra/monitoring/scripts/verify-restore.sh
```
