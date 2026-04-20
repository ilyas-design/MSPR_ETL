"""
Pipeline ETL Principal
======================
Ce module orchestre toutes les étapes de l'ETL avec les règles métier.
"""

import pandas as pd
import numpy as np
import sqlite3
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from datetime import datetime
import json
import logging

from .rules import (
    PATIENT_RULES,
    SANTE_RULES,
    NUTRITION_RULES,
    ACTIVITE_PHYSIQUE_RULES,
    GYM_SESSION_RULES
)
from .validators import (
    DataValidator,
    ValidationReport,
    validate_all_tables,
    print_validation_summary
)
from .transformers import (
    DataTransformer,
    apply_all_transformations
)
from .metrics import (
    MetricsCalculator,
    TableStats,
    calculate_all_metrics,
    print_metrics_summary
)


# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ETLPipeline:
    """
    Pipeline ETL complet avec règles métier
    
    Étapes:
    1. Extraction (chargement des CSV)
    2. Nettoyage (doublons, valeurs manquantes)
    3. Validation (règles métier)
    4. Transformation (normalisation, calculs)
    5. Chargement (SQLite)
    6. Métriques & Rapports
    """
    
    def __init__(
        self,
        data_dir: str = ".",
        db_path: str = "mspr_etl.db",
        report_dir: str = "reports"
    ):
        """
        Initialise le pipeline ETL
        
        Args:
            data_dir: Répertoire contenant les fichiers CSV
            db_path: Chemin de la base de données SQLite
            report_dir: Répertoire pour les rapports
        """
        self.data_dir = Path(data_dir)
        self.db_path = db_path
        self.report_dir = Path(report_dir)
        
        # Créer le répertoire de rapports
        self.report_dir.mkdir(exist_ok=True)
        
        # Composants du pipeline
        self.validator = DataValidator()
        self.transformer = DataTransformer()
        self.metrics_calculator = MetricsCalculator()
        
        # État du pipeline
        self.raw_data: Dict[str, pd.DataFrame] = {}
        self.cleaned_data: Dict[str, pd.DataFrame] = {}
        self.transformed_data: Dict[str, pd.DataFrame] = {}
        self.validation_reports: Dict[str, ValidationReport] = {}
        self.metrics: Dict[str, TableStats] = {}
        
        # Journal des opérations
        self.operations_log: List[Dict] = []
    
    def log_operation(self, step: str, message: str, status: str = "SUCCESS") -> None:
        """Enregistre une opération dans le journal"""
        entry = {
            "timestamp": datetime.now().isoformat(),
            "step": step,
            "message": message,
            "status": status
        }
        self.operations_log.append(entry)
        
        if status == "SUCCESS":
            logger.info(f"[{step}] {message}")
        elif status == "WARNING":
            logger.warning(f"[{step}] {message}")
        else:
            logger.error(f"[{step}] {message}")
    
    # =========================================================================
    # ÉTAPE 1: EXTRACTION
    # =========================================================================
    
    def extract(self, file_mappings: Dict[str, str] = None) -> Dict[str, pd.DataFrame]:
        """
        Charge les fichiers CSV
        
        Args:
            file_mappings: Dict {nom_source: fichier_csv}
        
        Returns:
            Dict des DataFrames chargés
        """
        print("\n" + "="*60)
        print("ETAPE 1: EXTRACTION")
        print("="*60)
        
        if file_mappings is None:
            file_mappings = {
                "diet": "diet_recommendations.csv",
                "gym": "gym_members_exercise.csv",
                # Journal alimentaire (source différente, non liée aux patients)
                "food_log": "daily_food_nutrition.csv",
                # Catalogue d'exercices (JSON)
                "exercise": "exercises.json",
            }
        
        for name, filename in file_mappings.items():
            filepath = self.data_dir / filename
            try:
                if filepath.suffix.lower() == ".json":
                    df = pd.read_json(filepath)
                elif filepath.suffix.lower() in [".xlsx", ".xls"]:
                    df = pd.read_excel(filepath)
                else:
                    df = pd.read_csv(filepath)
                self.raw_data[name] = df
                self.log_operation(
                    "EXTRACT",
                    f"Chargé {filename}: {len(df)} lignes, {len(df.columns)} colonnes"
                )
            except Exception as e:
                self.log_operation(
                    "EXTRACT",
                    f"Erreur chargement {filename}: {str(e)}",
                    "ERROR" if name in ("diet", "gym", "food_log") else "WARNING"
                )
        
        return self.raw_data
    
    # =========================================================================
    # ÉTAPE 2: NETTOYAGE
    # =========================================================================
    
    def clean(self) -> Dict[str, pd.DataFrame]:
        """
        Nettoie les données brutes
        
        Returns:
            Dict des DataFrames nettoyés
        """
        print("\n" + "="*60)
        print("ETAPE 2: NETTOYAGE")
        print("="*60)
        
        for name, df in self.raw_data.items():
            # Supprimer les doublons
            result = self.transformer.remove_duplicates(df)
            df_clean = result.df
            
            if result.values_modified > 0:
                self.log_operation(
                    "CLEAN",
                    f"{name}: Supprimé {result.values_modified} doublons"
                )
            
            # Normaliser les strings
            result = self.transformer.normalize_string_columns(df_clean)
            df_clean = result.df
            
            if result.values_modified > 0:
                self.log_operation(
                    "CLEAN",
                    f"{name}: Normalisé {result.values_modified} valeurs string"
                )
            
            self.cleaned_data[name] = df_clean
        
        return self.cleaned_data
    
    # =========================================================================
    # ÉTAPE 3: TRANSFORMATION & NORMALISATION
    # =========================================================================
    
    def transform(self) -> Dict[str, pd.DataFrame]:
        """
        Transforme et normalise les données en tables relationnelles
        
        Returns:
            Dict des tables transformées
        """
        print("\n" + "="*60)
        print("ETAPE 3: TRANSFORMATION")
        print("="*60)
        
        # Récupérer les données nettoyées
        diet_df = self.cleaned_data.get("diet", pd.DataFrame()).copy()
        gym_df = self.cleaned_data.get("gym", pd.DataFrame()).copy()
        food_df = self.cleaned_data.get("food_log", pd.DataFrame()).copy()
        exercise_df = self.cleaned_data.get("exercise", pd.DataFrame()).copy()
        
        # Renommer les colonnes du gym pour correspondre au schéma
        gym_columns_mapping = {
            # Format avec espaces et majuscules
            'Session_Duration (hours)': 'gym_session_duration_hours',
            'Calories_Burned': 'gym_calories_burned',
            'Workout_Type': 'gym_workout_type',
            'Fat_Percentage': 'gym_fat_percentage',
            'Water_Intake (liters)': 'gym_water_intake_liters',
            'Workout_Frequency (days/week)': 'gym_workout_frequency_days_week',
            'Experience_Level': 'gym_experience_level',
            'Max_BPM': 'gym_max_bpm',
            'Avg_BPM': 'gym_avg_bpm',
            'Resting_BPM': 'gym_resting_bpm',
            # Format minuscules avec underscores
            'session_duration_hours': 'gym_session_duration_hours',
            'calories_burned': 'gym_calories_burned',
            'workout_type': 'gym_workout_type',
            'fat_percentage': 'gym_fat_percentage',
            'water_intake_liters': 'gym_water_intake_liters',
            'workout_frequency_days_week': 'gym_workout_frequency_days_week',
            'experience_level': 'gym_experience_level',
            'max_bpm': 'gym_max_bpm',
            'avg_bpm': 'gym_avg_bpm',
            'resting_bpm': 'gym_resting_bpm',
        }
        
        # Appliquer le mapping si les colonnes existent
        if not gym_df.empty:
            gym_df = gym_df.rename(columns=gym_columns_mapping)
        
        # Créer les Patient IDs si absents
        if not diet_df.empty and "Patient_ID" not in diet_df.columns:
            diet_df["Patient_ID"] = ["P" + str(i).zfill(5) for i in range(1, len(diet_df) + 1)]
        
        if not gym_df.empty and "patient_id" not in gym_df.columns:
            gym_df["patient_id"] = ["P" + str(i).zfill(5) for i in range(1, len(gym_df) + 1)]
        
        # Table PATIENT
        patient_cols = ["Patient_ID", "Age", "Gender", "Weight_kg", "Height_cm", "BMI_Calculated"]
        available_cols = [c for c in patient_cols if c in diet_df.columns]
        
        if available_cols:
            patient_df = diet_df[available_cols].copy()
            patient_df.columns = ["patient_id", "age", "gender", "weight_kg", "height_cm", "bmi_calculated"][:len(available_cols)]
            
            # Appliquer les transformations métier
            patient_df, transformations = apply_all_transformations(patient_df, "patient", self.transformer)
            self.transformed_data["patient"] = patient_df
            self.log_operation("TRANSFORM", f"Table patient: {len(patient_df)} lignes, transformations: {transformations}")
        
        # Table SANTE
        sante_cols = ["Patient_ID", "Cholesterol_mg/dL", "Blood_Pressure_mmHg", "Disease_Type", "Glucose_mg/dL", "Severity"]
        available_cols = [c for c in sante_cols if c in diet_df.columns]
        
        if available_cols:
            sante_df = diet_df[available_cols].copy()
            sante_df.columns = ["patient_id", "cholesterol", "blood_pressure", "disease_type", "glucose", "severity"][:len(available_cols)]
            sante_df, transformations = apply_all_transformations(sante_df, "sante", self.transformer)
            self.transformed_data["sante"] = sante_df
            self.log_operation("TRANSFORM", f"Table sante: {len(sante_df)} lignes")
        
        # Table NUTRITION
        nutrition_cols = ["Patient_ID", "Daily_Caloric_Intake", "Dietary_Restrictions", "Allergies", 
                         "Preferred_Cuisine", "Diet_Recommendation", "Adherence_to_Diet_Plan"]
        available_cols = [c for c in nutrition_cols if c in diet_df.columns]
        
        if available_cols:
            nutrition_df = diet_df[available_cols].copy()
            col_names = ["patient_id", "daily_caloric_intake", "dietary_restrictions", "allergies",
                        "preferred_cuisine", "diet_recommendation", "adherence_to_diet_plan"]
            nutrition_df.columns = col_names[:len(available_cols)]
            nutrition_df, transformations = apply_all_transformations(nutrition_df, "nutrition", self.transformer)
            self.transformed_data["nutrition"] = nutrition_df
            self.log_operation("TRANSFORM", f"Table nutrition: {len(nutrition_df)} lignes")
        
        # Table ACTIVITE_PHYSIQUE
        activity_cols = ["Patient_ID", "Physical_Activity_Level", "Weekly_Exercise_Hours"]
        available_cols = [c for c in activity_cols if c in diet_df.columns]
        
        if available_cols:
            activity_df = diet_df[available_cols].copy()
            activity_df.columns = ["patient_id", "physical_activity_level", "weekly_exercice_hours"][:len(available_cols)]
            activity_df, transformations = apply_all_transformations(activity_df, "activite_physique", self.transformer)
            self.transformed_data["activite_physique"] = activity_df
            self.log_operation("TRANSFORM", f"Table activite_physique: {len(activity_df)} lignes")
        
        # Table GYM_SESSION
        if not gym_df.empty and "patient_id" in gym_df.columns:
            gym_cols = ["patient_id", "gym_session_duration_hours", "gym_calories_burned", 
                       "gym_workout_type", "gym_fat_percentage", "gym_water_intake_liters",
                       "gym_workout_frequency_days_week", "gym_experience_level",
                       "gym_max_bpm", "gym_avg_bpm", "gym_resting_bpm"]
            available_cols = [c for c in gym_cols if c in gym_df.columns]
            
            gym_session_df = gym_df[available_cols].copy()
            gym_session_df, transformations = apply_all_transformations(gym_session_df, "gym_session", self.transformer)
            
            # Ajouter une clé primaire auto-générée pour Django
            gym_session_df.insert(0, 'id', range(1, len(gym_session_df) + 1))
            
            self.transformed_data["gym_session"] = gym_session_df
            self.log_operation("TRANSFORM", f"Table gym_session: {len(gym_session_df)} lignes")

        # Table FOOD_LOG (journal alimentaire)
        if not food_df.empty:
            food_columns_mapping = {
                "Date": "date",
                "User_ID": "user_id",
                "Food_Item": "food_item",
                "Category": "category",
                "Calories (kcal)": "calories_kcal",
                "Protein (g)": "protein_g",
                "Carbohydrates (g)": "carbohydrates_g",
                "Fat (g)": "fat_g",
                "Fiber (g)": "fiber_g",
                "Sugars (g)": "sugars_g",
                "Sodium (mg)": "sodium_mg",
                "Cholesterol (mg)": "cholesterol_mg",
                "Meal_Type": "meal_type",
                "Water_Intake (ml)": "water_intake_ml",
            }
            food_df = food_df.rename(columns=food_columns_mapping)

            desired_cols = list(food_columns_mapping.values())
            available_cols = [c for c in desired_cols if c in food_df.columns]
            food_log_df = food_df[available_cols].copy()

            if "date" in food_log_df.columns:
                food_log_df["date"] = pd.to_datetime(food_log_df["date"], errors="coerce").dt.date.astype(str)

            food_log_df, transformations = apply_all_transformations(food_log_df, "food_log", self.transformer)
            food_log_df.insert(0, "id", range(1, len(food_log_df) + 1))
            self.transformed_data["food_log"] = food_log_df
            self.log_operation("TRANSFORM", f"Table food_log: {len(food_log_df)} lignes")

        # Table EXERCISE (catalogue d'exercices)
        if not exercise_df.empty:
            exercise_columns_mapping = {
                "id": "exercise_id",
                "exercise_id": "exercise_id",
                "name": "name",
                "bodyPart": "body_part",
                "body_part": "body_part",
                "target": "target",
                "equipment": "equipment",
                "level": "level",
                "instructions": "instructions",
            }
            exercise_df = exercise_df.rename(columns=exercise_columns_mapping)

            desired_cols = ["exercise_id", "name", "body_part", "target", "equipment", "level", "instructions"]
            available_cols = [c for c in desired_cols if c in exercise_df.columns]
            ex_df = exercise_df[available_cols].copy()

            if "exercise_id" not in ex_df.columns:
                ex_df.insert(0, "exercise_id", range(1, len(ex_df) + 1))

            ex_df, transformations = apply_all_transformations(ex_df, "exercise", self.transformer)
            self.transformed_data["exercise"] = ex_df
            self.log_operation("TRANSFORM", f"Table exercise: {len(ex_df)} lignes")
        
        return self.transformed_data
    
    # =========================================================================
    # ÉTAPE 4: VALIDATION
    # =========================================================================
    
    def validate(self) -> Dict[str, ValidationReport]:
        """
        Valide les données transformées selon les règles métier
        
        Returns:
            Dict des rapports de validation
        """
        print("\n" + "="*60)
        print("ETAPE 4: VALIDATION")
        print("="*60)
        
        self.validation_reports = validate_all_tables(self.transformed_data)
        
        for name, report in self.validation_reports.items():
            status = "SUCCESS" if report.error_count == 0 else "WARNING"
            self.log_operation(
                "VALIDATE",
                f"{name}: {report.validation_rate:.1f}% valide, {report.error_count} erreurs, {report.warning_count} warnings",
                status
            )
        
        # Afficher le résumé
        print_validation_summary(self.validation_reports)
        
        return self.validation_reports
    
    # =========================================================================
    # ÉTAPE 5: CHARGEMENT
    # =========================================================================

    # Chemin vers le schéma SQL versionné (source de vérité).
    SCHEMA_FILE = Path(__file__).resolve().parent.parent / "BDD.sql"

    # Ordre inverse des dépendances FK : on vide les enfants avant les parents.
    _DELETE_ORDER: Tuple[str, ...] = (
        "exercise",
        "food_log",
        "gym_session",
        "activite_physique",
        "nutrition",
        "sante",
        "patient",
    )

    def _ensure_schema(self, conn: sqlite3.Connection) -> None:
        """
        Applique le schéma versionné (``BDD.sql``) de façon idempotente.

        Utilise ``CREATE TABLE IF NOT EXISTS`` donc n'écrase jamais les données
        existantes ; crée aussi la table ``etl_run`` et les index analytiques.
        """
        if self.SCHEMA_FILE.exists():
            schema_sql = self.SCHEMA_FILE.read_text(encoding="utf-8")
            conn.executescript(schema_sql)

    def _existing_tables(self, conn: sqlite3.Connection) -> set:
        cur = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        )
        return {row[0] for row in cur.fetchall()}

    def _record_run(
        self,
        conn: sqlite3.Connection,
        started_at: datetime,
        finished_at: datetime,
        rows_per_table: Dict[str, int],
        status: str,
        notes: Optional[str] = None,
    ) -> None:
        """Insère une ligne de métadonnées dans ``etl_run``."""
        if "etl_run" not in self._existing_tables(conn):
            return

        error_count = sum(
            r.error_count for r in self.validation_reports.values()
        )
        warning_count = sum(
            r.warning_count for r in self.validation_reports.values()
        )

        conn.execute(
            """
            INSERT INTO etl_run (
                started_at, finished_at, duration_seconds, status,
                tables_loaded, total_rows, error_count, warning_count, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                started_at.isoformat(timespec="seconds"),
                finished_at.isoformat(timespec="seconds"),
                (finished_at - started_at).total_seconds(),
                status,
                json.dumps(rows_per_table, sort_keys=True),
                sum(rows_per_table.values()),
                error_count,
                warning_count,
                notes,
            ),
        )
        conn.commit()

    def load(self, if_exists: str = "append") -> bool:  # noqa: ARG002 (legacy param kept for compat)
        """
        Charge les données dans SQLite.

        Stratégie versionnée (à la place du ``to_sql(replace)`` d'origine) :

        1. Applique ``BDD.sql`` via ``executescript`` — crée tables, FK et
           index si absents. Idempotent.
        2. ``DELETE FROM`` chaque table en ordre inverse des FK.
        3. ``to_sql(if_exists="append")`` — préserve schéma, contraintes,
           index et auto-incréments.
        4. Insère une ligne dans ``etl_run`` avec durée, status et volumes.

        Le paramètre ``if_exists`` est conservé pour compatibilité ascendante
        mais ignoré : le nouveau comportement est toujours ``append`` après
        purge contrôlée.

        Returns:
            True si le chargement a réussi.
        """
        print("\n" + "="*60)
        print("ETAPE 5: CHARGEMENT")
        print("="*60)

        started_at = datetime.now()
        rows_per_table: Dict[str, int] = {}

        try:
            conn = sqlite3.connect(self.db_path)
            try:
                # 1. Schéma versionné (idempotent).
                self._ensure_schema(conn)

                # Bulk load : on désactive le contrôle FK pour la durée de la
                # session. Les contraintes restent déclarées dans le schéma
                # (documentaires + utilisées par l'API Django à sa connexion).
                conn.execute("PRAGMA foreign_keys = OFF")

                # 2. Purge en ordre inverse des FK.
                existing = self._existing_tables(conn)
                for table_name in self._DELETE_ORDER:
                    if table_name in existing and table_name in self.transformed_data:
                        conn.execute(f"DELETE FROM {table_name}")
                conn.commit()

                # 3. Append en ordre d'insertion (parents avant enfants).
                for table_name, df in self.transformed_data.items():
                    df.to_sql(table_name, conn, if_exists="append", index=False)
                    rows_per_table[table_name] = len(df)
                    self.log_operation(
                        "LOAD",
                        f"Table {table_name}: {len(df)} lignes chargées dans {self.db_path}",
                    )

                # 4. Métadonnées de run.
                finished_at = datetime.now()
                has_errors = any(
                    r.error_count > 0 for r in self.validation_reports.values()
                )
                status = "WARNING" if has_errors else "SUCCESS"
                self._record_run(
                    conn, started_at, finished_at, rows_per_table, status
                )
            finally:
                conn.close()
            return True

        except Exception as e:
            self.log_operation("LOAD", f"Erreur: {str(e)}", "ERROR")
            return False
    
    # =========================================================================
    # ÉTAPE 6: MÉTRIQUES
    # =========================================================================
    
    def calculate_metrics(self) -> Dict[str, TableStats]:
        """
        Calcule les métriques pour toutes les tables
        
        Returns:
            Dict des statistiques par table
        """
        print("\n" + "="*60)
        print("ETAPE 6: METRIQUES")
        print("="*60)
        
        self.metrics = calculate_all_metrics(self.transformed_data)
        
        for name, stats in self.metrics.items():
            self.log_operation(
                "METRICS",
                f"{name}: {stats.row_count} lignes, {stats.column_count} colonnes, {stats.memory_usage_mb:.4f} MB"
            )
        
        # Afficher le résumé
        print_metrics_summary(self.metrics)
        
        return self.metrics
    
    # =========================================================================
    # GÉNÉRATION DE RAPPORTS
    # =========================================================================
    
    def generate_report(self) -> Dict:
        """
        Génère un rapport complet de l'ETL
        
        Returns:
            Dict avec le rapport complet
        """
        report = {
            "timestamp": datetime.now().isoformat(),
            "pipeline_status": "SUCCESS" if all(
                r.error_count == 0 for r in self.validation_reports.values()
            ) else "WARNING",
            "summary": {
                "tables_processed": len(self.transformed_data),
                "total_rows": sum(len(df) for df in self.transformed_data.values()),
                "total_errors": sum(r.error_count for r in self.validation_reports.values()),
                "total_warnings": sum(r.warning_count for r in self.validation_reports.values())
            },
            "validation_reports": {
                name: report.to_dict() 
                for name, report in self.validation_reports.items()
            },
            "metrics": {
                name: stats.to_dict() 
                for name, stats in self.metrics.items()
            },
            "operations_log": self.operations_log
        }
        
        # Sauvegarder le rapport
        report_file = self.report_dir / f"etl_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        self.log_operation("REPORT", f"Rapport généré: {report_file}")
        
        return report
    
    # =========================================================================
    # EXÉCUTION COMPLÈTE
    # =========================================================================
    
    def run(
        self,
        file_mappings: Dict[str, str] = None,
        validate_data: bool = True,
        generate_report: bool = True
    ) -> Dict:
        """
        Exécute le pipeline ETL complet
        
        Args:
            file_mappings: Dict {nom_source: fichier_csv}
            validate_data: Si True, valide les données
            generate_report: Si True, génère un rapport
        
        Returns:
            Dict avec le résultat de l'exécution
        """
        print("\n" + "="*70)
        print("DEMARRAGE DU PIPELINE ETL")
        print("="*70)
        print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Repertoire donnees: {self.data_dir}")
        print(f"Base de donnees: {self.db_path}")
        
        start_time = datetime.now()
        
        try:
            # Étape 1: Extraction
            self.extract(file_mappings)
            
            # Étape 2: Nettoyage
            self.clean()
            
            # Étape 3: Transformation
            self.transform()
            
            # Étape 4: Validation
            if validate_data:
                self.validate()
            
            # Étape 5: Chargement
            self.load()
            
            # Étape 6: Métriques
            self.calculate_metrics()
            
            # Génération du rapport
            report = None
            if generate_report:
                report = self.generate_report()
            
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            print("\n" + "="*70)
            print("PIPELINE ETL TERMINE AVEC SUCCES")
            print("="*70)
            print(f"Duree totale: {duration:.2f} secondes")
            print(f"Tables creees: {len(self.transformed_data)}")
            print(f"Lignes totales: {sum(len(df) for df in self.transformed_data.values()):,}")
            
            return {
                "status": "SUCCESS",
                "duration_seconds": duration,
                "tables": list(self.transformed_data.keys()),
                "report": report
            }
        
        except Exception as e:
            self.log_operation("PIPELINE", f"Erreur fatale: {str(e)}", "ERROR")
            return {
                "status": "ERROR",
                "error": str(e),
                "operations_log": self.operations_log
            }


def run_etl(
    data_dir: str = ".",
    db_path: str = "mspr_etl.db",
    report_dir: str = "reports"
) -> Dict:
    """
    Fonction utilitaire pour exécuter l'ETL
    
    Args:
        data_dir: Répertoire des fichiers CSV
        db_path: Chemin de la base SQLite
        report_dir: Répertoire des rapports
    
    Returns:
        Résultat de l'exécution
    """
    pipeline = ETLPipeline(
        data_dir=data_dir,
        db_path=db_path,
        report_dir=report_dir
    )
    return pipeline.run()
