import argparse
import sys
from pathlib import Path

# Ajouter le répertoire parent au path
sys.path.insert(0, str(Path(__file__).parent))

from Pipelines.monitoring import (
    MonitoringThresholds,
    build_monitoring_snapshot,
    print_monitoring_summary,
    save_monitoring_snapshot,
)


def main():
    parser = argparse.ArgumentParser(
        description="Supervision ETL: analyse des rapports et alertes de qualité"
    )

    parser.add_argument(
        "--report-dir",
        type=str,
        default="reports",
        help="Répertoire contenant les rapports ETL JSON (défaut: reports)",
    )
    parser.add_argument(
        "--window",
        type=int,
        default=5,
        help="Nombre de runs à inclure dans la tendance (défaut: 5)",
    )
    parser.add_argument(
        "--max-errors",
        type=int,
        default=0,
        help="Seuil max d'erreurs autorisées",
    )
    parser.add_argument(
        "--max-warnings",
        type=int,
        default=250,
        help="Seuil max de warnings autorisés",
    )
    parser.add_argument(
        "--min-rows",
        type=int,
        default=1000,
        help="Volume minimum de lignes attendu",
    )
    parser.add_argument(
        "--min-validation-rate",
        type=float,
        default=99.0,
        help="Taux minimum de validation globale",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="reports/etl_monitoring_latest.json",
        help="Fichier de sortie JSON du monitoring",
    )
    parser.add_argument(
        "--fail-on-warning",
        action="store_true",
        help="Retourne un code d'erreur si le statut global est WARNING ou CRITICAL",
    )

    args = parser.parse_args()

    thresholds = MonitoringThresholds(
        max_errors=args.max_errors,
        max_warnings=args.max_warnings,
        min_total_rows=args.min_rows,
        min_validation_rate=args.min_validation_rate,
    )

    snapshot = build_monitoring_snapshot(
        report_dir=args.report_dir,
        thresholds=thresholds,
        trend_window=args.window,
    )

    save_path = save_monitoring_snapshot(snapshot, args.output)
    print_monitoring_summary(snapshot)
    print(f"Snapshot monitoring sauvegardé: {save_path}")

    if args.fail_on_warning and snapshot.get("overall_status") in {"WARNING", "CRITICAL"}:
        return 2

    if snapshot.get("overall_status") == "CRITICAL":
        return 2

    return 0


if __name__ == "__main__":
    sys.exit(main())
