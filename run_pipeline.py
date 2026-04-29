#!/usr/bin/env python3
import argparse
import sys
from pathlib import Path

# Ajouter le répertoire parent au path
sys.path.insert(0, str(Path(__file__).parent))

from Pipelines import ETLPipeline, run_etl


def main():
    parser = argparse.ArgumentParser(
        description="Exécute le pipeline ETL MSPR avec règles métier"
    )
    
    parser.add_argument(
        "--data-dir",
        type=str,
        default=".",
        help="Répertoire contenant les fichiers CSV (défaut: .)"
    )
    
    parser.add_argument(
        "--db-path",
        type=str,
        default="mspr_etl.db",
        help="Chemin de la base SQLite (défaut: mspr_etl.db)"
    )
    
    parser.add_argument(
        "--report-dir",
        type=str,
        default="reports",
        help="Répertoire pour les rapports (défaut: reports)"
    )
    
    parser.add_argument(
        "--no-validate",
        action="store_true",
        help="Désactiver la validation des données"
    )
    
    parser.add_argument(
        "--no-report",
        action="store_true",
        help="Désactiver la génération de rapport"
    )
    
    args = parser.parse_args()
    
    # Créer et exécuter le pipeline
    pipeline = ETLPipeline(
        data_dir=args.data_dir,
        db_path=args.db_path,
        report_dir=args.report_dir
    )
    
    result = pipeline.run(
        validate_data=not args.no_validate,
        generate_report=not args.no_report
    )
    
    # Retourner le code de sortie approprié
    if result["status"] == "SUCCESS":
        return 0
    else:
        return 1


if __name__ == "__main__":
    sys.exit(main())
