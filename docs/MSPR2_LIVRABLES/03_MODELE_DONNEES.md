# 03 — Modèle de données (relationnel + NoSQL)

HealthAI Coach utilise trois stockages : un référentiel ETL en lecture
(SQLite), une base applicative relationnelle (PostgreSQL) et une base
documentaire (MongoDB) pour les contenus générés par IA.

```
SQLite mspr_etl.db          PostgreSQL healthai        MongoDB healthai_plans
(référentiel ETL, lecture)  (applicatif, écriture)     (documents IA)

patient, sante,             auth_user (Django)         meal_plans
nutrition,                  user_profile                workout_plans
activite_physique,          mealentry                   exercises
gym_session, food_log,      workoutsession
exercise, etl_run           pendingchange

alimenté par                géré par Django ORM         géré par PyMongo
Pipelines/pipeline.py       (managed=True)              (reco-engine + backend/api/mongo.py)
modèles managed=False
```

## Modèle relationnel ETL (SQLite, hérité MSPR1)

Schéma inchangé depuis MSPR1. `BDD.sql` reste la source de vérité (tables
créées en `CREATE TABLE IF NOT EXISTS`), et les modèles Django correspondants
restent `managed = False`.

```
patient (PK patient_id)
 ├─1:1── sante
 ├─1:1── nutrition
 ├─1:1── activite_physique
 └─1:N── gym_session

food_log   (indépendant, pas de FK patient — dataset distinct)
exercise   (catalogue indépendant)
etl_run    (métadonnées d'exécution du pipeline)
```

| Table | Clé | Contenu | Rôle |
|---|---|---|---|
| `patient` | `patient_id` | âge, sexe, poids, taille, IMC | référentiel démographique |
| `sante` | `patient_id` | cholestérol, tension, glycémie, pathologie | indicateurs santé |
| `nutrition` | `patient_id` | apport calorique, allergies, régime, adhérence | profil nutritionnel |
| `activite_physique` | `patient_id` | niveau d'activité, heures d'exercice/semaine | activité référentielle |
| `gym_session` | `id`, FK `patient_id` | durée, calories, type de séance, fréquence cardiaque | historique de séances (dataset ETL) |
| `food_log` | `id` | aliment, catégorie, calories, macros, repas | journal alimentaire, sert de référentiel macros à `nutrition-api` |
| `exercise` | `exercise_id` | nom, partie du corps, équipement, niveau, instructions | catalogue d'exercices, repris par `nutrition-api` et seedé dans MongoDB pour `reco-engine` |
| `etl_run` | `run_id` | dates, durée, statut, lignes chargées | historique des exécutions du pipeline |

Ces tables alimentent le pipeline ETL et les KPIs de l'app admin
(`/api/kpis/`, `/api/engagement/`, ...). MSPR2 n'a pas eu besoin de les
modifier : les nouveaux besoins (profil utilisateur, séances, repas
analysés) sont portés par de nouvelles tables PostgreSQL plutôt que par une
extension du schéma ETL.

## Modèle relationnel applicatif (PostgreSQL, nouveau MSPR2)

Nouvelles tables `managed = True`, gérées par les migrations Django
classiques (`makemigrations` / `migrate`), avec `auth_user` fourni par
Django.

```
auth_user
 ├─1:1── user_profile
 ├─1:N── mealentry
 ├─1:N── workoutsession
 └─1:N── pendingchange
```

### `user_profile` (UserProfile)

Profil santé/objectifs capturé lors de l'onboarding.

| Champ | Type | Détail |
|---|---|---|
| `user` | OneToOne → auth_user | |
| `goal` | choix | `weight_loss`, `muscle_gain`, `endurance`, `general_health` |
| `experience_level` | choix | `beginner`, `intermediate`, `advanced` |
| `dietary_restrictions` | choix | `none`, `vegetarian`, `vegan`, `gluten_free`, `lactose_free` |
| `allergies`, `equipment_available` | texte | listes séparées par virgules, utilisées par `reco-engine` |
| `injuries` | JSON, défaut `[]` | limitations, bloque des exercices côté `reco-engine` |
| `meal_budget`, `daily_calorie_target` | entiers, optionnels | budget repas hebdo, cible calorique |
| `age`, `gender`, `height_cm`, `weight_kg`, `target_weight_kg` | données morphologiques | utilisées pour le calcul BMR/TDEE |
| `onboarded` | booléen | passe à `True` après le flow `/onboarding` |
| `bmi` | propriété calculée | `weight_kg / (height_cm/100)²` |

### `mealentry` (MealEntry)

Une ligne par analyse photo validée par l'utilisateur.

| Champ | Type | Détail |
|---|---|---|
| `user` | FK → auth_user | |
| `analyzed_at` | datetime, auto | tri `-analyzed_at` |
| `meal_type` | choix, optionnel | `breakfast`, `lunch`, `dinner`, `snack` |
| `detected_foods` | JSON, défaut `[]` | `[{label, source, matched_name, macros}]` |
| `total_calories`, `total_protein`, `total_carbohydrates`, `total_fat` | float, optionnels | totaux agrégés pour le dashboard |
| `image_hash` | char(64), optionnel | déduplication / clé de cache partagée avec le cache IA |

### `workoutsession` (WorkoutSession)

Une ligne par séance réalisée, utilisée pour le suivi et pour la rotation /
progression du moteur de recommandation.

| Champ | Type | Détail |
|---|---|---|
| `user` | FK → auth_user | |
| `done_at` | datetime, auto | tri `-done_at` |
| `focus` | choix, défaut `other` | `upper`, `lower`, `full`, `cardio`, `hiit`, `mobility`, `other` |
| `duration_min` | entier, défaut 30 | |
| `estimated_calories` | entier, optionnel | |
| `exercises_done` | JSON, défaut `[]` | détail libre des exercices réalisés |
| `difficulty_rating` | entier 1-5, optionnel | ressenti, sert à ajuster la difficulté future |
| `notes` | texte | |

Les 5 dernières `WorkoutSession` d'un utilisateur sont envoyées à
`reco-engine` pour la pénalité de rotation des exercices.

### `pendingchange` (PendingChange, hérité MSPR1)

Inchangé : workflow d'approbation pour les modifications des tables ETL
(`managed=False`) par des utilisateurs non-superviseurs.

| Champ | Type | Détail |
|---|---|---|
| `table_name`, `record_id` | char | table + clé visée |
| `operation` | choix | `update` / `delete` |
| `changes` | JSON, défaut `{}` | modification proposée |
| `status` | choix, défaut `pending` | `pending` / `approved` / `rejected` |
| `requested_by` / `requested_at` | FK User / datetime | demandeur |
| `reviewed_by` / `reviewed_at` / `review_comment` | FK User / datetime / texte | décision du superviseur |

## Modèle NoSQL (MongoDB `healthai_plans`)

Trois collections, accédées depuis deux endroits :

- `backend/api/mongo.py` (Django) → `meal_plans`
- `reco-engine/mongo.py` (FastAPI) → `exercises` et `workout_plans`

### `meal_plans`

Plans de repas générés par `nutrition-api` (`/meal-plan-ai`) et sauvegardés
via `POST /api/me/meal-plans/`.

```json
{
  "_id": "...",
  "user_id": 42,
  "username": "sarah",
  "title": "Plan perte de poids - semaine 1",
  "goal": "weight_loss",
  "calorie_target": 1800,
  "plan": {
    "meals": [
      {
        "meal_type": "Petit-déjeuner",
        "dish_name": "Bowl avoine-yaourt-fruits rouges",
        "ingredients": [{"item": "Flocons d'avoine", "quantity": "60 g"}],
        "estimated_calories": 420,
        "estimated_protein": 28
      }
    ],
    "total_calories": 1800,
    "advice": "..."
  },
  "created_at": "2026-06-11T10:00:00Z"
}
```

Index : `(user_id: 1, created_at: -1)`.

### `exercises` (reco-engine)

Catalogue d'exercices seedé depuis la table ETL `exercise`, interrogé par
`scoring.score_exercises()`.

```json
{
  "_id": "...",
  "exercise_id": 1204,
  "name": "Barbell Bench Press",
  "body_part": "chest",
  "target": "pectorals",
  "equipment": "barbell",
  "level": "intermediate",
  "instructions": "..."
}
```

Index : unique sur `exercise_id`, composé sur `(level, equipment)` pour le
filtrage.

### `workout_plans` (reco-engine)

Plans d'entraînement générés par `/workout-plan-ai` et sauvegardés via
`POST /api/me/workout-plans/`.

```json
{
  "_id": "...",
  "user_id": 42,
  "username": "sarah",
  "title": "Plan d'entraînement IA",
  "goal": "muscle_gain",
  "level": "intermediate",
  "plan": {
    "weekly_plan": [
      {
        "day_label": "Lundi",
        "focus": "upper",
        "exercises": [
          {"name": "Développé couché", "sets": 4, "reps": "8-10", "rest_seconds": 90}
        ]
      }
    ],
    "progression_tips": "...",
    "rotation_note": "Basé sur les 5 dernières séances."
  },
  "created_at": "2026-06-11T10:00:00Z"
}
```

Index : `(user_id: 1, created_at: -1)`.

## Différences avec MSPR1

| Aspect | MSPR1 | MSPR2 |
|---|---|---|
| Schéma | 7 tables ETL + `etl_run`, `managed=False`, alimentées par batch | + 3 tables applicatives `managed=True` (`UserProfile`, `MealEntry`, `WorkoutSession`) en écriture temps réel |
| Identité utilisateur | aucune (uniquement `patient_id` du dataset) | `auth_user` Django + JWT, profils liés 1:1 |
| Stockage | SQLite unique | SQLite (référentiel) + PostgreSQL (applicatif) + MongoDB (plans IA) |
| Migrations Django | aucune | `makemigrations api` / `migrate` pour les 3 nouvelles tables, tables ETL inchangées |

Convention rappelée dans [CLAUDE.md](../../CLAUDE.md) : toute évolution des 7
tables ETL passe par `BDD.sql` + transformer, jamais par une migration
Django. Les 3 nouvelles tables MSPR2 suivent le cycle de migration Django
standard.
