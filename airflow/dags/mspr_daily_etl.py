import pendulum

from airflow import DAG
from airflow.providers.standard.operators.bash import BashOperator


PROJECT_DIR = "/opt/airflow/project"


with DAG(
    dag_id="mspr_daily_etl",
    description="Pipeline ETL MSPR detaille par etape",
    start_date=pendulum.datetime(2026, 4, 29, tz="Europe/Paris"),
    schedule="0 2 * * *",
    catchup=False,
    tags=["mspr", "etl", "healthai"],
) as dag:
    def etl_step(task_id, step):
        return BashOperator(
            task_id=task_id,
            bash_command=f"""
            set -e
            cd {PROJECT_DIR}
            python airflow/run_etl_step.py {step} \
              --data-dir . \
              --db-path /data/mspr_etl.db \
              --report-dir /data/reports
            """,
        )

    etl_init = etl_step("etl_init", "init")
    extract = etl_step("01_extract_sources", "extract")
    clean = etl_step("02_clean_data", "clean")
    transform = etl_step("03_transform_model", "transform")
    validate = etl_step("04_validate_rules", "validate")
    load = etl_step("05_load_sqlite", "load")
    metrics = etl_step("06_calculate_metrics", "metrics")
    report = etl_step("07_generate_report", "report")
    monitoring = etl_step("08_monitoring_snapshot", "monitoring")

    etl_init >> extract >> clean >> transform >> validate >> load >> metrics >> report >> monitoring
