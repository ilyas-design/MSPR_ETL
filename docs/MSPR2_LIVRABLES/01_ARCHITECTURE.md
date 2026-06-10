# 01 — Architecture HealthAI Coach (MSPR2)

> Section IV du brief — *Application frontend moderne et responsive, API IA développée, Moteur de recommandation sous forme de micro-service séparé connecté à une base NoSQL.*

## 1. Vue d'ensemble

HealthAI Coach est une plateforme de coaching santé personnalisée par IA. Le
système est découpé en **3 frontaux** et **3 stockages de données**, avec un
microservice IA isolé pour respecter le besoin de scalabilité du brief.

```
                ┌──────────────────────────────────────────────┐
                │             Utilisateur final                │
                └──────────────┬───────────────────────────────┘
                               │ HTTPS
                ┌──────────────▼───────────────┐
                │  frontend-user/ (React/Vite) │
                │  Auth JWT, SPA               │
                └──────────────┬───────────────┘
                               │ /api (proxy Vite → :8000)
                ┌──────────────▼───────────────┐
                │  Django REST API (port 8000) │
                │  - JWT, permissions          │
                │  - Cache, rate-limiting      │
                │  - Proxy vers IA             │
                └─┬────────┬──────────────────┬┘
                  │        │                  │
        ┌─────────▼─┐  ┌───▼────────┐  ┌─────▼────────────┐
        │PostgreSQL │  │ MongoDB    │  │ nutrition-api    │
        │ Auth      │  │ Plans IA   │  │ FastAPI :8001    │
        │ Profil    │  │ flexibles  │  │ - Food-101 (HF)  │
        │ MealEntry │  │            │  │ - USDA cascade   │
        │ Workout-  │  │            │  │ - gpt-oss (OR)   │
        │  Session  │  │            │  │ - meal-plan-ai   │
        │           │  │            │  │ - workout-plan-ai│
        └───────────┘  └────────────┘  └─────────┬────────┘
                                                 │ HTTPS
                                       ┌─────────▼─────────┐
                                       │ APIs externes :   │
                                       │ - Hugging Face    │
                                       │ - USDA FoodData   │
                                       │ - OpenRouter      │
                                       │   (gpt-oss-120b)  │
                                       └───────────────────┘
                                                 ▲
                                       ┌─────────┴─────────┐
                                       │ SQLite ETL        │
                                       │ (mspr_etl.db)     │
                                       │ food_log,         │
                                       │ exercise          │
                                       └───────────────────┘
```

## 2. Découpage des composants

### 2.1 Frontends

| Composant | Stack | Audience | Port |
|---|---|---|---|
| `frontend/` | React (Vite) | Admin / superviseur (legacy MSPR1) | 80 (nginx Docker) |
| `frontend-user/` | React (Vite), React Router, Axios, Chart.js | Utilisateur final (Millennials/GenZ) | 5174 (dev), 80 (prod) |

### 2.2 Backends

| Composant | Stack | Rôle | Port |
|---|---|---|---|
| `backend/` (Django REST) | Django 5.2, DRF, simple-jwt, ratelimit | Auth, profils, MealEntry/WorkoutSession, proxy IA, agrégat NoSQL | 8000 |
| `nutrition-api/` | FastAPI, transformers, httpx | Vision (Food-101), USDA fallback, LLM gpt-oss, génération plans repas + plans entraînement | 8001 |

### 2.3 Bases de données

| Base | Type | Données | Justification |
|---|---|---|---|
| PostgreSQL `healthai` | Relationnel | `User`, `UserProfile`, `MealEntry`, `WorkoutSession`, `PendingChange` | Transactionnel, requêtes agrégées (Sum, Count), intégrité référentielle |
| MongoDB `healthai_plans` | NoSQL document | `meal_plans`, `workout_plans` | Documents IA à schéma flexible (nested sessions/ingredients), évolution rapide sans migration |
| SQLite `mspr_etl.db` | Relationnel léger | `patient`, `sante`, `food_log`, `exercise` (alimentés par ETL) | Données de référence en lecture seule, partagées via volume Docker |

## 3. Flux de données clés

### 3.1 Analyse photo d'un repas (chantier 1)

```
User --photo--> frontend-user
       --multipart POST /api/ai/analyze (proxy)--> Django
       --multipart POST /analyze--> nutrition-api
       --pipeline(HF Food-101 nateraw/food)--> Top-5 prédictions
       --fuzzy match sur food_log SQLite--> macros si dispo
       --return JSON--> Django (cache SHA-256 1h) --> frontend
User coche → POST /nutrition-api/macros/lookup [labels]
       --cascade food_log → USDA FoodData Central (httpx async)--> macros
       --total agrégé--> frontend
User valide → POST /api/me/meals/ --> PostgreSQL MealEntry
```

### 3.2 Recommandations + conseil coach (chantier 1)

```
GET /api/me/recommendations/today/
  --> Django calcule BMR (Mifflin-St Jeor) → TDEE → cible kcal/macros
  --> compare avec MealEntry du jour
  --> détecte déséquilibres
  --> applique règles métier par objectif → suggestions
POST /api/me/coach-advice/
  --> Django enrichit avec profil + totaux du jour
  --> POST nutrition-api/coach-advice
  --> nutrition-api → OpenRouter (gpt-oss-120b:free) avec system prompt FR
  --> conseil texte 2-3 paragraphes
```

### 3.3 Génération de plan repas IA (chantier 1)

```
POST /api/ai/meal-plan-ai/
  --> Django proxy → nutrition-api/meal-plan-ai
  --> Construction prompt structuré (objectif, kcal, allergies, restrictions)
  --> Appel gpt-oss-120b avec JSON mode (max_tokens=3000)
  --> Parse JSON robuste (fallback regex)
  --> Retourne { meals: [{dish_name, ingredients, calories, ...}], advice }
```

### 3.4 Moteur de recommandation activités physiques (chantier 2)

```
POST /api/ai/workout-plan-ai/
  --> Django récupère les 5 dernières WorkoutSession (PostgreSQL)
       → permet rotation + progression adaptative
  --> Django proxy → nutrition-api/workout-plan-ai
  --> Construction prompt multi-critères (objectif, niveau, équipement,
       préférences, limitations, historique récent)
  --> Appel gpt-oss-120b
  --> Retourne plan hebdomadaire structuré (sessions, exercices, sets/reps,
       échauffement, retour au calme, progression_tips)
```

### 3.5 Sauvegarde de plan (NoSQL)

```
POST /api/me/meal-plans/    ou    POST /api/me/workout-plans/
  --> Django reçoit le plan + métadonnées
  --> PyMongo insert dans collection MongoDB
  --> Index user_id + created_at pour requêtes rapides
GET ... renvoie les plans triés desc
```

## 4. Sécurité et résilience

| Mécanisme | Implémentation | Justification brief |
|---|---|---|
| **Authentification** | JWT (django-simple-jwt) avec refresh rotation côté client (intercepteur Axios) | Pas de session, scalable horizontalement |
| **Rate limiting** | `django-ratelimit` sur endpoints IA (10-20 req/min/user) | Brief : "gestion de la charge (rate limiting)" |
| **Cache IA** | `cache_key = ai_analyze_<sha256(image)>`, TTL 1h (filebased cache) | Brief : "mise en cache intelligente" |
| **Fallback USDA** | `food_log` SQLite primaire → USDA si pas trouvé → null | Brief : "mécanismes de fallback pour assurer la continuité" |
| **Gestion pannes** | Try/except → 502 explicite avec `detail` du provider | Brief : "gestion des pannes" |
| **CORS** | Default Django (à durcir en prod) | — |

## 5. Microservice IA — pourquoi séparé ?

Le brief impose : *"Le moteur devra être développé séparément de l'application principale sous forme de micro-service."* Notre choix :

- **`nutrition-api`** est un service FastAPI **autonome** : son propre `Dockerfile`, son propre port, ses propres dépendances (`transformers`, `httpx`), son propre cache mémoire.
- Django **proxy** vers lui via `httpx.post(f'{NUTRITION_API_URL}/...')`. Aucune dépendance Python partagée.
- Le service expose **un OpenAPI propre** à `http://localhost:8001/docs` (auto-généré par FastAPI).
- Il peut être **déployé indépendamment** : scaler horizontalement si la charge vision/LLM augmente, sans toucher Django.
- Il gère **deux moteurs** : nutrition (chantier 1) ET activité physique (chantier 2), tous deux exposés en endpoints distincts.

## 6. Orchestration Docker

`docker-compose.yml` + `docker-compose.override.yml` (local) :

```
services:
  app-postgres   (Postgres 16)         -- Django data
  mongo          (Mongo 7)             -- Plans IA NoSQL
  etl            (one-shot Python)     -- Pipeline data
  backend        (Django + gunicorn)   -- API REST
  nutrition-api  (FastAPI)             -- Microservice IA
  frontend       (nginx + build React) -- frontend admin
  frontend-user  (nginx + build Vite)  -- frontend user
  airflow-*                             -- Orchestration ETL
```

Le `docker-compose.override.yml` (non commit) ajoute MongoDB et expose les
ports utiles en local. Voir la doc d'installation pour démarrage natif.

## 7. Choix structurants — pourquoi pas autrement ?

| Décision | Alternative considérée | Pourquoi notre choix |
|---|---|---|
| **2 frontends séparés** | App unique avec rôles | Audiences trop différentes (admin vs user final), legacy MSPR1 stable |
| **Django + microservice IA** | Tout en Django | FastAPI mieux adapté async + OpenAPI auto + isolation deps (transformers lourd) |
| **PostgreSQL + MongoDB** | Tout en PostgreSQL JSON | Brief exige NoSQL explicite ; documents IA ont schéma variable (sessions imbriquées, champs LLM-driven) |
| **gpt-oss via OpenRouter** | gpt-oss local via Ollama | Pas de download 13 Go ; free tier suffisant pour un projet école ; LLM peut être swappé en changeant `OPENROUTER_MODEL` |
| **JWT côté frontend** | Sessions cookies | API REST stateless, plus simple pour mobile futur |

## 8. Évolutions possibles

- App mobile React Native qui consomme la même API JWT
- Microservice `reco-engine` dédié activité (actuellement inclus dans nutrition-api pour simplicité — séparable trivialement)
- Cache Redis dédié pour les réponses LLM répétées (réduction coût quota)
- Observabilité : Prometheus + Grafana sur les services FastAPI/Django
