# 04 — Référence API

HealthAI Coach expose trois APIs HTTP, chacune avec sa documentation OpenAPI
auto-générée. Ce document sert de catalogue ; pour le détail complet des
schémas, voir les interfaces interactives ci-dessous.

| API | Port | Swagger | Redoc | Schéma brut |
|---|---|---|---|---|
| Django REST (`backend/`) | 8000 | `/api/docs/` | `/api/redoc/` | `/api/schema/` |
| `nutrition-api` | 8001 | `/docs` | `/redoc` | `/openapi.json` |
| `reco-engine` | 8002 | `/docs` | `/redoc` | `/openapi.json` |

En Docker, seul le port 8000 (via le proxy nginx du frontend) est exposé
publiquement. `nutrition-api` et `reco-engine` ne sont accessibles que dans
le réseau Docker (`http://nutrition-api:8001`, `http://reco-engine:8002`),
sauf à exposer leurs ports pour le développement.

## Django REST (`backend/`)

Toutes les routes sont préfixées par `/api/`. JWT requis sauf mention
contraire (`Authorization: Bearer <access_token>`).

**Authentification**

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/auth/token/` | Paire de tokens JWT (`access` + `refresh`) |
| POST | `/api/auth/token/refresh/` | Rafraîchit le token d'accès |
| POST | `/api/auth/register/` | Crée `User` + `UserProfile` (public) |
| GET | `/api/auth/me/` | Infos sur l'utilisateur connecté |

**Profil**

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/me/profile/` | Récupère le `UserProfile` |
| PATCH/PUT | `/api/me/profile/` | Met à jour le profil (objectif, niveau, équipement, blessures...) |

**Données ETL** (pagination désactivée, écriture non-superviseur → `PendingChange`)

| Méthode | Route | Modèle |
|---|---|---|
| GET/POST/PUT/PATCH/DELETE | `/api/patients/` | `Patient` |
| GET/... | `/api/sante/` | `Sante` |
| GET/... | `/api/nutrition/` | `Nutrition` |
| GET/... | `/api/activite-physique/` | `ActivitePhysique` |
| GET/... | `/api/gym-sessions/` | `GymSession` |
| GET/... | `/api/food-logs/` | `FoodLog` |
| GET/... | `/api/exercises/` | `Exercise` |
| GET/POST/PATCH/DELETE | `/api/pending-changes/` | `PendingChange` (approbation, superviseur) |

**Données utilisateur**

| Méthode | Route | Modèle |
|---|---|---|
| GET/POST/DELETE | `/api/me/meals/` | `MealEntry` |
| GET/POST/DELETE | `/api/me/workouts/` | `WorkoutSession` |

**Proxy IA — nutrition**

| Méthode | Route | Cible | Notes |
|---|---|---|---|
| POST | `/api/ai/analyze/` | `nutrition-api /analyze` | multipart image, rate-limit 10/min/user, cache 1h |
| POST | `/api/ai/meal-plan/` | `nutrition-api /meal-plan` | plan repas par règles |
| POST | `/api/ai/meal-plan-ai/` | `nutrition-api /meal-plan-ai` | plan repas via LLM (timeout 110s) |
| POST | `/api/me/coach-advice/` | `nutrition-api /coach-advice` | conseil nutritionnel LLM |

**Proxy IA — activité physique**

| Méthode | Route | Cible | Notes |
|---|---|---|---|
| POST | `/api/ai/workout-plan-ai/` | `reco-engine /workout-plan-ai` | plan d'entraînement IA, basé sur les 5 dernières séances (timeout 110s) |

**Plans sauvegardés (MongoDB)**

| Méthode | Route | Notes |
|---|---|---|
| GET, POST | `/api/me/meal-plans/` | liste / sauvegarde (collection `meal_plans`) |
| GET, DELETE | `/api/me/meal-plans/<id>/` | détail / suppression |
| GET, POST | `/api/me/workout-plans/` | liste / sauvegarde (proxy `reco-engine /workout-plans`) |
| GET, DELETE | `/api/me/workout-plans/<id>/` | détail / suppression |

**Recommandations et KPIs**

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/me/recommendations/today/` | BMR → TDEE → cibles, déséquilibres du jour, suggestions |
| GET | `/api/kpis/` | indicateurs généraux |
| GET | `/api/engagement/` | KPIs d'engagement |
| GET | `/api/conversion/` | KPIs de conversion |
| GET | `/api/satisfaction/` | KPIs de satisfaction |
| GET | `/api/data-quality/` | qualité des données ETL |

## `nutrition-api` (port 8001)

| Méthode | Route | Description |
|---|---|---|
| GET | `/health` | healthcheck |
| GET | `/foods` | aliments distincts de `food_log` avec macros moyennes |
| GET | `/exercises` | catalogue complet de la table `exercise` |
| POST | `/analyze` | classification d'image (multipart `file`) via `nateraw/food`, top-5 prédictions + macros |
| POST | `/meal-plan` | plan repas par règles (`goal`, `calorie_target`, `allergies`, `restrictions`, `meals_per_day`) |
| POST | `/macros/lookup` | cascade macros : `food_log` → USDA → `null`, détail + total |
| POST | `/coach-advice` | conseil nutritionnel LLM (OpenRouter), 2-3 paragraphes en français |
| POST | `/meal-plan-ai` | plan repas via LLM (recettes, ingrédients, grammages) |

Exemple :

```bash
curl -X POST http://localhost:8001/analyze -F "file=@meal.jpg"
```

```json
[
  {
    "label": "grilled_salmon",
    "score": 0.8123,
    "matched_food": "Salmon",
    "macros": {"avg_calories": 208.0, "avg_protein": 22.1, "avg_carbohydrates": 0.0, "avg_fat": 13.4}
  }
]
```

## `reco-engine` (port 8002)

| Méthode | Route | Description |
|---|---|---|
| GET | `/health` | healthcheck |
| POST | `/recommend` | scoring multi-critères d'exercices (équipement, niveau, blessures, objectif, rotation), retourne `count` exercices triés |
| POST | `/workout-plan-ai` | plan d'entraînement hebdomadaire via LLM, tient compte de l'historique récent |
| GET | `/workout-plans?user_id=...` | liste les plans sauvegardés d'un utilisateur |
| POST | `/workout-plans` | sauvegarde un plan |
| DELETE | `/workout-plans/{plan_id}` | supprime un plan |

Exemple :

```bash
curl -X POST http://localhost:8002/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "goal": "muscle_gain",
    "experience_level": "intermediate",
    "equipment": ["dumbbell", "barbell"],
    "limitations": ["genou"],
    "count": 8
  }'
```

```json
{
  "recommendations": [
    {
      "exercise_id": 1204,
      "name": "Barbell Bench Press",
      "body_part": "chest",
      "equipment": "barbell",
      "level": "intermediate",
      "score": 75.0,
      "reasons": ["aligné objectif muscle_gain", "niveau adapté"]
    }
  ],
  "criteria_applied": {"goal": "muscle_gain", "experience_level": "intermediate"}
}
```

## Codes d'erreur communs

| Code | Origine | Signification |
|---|---|---|
| 401 | Django | token JWT manquant/expiré → tenter `token/refresh/`, sinon relogin |
| 403 | Django | action interdite (créer un `PendingChange` à la place) |
| 422 | `nutrition-api` | fichier uploadé non décodable comme image |
| 502 | `nutrition-api` / `reco-engine` | provider externe en échec (OpenRouter, USDA) |
| 503 | `nutrition-api` / `reco-engine` | clé `OPENROUTER_API_KEY` non configurée |
