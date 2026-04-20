"""
Pipelines ETL - Module de règles métier
=======================================

Ce module fournit un pipeline ETL complet avec:
- Règles métier de validation
- Transformations de données
- Métriques et statistiques
- Génération de rapports

Usage:
    from Pipelines import ETLPipeline, run_etl
    
    # Méthode 1: Fonction utilitaire
    result = run_etl(
        data_dir=".",
        db_path="mspr_etl.db",
        report_dir="reports"
    )
    
    # Méthode 2: Contrôle complet
    pipeline = ETLPipeline(data_dir=".", db_path="mspr_etl.db")
    pipeline.extract()
    pipeline.clean()
    pipeline.transform()
    pipeline.validate()
    pipeline.load()
    pipeline.calculate_metrics()
    report = pipeline.generate_report()

Modules:
    - rules: Définition des règles métier
    - validators: Classes de validation
    - transformers: Transformations de données
    - metrics: Calcul de métriques
    - pipeline: Orchestration du pipeline
"""

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

from .validators import (
    DataValidator,
    ValidationResult,
    ValidationReport,
    ValidationSeverity,
    validate_all_tables,
    print_validation_summary
)

from .transformers import (
    DataTransformer,
    TransformationResult,
    apply_all_transformations
)

from .metrics import (
    MetricsCalculator,
    ColumnStats,
    TableStats,
    calculate_all_metrics,
    print_metrics_summary
)

from .pipeline import (
    ETLPipeline,
    run_etl
)

from .monitoring import (
    MonitoringThresholds,
    load_reports,
    evaluate_report,
    build_monitoring_snapshot,
    save_monitoring_snapshot,
    print_monitoring_summary,
)

__all__ = [
    # Règles
    "PATIENT_RULES",
    "SANTE_RULES",
    "NUTRITION_RULES",
    "ACTIVITE_PHYSIQUE_RULES",
    "GYM_SESSION_RULES",
    "FOOD_LOG_RULES",
    "EXERCISE_RULES",
    "COHERENCE_RULES",
    
    # Validators
    "DataValidator",
    "ValidationResult",
    "ValidationReport",
    "ValidationSeverity",
    "validate_all_tables",
    "print_validation_summary",
    
    # Transformers
    "DataTransformer",
    "TransformationResult",
    "apply_all_transformations",
    
    # Metrics
    "MetricsCalculator",
    "ColumnStats",
    "TableStats",
    "calculate_all_metrics",
    "print_metrics_summary",
    
    # Pipeline
    "ETLPipeline",
    "run_etl",

    # Monitoring
    "MonitoringThresholds",
    "load_reports",
    "evaluate_report",
    "build_monitoring_snapshot",
    "save_monitoring_snapshot",
    "print_monitoring_summary",
]

__version__ = "1.0.0"
