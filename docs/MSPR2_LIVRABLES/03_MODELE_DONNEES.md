# 03 — Modèle de données

> Section IV du brief — *"Un modèle de données relationnel documenté expliquant les adaptations réalisées sur le modèle existant pour stocker les nouvelles données."* + *"micro-service connecté à une base de données NoSQL"*.

## 1. Vue d'ensemble

Trois bases coexistent, chacune pour un usage précis :

| Base | SGBD | Géré par | Migrations | Contenu |
|---|---|---|---|---|
| `healthai` | PostgreSQL 16 | Django ORM | `python manage.py migrate` | Auth, profil utilisateur, repas mangés, séances d'entraînement, modifications en attente |
| `healthai_plans` | MongoDB 7 | PyMongo (sans schéma) | n/a (NoSQL) | Plans repas IA, programmes d'entraînement IA |
| `mspr_etl.db` | SQLite | Pipeline ETL (Pandas) + BDD.sql | `BDD.sql` (CREATE TABLE IF NOT EXISTS) | Données de référence ETL : food_log, exercise, patient, sante, nutrition |

## 2. Modèle relationnel — PostgreSQL (Django)

### 2.1 Schéma

```
┌─────────────────────────┐
│ auth_user (Django)      │
│ id (PK)                 │
│ username                │
│ email                   │
│ password                │
└──────┬──────────────────┘
       │ 1
       │
       │ 1
┌──────▼──────────────────────────┐
│ user_profile                    │
│ id (PK)                         │
│ user_id (FK → auth_user, unique)│
│ goal                            │
│ experience_level                │
│ dietary_restrictions            │
│ allergies                       │
│ equipment_available             │
│ daily_calorie_target            │
│ age, gender, height_cm,         │
│ weight_kg, target_weight_kg     │
│ created_at, updated_at          │
│ onboarded (bool)                │
└─────────────────────────────────┘

┌─────────────────────────┐         ┌──────────────────────────┐
│ user_meal_entry         │         │ workout_session          │
│ id (PK)                 │         │ id (PK)                  │
│ user_id (FK)            │         │ user_id (FK)             │
│ analyzed_at             │         │ done_at                  │
│ meal_type (choices)     │         │ focus (choices)          │
│ detected_foods (JSON)   │         │ duration_min             │
│ total_calories          │         │ estimated_calories       │
│ total_protein           │         │ exercises_done (JSON)    │
│ total_carbohydrates     │         │ difficulty_rating        │
│ total_fat               │         │ notes                    │
│ image_hash              │         └──────────────────────────┘
└─────────────────────────┘

┌─────────────────────────┐
│ pending_change          │
│ id (PK)                 │
│ table_name              │
│ record_id               │
│ operation               │
│ changes (JSON)          │
│ status                  │
│ requested_by (FK)       │
│ reviewed_by (FK)        │
│ reviewed_at             │
│ review_comment          │
└─────────────────────────┘
```

### 2.2 Tables — adaptations MSPR2

Les tables suivantes sont **ajoutées par MSPR2** sur le modèle MSPR1 :

#### `user_profile` (Django-managed)

Profil étendu avec biométrie et préférences pour calcul des recommandations
nutritionnelles personnalisées.

```python
class UserProfile(models.Model):
    user = OneToOneField(AUTH_USER_MODEL)
    goal = CharField(choices=...)                # weight_loss, muscle_gain, ...
    experience_level = CharField                 # beginner / intermediate / advanced
    dietary_restrictions = CharField              # none, vegetarian, vegan, ...
    allergies = TextField                         # "arachides, fruits de mer"
    equipment_available = TextField               # "haltères, tapis"
    daily_calorie_target = PositiveIntegerField   # cible kcal/jour (ou null = calculé via Mifflin-St Jeor)
    age = PositiveIntegerField
    gender = CharField                            # M / F / O
    height_cm = PositiveSmallIntegerField
    weight_kg = DecimalField
    target_weight_kg = DecimalField
    bmi = computed property (poids / taille²)
    created_at, updated_at, onboarded
```

#### `user_meal_entry` (Django-managed)

Tracking des repas consommés.

```python
class MealEntry(models.Model):
    user = ForeignKey(AUTH_USER_MODEL)
    analyzed_at = DateTimeField(auto_now_add=True)
    meal_type = CharField(choices=Breakfast/Lunch/Dinner/Snack, nullable)
    detected_foods = JSONField(default=list)      # [{label, source, macros, ...}]
    total_calories = FloatField
    total_protein, total_carbohydrates, total_fat = FloatField
    image_hash = CharField(max_length=64)         # SHA-256 pour dédup
```

#### `workout_session` (Django-managed)

Tracking des séances d'entraînement effectuées.

```python
class WorkoutSession(models.Model):
    user = ForeignKey(AUTH_USER_MODEL)
    done_at = DateTimeField(auto_now_add=True)
    focus = CharField(choices=upper/lower/full/cardio/hiit/mobility/other)
    duration_min = PositiveSmallIntegerField
    estimated_calories = PositiveIntegerField(nullable)
    exercises_done = JSONField(default=list)      # [{name, sets, reps, ...}]
    difficulty_rating = PositiveSmallIntegerField(nullable)  # 1-5
    notes = TextField(blank=True)
```

#### `pending_change` (MSPR1, conservée)

Modifications utilisateur en attente d'approbation par un superviseur sur les
tables ETL. Inchangée.

### 2.3 Routing inter-bases

Le `DATABASE_ROUTERS = ['api.db_router.HealthAIRouter']` route :

- Tables `auth_*`, `user_profile`, `user_meal_entry`, `workout_session`,
  `pending_change` → `default` (PostgreSQL)
- Tables `patient`, `sante`, `food_log`, `exercise`, `nutrition`,
  `activite_physique`, `gym_session` → `etl` (SQLite, `managed=False`)

## 3. Modèle NoSQL — MongoDB

### 3.1 Justification du NoSQL

Le brief impose : *"Moteur de recommandation, sous forme de micro-service séparé de l'application principale, connecté à une base de données NoSQL."*

Notre choix : stocker les **plans IA générés** en MongoDB plutôt qu'en
PostgreSQL JSONB, parce que :

- **Schéma variable** : le LLM peut renvoyer de nouveaux champs (`equipment_used`, `intensity`, etc.) sans qu'on ait à migrer Postgres
- **Imbrications profondes** : un plan = liste de séances = liste d'exercices = sets/reps/notes — exactement le cas d'usage d'un document
- **Persistance lisible** : un plan stocké tel quel est directement réutilisable dans le frontend sans aplatissement
- **Sépare clairement** "ce que l'IA a proposé" (Mongo) de "ce que l'user a fait" (Postgres `MealEntry` / `WorkoutSession`)

### 3.2 Collections

#### `meal_plans`

```jsonc
{
  "_id": ObjectId("..."),
  "user_id": 5,                              // FK logique → PostgreSQL auth_user.id
  "username": "test@test.com",
  "title": "Plan weight_loss — 1607 kcal",
  "goal": "weight_loss",
  "calorie_target": 1607,
  "created_at": ISODate("2026-06-10T..."),
  "plan": {
    "meals": [
      {
        "meal_type": "Petit-déjeuner",
        "dish_name": "Bol d'avoine au yaourt grec et fruits rouges",
        "description": "...",
        "ingredients": [
          { "item": "Flocons d'avoine", "quantity": "60 g" },
          { "item": "Yaourt grec 0%", "quantity": "200 g" }
        ],
        "estimated_calories": 420,
        "estimated_protein": 28,
        "estimated_carbs": 55,
        "estimated_fat": 12
      }
    ],
    "total_calories": 1850,
    "total_protein": 130,
    "advice": "Ce plan privilégie...",
    "model": "openai/gpt-oss-120b:free"
  }
}
```

#### `workout_plans`

```jsonc
{
  "_id": ObjectId("..."),
  "user_id": 5,
  "username": "test@test.com",
  "title": "Programme muscle_mass — 4 séances/sem",
  "goal": "muscle_mass",
  "level": "intermediate",
  "created_at": ISODate("..."),
  "plan": {
    "weekly_plan": [
      {
        "day_label": "Jour 1 — Push",
        "focus": "Pecs, épaules, triceps",
        "estimated_duration_min": 60,
        "estimated_calories": 380,
        "warm_up": [...],
        "exercises": [
          { "name": "Développé couché", "sets": 4, "reps": "8-10", "rest_seconds": 90 }
        ],
        "cool_down": [...]
      }
    ],
    "progression_tips": "Augmente les charges...",
    "rotation_note": "La semaine prochaine, ...",
    "model": "openai/gpt-oss-120b:free"
  }
}
```

### 3.3 Index

```
db.meal_plans.createIndex({ user_id: 1, created_at: -1 })
db.workout_plans.createIndex({ user_id: 1, created_at: -1 })
```

Tous les accès se font par utilisateur, triés par date desc.

### 3.4 Référentiel entre Postgres et Mongo

- Les `user_id` dans Mongo réfèrent à `auth_user.id` en Postgres
- Aucune contrainte FK **physique** (impossible entre deux SGBD)
- L'**intégrité** est garantie par le code Django (filtre `user_id=request.user.id` sur chaque requête)
- En cas de suppression d'un user, un job de cleanup MongoDB est à prévoir (TODO post-MSPR2)

## 4. Base SQLite ETL (lecture)

Schéma défini dans `BDD.sql`, alimenté par le pipeline ETL Python/Pandas
(MSPR1). Les tables qui servent à MSPR2 :

- `food_log` — items nutritionnels avec calories/protéines/glucides/lipides
  → utilisé pour la cascade macros (`/macros/lookup`) et le rule-based meal-plan
- `exercise` — catalogue d'exercices avec body_part / target / equipment / level
  → disponible via `GET /api/exercises/` (pour évolution future filtrage côté front)

Détail : voir [`README_SOUTENANCE.md`](../README_SOUTENANCE.md) section "Base de données".

## 5. Récap : où est chaque donnée ?

| Donnée | Base | Pourquoi là |
|---|---|---|
| Compte utilisateur | PostgreSQL | Auth Django, transactionnel |
| Profil biométrique | PostgreSQL | Lookup fréquent, relation 1-1 avec user |
| Repas mangés | PostgreSQL | Agrégats (Sum kcal du jour, GROUP BY date) |
| Séances effectuées | PostgreSQL | Agrégats, FK user |
| **Plans repas IA** | **MongoDB** | Documents flexibles, imbriqués |
| **Plans entraînement IA** | **MongoDB** | Idem |
| Aliments référence | SQLite ETL | Données de référence ETL, lecture seule |
| Exercices référence | SQLite ETL | Idem |
| Patients/santé démographiques | SQLite ETL | Legacy MSPR1, kpis admin |
