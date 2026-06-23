"""
Métriques et Statistiques
=========================
Ce module calcule les métriques statistiques pour chaque table de données.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from enum import Enum


@dataclass
class ColumnStats:
    """Statistiques pour une colonne"""
    column_name: str
    data_type: str
    non_null_count: int
    null_count: int
    null_percentage: float
    unique_count: int
    
    # Stats numériques (optionnel)
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    mean_value: Optional[float] = None
    median_value: Optional[float] = None
    std_value: Optional[float] = None
    q1_value: Optional[float] = None
    q3_value: Optional[float] = None
    
    # Stats catégorielles (optionnel)
    top_values: Optional[List[tuple]] = None  # [(valeur, count), ...]
    
    def to_dict(self) -> Dict:
        """Convertit en dictionnaire"""
        result = {
            "column_name": self.column_name,
            "data_type": self.data_type,
            "non_null_count": self.non_null_count,
            "null_count": self.null_count,
            "null_percentage": round(self.null_percentage, 2),
            "unique_count": self.unique_count
        }
        
        if self.min_value is not None:
            result.update({
                "min": self.min_value,
                "max": self.max_value,
                "mean": round(self.mean_value, 2) if self.mean_value else None,
                "median": self.median_value,
                "std": round(self.std_value, 2) if self.std_value else None,
                "q1": self.q1_value,
                "q3": self.q3_value
            })
        
        if self.top_values:
            result["top_values"] = [
                {"value": str(v), "count": c} for v, c in self.top_values
            ]
        
        return result


@dataclass
class TableStats:
    """Statistiques pour une table"""
    table_name: str
    row_count: int
    column_count: int
    memory_usage_mb: float
    columns_stats: List[ColumnStats] = field(default_factory=list)
    
    def to_dict(self) -> Dict:
        """Convertit en dictionnaire"""
        return {
            "table_name": self.table_name,
            "row_count": self.row_count,
            "column_count": self.column_count,
            "memory_usage_mb": round(self.memory_usage_mb, 4),
            "columns": [cs.to_dict() for cs in self.columns_stats]
        }
    
    def summary(self) -> str:
        """Génère un résumé textuel"""
        lines = [
            f"\n{'='*60}",
            f"STATISTIQUES - {self.table_name.upper()}",
            f"{'='*60}",
            f"Lignes: {self.row_count:,}",
            f"Colonnes: {self.column_count}",
            f"Memoire: {self.memory_usage_mb:.4f} MB",
            f"\n{'-'*40}",
            "Statistiques par colonne:",
        ]
        
        for col_stat in self.columns_stats:
            lines.append(f"\n   - {col_stat.column_name} ({col_stat.data_type})")
            lines.append(f"      Non-null: {col_stat.non_null_count} | Null: {col_stat.null_count} ({col_stat.null_percentage:.1f}%)")
            lines.append(f"      Unique: {col_stat.unique_count}")
            
            if col_stat.min_value is not None:
                lines.append(f"      Min: {col_stat.min_value} | Max: {col_stat.max_value}")
                lines.append(f"      Moyenne: {col_stat.mean_value:.2f} | Médiane: {col_stat.median_value}")
                lines.append(f"      Std: {col_stat.std_value:.2f} | Q1: {col_stat.q1_value} | Q3: {col_stat.q3_value}")
            
            if col_stat.top_values:
                top_str = ", ".join([f"{v}({c})" for v, c in col_stat.top_values[:3]])
                lines.append(f"      Top valeurs: {top_str}")
        
        lines.append(f"\n{'='*60}")
        return "\n".join(lines)


class MetricsCalculator:
    """Calculateur de métriques et statistiques"""
    
    def calculate_column_stats(
        self,
        df: pd.DataFrame,
        column: str
    ) -> ColumnStats:
        """
        Calcule les statistiques pour une colonne
        
        Args:
            df: DataFrame source
            column: Nom de la colonne
        
        Returns:
            ColumnStats avec toutes les métriques
        """
        series = df[column]
        
        # Stats de base
        non_null = series.notna().sum()
        null_count = series.isna().sum()
        null_pct = (null_count / len(series)) * 100 if len(series) > 0 else 0
        unique_count = series.nunique()
        data_type = str(series.dtype)
        
        # Initialiser le résultat
        stats = ColumnStats(
            column_name=column,
            data_type=data_type,
            non_null_count=int(non_null),
            null_count=int(null_count),
            null_percentage=null_pct,
            unique_count=int(unique_count)
        )
        
        # Stats numériques
        if pd.api.types.is_numeric_dtype(series):
            try:
                numeric_series = pd.to_numeric(series, errors='coerce').dropna()
                if len(numeric_series) > 0:
                    stats.min_value = float(numeric_series.min())
                    stats.max_value = float(numeric_series.max())
                    stats.mean_value = float(numeric_series.mean())
                    stats.median_value = float(numeric_series.median())
                    stats.std_value = float(numeric_series.std())
                    stats.q1_value = float(numeric_series.quantile(0.25))
                    stats.q3_value = float(numeric_series.quantile(0.75))
            except Exception:
                pass
        
        # Stats catégorielles
        if pd.api.types.is_object_dtype(series) or unique_count <= 20:
            try:
                value_counts = series.value_counts().head(5)
                stats.top_values = [(str(idx), int(count)) for idx, count in value_counts.items()]
            except Exception:
                pass
        
        return stats
    
    def calculate_table_stats(
        self,
        df: pd.DataFrame,
        table_name: str
    ) -> TableStats:
        """
        Calcule les statistiques pour une table complète
        
        Args:
            df: DataFrame source
            table_name: Nom de la table
        
        Returns:
            TableStats avec toutes les métriques
        """
        columns_stats = []
        
        for col in df.columns:
            col_stats = self.calculate_column_stats(df, col)
            columns_stats.append(col_stats)
        
        # Calculer la mémoire utilisée
        memory_mb = df.memory_usage(deep=True).sum() / (1024 * 1024)
        
        return TableStats(
            table_name=table_name,
            row_count=len(df),
            column_count=len(df.columns),
            memory_usage_mb=memory_mb,
            columns_stats=columns_stats
        )
    
    def calculate_correlation_matrix(
        self,
        df: pd.DataFrame,
        numeric_only: bool = True
    ) -> pd.DataFrame:
        """
        Calcule la matrice de corrélation
        
        Args:
            df: DataFrame source
            numeric_only: Si True, utilise uniquement les colonnes numériques
        
        Returns:
            DataFrame avec la matrice de corrélation
        """
        if numeric_only:
            numeric_df = df.select_dtypes(include=[np.number])
        else:
            numeric_df = df
        
        return numeric_df.corr()
    
    def detect_outliers(
        self,
        df: pd.DataFrame,
        column: str,
        method: str = "iqr"
    ) -> Dict[str, Any]:
        """
        Détecte les outliers dans une colonne numérique
        
        Args:
            df: DataFrame source
            column: Nom de la colonne
            method: Méthode de détection ('iqr' ou 'zscore')
        
        Returns:
            Dict avec les informations sur les outliers
        """
        series = pd.to_numeric(df[column], errors='coerce').dropna()
        
        if len(series) == 0:
            return {"column": column, "outlier_count": 0, "outliers": []}
        
        if method == "iqr":
            q1 = series.quantile(0.25)
            q3 = series.quantile(0.75)
            iqr = q3 - q1
            lower_bound = q1 - 1.5 * iqr
            upper_bound = q3 + 1.5 * iqr
            outliers = series[(series < lower_bound) | (series > upper_bound)]
        
        elif method == "zscore":
            mean = series.mean()
            std = series.std()
            z_scores = (series - mean) / std
            outliers = series[abs(z_scores) > 3]
        
        else:
            raise ValueError(f"Méthode inconnue: {method}")
        
        return {
            "column": column,
            "method": method,
            "outlier_count": len(outliers),
            "outlier_percentage": round(len(outliers) / len(series) * 100, 2),
            "lower_bound": float(lower_bound) if method == "iqr" else None,
            "upper_bound": float(upper_bound) if method == "iqr" else None,
            "outlier_values": outliers.head(10).tolist()
        }
    
    def generate_data_profile(
        self,
        df: pd.DataFrame,
        table_name: str
    ) -> Dict[str, Any]:
        """
        Génère un profil complet des données
        
        Args:
            df: DataFrame source
            table_name: Nom de la table
        
        Returns:
            Dict avec le profil complet
        """
        table_stats = self.calculate_table_stats(df, table_name)
        
        # Détecter les outliers pour les colonnes numériques
        outliers_report = {}
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            outliers_report[col] = self.detect_outliers(df, col)
        
        # Matrice de corrélation
        correlation = None
        if len(numeric_cols) > 1:
            correlation = self.calculate_correlation_matrix(df).to_dict()
        
        return {
            "table_stats": table_stats.to_dict(),
            "outliers": outliers_report,
            "correlation_matrix": correlation,
            "data_quality_score": self._calculate_quality_score(table_stats)
        }
    
    def _calculate_quality_score(self, table_stats: TableStats) -> float:
        """
        Calcule un score de qualité des données (0-100)
        
        Args:
            table_stats: Statistiques de la table
        
        Returns:
            Score de qualité entre 0 et 100
        """
        if not table_stats.columns_stats:
            return 0.0
        
        # Score basé sur le taux de non-null
        null_scores = []
        for col in table_stats.columns_stats:
            completeness = 100 - col.null_percentage
            null_scores.append(completeness)
        
        avg_completeness = sum(null_scores) / len(null_scores)
        
        return round(avg_completeness, 2)


def calculate_all_metrics(tables: Dict[str, pd.DataFrame]) -> Dict[str, TableStats]:
    """
    Calcule les métriques pour toutes les tables
    
    Args:
        tables: Dict {nom_table: DataFrame}
    
    Returns:
        Dict {nom_table: TableStats}
    """
    calculator = MetricsCalculator()
    results = {}
    
    for table_name, df in tables.items():
        results[table_name] = calculator.calculate_table_stats(df, table_name)
    
    return results


def print_metrics_summary(metrics: Dict[str, TableStats]) -> None:
    """Affiche un résumé de toutes les métriques"""
    print("\n" + "="*70)
    print("RESUME DES METRIQUES")
    print("="*70)
    
    total_rows = sum(m.row_count for m in metrics.values())
    total_memory = sum(m.memory_usage_mb for m in metrics.values())
    
    print(f"\nStatistiques globales:")
    print(f"   - Tables: {len(metrics)}")
    print(f"   - Lignes totales: {total_rows:,}")
    print(f"   - Memoire totale: {total_memory:.4f} MB")
    
    print(f"\n{'-'*50}")
    print("Par table:")
    
    for name, stats in metrics.items():
        print(f"\n   {name}:")
        print(f"      Lignes: {stats.row_count:,} | Colonnes: {stats.column_count}")
        print(f"      Mémoire: {stats.memory_usage_mb:.4f} MB")
        
        # Afficher les colonnes avec le plus de nulls
        high_null_cols = [
            cs for cs in stats.columns_stats 
            if cs.null_percentage > 10
        ]
        if high_null_cols:
            print(f"      Colonnes avec >10% null:")
            for col in high_null_cols[:3]:
                print(f"         - {col.column_name}: {col.null_percentage:.1f}%")
    
    print("\n" + "="*70)
