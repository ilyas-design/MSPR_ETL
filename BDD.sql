-- database: :memory:
-- Schéma SQLite de la plateforme HealthAI Coach (source de vérité versionnée).
-- Exécuté idempotemment par `ETLPipeline._ensure_schema` à chaque run.
--
-- Stratégie de chargement (cf. `Pipelines/pipeline.py::load`) :
--   1. `CREATE TABLE IF NOT EXISTS` via ce script => schéma stable, pas de DROP
--   2. `DELETE FROM <table>` en ordre inverse des dépendances FK
--   3. `df.to_sql(..., if_exists="append")` : les contraintes (PK, FK, index)
--      survivent à chaque rechargement.

PRAGMA foreign_keys = ON;

-- =============================================================================
-- Tables métier
-- =============================================================================

CREATE TABLE IF NOT EXISTS patient (
  patient_id TEXT PRIMARY KEY,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL,
  weight_kg REAL NOT NULL,
  height_cm REAL NOT NULL,
  bmi_calculated REAL NOT NULL,
  bmi_category TEXT,
  age_group TEXT
);

CREATE TABLE IF NOT EXISTS sante (
  patient_id TEXT PRIMARY KEY,
  cholesterol REAL,
  blood_pressure INTEGER,
  disease_type TEXT,
  glucose REAL,
  severity TEXT,
  FOREIGN KEY (patient_id) REFERENCES patient(patient_id)
);

CREATE TABLE IF NOT EXISTS nutrition (
  patient_id TEXT PRIMARY KEY,
  daily_caloric_intake INTEGER,
  dietary_restrictions TEXT,
  allergies TEXT,
  preferred_cuisine TEXT,
  diet_recommendation TEXT,
  adherence_to_diet_plan REAL,
  FOREIGN KEY (patient_id) REFERENCES patient(patient_id)
);

CREATE TABLE IF NOT EXISTS activite_physique (
  patient_id TEXT PRIMARY KEY,
  physical_activity_level TEXT,
  weekly_exercice_hours REAL,
  FOREIGN KEY (patient_id) REFERENCES patient(patient_id)
);

CREATE TABLE IF NOT EXISTS gym_session (
  id INTEGER PRIMARY KEY,
  patient_id TEXT NOT NULL,
  gym_session_duration_hours REAL,
  gym_calories_burned INTEGER,
  gym_workout_type TEXT,
  gym_fat_percentage REAL,
  gym_water_intake_liters REAL,
  gym_workout_frequency_days_week INTEGER,
  gym_experience_level INTEGER,
  gym_max_bpm INTEGER,
  gym_avg_bpm INTEGER,
  gym_resting_bpm INTEGER,
  calories_per_hour REAL,
  FOREIGN KEY (patient_id) REFERENCES patient(patient_id)
);

-- Source 3 : journal alimentaire (dataset indépendant, pas de FK patient).
CREATE TABLE IF NOT EXISTS food_log (
  id INTEGER PRIMARY KEY,
  date TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  food_item TEXT NOT NULL,
  category TEXT,
  calories_kcal INTEGER,
  protein_g REAL,
  carbohydrates_g REAL,
  fat_g REAL,
  fiber_g REAL,
  sugars_g REAL,
  sodium_mg REAL,
  cholesterol_mg REAL,
  meal_type TEXT,
  water_intake_ml INTEGER
);

-- Source hétérogène : catalogue d'exercices (JSON).
CREATE TABLE IF NOT EXISTS exercise (
  exercise_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  body_part TEXT,
  target TEXT,
  equipment TEXT,
  level TEXT,
  instructions TEXT
);

-- =============================================================================
-- Métadonnées : historique des exécutions du pipeline ETL
-- =============================================================================

CREATE TABLE IF NOT EXISTS etl_run (
  run_id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL,
  finished_at TEXT NOT NULL,
  duration_seconds REAL NOT NULL,
  status TEXT NOT NULL,            -- SUCCESS | WARNING | ERROR
  tables_loaded TEXT NOT NULL,     -- JSON: {"patient": 1000, ...}
  total_rows INTEGER NOT NULL,
  error_count INTEGER NOT NULL DEFAULT 0,
  warning_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);

-- =============================================================================
-- Index pour les requêtes analytiques (cf. KPIs backend/api/views.py)
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_patient_bmi_category ON patient(bmi_category);
CREATE INDEX IF NOT EXISTS idx_patient_age_group ON patient(age_group);
CREATE INDEX IF NOT EXISTS idx_patient_gender ON patient(gender);
CREATE INDEX IF NOT EXISTS idx_gym_session_patient ON gym_session(patient_id);
CREATE INDEX IF NOT EXISTS idx_gym_session_type ON gym_session(gym_workout_type);
CREATE INDEX IF NOT EXISTS idx_food_log_user_date ON food_log(user_id, date);
CREATE INDEX IF NOT EXISTS idx_food_log_meal_type ON food_log(meal_type);
CREATE INDEX IF NOT EXISTS idx_etl_run_started ON etl_run(started_at);
