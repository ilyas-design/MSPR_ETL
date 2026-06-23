"""
Validateurs de données
======================
Ce module contient les classes et fonctions de validation pour chaque type de données.
"""

import pandas as pd
import numpy as np
import re
from typing import Dict, List, Tuple, Any, Optional
from dataclasses import dataclass, field
from enum import Enum

from .rules import (
    PATIENT_RULES,
    SANTE_RULES,
    NUTRITION_RULES,
    ACTIVITE_PHYSIQUE_RULES,
    GYM_SESSION_RULES,
    FOOD_LOG_RULES,
    EXERCISE_RULES,
    COHERENCE_RULES
)


class ValidationSeverity(Enum):
    """Niveaux de sévérité des erreurs de validation"""
    ERROR = "ERROR"      # Donnée invalide - doit être corrigée
    WARNING = "WARNING"  # Donnée suspecte - à vérifier
    INFO = "INFO"        # Information - pas d'action requise


@dataclass
class ValidationResult:
    """Résultat d'une validation"""
    is_valid: bool
    field: str
    value: Any
    rule: str
    message: str
    severity: ValidationSeverity
    row_index: Optional[int] = None


@dataclass
class ValidationReport:
    """Rapport complet de validation"""
    table_name: str
    total_rows: int
    valid_rows: int
    invalid_rows: int
    errors: List[ValidationResult] = field(default_factory=list)
    warnings: List[ValidationResult] = field(default_factory=list)
    
    @property
    def error_count(self) -> int:
        return len(self.errors)
    
    @property
    def warning_count(self) -> int:
        return len(self.warnings)
    
    @property
    def validation_rate(self) -> float:
        """Taux de validation en pourcentage"""
        if self.total_rows == 0:
            return 100.0
        return (self.valid_rows / self.total_rows) * 100
    
    def to_dict(self) -> Dict:
        """Convertit le rapport en dictionnaire"""
        return {
            "table_name": self.table_name,
            "total_rows": self.total_rows,
            "valid_rows": self.valid_rows,
            "invalid_rows": self.invalid_rows,
            "error_count": self.error_count,
            "warning_count": self.warning_count,
            "validation_rate": round(self.validation_rate, 2),
            "errors": [
                {
                    "field": e.field,
                    "value": str(e.value),
                    "message": e.message,
                    "row_index": e.row_index
                }
                for e in self.errors[:50]  # Limite à 50 erreurs pour le rapport
            ],
            "warnings": [
                {
                    "field": w.field,
                    "value": str(w.value),
                    "message": w.message,
                    "row_index": w.row_index
                }
                for w in self.warnings[:50]
            ]
        }
    
    def summary(self) -> str:
        """Génère un résumé textuel du rapport"""
        lines = [
            f"\n{'='*60}",
            f"RAPPORT DE VALIDATION - {self.table_name.upper()}",
            f"{'='*60}",
            f"Lignes totales: {self.total_rows}",
            f"Lignes valides: {self.valid_rows}",
            f"Lignes invalides: {self.invalid_rows}",
            f"Taux de validation: {self.validation_rate:.2f}%",
            f"Erreurs: {self.error_count}",
            f"Avertissements: {self.warning_count}",
        ]
        
        if self.errors:
            lines.append(f"\n{'-'*40}")
            lines.append("ERREURS (top 10):")
            for error in self.errors[:10]:
                lines.append(f"   - [{error.field}] {error.message}")
        
        if self.warnings:
            lines.append(f"\n{'-'*40}")
            lines.append("AVERTISSEMENTS (top 10):")
            for warning in self.warnings[:10]:
                lines.append(f"   - [{warning.field}] {warning.message}")
        
        lines.append(f"{'='*60}\n")
        return "\n".join(lines)


class DataValidator:
    """Classe principale de validation des données"""
    
    def __init__(self):
        self.rules = {
            "patient": PATIENT_RULES,
            "sante": SANTE_RULES,
            "nutrition": NUTRITION_RULES,
            "activite_physique": ACTIVITE_PHYSIQUE_RULES,
            "gym_session": GYM_SESSION_RULES,
            "food_log": FOOD_LOG_RULES,
            "exercise": EXERCISE_RULES,
        }
    
    def validate_value(
        self,
        value: Any,
        rule: Dict,
        field_name: str,
        row_index: int = None
    ) -> List[ValidationResult]:
        """Valide une valeur unique selon les règles définies"""
        results = []
        
        # Vérification de la nullité
        is_null = pd.isna(value) or value is None or value == "" or str(value).lower() == "nan"
        
        if is_null:
            if not rule.get("nullable", True):
                results.append(ValidationResult(
                    is_valid=False,
                    field=field_name,
                    value=value,
                    rule="nullable",
                    message=f"La valeur ne peut pas être nulle",
                    severity=ValidationSeverity.ERROR,
                    row_index=row_index
                ))
            return results  # Si null et nullable=True, pas d'erreur
        
        # Vérification du type
        expected_type = rule.get("type")
        if expected_type:
            type_valid = self._check_type(value, expected_type)
            if not type_valid:
                results.append(ValidationResult(
                    is_valid=False,
                    field=field_name,
                    value=value,
                    rule="type",
                    message=f"Type invalide: attendu {expected_type}, reçu {type(value).__name__}",
                    severity=ValidationSeverity.ERROR,
                    row_index=row_index
                ))
                return results
        
        # Vérification des valeurs min/max
        if "min" in rule:
            try:
                numeric_value = float(value)
                if numeric_value < rule["min"]:
                    results.append(ValidationResult(
                        is_valid=False,
                        field=field_name,
                        value=value,
                        rule="min",
                        message=f"Valeur {value} inférieure au minimum {rule['min']}",
                        severity=ValidationSeverity.ERROR,
                        row_index=row_index
                    ))
            except (ValueError, TypeError):
                pass
        
        if "max" in rule:
            try:
                numeric_value = float(value)
                if numeric_value > rule["max"]:
                    results.append(ValidationResult(
                        is_valid=False,
                        field=field_name,
                        value=value,
                        rule="max",
                        message=f"Valeur {value} supérieure au maximum {rule['max']}",
                        severity=ValidationSeverity.ERROR,
                        row_index=row_index
                    ))
            except (ValueError, TypeError):
                pass
        
        # Vérification des valeurs autorisées
        if "allowed_values" in rule:
            allowed = rule["allowed_values"]
            if value not in allowed and str(value) not in [str(a) for a in allowed if a is not None]:
                results.append(ValidationResult(
                    is_valid=False,
                    field=field_name,
                    value=value,
                    rule="allowed_values",
                    message=f"Valeur '{value}' non autorisée. Valeurs permises: {allowed}",
                    severity=ValidationSeverity.ERROR,
                    row_index=row_index
                ))
        
        # Vérification du pattern (regex)
        if "pattern" in rule:
            pattern = rule["pattern"]
            if not re.match(pattern, str(value)):
                results.append(ValidationResult(
                    is_valid=False,
                    field=field_name,
                    value=value,
                    rule="pattern",
                    message=f"Format invalide pour '{value}'",
                    severity=ValidationSeverity.ERROR,
                    row_index=row_index
                ))
        
        return results
    
    def _check_type(self, value: Any, expected_type: str) -> bool:
        """Vérifie si une valeur correspond au type attendu"""
        if expected_type == "int":
            try:
                return float(value) == int(float(value))
            except:
                return False
        elif expected_type == "float":
            try:
                float(value)
                return True
            except:
                return False
        elif expected_type == "str":
            return isinstance(value, str)
        return True
    
    def validate_dataframe(
        self,
        df: pd.DataFrame,
        table_name: str
    ) -> ValidationReport:
        """Valide un DataFrame complet selon les règles de la table"""
        rules = self.rules.get(table_name, {})
        errors = []
        warnings = []
        invalid_row_indices = set()
        
        for col_name, rule in rules.items():
            if col_name not in df.columns:
                # Colonne manquante
                if not rule.get("nullable", True):
                    errors.append(ValidationResult(
                        is_valid=False,
                        field=col_name,
                        value=None,
                        rule="missing_column",
                        message=f"Colonne obligatoire '{col_name}' manquante",
                        severity=ValidationSeverity.ERROR
                    ))
                continue
            
            for idx, value in df[col_name].items():
                validation_results = self.validate_value(value, rule, col_name, idx)
                for result in validation_results:
                    if result.severity == ValidationSeverity.ERROR:
                        errors.append(result)
                        invalid_row_indices.add(idx)
                    elif result.severity == ValidationSeverity.WARNING:
                        warnings.append(result)
        
        report = ValidationReport(
            table_name=table_name,
            total_rows=len(df),
            valid_rows=len(df) - len(invalid_row_indices),
            invalid_rows=len(invalid_row_indices),
            errors=errors,
            warnings=warnings
        )
        
        return report
    
    def validate_coherence(
        self,
        df: pd.DataFrame,
        table_name: str
    ) -> List[ValidationResult]:
        """Valide la cohérence des données selon les règles métier"""
        results = []
        
        # Cohérence BMI - Weight - Height (pour la table patient)
        if table_name == "patient" and all(c in df.columns for c in ["weight_kg", "height_cm", "bmi_calculated"]):
            for idx, row in df.iterrows():
                try:
                    weight = float(row["weight_kg"])
                    height_m = float(row["height_cm"]) / 100
                    bmi_calculated = float(row["bmi_calculated"])
                    bmi_expected = weight / (height_m ** 2)
                    
                    tolerance = COHERENCE_RULES["bmi_weight_height"]["tolerance"]
                    if abs(bmi_calculated - bmi_expected) > tolerance:
                        results.append(ValidationResult(
                            is_valid=False,
                            field="bmi_calculated",
                            value=bmi_calculated,
                            rule="bmi_coherence",
                            message=f"BMI incohérent: calculé={bmi_calculated:.2f}, attendu={bmi_expected:.2f}",
                            severity=ValidationSeverity.WARNING,
                            row_index=idx
                        ))
                except (ValueError, TypeError, ZeroDivisionError):
                    pass
        
        # Cohérence BPM (pour la table gym_session)
        if table_name == "gym_session":
            bpm_cols = ["gym_max_bpm", "gym_avg_bpm", "gym_resting_bpm"]
            if all(c in df.columns for c in bpm_cols):
                for idx, row in df.iterrows():
                    try:
                        max_bpm = float(row["gym_max_bpm"]) if pd.notna(row["gym_max_bpm"]) else None
                        avg_bpm = float(row["gym_avg_bpm"]) if pd.notna(row["gym_avg_bpm"]) else None
                        resting_bpm = float(row["gym_resting_bpm"]) if pd.notna(row["gym_resting_bpm"]) else None
                        
                        if all([max_bpm, avg_bpm, resting_bpm]):
                            if not (max_bpm >= avg_bpm >= resting_bpm):
                                results.append(ValidationResult(
                                    is_valid=False,
                                    field="bpm",
                                    value=f"max={max_bpm}, avg={avg_bpm}, rest={resting_bpm}",
                                    rule="bpm_coherence",
                                    message=f"BPM incohérent: max({max_bpm}) >= avg({avg_bpm}) >= rest({resting_bpm})",
                                    severity=ValidationSeverity.WARNING,
                                    row_index=idx
                                ))
                    except (ValueError, TypeError):
                        pass
        
        # Cohérence calories/durée (pour gym_session)
        if table_name == "gym_session":
            if all(c in df.columns for c in ["gym_calories_burned", "gym_session_duration_hours"]):
                for idx, row in df.iterrows():
                    try:
                        calories = float(row["gym_calories_burned"]) if pd.notna(row["gym_calories_burned"]) else None
                        duration = float(row["gym_session_duration_hours"]) if pd.notna(row["gym_session_duration_hours"]) else None
                        
                        if calories and duration and duration > 0:
                            cal_per_hour = calories / duration
                            min_cal = COHERENCE_RULES["calories_activity_coherence"]["min_calories_per_hour"]
                            max_cal = COHERENCE_RULES["calories_activity_coherence"]["max_calories_per_hour"]
                            
                            if cal_per_hour < min_cal or cal_per_hour > max_cal:
                                results.append(ValidationResult(
                                    is_valid=False,
                                    field="gym_calories_burned",
                                    value=calories,
                                    rule="calories_coherence",
                                    message=f"Calories/heure suspectes: {cal_per_hour:.0f} cal/h (attendu: {min_cal}-{max_cal})",
                                    severity=ValidationSeverity.WARNING,
                                    row_index=idx
                                ))
                    except (ValueError, TypeError, ZeroDivisionError):
                        pass
        
        return results


def validate_all_tables(tables: Dict[str, pd.DataFrame]) -> Dict[str, ValidationReport]:
    """
    Valide toutes les tables d'un dictionnaire
    
    Args:
        tables: Dictionnaire {nom_table: DataFrame}
    
    Returns:
        Dictionnaire {nom_table: ValidationReport}
    """
    validator = DataValidator()
    reports = {}
    
    for table_name, df in tables.items():
        # Validation des règles de base
        report = validator.validate_dataframe(df, table_name)
        
        # Validation de la cohérence
        coherence_results = validator.validate_coherence(df, table_name)
        report.warnings.extend(coherence_results)
        
        reports[table_name] = report
    
    return reports


def print_validation_summary(reports: Dict[str, ValidationReport]) -> None:
    """Affiche un résumé de tous les rapports de validation"""
    print("\n" + "="*70)
    print("RESUME GLOBAL DE VALIDATION")
    print("="*70)
    
    total_rows = sum(r.total_rows for r in reports.values())
    total_valid = sum(r.valid_rows for r in reports.values())
    total_errors = sum(r.error_count for r in reports.values())
    total_warnings = sum(r.warning_count for r in reports.values())
    
    print(f"\nStatistiques globales:")
    print(f"   - Tables validees: {len(reports)}")
    print(f"   - Lignes totales: {total_rows:,}")
    print(f"   - Lignes valides: {total_valid:,}")
    print(f"   - Taux de validation global: {(total_valid/total_rows*100):.2f}%")
    print(f"   - Erreurs totales: {total_errors:,}")
    print(f"   - Avertissements totaux: {total_warnings:,}")
    
    print(f"\n{'-'*50}")
    print("Details par table:")
    
    for name, report in reports.items():
        status = "OK" if report.error_count == 0 else "KO"
        print(f"\n   {status} {name}:")
        print(f"      Lignes: {report.total_rows} | Valides: {report.valid_rows} | Taux: {report.validation_rate:.1f}%")
        print(f"      Erreurs: {report.error_count} | Warnings: {report.warning_count}")
    
    print("\n" + "="*70 + "\n")
