import argparse
import pickle
import shutil
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from Pipelines import ETLPipeline  # noqa: E402


STATE_FILE = Path("/data/airflow_state/mspr_pipeline_state.pkl")


def save_pipeline(pipeline: ETLPipeline) -> None:
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with STATE_FILE.open("wb") as fh:
        pickle.dump(pipeline, fh)


def load_pipeline() -> ETLPipeline:
    if not STATE_FILE.exists():
        raise FileNotFoundError(
            f"Etat Airflow introuvable: {STATE_FILE}. "
            "Lance d'abord la tache etl_init."
        )
    with STATE_FILE.open("rb") as fh:
        return pickle.load(fh)


def print_tables(pipeline: ETLPipeline, attr_name: str) -> None:
    tables = getattr(pipeline, attr_name, {}) or {}
    if not tables:
        print("Aucune table disponible pour cette etape.")
        return
    print("\nTables disponibles:")
    for name, df in tables.items():
        print(f"  - {name}: {len(df):,} lignes, {len(df.columns)} colonnes")


def main() -> int:
    parser = argparse.ArgumentParser(description="Execute une etape ETL pour Airflow")
    parser.add_argument(
        "step",
        choices=[
            "init",
            "extract",
            "clean",
            "transform",
            "validate",
            "load",
            "metrics",
            "report",
            "monitoring",
        ],
    )
    parser.add_argument("--data-dir", default=".")
    parser.add_argument("--db-path", default="/data/mspr_etl.db")
    parser.add_argument("--report-dir", default="/data/reports")
    args = parser.parse_args()

    print(f"\n=== Airflow ETL step: {args.step} ===")

    if args.step == "init":
        if STATE_FILE.parent.exists():
            shutil.rmtree(STATE_FILE.parent)
        STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
        pipeline = ETLPipeline(
            data_dir=args.data_dir,
            db_path=args.db_path,
            report_dir=args.report_dir,
        )
        save_pipeline(pipeline)
        print(f"Etat initialise: {STATE_FILE}")
        print(f"Dossier donnees: {args.data_dir}")
        print(f"Base cible: {args.db_path}")
        print(f"Dossier rapports: {args.report_dir}")
        return 0

    if args.step == "monitoring":
        from Pipelines.monitoring import (  # noqa: WPS433
            build_monitoring_snapshot,
            print_monitoring_summary,
            save_monitoring_snapshot,
        )

        snapshot = build_monitoring_snapshot(report_dir=args.report_dir)
        print_monitoring_summary(snapshot)
        output = Path(args.report_dir) / "etl_monitoring_latest.json"
        save_monitoring_snapshot(snapshot, str(output))
        print(f"Snapshot monitoring sauvegarde: {output}")
        return 0 if snapshot.get("overall_status") != "CRITICAL" else 2

    pipeline = load_pipeline()

    if args.step == "extract":
        pipeline.extract()
        print_tables(pipeline, "raw_data")
    elif args.step == "clean":
        pipeline.clean()
        print_tables(pipeline, "cleaned_data")
    elif args.step == "transform":
        pipeline.transform()
        print_tables(pipeline, "transformed_data")
    elif args.step == "validate":
        reports = pipeline.validate()
        print("\nValidation par table:")
        for name, report in reports.items():
            print(
                f"  - {name}: {report.validation_rate:.2f}% valides, "
                f"{report.error_count} erreur(s), {report.warning_count} warning(s)"
            )
    elif args.step == "load":
        ok = pipeline.load()
        if not ok:
            raise RuntimeError("Chargement SQLite echoue")
        print(f"Base SQLite rechargee: {pipeline.db_path}")
    elif args.step == "metrics":
        metrics = pipeline.calculate_metrics()
        print("\nMetriques par table:")
        for name, stats in metrics.items():
            print(
                f"  - {name}: {stats.row_count:,} lignes, "
                f"{stats.column_count} colonnes, {stats.memory_usage_mb:.4f} MB"
            )
    elif args.step == "report":
        report = pipeline.generate_report()
        print("\nRapport ETL genere.")
        print(f"Statut: {report['pipeline_status']}")
        print(f"Tables: {report['summary']['tables_processed']}")
        print(f"Lignes: {report['summary']['total_rows']:,}")
        print(f"Erreurs: {report['summary']['total_errors']}")
        print(f"Warnings: {report['summary']['total_warnings']}")

    save_pipeline(pipeline)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
