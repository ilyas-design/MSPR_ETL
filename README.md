# HealthAI Coach — MSPR 2

Plateforme de santé connectée avec pipeline ETL, API REST Django, reconnaissance d'image IA (HuggingFace) et interface React. Orchestrée par Apache Airflow et packagée avec Docker Compose.

## Architecture

```
Internet
   │
   ▼ :80
frontend (nginx)          ← React/Vite buildé, sert les fichiers statiques
   │ proxifie /api/*
   ▼
backend (Django + gunicorn)
   │                  │
   ▼                  ▼
app-postgres       SQLite (/data/mspr_etl.db)
(PostgreSQL 16)    (données ETL — patients, nutrition, sport)
comptes, profils,
repas analysés
   │
   ▼ httpx interne
nutrition-api (FastAPI + HuggingFace)   ← jamais exposé sur internet
   │
   └── lit SQLite pour les macros
```

### Services Docker

| Service | Port | Rôle |
|---|---|---|
| `frontend` | 80 | nginx — app admin MSPR1 + proxy `/api` |
| `frontend-user` | 81 | nginx — app utilisateur MSPR2 + proxy `/api` |
| `backend` | interne 8000 | Django REST API + JWT + proxy IA |
| `app-postgres` | interne 5432 | PostgreSQL — comptes utilisateurs, profils, repas |
| `mongo` | interne 27017 | MongoDB — plans repas / entraînement sauvegardés (IA) |
| `nutrition-api` | interne 8001 | FastAPI — reconnaissance d'image IA + plans repas |
| `etl` | — | One-shot Python/Pandas — génère `mspr_etl.db` depuis les CSV/JSON |
| `airflow-apiserver` | 8080 | Interface Airflow (UI) |
| `airflow-scheduler` | interne | Planificateur — relance l'ETL quotidiennement à 02h00 |
| `airflow-postgres` | interne 5432 | PostgreSQL — état interne Airflow uniquement |

### Deux bases de données

| Base | Technologie | Contenu | Géré par |
|---|---|---|---|
| ETL | SQLite (`/data/mspr_etl.db`) | `patient`, `sante`, `nutrition`, `activite_physique`, `gym_session`, `food_log`, `exercise` | Pipeline ETL + Airflow |
| App | PostgreSQL (`app-postgres`) | `auth_user`, `UserProfile`, `MealEntry`, `PendingChange` | Django migrations |

Le routeur Django (`api/db_router.py`) choisit automatiquement la bonne base : `managed=False` → SQLite, `managed=True` → PostgreSQL.

### Ce que génère l'ETL

| Table SQLite | Source CSV/JSON |
|---|---|
| `patient` | `diet_recommendations.csv` |
| `sante` | `diet_recommendations.csv` |
| `nutrition` | `diet_recommendations.csv` |
| `activite_physique` | `diet_recommendations.csv` |
| `gym_session` | `gym_members_exercise.csv` |
| `food_log` | `daily_food_nutrition.csv` |
| `exercise` | `exercises.json` |

---

## Lancer avec Docker (recommandé)

Prérequis : [Docker Desktop](https://www.docker.com/products/docker-desktop/)

```bash
docker compose up --build
```

- App admin (MSPR1) : **http://localhost**
- App utilisateur (MSPR2) : **http://localhost:81**
- Airflow UI : **http://localhost:8080** (login : `airflow` / `airflow`)

L'ordre de démarrage est géré automatiquement : ETL → app-postgres + mongo + nutrition-api → backend → frontend + frontend-user.

Pour relancer sans reconstruire :

```bash
docker compose up
```

---

## Lancer sans Docker

### Prérequis

- Python 3.12+
- Node.js 22+
- PostgreSQL 16 (pour le backend)

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

### 2. ETL — générer la base SQLite

```bash
pip install -r requirements.txt
python run_pipeline.py
# → génère mspr_etl.db à la racine
```

Options :
```bash
python run_pipeline.py --db-path custom.db  # chemin personnalisé
python run_pipeline.py --no-validate        # désactiver la validation
python run_pipeline.py --no-report          # désactiver le rapport
```

### 3. Backend — API Django

```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
# → http://localhost:8000
# Swagger : http://localhost:8000/api/schema/swagger-ui/
```

### 4. nutrition-api — microservice IA

```bash
cd nutrition-api
pip install --extra-index-url https://download.pytorch.org/whl/cpu -r requirements.txt
NUTRITION_API_DB_PATH=../mspr_etl.db uvicorn app:app --port 8001
# → http://localhost:8001
```

### 5. Frontend — React

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173 (proxy /api → localhost:8000)
```

---

## API — endpoints principaux

### Authentification

```
POST /api/auth/register/      Créer un compte + profil
POST /api/auth/token/         Obtenir un token JWT
POST /api/auth/token/refresh/ Rafraîchir le token
GET  /api/auth/me/            Utilisateur connecté
```

### Profil utilisateur

```
GET   /api/me/profile/  Lire son profil
PATCH /api/me/profile/  Modifier objectif, allergies, équipement...
```

### Données ETL (lecture seule)

```
GET /api/food-logs/    Données nutritionnelles journalières
GET /api/exercises/    Catalogue d'exercices
GET /api/patients/     Données patients
GET /api/nutrition/    Données nutrition
```

### IA — reconnaissance d'image

```
POST /api/ai/analyze/    Image → aliments détectés + calories + macros
POST /api/ai/meal-plan/  Paramètres → plan repas personnalisé
GET  /api/me/meals/      Historique des analyses (stocké en base)
```

---

## Tester la reconnaissance d'image

```bash
# 1. Créer un compte
curl -X POST http://localhost/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test1234","goal":"weight_loss"}'

# 2. Obtenir un token JWT
curl -X POST http://localhost/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test1234"}'

# 3. Analyser une photo de nourriture
curl -X POST http://localhost/api/ai/analyze/ \
  -H "Authorization: Bearer <access_token>" \
  -F "file=@pizza.jpg"

# 4. Générer un plan repas
curl -X POST http://localhost/api/ai/meal-plan/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"goal":"weight_loss","calorie_target":1800,"meals_per_day":3}'

# 5. Voir l'historique des repas analysés
curl http://localhost/api/me/meals/ \
  -H "Authorization: Bearer <access_token>"
```

---

## Variables d'environnement

| Variable | Défaut | Description |
|---|---|---|
| `SECRET_KEY` | valeur de dev | Clé secrète Django |
| `DEBUG` | `False` | Mode debug Django |
| `DB_PATH` | `/data/mspr_etl.db` | Chemin SQLite ETL |
| `POSTGRES_HOST` | `app-postgres` | Hôte PostgreSQL app |
| `POSTGRES_DB` | `healthai` | Nom de la base app |
| `POSTGRES_USER` | `healthai` | Utilisateur PostgreSQL |
| `POSTGRES_PASSWORD` | `healthai` | Mot de passe PostgreSQL |
| `NUTRITION_API_URL` | `http://nutrition-api:8001` | URL interne du microservice IA |

---

## Tests

```bash
# Tests ETL
python -m unittest discover -s tests -v

# Tests backend Django
cd backend
python manage.py test -v 2

# Couverture complète
./run_coverage.sh
./run_coverage.sh --html  # → htmlcov/
```
