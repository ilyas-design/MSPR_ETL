# HealthAI Coach — MSPT ETL 2

Plateforme de santé connectée intégrant un pipeline ETL, une API REST Django et un frontend React.

## Architecture

```
MSPT_ETL_2/
├── Pipelines/          # Module ETL (extraction, transformation, chargement)
├── backend/            # API REST Django + JWT
├── frontend/           # SPA React + Vite
├── run_pipeline.py     # Point d'entrée ETL
├── *.csv / *.json      # Données sources
└── docker-compose.yml  # Orchestration Docker
```

### Ce que génère l'ETL

L'ETL lit les fichiers sources et produit :

- **`mspr_etl.db`** — base SQLite avec 7 tables :

| Table | Source |
|---|---|
| `patient` | `diet_recommendations.csv` |
| `sante` | `diet_recommendations.csv` |
| `nutrition` | `diet_recommendations.csv` |
| `activite_physique` | `diet_recommendations.csv` |
| `gym_session` | `gym_members_exercise.csv` |
| `food_log` | `daily_food_nutrition.csv` |
| `exercise` | `exercises.json` |

- **`reports/etl_report_YYYYMMDD_HHMMSS.json`** — rapport d'exécution (validation, métriques, logs)

---

## Lancer avec Docker (recommandé)

Prérequis : [Docker Desktop](https://www.docker.com/products/docker-desktop/)

```bash
docker compose up --build
```

L'application est accessible sur **http://localhost**

L'ordre de démarrage est géré automatiquement : ETL → Backend → Frontend.

Pour relancer sans reconstruire les images :

```bash
docker compose up
```

---

## Lancer sans Docker

### Prérequis

- Python 3.12+
- Node.js 22+

### 1. Environnement virtuel Python

**Linux / macOS / Git Bash :**
```bash
python -m venv .venv
source .venv/bin/activate
```

**Windows PowerShell :**
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

### 2. ETL — générer la base de données

```bash
pip install -r requirements.txt
python run_pipeline.py
# → génère mspr_etl.db à la racine
```

Options disponibles :
```bash
python run_pipeline.py --data-dir .         # dossier des CSV (défaut: .)
python run_pipeline.py --db-path custom.db  # chemin de la base (défaut: mspr_etl.db)
python run_pipeline.py --report-dir reports # dossier des rapports (défaut: reports)
python run_pipeline.py --no-validate        # désactiver la validation
python run_pipeline.py --no-report          # désactiver la génération de rapport
```

### 3. Backend — API Django

```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
# → http://localhost:8000
```

Documentation API (Swagger) : http://localhost:8000/api/schema/swagger-ui/

### 4. Frontend — React

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

Le proxy Vite redirige automatiquement `/api` vers `http://localhost:8000`.

---

## Variables d'environnement

Copier `.env` et adapter si besoin :

| Variable | Défaut | Description |
|---|---|---|
| `SECRET_KEY` | valeur de dev | Clé secrète Django |
| `DEBUG` | `False` | Mode debug Django |
| `DB_PATH` | `/data/mspr_etl.db` | Chemin de la base SQLite (Docker) |
