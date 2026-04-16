-- database: :memory:
-- Schéma SQLite aligné sur l'ETL (`run_pipeline.py` -> `Pipelines/ETLPipeline`)
-- NB: les tables ETL sont recréées via `to_sql(if_exists="replace")` par défaut.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS patient (
  patient_id TEXT PRIMARY KEY,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL,
  weight_kg REAL NOT NULL,
  height_cm REAL NOT NULL,
  bmi_calculated REAL NOT NULL
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

-- Source 3: journal alimentaire (dataset indépendant)
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

-- Source hétérogène: catalogue d'exercices (JSON)
CREATE TABLE IF NOT EXISTS exercise (
  exercise_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  body_part TEXT,
  target TEXT,
  equipment TEXT,
  level TEXT,
  instructions TEXT
);
