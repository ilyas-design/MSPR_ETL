# 01 — Architecture HealthAI Coach (MSPR2)

## Vue d'ensemble

La plateforme se compose de deux frontends, d'une API Django centrale et de
deux microservices IA (FastAPI), chacun avec sa propre base de données.

```
                Utilisateur final
                       │ HTTPS
                       ▼
            frontend-user (React/Vite)
                       │ /api
                       ▼
            Django REST API (port 8000)
       JWT, permissions, cache, rate-limiting
                       │
       ┌───────────┬───────────┬───────────────┐
       ▼           ▼           ▼               ▼
  PostgreSQL    MongoDB    nutrition-api    reco-engine
  (auth,        (meal_     (FastAPI :8001)  (FastAPI :8002)
   profil,       plans,     vision Food-101,  scoring exercices,
   repas,        workout_   USDA, LLM repas   plan d'entraînement
   séances)      plans,                       LLM
                 exercises)
                                  │               │
                                  └──────┬────────┘
                                         ▼
                            APIs externes : Hugging Face,
                            USDA FoodData Central, OpenRouter
                            (gpt-oss-120b)

  SQLite mspr_etl.db (référentiel ETL, lecture)
   └─ food_log, exercise → consultés par nutrition-api
```

MongoDB (`healthai_plans`) est partagée entre Django
(`backend/api/mongo.py`, collection `meal_plans`) et `reco-engine`
(`reco-engine/mongo.py`, collections `exercises` et `workout_plans`). Le
détail des documents est dans [03_MODELE_DONNEES.md](03_MODELE_DONNEES.md).

## Composants

### Frontends

| Composant | Stack | Audience | Port |
|---|---|---|---|
| `frontend/` | React + Vite | Admin / superviseur (MSPR1, inchangé) | 8083 |
| `frontend-user/` | React + Vite, React Router, Axios, Chart.js | Utilisateur final | 81 (prod), 5174 (dev) |

### Backends

| Composant | Stack | Rôle | Port |
|---|---|---|---|
| `backend/` | Django 5.2, DRF, simplejwt, ratelimit | Auth, profils, données utilisateur, proxy vers les deux microservices IA | 8000 |
| `nutrition-api/` | FastAPI, transformers, httpx | Vision (Food-101), macros (food_log + USDA), plans repas, conseils LLM | 8001 |
| `reco-engine/` | FastAPI, PyMongo, httpx | Scoring d'exercices, plans d'entraînement LLM, stockage Mongo | 8002 |

### Bases de données

| Base | Type | Contenu | Pourquoi |
|---|---|---|---|
| PostgreSQL `healthai` | relationnel | `User`, `UserProfile`, `MealEntry`, `WorkoutSession`, `PendingChange` | écritures concurrentes, agrégations (Sum/Count) pour les KPIs |
| MongoDB `healthai_plans` | document | `meal_plans`, `workout_plans`, `exercises` | plans générés par LLM, structure variable selon le contenu, pas de migration nécessaire |
| SQLite `mspr_etl.db` | relationnel léger | `patient`, `sante`, `food_log`, `exercise`, ... | référentiel ETL hérité de MSPR1, lecture seule, alimenté par `Pipelines/pipeline.py` |

## Flux principaux

**Analyse photo d'un repas**
`frontend-user` envoie la photo en multipart à `POST /api/ai/analyze/`.
Django met en cache la réponse (clé `sha256(image)`, 1h) puis appelle
`nutrition-api /analyze`, qui classe l'image avec le modèle Food-101 (HF) et
renvoie les 5 meilleures prédictions. Le frontend demande ensuite les macros
via `/macros/lookup` (cascade `food_log` puis USDA), et l'utilisateur valide
le repas via `POST /api/me/meals/` (stocké dans PostgreSQL).

**Recommandations et coach nutrition**
`GET /api/me/recommendations/today/` calcule le BMR (Mifflin-St Jeor) puis le
TDEE à partir du profil, compare avec les repas du jour et signale les
déséquilibres. `POST /api/me/coach-advice/` enrichit ces données et les
transmet à `nutrition-api /coach-advice`, qui interroge le LLM (OpenRouter
gpt-oss-120b) pour produire un conseil en français.

**Plan de repas généré par IA**
`POST /api/ai/meal-plan-ai/` proxy vers `nutrition-api /meal-plan-ai` : le
service construit un prompt (objectif, calories, allergies, restrictions),
appelle le LLM en mode JSON et renvoie une liste de repas avec ingrédients et
quantités.

**Recommandations et plans d'activité physique**
`POST /api/ai/workout-plan-ai/` : Django récupère les 5 dernières séances de
l'utilisateur (pour la rotation et la progression) et proxy vers
`reco-engine /workout-plan-ai`, qui génère un plan hebdomadaire via LLM.
`GET /api/me/recommendations/today/` (variante exercices) appelle
`reco-engine /recommend`, un scoring basé sur des règles (équipement,
niveau, blessures, objectif) sur la collection Mongo `exercises`.

**Sauvegarde des plans**
`POST /api/me/meal-plans/` et `POST /api/me/workout-plans/` enregistrent un
plan dans MongoDB (indexé par `user_id` + `created_at`), pour le retrouver
plus tard sans le régénérer.

## Sécurité et résilience

| Mécanisme | Implémentation |
|---|---|
| Authentification | JWT (simple-jwt), refresh côté frontend via intercepteur Axios |
| Rate limiting | `django-ratelimit`, 10-20 requêtes/min/utilisateur sur les endpoints IA |
| Cache IA | `django.core.cache` (filebased), clé `sha256(image)`, TTL 1h |
| Fallback macros | `food_log` (SQLite) en priorité, puis USDA FoodData Central, sinon `null` |
| Gestion des pannes | try/except autour des appels aux microservices → 502/503 explicites avec message d'origine |

## Pourquoi deux microservices séparés

Le brief demande que le moteur de recommandation soit un micro-service à
part, connecté à une base NoSQL. `nutrition-api` et `reco-engine` sont deux
services FastAPI indépendants (Dockerfile, port, dépendances et cache
propres), que Django appelle via `httpx`. Chacun expose son propre OpenAPI
(`/docs` sur 8001 et 8002) et peut être redéployé ou mis à l'échelle sans
toucher à l'autre service ni à Django :

- `reco-engine` est connecté à MongoDB (`exercises`, `workout_plans`) — c'est
  le micro-service "moteur de recommandation" exigé par le brief.
- `nutrition-api` couvre la partie nutrition (vision, USDA, LLM repas) et
  reste en lecture sur SQLite (`food_log`, `exercise`).

## Choix structurants

| Décision | Alternative écartée | Pourquoi |
|---|---|---|
| Deux frontends séparés | Une seule app avec rôles | Audiences trop différentes (admin vs utilisateur final), `frontend/` MSPR1 reste stable |
| Django + microservices FastAPI | Tout en Django | FastAPI plus adapté à l'async (appels LLM) et génère son OpenAPI automatiquement |
| PostgreSQL + MongoDB | Tout en PostgreSQL (JSON) | Le brief exige une base NoSQL ; les plans IA ont une structure imbriquée et évolutive |
| LLM via OpenRouter (gpt-oss-120b) | Ollama local | Évite de télécharger un modèle de plusieurs Go ; modèle interchangeable via une variable d'environnement |
| JWT | Sessions Django | API stateless, plus simple pour un futur client mobile |

## Orchestration Docker

```
app-postgres   Postgres 16        données Django
mongo          Mongo 7            plans IA + exercices
etl            one-shot Python    pipeline ETL
backend        Django + gunicorn  API REST (8000)
nutrition-api  FastAPI            microservice nutrition (8001)
reco-engine    FastAPI            microservice activité (8002)
frontend       nginx              frontend admin (8083)
frontend-user  nginx              frontend utilisateur (81)
airflow-*                          orchestration ETL
```

## Évolutions possibles

- App mobile React Native consommant la même API JWT
- Cache Redis pour les réponses LLM répétées
- Observabilité (Prometheus/Grafana) sur les services FastAPI/Django
- Gating freemium/premium des fonctions IA générative au niveau du proxy Django
