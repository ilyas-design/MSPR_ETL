"""
Règles Métier - Validation des données
======================================
Ce module contient toutes les règles de validation pour l'ETL MSPR.
"""

# ============================================================================
# RÈGLES DE VALIDATION - PATIENT
# ============================================================================

PATIENT_RULES = {
    "age": {
        "min": 18,
        "max": 120,
        "type": "int",
        "nullable": False,
        "description": "L'âge doit être compris entre 18 et 120 ans"
    },
    "gender": {
        "allowed_values": ["Male", "Female"],
        "type": "str",
        "nullable": False,
        "description": "Le genre doit être 'Male' ou 'Female'"
    },
    "weight_kg": {
        "min": 30.0,
        "max": 300.0,
        "type": "float",
        "nullable": False,
        "description": "Le poids doit être compris entre 30 et 300 kg"
    },
    "height_cm": {
        "min": 100.0,
        "max": 250.0,
        "type": "float",
        "nullable": False,
        "description": "La taille doit être comprise entre 100 et 250 cm"
    },
    "bmi_calculated": {
        "min": 10.0,
        "max": 60.0,
        "type": "float",
        "nullable": False,
        "description": "Le BMI doit être compris entre 10 et 60"
    }
}

# ============================================================================
# RÈGLES DE VALIDATION - SANTÉ
# ============================================================================

SANTE_RULES = {
    "cholesterol": {
        "min": 100,
        "max": 400,
        "type": "float",
        "nullable": True,
        "description": "Le cholestérol doit être compris entre 100 et 400 mg/dL"
    },
    "blood_pressure": {
        "min": 60,
        "max": 250,
        "type": "int",
        "nullable": True,
        "description": "La tension artérielle doit être comprise entre 60 et 250 mmHg"
    },
    "disease_type": {
        "allowed_values": ["Obesity", "Diabetes", "Hypertension", "Nan", None, "nan"],
        "type": "str",
        "nullable": True,
        "description": "Type de maladie: Obesity, Diabetes, Hypertension ou Nan"
    },
    "glucose": {
        "min": 50,
        "max": 300,
        "type": "float",
        "nullable": True,
        "description": "Le glucose doit être compris entre 50 et 300 mg/dL"
    },
    "severity": {
        "allowed_values": ["Low", "Mild", "Moderate", "Severe", "High", None, "nan", "Nan"],
        "type": "str",
        "nullable": True,
        "description": "Sévérité: Low, Mild, Moderate, Severe ou High"
    }
}

# ============================================================================
# RÈGLES DE VALIDATION - NUTRITION
# ============================================================================

NUTRITION_RULES = {
    "daily_caloric_intake": {
        "min": 800,
        "max": 5000,
        "type": "int",
        "nullable": False,
        "description": "L'apport calorique journalier doit être entre 800 et 5000 kcal"
    },
    "dietary_restrictions": {
        "allowed_values": ["Low_Sugar", "Low_Sodium", "Low_Fat", "Gluten_Free", "Nan", None],
        "type": "str",
        "nullable": True,
        "description": "Restrictions alimentaires valides"
    },
    "allergies": {
        "allowed_values": ["Peanuts", "Gluten", "Dairy", "Shellfish", "Nan", None],
        "type": "str",
        "nullable": True,
        "description": "Allergies connues"
    },
    "preferred_cuisine": {
        "allowed_values": ["Mexican", "Chinese", "Italian", "Indian", "American", "Mediterranean", None],
        "type": "str",
        "nullable": True,
        "description": "Cuisine préférée"
    },
    "diet_recommendation": {
        "allowed_values": ["Balanced", "Low_Carb", "Low_Sodium", "Low_Fat", "High_Protein", None],
        "type": "str",
        "nullable": True,
        "description": "Recommandation diététique"
    },
    "adherence_to_diet_plan": {
        "min": 0.0,
        "max": 100.0,
        "type": "float",
        "nullable": True,
        "description": "Adhérence au régime entre 0% et 100%"
    }
}

# ============================================================================
# RÈGLES DE VALIDATION - ACTIVITÉ PHYSIQUE
# ============================================================================

ACTIVITE_PHYSIQUE_RULES = {
    "physical_activity_level": {
        "allowed_values": ["Sedentary", "Moderate", "Active", "Very_Active", None],
        "type": "str",
        "nullable": True,
        "description": "Niveau d'activité: Sedentary, Moderate, Active, Very_Active"
    },
    "weekly_exercice_hours": {
        "min": 0.0,
        "max": 40.0,
        "type": "float",
        "nullable": False,
        "description": "Heures d'exercice par semaine entre 0 et 40"
    }
}

# ============================================================================
# RÈGLES DE VALIDATION - GYM SESSION
# ============================================================================

GYM_SESSION_RULES = {
    "gym_session_duration_hours": {
        "min": 0.1,
        "max": 5.0,
        "type": "float",
        "nullable": True,
        "description": "Durée de session entre 0.1 et 5 heures"
    },
    "gym_calories_burned": {
        "min": 50,
        "max": 2000,
        "type": "int",
        "nullable": True,
        "description": "Calories brûlées entre 50 et 2000"
    },
    "gym_workout_type": {
        "allowed_values": ["Cardio", "HIIT", "Strength", "Yoga", "Cycling", None],
        "type": "str",
        "nullable": True,
        "description": "Type d'entraînement"
    },
    "gym_max_bpm": {
        "min": 100,
        "max": 220,
        "type": "int",
        "nullable": True,
        "description": "BPM max entre 100 et 220"
    },
    "gym_avg_bpm": {
        "min": 60,
        "max": 200,
        "type": "int",
        "nullable": True,
        "description": "BPM moyen entre 60 et 200"
    },
    "gym_resting_bpm": {
        "min": 40,
        "max": 100,
        "type": "int",
        "nullable": True,
        "description": "BPM au repos entre 40 et 100"
    },
    "gym_fat_percentage": {
        "min": 5.0,
        "max": 50.0,
        "type": "float",
        "nullable": True,
        "description": "Pourcentage de graisse entre 5% et 50%"
    },
    "gym_water_intake_liters": {
        "min": 0.0,
        "max": 5.0,
        "type": "float",
        "nullable": True,
        "description": "Consommation d'eau entre 0 et 5 litres"
    },
    "gym_workout_frequency_days_week": {
        "min": 1,
        "max": 7,
        "type": "int",
        "nullable": True,
        "description": "Fréquence d'entraînement entre 1 et 7 jours/semaine"
    },
    "gym_experience_level": {
        "allowed_values": [1, 2, 3],  # 1=Débutant, 2=Intermédiaire, 3=Expert
        "type": "int",
        "nullable": True,
        "description": "Niveau d'expérience: 1=Débutant, 2=Intermédiaire, 3=Expert"
    }
}

# ============================================================================
# RÈGLES DE VALIDATION - FOOD LOG (journal alimentaire)
# ============================================================================

FOOD_LOG_RULES = {
    "date": {
        "type": "str",
        "nullable": False,
        "description": "Date (YYYY-MM-DD) du journal alimentaire"
    },
    "user_id": {
        "type": "int",
        "nullable": False,
        "description": "Identifiant utilisateur du dataset food log"
    },
    "food_item": {
        "type": "str",
        "nullable": False,
        "description": "Nom de l'aliment"
    },
    "category": {
        "type": "str",
        "nullable": True,
        "description": "Catégorie de l'aliment"
    },
    "calories_kcal": {
        "min": 0,
        "max": 5000,
        "type": "int",
        "nullable": True,
        "description": "Calories en kcal"
    },
    "protein_g": {
        "min": 0.0,
        "max": 500.0,
        "type": "float",
        "nullable": True,
        "description": "Protéines en grammes"
    },
    "carbohydrates_g": {
        "min": 0.0,
        "max": 1000.0,
        "type": "float",
        "nullable": True,
        "description": "Glucides en grammes"
    },
    "fat_g": {
        "min": 0.0,
        "max": 500.0,
        "type": "float",
        "nullable": True,
        "description": "Lipides en grammes"
    },
    "fiber_g": {
        "min": 0.0,
        "max": 200.0,
        "type": "float",
        "nullable": True,
        "description": "Fibres en grammes"
    },
    "sugars_g": {
        "min": 0.0,
        "max": 500.0,
        "type": "float",
        "nullable": True,
        "description": "Sucres en grammes"
    },
    "sodium_mg": {
        "min": 0.0,
        "max": 10000.0,
        "type": "float",
        "nullable": True,
        "description": "Sodium en mg"
    },
    "cholesterol_mg": {
        "min": 0.0,
        "max": 5000.0,
        "type": "float",
        "nullable": True,
        "description": "Cholestérol en mg"
    },
    "meal_type": {
        "allowed_values": ["Breakfast", "Lunch", "Dinner", "Snack", None],
        "type": "str",
        "nullable": True,
        "description": "Type de repas"
    },
    "water_intake_ml": {
        "min": 0,
        "max": 5000,
        "type": "int",
        "nullable": True,
        "description": "Apport en eau en ml"
    },
}

# ============================================================================
# RÈGLES DE VALIDATION - EXERCISE (catalogue d'exercices)
# ============================================================================

EXERCISE_RULES = {
    "exercise_id": {
        "type": "int",
        "nullable": False,
        "description": "Identifiant de l'exercice"
    },
    "name": {
        "type": "str",
        "nullable": False,
        "description": "Nom de l'exercice"
    },
    "body_part": {
        "type": "str",
        "nullable": True,
        "description": "Partie du corps (ex: chest, legs)"
    },
    "target": {
        "type": "str",
        "nullable": True,
        "description": "Muscle ciblé"
    },
    "equipment": {
        "type": "str",
        "nullable": True,
        "description": "Équipement requis"
    },
    "level": {
        "allowed_values": ["beginner", "intermediate", "advanced", None],
        "type": "str",
        "nullable": True,
        "description": "Niveau de difficulté"
    },
    "instructions": {
        "type": "str",
        "nullable": True,
        "description": "Instructions textuelles"
    },
}

# ============================================================================
# RÈGLES MÉTIER - COHÉRENCE DES DONNÉES
# ============================================================================

COHERENCE_RULES = {
    "bmi_weight_height": {
        "description": "Le BMI calculé doit correspondre à weight_kg / (height_m)²",
        "tolerance": 0.5  # Tolérance de 0.5 pour les arrondis
    },
    "age_disease_correlation": {
        "description": "Certaines maladies sont plus fréquentes après un certain âge",
        "rules": {
            "Hypertension": {"min_age_warning": 30},
            "Diabetes": {"min_age_warning": 25}
        }
    },
    "bpm_coherence": {
        "description": "max_bpm > avg_bpm > resting_bpm",
        "rule": "gym_max_bpm >= gym_avg_bpm >= gym_resting_bpm"
    },
    "calories_activity_coherence": {
        "description": "Les calories brûlées doivent être cohérentes avec la durée",
        "min_calories_per_hour": 200,
        "max_calories_per_hour": 800
    }
}
