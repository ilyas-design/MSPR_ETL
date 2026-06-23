import os
import sqlite3
import tempfile
import unittest
from pathlib import Path

import pandas as pd


class TestETLPipeline(unittest.TestCase):
    def _make_temp_data_dir(self) -> Path:
        data_src = Path(__file__).resolve().parents[1] / "data"
        tmp_dir = Path(tempfile.mkdtemp(prefix="mspr_etl_test_"))

        # copy small samples from provided datasets
        pd.read_csv(data_src / "diet_recommendations.csv").head(50).to_csv(tmp_dir / "diet_recommendations.csv", index=False)
        pd.read_csv(data_src / "gym_members_exercise.csv").head(50).to_csv(tmp_dir / "gym_members_exercise.csv", index=False)
        pd.read_csv(data_src / "daily_food_nutrition.csv").head(50).to_csv(tmp_dir / "daily_food_nutrition.csv", index=False)

        # exercises.json lives in etl/data; copy it
        (tmp_dir / "exercises.json").write_text((data_src / "exercises.json").read_text(encoding="utf-8"), encoding="utf-8")

        return tmp_dir

    def test_pipeline_creates_all_expected_tables(self):
        # Import inside test to avoid import-path issues in some runners
        repo = Path(__file__).resolve().parents[1]
        os.environ.pop("DJANGO_SETTINGS_MODULE", None)

        data_dir = self._make_temp_data_dir()
        db_path = data_dir / "test.db"
        report_dir = data_dir / "reports"

        # Ensure we can import Pipelines from repo root
        import sys
        sys.path.insert(0, str(repo))
        from Pipelines import ETLPipeline

        pipeline = ETLPipeline(data_dir=str(data_dir), db_path=str(db_path), report_dir=str(report_dir))
        result = pipeline.run(validate_data=True, generate_report=False)
        self.assertEqual(result["status"], "SUCCESS", msg=str(result))

        expected_tables = {"patient", "sante", "nutrition", "activite_physique", "gym_session", "food_log", "exercise"}
        self.assertTrue(expected_tables.issubset(set(result["tables"])))

        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = {r[0] for r in cur.fetchall()}
        conn.close()

        self.assertTrue(expected_tables.issubset(tables))

    def test_food_log_has_rows_and_expected_columns(self):
        repo = Path(__file__).resolve().parents[1]
        data_dir = self._make_temp_data_dir()
        db_path = data_dir / "test2.db"

        import sys
        sys.path.insert(0, str(repo))
        from Pipelines import ETLPipeline

        pipeline = ETLPipeline(data_dir=str(data_dir), db_path=str(db_path), report_dir=str(data_dir / "reports"))
        result = pipeline.run(validate_data=False, generate_report=False)
        self.assertEqual(result["status"], "SUCCESS", msg=str(result))

        conn = sqlite3.connect(db_path)
        df = pd.read_sql_query("SELECT * FROM food_log LIMIT 5", conn)
        conn.close()

        self.assertGreaterEqual(len(df), 1)
        for col in ["id", "date", "user_id", "food_item", "calories_kcal", "meal_type", "water_intake_ml"]:
            self.assertIn(col, df.columns)


if __name__ == "__main__":
    unittest.main()

