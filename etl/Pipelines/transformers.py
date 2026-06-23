"""
Transformations et Nettoyage des données
========================================
Ce module contient les fonctions de transformation et nettoyage pour l'ETL.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional, Callable
from dataclasses import dataclass

from .rules import (
    PATIENT_RULES,
    SANTE_RULES,
    NUTRITION_RULES,
    ACTIVITE_PHYSIQUE_RULES,
    GYM_SESSION_RULES,
    FOOD_LOG_RULES,
    EXERCISE_RULES,
)


@dataclass
class TransformationResult:
    """Résultat d'une transformation"""
    df: pd.DataFrame
    rows_before: int
    rows_after: int
    transformations_applied: List[str]
    values_modified: int
    
    def summary(self) -> str:
        """Génère un résumé de la transformation"""
        return (
            f"Lignes: {self.rows_before} → {self.rows_after} | "
            f"Valeurs modifiées: {self.values_modified} | "
            f"Transformations: {', '.join(self.transformations_applied)}"
        )


class DataTransformer:
    """Classe pour les transformations de données"""
    
    def __init__(self):
        self.transformations_log = []
    
    # =========================================================================
    # NETTOYAGE GÉNÉRAL
    # =========================================================================
    
    def remove_duplicates(
        self,
        df: pd.DataFrame,
        subset: Optional[List[str]] = None
    ) -> TransformationResult:
        """
        Supprime les doublons d'un DataFrame
        
        Args:
            df: DataFrame à nettoyer
            subset: Colonnes à considérer pour la détection des doublons
        
        Returns:
            TransformationResult avec le DataFrame nettoyé
        """
        rows_before = len(df)
        df_clean = df.drop_duplicates(subset=subset, keep='first')
        rows_after = len(df_clean)
        
        return TransformationResult(
            df=df_clean,
            rows_before=rows_before,
            rows_after=rows_after,
            transformations_applied=["remove_duplicates"],
            values_modified=rows_before - rows_after
        )
    
    def handle_missing_values(
        self,
        df: pd.DataFrame,
        strategy: Dict[str, str] = None,
        fill_values: Dict[str, any] = None
    ) -> TransformationResult:
        """
        Gère les valeurs manquantes
        
        Args:
            df: DataFrame à traiter
            strategy: Dict {colonne: stratégie} où stratégie = 'drop', 'mean', 'median', 'mode', 'fill'
            fill_values: Dict {colonne: valeur} pour les colonnes avec stratégie 'fill'
        
        Returns:
            TransformationResult
        """
        df_clean = df.copy()
        rows_before = len(df_clean)
        values_modified = 0
        transformations = []
        
        if strategy is None:
            strategy = {}
        if fill_values is None:
            fill_values = {}
        
        for col, strat in strategy.items():
            if col not in df_clean.columns:
                continue
            
            missing_count = df_clean[col].isna().sum()
            if missing_count == 0:
                continue
            
            if strat == 'drop':
                df_clean = df_clean.dropna(subset=[col])
                values_modified += missing_count
                transformations.append(f"drop_na({col})")
            
            elif strat == 'mean':
                mean_val = df_clean[col].mean()
                df_clean[col] = df_clean[col].fillna(mean_val)
                values_modified += missing_count
                transformations.append(f"fill_mean({col})")
            
            elif strat == 'median':
                median_val = df_clean[col].median()
                df_clean[col] = df_clean[col].fillna(median_val)
                values_modified += missing_count
                transformations.append(f"fill_median({col})")
            
            elif strat == 'mode':
                mode_val = df_clean[col].mode()
                if len(mode_val) > 0:
                    df_clean[col] = df_clean[col].fillna(mode_val[0])
                    values_modified += missing_count
                    transformations.append(f"fill_mode({col})")
            
            elif strat == 'fill':
                fill_val = fill_values.get(col, 0)
                df_clean[col] = df_clean[col].fillna(fill_val)
                values_modified += missing_count
                transformations.append(f"fill_value({col}={fill_val})")
        
        return TransformationResult(
            df=df_clean,
            rows_before=rows_before,
            rows_after=len(df_clean),
            transformations_applied=transformations,
            values_modified=values_modified
        )
    
    def normalize_string_columns(
        self,
        df: pd.DataFrame,
        columns: List[str] = None
    ) -> TransformationResult:
        """
        Normalise les colonnes de type string (trim, lowercase optionnel)
        
        Args:
            df: DataFrame à traiter
            columns: Liste des colonnes à normaliser (None = toutes les colonnes string)
        
        Returns:
            TransformationResult
        """
        df_clean = df.copy()
        values_modified = 0
        transformations = []
        
        if columns is None:
            columns = df_clean.select_dtypes(include=['object']).columns.tolist()
        
        for col in columns:
            if col not in df_clean.columns:
                continue
            
            # Strip whitespace
            original = df_clean[col].copy()
            df_clean[col] = df_clean[col].astype(str).str.strip()
            
            # Remplacer 'nan' string par NaN
            df_clean[col] = df_clean[col].replace(['nan', 'Nan', 'NaN', 'NAN', ''], np.nan)
            
            # Compter les modifications
            changes = (original.astype(str) != df_clean[col].astype(str)).sum()
            if changes > 0:
                values_modified += changes
                transformations.append(f"normalize({col})")
        
        return TransformationResult(
            df=df_clean,
            rows_before=len(df),
            rows_after=len(df_clean),
            transformations_applied=transformations,
            values_modified=values_modified
        )
    
    def convert_types(
        self,
        df: pd.DataFrame,
        type_mapping: Dict[str, str]
    ) -> TransformationResult:
        """
        Convertit les types des colonnes
        
        Args:
            df: DataFrame à traiter
            type_mapping: Dict {colonne: type} où type = 'int', 'float', 'str', 'datetime'
        
        Returns:
            TransformationResult
        """
        df_clean = df.copy()
        transformations = []
        errors = []
        
        for col, dtype in type_mapping.items():
            if col not in df_clean.columns:
                continue
            
            try:
                if dtype == 'int':
                    df_clean[col] = pd.to_numeric(df_clean[col], errors='coerce').astype('Int64')
                elif dtype == 'float':
                    df_clean[col] = pd.to_numeric(df_clean[col], errors='coerce')
                elif dtype == 'str':
                    df_clean[col] = df_clean[col].astype(str)
                elif dtype == 'datetime':
                    df_clean[col] = pd.to_datetime(df_clean[col], errors='coerce')
                
                transformations.append(f"convert({col}→{dtype})")
            except Exception as e:
                errors.append(f"Erreur conversion {col}: {str(e)}")
        
        return TransformationResult(
            df=df_clean,
            rows_before=len(df),
            rows_after=len(df_clean),
            transformations_applied=transformations,
            values_modified=len(transformations)
        )
    
    # =========================================================================
    # TRANSFORMATIONS MÉTIER
    # =========================================================================
    
    def clip_numeric_values(
        self,
        df: pd.DataFrame,
        rules: Dict[str, Dict]
    ) -> TransformationResult:
        """
        Limite les valeurs numériques selon les règles min/max
        
        Args:
            df: DataFrame à traiter
            rules: Règles avec min/max pour chaque colonne
        
        Returns:
            TransformationResult
        """
        df_clean = df.copy()
        values_modified = 0
        transformations = []
        
        for col, rule in rules.items():
            if col not in df_clean.columns:
                continue
            
            if 'min' in rule and 'max' in rule:
                try:
                    original = df_clean[col].copy()
                    df_clean[col] = pd.to_numeric(df_clean[col], errors='coerce')
                    df_clean[col] = df_clean[col].clip(lower=rule['min'], upper=rule['max'])
                    
                    changes = (original != df_clean[col]).sum()
                    if changes > 0:
                        values_modified += changes
                        transformations.append(f"clip({col}:{rule['min']}-{rule['max']})")
                except Exception:
                    pass
        
        return TransformationResult(
            df=df_clean,
            rows_before=len(df),
            rows_after=len(df_clean),
            transformations_applied=transformations,
            values_modified=values_modified
        )
    
    def standardize_categorical_values(
        self,
        df: pd.DataFrame,
        rules: Dict[str, Dict]
    ) -> TransformationResult:
        """
        Standardise les valeurs catégorielles selon les règles
        
        Args:
            df: DataFrame à traiter
            rules: Règles avec allowed_values pour chaque colonne
        
        Returns:
            TransformationResult
        """
        df_clean = df.copy()
        values_modified = 0
        transformations = []
        
        for col, rule in rules.items():
            if col not in df_clean.columns:
                continue
            
            if 'allowed_values' in rule:
                allowed = rule['allowed_values']
                original = df_clean[col].copy()
                
                # Remplacer les valeurs non autorisées par NaN
                mask = ~df_clean[col].isin(allowed) & df_clean[col].notna()
                if mask.any():
                    df_clean.loc[mask, col] = np.nan
                    changes = mask.sum()
                    values_modified += changes
                    transformations.append(f"standardize({col})")
        
        return TransformationResult(
            df=df_clean,
            rows_before=len(df),
            rows_after=len(df_clean),
            transformations_applied=transformations,
            values_modified=values_modified
        )
    
    def recalculate_bmi(self, df: pd.DataFrame) -> TransformationResult:
        """
        Recalcule le BMI à partir du poids et de la taille
        
        Args:
            df: DataFrame avec colonnes weight_kg et height_cm
        
        Returns:
            TransformationResult
        """
        df_clean = df.copy()
        transformations = []
        values_modified = 0
        
        if 'weight_kg' in df_clean.columns and 'height_cm' in df_clean.columns:
            original_bmi = df_clean.get('bmi_calculated', pd.Series([np.nan] * len(df_clean)))
            
            height_m = pd.to_numeric(df_clean['height_cm'], errors='coerce') / 100
            weight = pd.to_numeric(df_clean['weight_kg'], errors='coerce')
            
            # Calculer le BMI
            df_clean['bmi_calculated'] = round(weight / (height_m ** 2), 2)
            
            # Compter les modifications
            if 'bmi_calculated' in df.columns:
                changes = ((original_bmi - df_clean['bmi_calculated']).abs() > 0.01).sum()
                values_modified = changes
            else:
                values_modified = len(df_clean)
            
            transformations.append("recalculate_bmi")
        
        return TransformationResult(
            df=df_clean,
            rows_before=len(df),
            rows_after=len(df_clean),
            transformations_applied=transformations,
            values_modified=values_modified
        )
    
    def categorize_bmi(self, df: pd.DataFrame) -> TransformationResult:
        """
        Ajoute une colonne de catégorie BMI
        
        Args:
            df: DataFrame avec colonne bmi_calculated
        
        Returns:
            TransformationResult
        """
        df_clean = df.copy()
        transformations = []
        
        if 'bmi_calculated' in df_clean.columns:
            def categorize(bmi):
                if pd.isna(bmi):
                    return None
                elif bmi < 18.5:
                    return "Underweight"
                elif bmi < 25:
                    return "Normal"
                elif bmi < 30:
                    return "Overweight"
                else:
                    return "Obese"
            
            df_clean['bmi_category'] = df_clean['bmi_calculated'].apply(categorize)
            transformations.append("categorize_bmi")
        
        return TransformationResult(
            df=df_clean,
            rows_before=len(df),
            rows_after=len(df_clean),
            transformations_applied=transformations,
            values_modified=len(df_clean)
        )
    
    def categorize_age(self, df: pd.DataFrame) -> TransformationResult:
        """
        Ajoute une colonne de tranche d'âge
        
        Args:
            df: DataFrame avec colonne age
        
        Returns:
            TransformationResult
        """
        df_clean = df.copy()
        transformations = []
        
        if 'age' in df_clean.columns:
            def categorize(age):
                if pd.isna(age):
                    return None
                elif age < 25:
                    return "18-24"
                elif age < 35:
                    return "25-34"
                elif age < 45:
                    return "35-44"
                elif age < 55:
                    return "45-54"
                elif age < 65:
                    return "55-64"
                else:
                    return "65+"
            
            df_clean['age_group'] = df_clean['age'].apply(categorize)
            transformations.append("categorize_age")
        
        return TransformationResult(
            df=df_clean,
            rows_before=len(df),
            rows_after=len(df_clean),
            transformations_applied=transformations,
            values_modified=len(df_clean)
        )
    
    def calculate_calories_per_hour(self, df: pd.DataFrame) -> TransformationResult:
        """
        Calcule les calories brûlées par heure pour les sessions gym
        
        Args:
            df: DataFrame avec colonnes gym_calories_burned et gym_session_duration_hours
        
        Returns:
            TransformationResult
        """
        df_clean = df.copy()
        transformations = []
        
        if 'gym_calories_burned' in df_clean.columns and 'gym_session_duration_hours' in df_clean.columns:
            calories = pd.to_numeric(df_clean['gym_calories_burned'], errors='coerce')
            duration = pd.to_numeric(df_clean['gym_session_duration_hours'], errors='coerce')
            
            df_clean['calories_per_hour'] = round(calories / duration, 2)
            df_clean['calories_per_hour'] = df_clean['calories_per_hour'].replace([np.inf, -np.inf], np.nan)
            
            transformations.append("calculate_calories_per_hour")
        
        return TransformationResult(
            df=df_clean,
            rows_before=len(df),
            rows_after=len(df_clean),
            transformations_applied=transformations,
            values_modified=len(df_clean)
        )


def apply_all_transformations(
    df: pd.DataFrame,
    table_name: str,
    transformer: DataTransformer = None
) -> Tuple[pd.DataFrame, List[str]]:
    """
    Applique toutes les transformations appropriées pour une table donnée
    
    Args:
        df: DataFrame à transformer
        table_name: Nom de la table
        transformer: Instance de DataTransformer (optionnel)
    
    Returns:
        Tuple (DataFrame transformé, liste des transformations appliquées)
    """
    if transformer is None:
        transformer = DataTransformer()
    
    all_transformations = []
    df_transformed = df.copy()
    
    # 1. Nettoyage général
    result = transformer.remove_duplicates(df_transformed)
    df_transformed = result.df
    all_transformations.extend(result.transformations_applied)
    
    result = transformer.normalize_string_columns(df_transformed)
    df_transformed = result.df
    all_transformations.extend(result.transformations_applied)
    
    # 2. Transformations spécifiques par table
    rules_mapping = {
        "patient": PATIENT_RULES,
        "sante": SANTE_RULES,
        "nutrition": NUTRITION_RULES,
        "activite_physique": ACTIVITE_PHYSIQUE_RULES,
        "gym_session": GYM_SESSION_RULES,
        "food_log": FOOD_LOG_RULES,
        "exercise": EXERCISE_RULES,
    }
    
    rules = rules_mapping.get(table_name, {})
    
    # Clipping des valeurs numériques
    result = transformer.clip_numeric_values(df_transformed, rules)
    df_transformed = result.df
    all_transformations.extend(result.transformations_applied)
    
    # Standardisation des valeurs catégorielles
    result = transformer.standardize_categorical_values(df_transformed, rules)
    df_transformed = result.df
    all_transformations.extend(result.transformations_applied)
    
    # 3. Transformations métier spécifiques
    if table_name == "patient":
        result = transformer.recalculate_bmi(df_transformed)
        df_transformed = result.df
        all_transformations.extend(result.transformations_applied)
        
        result = transformer.categorize_bmi(df_transformed)
        df_transformed = result.df
        all_transformations.extend(result.transformations_applied)
        
        result = transformer.categorize_age(df_transformed)
        df_transformed = result.df
        all_transformations.extend(result.transformations_applied)
    
    elif table_name == "gym_session":
        result = transformer.calculate_calories_per_hour(df_transformed)
        df_transformed = result.df
        all_transformations.extend(result.transformations_applied)
    
    return df_transformed, all_transformations
