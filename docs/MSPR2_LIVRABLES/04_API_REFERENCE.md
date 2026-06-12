# 04 — Référence API (OpenAPI)

> Section IV du brief — *"Documentation d'API à jour, au format OpenAPI, permettant une adoption immédiate par les équipes front-end et partenaires externes."*

## 1. Deux APIs documentées en OpenAPI

| API | URL Swagger UI | URL spec OpenAPI brute |
|---|---|---|
| Django REST (port 8000) | `http://localhost:8000/api/schema/swagger-ui/` | `/api/schema/` |
| nutrition-api (FastAPI, port 8001) | `http://localhost:8001/docs` | `http://localhost:8001/openapi.json` |

Les deux specs sont **auto-générées** (`drf-spectacular` pour Django,
introspection Pydantic pour FastAPI) — elles restent à jour à chaque
modification de code, zéro maintenance.

---

## 2. Django REST — endpoints publics

### 2.1 Authentification

| Méthode | URL | Auth ? | Description |
|---|---|---|---|
| POST | `/api/auth/register/` | ✗ | Crée un User + UserProfile vide |
| POST | `/api/auth/token/` | ✗ | Login → renvoie `{access, refresh}` |
| POST | `/api/auth/token/refresh/` | ✗ | Rafraîchit l'access token |
| GET | `/api/auth/me/` | ✓ | Infos sur l'user courant |

### 2.2 Profil utilisateur

| Méthode | URL | Description |
|---|---|---|
| GET | `/api/me/profile/` | Profil du user courant (avec `bmi` calculé) |
| PATCH | `/api/me/profile/` | Met à jour le profil |

### 2.3 Repas (PostgreSQL `MealEntry`)

| Méthode | URL | Description |
|---|---|---|
| GET | `/api/me/meals/` | Liste paginée des repas de l'user |
| POST | `/api/me/meals/` | Crée un repas (meal_type auto-détecté par heure) |
| GET | `/api/me/meals/today/` | Repas du jour + totaux agrégés |
| GET | `/api/me/meals/summary/?days=14` | Agrégat par jour pour graphiques |
| DELETE | `/api/me/meals/<id>/` | Supprime un repas |

### 2.4 Séances d'entraînement (PostgreSQL `WorkoutSession`)

| Méthode | URL | Description |
|---|---|---|
| GET | `/api/me/workouts/` | Liste des séances effectuées |
| POST | `/api/me/workouts/` | Log une nouvelle séance |
| GET | `/api/me/workouts/today/` | Séances du jour + totaux |
| GET | `/api/me/workouts/summary/?days=14` | Agrégat par jour |
| DELETE | `/api/me/workouts/<id>/` | Supprime une séance |

### 2.5 Plans sauvegardés (MongoDB)

| Méthode | URL | Description |
|---|---|---|
| GET | `/api/me/meal-plans/` | Plans repas IA sauvegardés (Mongo `meal_plans`) |
| POST | `/api/me/meal-plans/` | Sauvegarde un plan |
| DELETE | `/api/me/meal-plans/<plan_id>/` | Supprime un plan (ObjectId) |
| GET | `/api/me/workout-plans/` | Plans d'entraînement IA sauvegardés (Mongo `workout_plans`) |
| POST | `/api/me/workout-plans/` | Sauvegarde un programme |
| DELETE | `/api/me/workout-plans/<plan_id>/` | Supprime un programme |

### 2.6 Recommandations IA — proxy vers nutrition-api

| Méthode | URL | Description |
|---|---|---|
| GET | `/api/me/recommendations/today/` | Cibles + déséquilibres + suggestions règle-based (Django local, ne passe pas par nutrition-api) |
| POST | `/api/me/coach-advice/` | Conseil détaillé personnalisé par gpt-oss (proxy vers nutrition-api) |
| POST | `/api/ai/analyze/` | Analyse photo repas (Food-101) — proxy + cache SHA-256 |
| POST | `/api/ai/meal-plan/` | Plan repas rule-based (proxy) |
| POST | `/api/ai/meal-plan-ai/` | Plan repas généré par gpt-oss (proxy) |
| POST | `/api/ai/workout-plan-ai/` | Plan entraînement généré par gpt-oss avec historique de l'user (proxy) |

### 2.7 Données ETL (lecture)

| Méthode | URL | Description |
|---|---|---|
| GET | `/api/food-logs/` | Catalogue d'aliments avec macros |
| GET | `/api/exercises/?search=...&body_part=...` | Catalogue d'exercices |
| GET | `/api/patients/` | Patients (legacy MSPR1) |
| GET | `/api/sante/`, `/api/nutrition/`, `/api/activite-physique/`, `/api/gym-sessions/` | Données ETL |
| GET | `/api/kpis/`, `/api/engagement/`, `/api/conversion/`, `/api/satisfaction/`, `/api/data-quality/` | KPIs admin |

### 2.8 Workflow d'approbation (admin)

| Méthode | URL | Description |
|---|---|---|
| GET | `/api/pending-changes/` | Liste des modifications en attente |
| POST | `/api/pending-changes/<id>/approve/` | Approuve (superviseur) |
| POST | `/api/pending-changes/<id>/reject/` | Rejette (superviseur) |

---

## 3. nutrition-api — endpoints microservice

### 3.1 Health

| Méthode | URL | Description |
|---|---|---|
| GET | `/health` | Sonde Docker (`{"status":"ok"}`) |

### 3.2 Données

| Méthode | URL | Description |
|---|---|---|
| GET | `/foods` | Catalogue d'aliments depuis SQLite ETL |
| GET | `/exercises` | Catalogue d'exercices depuis SQLite ETL |

### 3.3 IA

| Méthode | URL | Description |
|---|---|---|
| POST | `/analyze` | multipart image → Top-5 prédictions Food-101 + fuzzy match `food_log` |
| POST | `/macros/lookup` | `{labels: [...]}` → cascade food_log → USDA → null |
| POST | `/meal-plan` | Plan rule-based (composition logique + whitelist FR) |
| POST | `/meal-plan-ai` | Plan IA via gpt-oss (JSON structuré) |
| POST | `/workout-plan-ai` | Plan d'entraînement IA via gpt-oss (multi-critères) |
| POST | `/coach-advice` | Conseil texte personnalisé via gpt-oss |

### 3.4 Schémas Pydantic principaux

Exemple complet pour `/coach-advice` :

**Request `CoachAdviceRequest`** :
```json
{
  "goal": "weight_loss",
  "totals_today": {
    "calories": 553,
    "protein": 16,
    "carbohydrates": 69,
    "fat": 23,
    "meals_count": 1
  },
  "targets": {
    "calories": 2160,
    "protein": 189,
    "carbohydrates": 189,
    "fat": 72
  },
  "imbalances": [
    {"nutrient": "protein", "eaten": 16, "target": 189, "percentage": 8.5, "status": "deficit"}
  ],
  "allergies": [],
  "restrictions": []
}
```

**Response `CoachAdviceResponse`** :
```json
{
  "advice": "Pour combler rapidement le manque de protéines...",
  "model": "openai/gpt-oss-120b:free"
}
```

L'intégralité des schémas Pydantic est documentée à `http://localhost:8001/docs`.

---

## 4. Sécurité

| Endpoint | Auth requise | Rate limit |
|---|---|---|
| `/api/auth/*` | Non | 20 POST/min/IP |
| `/api/me/*` | JWT obligatoire | — |
| `/api/ai/analyze/` | JWT + ratelimit | 10 req/min/user |
| `/api/ai/meal-plan*/`, `/coach-advice/` | JWT + ratelimit | 20 req/min/user |
| `/api/ai/workout-plan-ai/` | JWT + ratelimit | 10 req/min/user |

JWT signé HS256, durée access 5 min, refresh 1 jour (rotation côté client).

---

## 5. Format des erreurs

Format commun à toute l'API :

```json
{ "detail": "Message d'erreur lisible." }
```

Codes HTTP renvoyés :

| Code | Cas |
|---|---|
| 200 / 201 | OK / Created |
| 204 | Suppression OK |
| 400 | Payload invalide |
| 401 | Token absent / invalide / expiré |
| 403 | Permission refusée |
| 404 | Ressource introuvable |
| 429 | Rate-limit dépassé |
| 502 | Service IA indisponible (nutrition-api / OpenRouter / USDA) |
| 503 | Base de données indisponible (Mongo / Postgres) |

---

## 6. Consulter la doc en live

```bash
# Avec la stack lancée (run.sh)
open http://localhost:8000/api/schema/swagger-ui/    # Django
open http://localhost:8001/docs                      # FastAPI
```

Les deux UI permettent **d'envoyer des requêtes de test** directement depuis le navigateur (formulaire intégré).
