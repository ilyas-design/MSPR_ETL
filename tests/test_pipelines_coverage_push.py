import json
import os
import sqlite3
import tempfile
import unittest
from pathlib import Path

import pandas as pd

from Pipelines.pipeline import ETLPipeline, run_etl
from Pipelines.transformers import DataTransformer, apply_all_transformations
from Pipelines.validators import DataValidator, print_validation_summary
from Pipelines.metrics import print_metrics_summary, calculate_all_metrics
from Pipelines.metrics import ColumnStats, TableStats


class TestCoveragePush(unittest.TestCase):
    def test_transformer_branches(self):
        tr = DataTransformer()

        df = pd.DataFrame({"a": [1, 1, None, 3], "b": [" x ", " x ", None, "Nan"]})
        # remove_duplicates subset
        tr.remove_duplicates(df, subset=["a", "b"])

        # handle_missing_values branches
        tr.handle_missing_values(df, strategy={"a": "drop"})
        tr.handle_missing_values(df, strategy={"a": "median"})
        tr.handle_missing_values(df, strategy={"b": "mode"})
        tr.handle_missing_values(df, strategy={"b": "fill"}, fill_values={"b": "y"})
        # strategy None branch + continue branches (missing column / no missing)
        tr.handle_missing_values(pd.DataFrame({"z": [1, 2]}), strategy=None, fill_values=None)
        tr.handle_missing_values(pd.DataFrame({"z": [1, 2]}), strategy={"missing": "mean"})
        tr.handle_missing_values(pd.DataFrame({"z": [1, 2]}), strategy={"z": "mean"})  # missing_count == 0 -> continue
        # unknown strategy with missing_count > 0 (covers fallthrough)
        tr.handle_missing_values(pd.DataFrame({"z": [1, None]}), strategy={"z": "unknown"})

        # normalize explicit columns + missing col skip
        tr.normalize_string_columns(df, columns=["b", "missing"])

        # convert_types branches
        tr.convert_types(pd.DataFrame({"i": ["1", "2"]}), {"i": "int"})
        tr.convert_types(pd.DataFrame({"f": ["1.5", "2.5"]}), {"f": "float"})
        tr.convert_types(pd.DataFrame({"s": [1, 2]}), {"s": "str"})
        tr.convert_types(pd.DataFrame({"d": ["2024-01-01"]}), {"d": "datetime"})
        # invalid dtype falls back (should not crash)
        tr.convert_types(pd.DataFrame({"x": ["a"]}), {"x": "nope"})
        # convert_types except branch
        import Pipelines.transformers as tmod
        orig_to_numeric = tmod.pd.to_numeric
        try:
            def num_raiser(*a, **k):
                raise RuntimeError("boom")
            tmod.pd.to_numeric = num_raiser
            tr.convert_types(pd.DataFrame({"i": ["1"]}), {"i": "int"})
        finally:
            tmod.pd.to_numeric = orig_to_numeric

        # convert_types missing column continue
        tr.convert_types(pd.DataFrame({"a": [1]}), {"missing": "int"})

        # clip_numeric_values / standardize_categorical_values
        rules = {"a": {"min": 0, "max": 2}, "b": {"allowed_values": ["x", None]}}
        tr.clip_numeric_values(pd.DataFrame({"a": [-1, 1, 3]}), rules)
        tr.standardize_categorical_values(pd.DataFrame({"b": ["x", "bad"]}), rules)
        # clip_numeric_values except branch
        import Pipelines.transformers as tmod2
        orig_to_numeric2 = tmod2.pd.to_numeric
        try:
            def num_raiser2(*a, **k):
                raise RuntimeError("boom")
            tmod2.pd.to_numeric = num_raiser2
            tr.clip_numeric_values(pd.DataFrame({"a": ["x"]}), {"a": {"min": 0, "max": 1}})
        finally:
            tmod2.pd.to_numeric = orig_to_numeric2

        # cover TransformationResult.summary
        tr.remove_duplicates(pd.DataFrame({"x": [1, 1]})).summary()

        # cover handle_missing_values mode branch when mode is empty
        tr.handle_missing_values(pd.DataFrame({"m": [None, None]}), strategy={"m": "mode"})
        # cover recalculate_bmi skip branch (missing columns)
        tr.recalculate_bmi(pd.DataFrame({"age": [1]}))
        # cover categorize_bmi/categorize_age skip branches
        tr.categorize_bmi(pd.DataFrame({"age": [1]}))
        tr.categorize_age(pd.DataFrame({"bmi_calculated": [1]}))
        # recalculate_bmi else branch (bmi_calculated not in df.columns)
        tr.recalculate_bmi(pd.DataFrame({"weight_kg": [80], "height_cm": [180]}))
        # categorize_bmi NaN branch
        tr.categorize_bmi(pd.DataFrame({"bmi_calculated": [float("nan")]}))
        # categorize_age NaN branch
        tr.categorize_age(pd.DataFrame({"age": [float("nan")]}))

        # calculate_calories_per_hour skip branch
        tr.calculate_calories_per_hour(pd.DataFrame({"x": [1]}))

        # apply_all_transformations transformer None branch
        apply_all_transformations(pd.DataFrame({"a": [1]}), "unknown_table", transformer=None)

    def test_validator_branches_and_summaries(self):
        v = DataValidator()

        # float type check branch
        self.assertTrue(v._check_type("1.0", "float"))
        self.assertFalse(v._check_type("x", "float"))

        # str type check branch
        self.assertTrue(v._check_type("x", "str"))
        # unknown type branch
        self.assertTrue(v._check_type("x", "unknown"))

        # validate_dataframe with missing required cols to create errors
        bad_patient = pd.DataFrame({"gender": ["BAD"]})
        rep = v.validate_dataframe(bad_patient, "patient")
        self.assertGreater(rep.error_count, 0)
        _ = rep.summary()  # includes errors block

        # create warnings via coherence (BMI)
        df = pd.DataFrame(
            {"weight_kg": [80], "height_cm": [180], "bmi_calculated": [10], "age": [30], "gender": ["Male"]}
        )
        rep2 = v.validate_dataframe(df, "patient")
        rep2.warnings.extend(v.validate_coherence(df, "patient"))
        _ = rep2.summary()

        print_validation_summary({"patient": rep2})

        # validation_rate branch when total_rows == 0
        from Pipelines.validators import ValidationReport

        empty_report = ValidationReport(table_name="t", total_rows=0, valid_rows=0, invalid_rows=0)
        self.assertEqual(empty_report.validation_rate, 100.0)

        # validate_value null but nullable=True (returns empty)
        self.assertEqual(v.validate_value(None, {"nullable": True, "type": "int"}, "x", 0), [])

        # validate_value min/max except branches (no type, non-numeric)
        _ = v.validate_value("abc", {"nullable": True, "min": 1}, "x", 0)
        _ = v.validate_value("abc", {"nullable": True, "max": 1}, "x", 0)
        # validate_value max error path
        rmax = v.validate_value(10, {"nullable": True, "max": 1}, "x", 0)
        self.assertTrue(any(not x.is_valid for x in rmax))

        # cover pattern success branch (no error appended)
        okp = v.validate_value("123", {"nullable": True, "type": "str", "pattern": r"^[0-9]+$"}, "p", 0)
        self.assertEqual(okp, [])

        # coherence branches for gym_session: bpm warning + calories/hour warning
        gym = pd.DataFrame(
            {
                "gym_max_bpm": [100],
                "gym_avg_bpm": [120],  # invalid ordering
                "gym_resting_bpm": [80],
                "gym_calories_burned": [10],
                "gym_session_duration_hours": [10],  # low cal/h
            }
        )
        warnings = v.validate_coherence(gym, "gym_session")
        self.assertGreaterEqual(len(warnings), 1)

        # cover coherence branches/excepts
        # patient coherence exception branch (non-numeric)
        _ = v.validate_coherence(pd.DataFrame({"weight_kg": ["x"], "height_cm": [180], "bmi_calculated": [20]}), "patient")
        # gym_session bpm all() false branch (one missing)
        _ = v.validate_coherence(pd.DataFrame({"gym_max_bpm": [100], "gym_avg_bpm": [90], "gym_resting_bpm": [None]}), "gym_session")
        # gym_session bpm exception branch
        _ = v.validate_coherence(pd.DataFrame({"gym_max_bpm": ["x"], "gym_avg_bpm": [90], "gym_resting_bpm": [80]}), "gym_session")
        # calories coherence if-guard false (duration zero)
        _ = v.validate_coherence(pd.DataFrame({"gym_calories_burned": [100], "gym_session_duration_hours": [0]}), "gym_session")
        # calories coherence exception branch
        _ = v.validate_coherence(pd.DataFrame({"gym_calories_burned": ["x"], "gym_session_duration_hours": [1]}), "gym_session")

        # cover validate_dataframe WARNING branch by monkeypatching validate_value
        from Pipelines.validators import ValidationResult, ValidationSeverity
        orig_validate_value = v.validate_value
        try:
            def fake_validate_value(value, rule, field_name, row_index=None):
                return [
                    ValidationResult(
                        is_valid=True,
                        field=field_name,
                        value=value,
                        rule="fake",
                        message="warn",
                        severity=ValidationSeverity.WARNING,
                        row_index=row_index,
                    )
                ]
            v.validate_value = fake_validate_value
            repw = v.validate_dataframe(pd.DataFrame({"age": [20]}), "patient")
            self.assertGreaterEqual(repw.warning_count, 1)
        finally:
            v.validate_value = orig_validate_value

        # cover validate_dataframe branch where severity is neither ERROR nor WARNING
        orig_validate_value = v.validate_value
        try:
            def fake_info(value, rule, field_name, row_index=None):
                return [
                    ValidationResult(
                        is_valid=True,
                        field=field_name,
                        value=value,
                        rule="fake",
                        message="info",
                        severity=ValidationSeverity.INFO,
                        row_index=row_index,
                    )
                ]
            v.validate_value = fake_info
            _ = v.validate_dataframe(pd.DataFrame({"age": [20]}), "patient")
        finally:
            v.validate_value = orig_validate_value

    def test_pipeline_error_and_optional_sources_and_report(self):
        repo = Path(__file__).resolve().parents[1]
        tmp = Path(tempfile.mkdtemp(prefix="mspr_cov_"))
        # minimal required CSVs
        pd.read_csv(repo / "diet_recommendations.csv").head(5).to_csv(tmp / "diet_recommendations.csv", index=False)
        pd.read_csv(repo / "gym_members_exercise.csv").head(5).to_csv(tmp / "gym_members_exercise.csv", index=False)
        pd.read_csv(repo / "daily_food_nutrition.csv").head(5).to_csv(tmp / "daily_food_nutrition.csv", index=False)

        # valid json branch
        (tmp / "exercises.json").write_text(json.dumps([{"id": 1, "name": "t"}]), encoding="utf-8")
        # excel branch will raise (no engine), but should be caught as WARNING if optional
        (tmp / "optional.xlsx").write_bytes(b"not-a-real-xlsx")

        db_path = tmp / "db.sqlite"
        report_dir = tmp / "reports"

        pipeline = ETLPipeline(data_dir=str(tmp), db_path=str(db_path), report_dir=str(report_dir))

        # custom file mappings to hit branches + optional warning path
        pipeline.extract(
            file_mappings={
                "diet": "diet_recommendations.csv",
                "gym": "gym_members_exercise.csv",
                "food_log": "daily_food_nutrition.csv",
                "exercise": "exercises.json",
                "optional": "optional.xlsx",
            }
        )
        pipeline.clean()
        pipeline.transform()
        pipeline.validate()
        self.assertTrue(pipeline.load())
        pipeline.calculate_metrics()

        # report generation branch
        report = pipeline.generate_report()
        self.assertIn("summary", report)
        self.assertTrue(any(p.name.startswith("etl_report_") for p in report_dir.glob("etl_report_*.json")))

        # log_operation branches
        pipeline.log_operation("X", "warn", "WARNING")
        pipeline.log_operation("X", "err", "ERROR")

        # exercise load path exists
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = {r[0] for r in cur.fetchall()}
        conn.close()
        self.assertIn("food_log", tables)

        # cover print_metrics_summary
        print_metrics_summary(calculate_all_metrics(pipeline.transformed_data))

        # cover pipeline.transform branches when sources are missing/empty
        p2 = ETLPipeline(data_dir=str(tmp), db_path=str(tmp / "db2.sqlite"), report_dir=str(tmp / "r2"))
        p2.cleaned_data = {}
        p2.transform()

        # cover pipeline.load error branch
        bad_db_dir = tmp / "not_a_db_dir"
        bad_db_dir.mkdir(exist_ok=True)
        p3 = ETLPipeline(data_dir=str(tmp), db_path=str(bad_db_dir), report_dir=str(tmp / "r3"))
        p3.transformed_data = {"patient": pd.DataFrame({"a": [1]})}
        self.assertFalse(p3.load())

        # cover pipeline.run error branch (missing required file)
        p4 = ETLPipeline(data_dir=str(tmp), db_path=str(tmp / "db4.sqlite"), report_dir=str(tmp / "r4"))
        res = p4.run(file_mappings={"diet": "missing.csv"}, validate_data=False, generate_report=False)
        # Pipeline logs extraction error but continues; ensure it recorded an ERROR operation.
        self.assertIn(res["status"], ("SUCCESS", "ERROR"))
        self.assertTrue(any(e["status"] == "ERROR" for e in p4.operations_log))

        # cover pipeline.clean duplicate log (values_modified > 0)
        p_dup = ETLPipeline(data_dir=str(tmp), db_path=str(tmp / "ddup.sqlite"), report_dir=str(tmp / "rdup"))
        p_dup.raw_data = {"x": pd.DataFrame({"a": [1, 1], "b": [2, 2]})}
        p_dup.clean()

        # cover Patient_ID generation branch in transform
        p_ids = ETLPipeline(data_dir=str(tmp), db_path=str(tmp / "dids.sqlite"), report_dir=str(tmp / "rids"))
        p_ids.cleaned_data = {
            "diet": pd.DataFrame(
                {
                    "Age": [30],
                    "Gender": ["Male"],
                    "Weight_kg": [80.0],
                    "Height_cm": [180.0],
                    "BMI_Calculated": [24.7],
                }
            ),
            "gym": pd.DataFrame(),  # keep empty to skip
        }
        p_ids.transform()
        self.assertIn("patient", p_ids.transformed_data)

        # cover food_log date branch false (no Date column)
        p_food = ETLPipeline(data_dir=str(tmp), db_path=str(tmp / "dfood.sqlite"), report_dir=str(tmp / "rfood"))
        p_food.cleaned_data = {"food_log": pd.DataFrame({"User_ID": [1], "Food_Item": ["x"]})}
        p_food.transform()

        # cover exercise_id insert branch (no id fields)
        p_ex = ETLPipeline(data_dir=str(tmp), db_path=str(tmp / "dex.sqlite"), report_dir=str(tmp / "rex"))
        p_ex.cleaned_data = {"exercise": pd.DataFrame({"name": ["x"], "equipment": ["bw"]})}
        p_ex.transform()

        # cover run() generate_report branch
        p_run = ETLPipeline(data_dir=str(tmp), db_path=str(tmp / "drun.sqlite"), report_dir=str(tmp / "rrun"))
        p_run.raw_data = {
            "diet": pd.read_csv(tmp / "diet_recommendations.csv"),
            "gym": pd.read_csv(tmp / "gym_members_exercise.csv"),
            "food_log": pd.read_csv(tmp / "daily_food_nutrition.csv"),
            "exercise": pd.read_json(tmp / "exercises.json"),
        }
        p_run.clean()
        p_run.transform()
        out = p_run.run(
            file_mappings={
                "diet": "diet_recommendations.csv",
                "gym": "gym_members_exercise.csv",
                "food_log": "daily_food_nutrition.csv",
                "exercise": "exercises.json",
            },
            validate_data=False,
            generate_report=True,
        )
        self.assertEqual(out["status"], "SUCCESS")

        # cover run() exception branch
        p_err = ETLPipeline(data_dir=str(tmp), db_path=str(tmp / "derr.sqlite"), report_dir=str(tmp / "rerr"))
        def boom(*args, **kwargs):
            raise RuntimeError("boom")
        p_err.extract = boom
        out2 = p_err.run(validate_data=False, generate_report=False)
        self.assertEqual(out2["status"], "ERROR")

        # cover run_etl() helper
        _ = run_etl(data_dir=str(tmp), db_path=str(tmp / "dhelper.sqlite"), report_dir=str(tmp / "rhelper"))

    def test_load_schema_init_and_etl_run_tracking(self):
        """
        Le nouveau ``load()`` applique ``BDD.sql`` puis ``DELETE + append``
        de façon idempotente, et trace chaque run dans la table ``etl_run``.
        """
        with tempfile.TemporaryDirectory() as d:
            tmp = Path(d)
            db_path = tmp / "schema.db"
            pipeline = ETLPipeline(
                data_dir=str(tmp),
                db_path=str(db_path),
                report_dir=str(tmp / "reports"),
            )
            pipeline.transformed_data = {
                "patient": pd.DataFrame(
                    {
                        "patient_id": ["P00001", "P00002"],
                        "age": [30, 45],
                        "gender": ["Male", "Female"],
                        "weight_kg": [80.0, 65.0],
                        "height_cm": [180.0, 165.0],
                        "bmi_calculated": [24.7, 23.9],
                        "bmi_category": ["Normal", "Normal"],
                        "age_group": ["Adulte", "Adulte"],
                    }
                )
            }

            # Premier run : schéma appliqué, 2 patients insérés, 1 ligne etl_run.
            self.assertTrue(pipeline.load())

            conn = sqlite3.connect(db_path)
            tables = {r[0] for r in conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            )}
            self.assertIn("patient", tables)
            self.assertIn("etl_run", tables)
            self.assertIn("sante", tables)  # créée via BDD.sql même si vide

            patient_count = conn.execute(
                "SELECT COUNT(*) FROM patient"
            ).fetchone()[0]
            self.assertEqual(patient_count, 2)

            run_count = conn.execute(
                "SELECT COUNT(*) FROM etl_run"
            ).fetchone()[0]
            self.assertEqual(run_count, 1)

            # Vérifie que le statut et les compteurs sont bien enregistrés.
            row = conn.execute(
                "SELECT status, total_rows, tables_loaded FROM etl_run"
            ).fetchone()
            self.assertEqual(row[0], "SUCCESS")
            self.assertEqual(row[1], 2)
            loaded = json.loads(row[2])
            self.assertEqual(loaded["patient"], 2)

            # Vérifie la présence des index analytiques.
            indexes = {r[0] for r in conn.execute(
                "SELECT name FROM sqlite_master WHERE type='index'"
            )}
            self.assertIn("idx_patient_bmi_category", indexes)
            self.assertIn("idx_etl_run_started", indexes)
            conn.close()

            # Second run : idempotence — toujours 2 patients, mais 2 runs tracés.
            self.assertTrue(pipeline.load())
            conn = sqlite3.connect(db_path)
            self.assertEqual(
                conn.execute("SELECT COUNT(*) FROM patient").fetchone()[0], 2
            )
            self.assertEqual(
                conn.execute("SELECT COUNT(*) FROM etl_run").fetchone()[0], 2
            )
            conn.close()

    def test_load_schema_file_missing_branch(self):
        """Si ``BDD.sql`` est absent, ``load`` crée les tables via ``to_sql``."""
        with tempfile.TemporaryDirectory() as d:
            tmp = Path(d)
            pipeline = ETLPipeline(
                data_dir=str(tmp),
                db_path=str(tmp / "noschema.db"),
                report_dir=str(tmp / "r"),
            )
            pipeline.SCHEMA_FILE = tmp / "nonexistent.sql"
            pipeline.transformed_data = {
                "custom_table": pd.DataFrame({"a": [1, 2]})
            }
            self.assertTrue(pipeline.load())

            conn = sqlite3.connect(pipeline.db_path)
            rows = conn.execute("SELECT COUNT(*) FROM custom_table").fetchone()
            self.assertEqual(rows[0], 2)
            # Pas d'etl_run puisque BDD.sql n'a pas été appliqué.
            tables = {r[0] for r in conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            )}
            self.assertNotIn("etl_run", tables)
            conn.close()

    def test_load_status_warning_on_validation_errors(self):
        """Le statut etl_run passe à ``WARNING`` quand la validation remonte des erreurs."""
        from Pipelines.validators import (
            ValidationReport,
            ValidationResult,
            ValidationSeverity,
        )

        with tempfile.TemporaryDirectory() as d:
            tmp = Path(d)
            pipeline = ETLPipeline(
                data_dir=str(tmp),
                db_path=str(tmp / "warn.db"),
                report_dir=str(tmp / "r"),
            )
            pipeline.transformed_data = {
                "patient": pd.DataFrame(
                    {
                        "patient_id": ["P00001"],
                        "age": [30],
                        "gender": ["Male"],
                        "weight_kg": [80.0],
                        "height_cm": [180.0],
                        "bmi_calculated": [24.7],
                        "bmi_category": ["Normal"],
                        "age_group": ["Adulte"],
                    }
                )
            }
            fake_report = ValidationReport(
                table_name="patient",
                total_rows=1,
                valid_rows=0,
                invalid_rows=1,
            )
            fake_report.errors.append(
                ValidationResult(
                    is_valid=False,
                    field="patient_id",
                    value="P00001",
                    rule="fake",
                    message="boom",
                    severity=ValidationSeverity.ERROR,
                )
            )
            pipeline.validation_reports = {"patient": fake_report}

            self.assertTrue(pipeline.load())

            conn = sqlite3.connect(pipeline.db_path)
            status, errors = conn.execute(
                "SELECT status, error_count FROM etl_run ORDER BY run_id DESC LIMIT 1"
            ).fetchone()
            conn.close()
            self.assertEqual(status, "WARNING")
            self.assertEqual(errors, 1)

    def test_metrics_remaining_branches(self):
        # cover ColumnStats.to_dict branches (numeric + top_values)
        cs = ColumnStats(
            column_name="x",
            data_type="int",
            non_null_count=1,
            null_count=0,
            null_percentage=0.0,
            unique_count=1,
            min_value=1.0,
            max_value=2.0,
            mean_value=1.5,
            median_value=1.5,
            std_value=0.1,
            q1_value=1.0,
            q3_value=2.0,
            top_values=[("a", 1)],
        )
        d = cs.to_dict()
        self.assertIn("top_values", d)
        self.assertIn("min", d)

        # cover TableStats.to_dict simple
        ts = TableStats(table_name="t", row_count=0, column_count=0, memory_usage_mb=0.0, columns_stats=[cs])
        self.assertIn("columns", ts.to_dict())

    # ------------------------------------------------------------------
    # _reconcile_foreign_keys : couverture complète des branches
    # ------------------------------------------------------------------

    def _make_pipeline(self):
        p = ETLPipeline(data_dir="./Data", db_path=":memory:")
        p.transformed_data = {}
        p.operations_log = []
        return p

    def test_reconcile_fk_no_patient_is_noop(self):
        """Sans table `patient`, la réconciliation ne fait rien."""
        p = self._make_pipeline()
        p.transformed_data["gym_session"] = pd.DataFrame(
            {"patient_id": ["P0001", "P0002"]}
        )
        result = p._reconcile_foreign_keys()
        self.assertEqual(result, {})
        # Et les données enfants ne sont pas modifiées.
        self.assertEqual(len(p.transformed_data["gym_session"]), 2)

    def test_reconcile_fk_drops_orphans_and_realigns_width(self):
        """Les enfants au format P00001 sont ré-alignés sur P0001, et les
        vrais orphelins (>N) sont supprimés."""
        p = self._make_pipeline()
        p.transformed_data["patient"] = pd.DataFrame(
            {"patient_id": ["P0001", "P0002", "P0003"]}
        )
        # 5 sessions dont 2 orphelines (P0004 et P0005 n'existent pas),
        # et 3 valides mais au format large → doivent être re-padées à 4.
        p.transformed_data["gym_session"] = pd.DataFrame(
            {
                "patient_id": ["P00001", "P00002", "P00003", "P00004", "P00005"],
                "val": [1, 2, 3, 4, 5],
            }
        )
        result = p._reconcile_foreign_keys()
        self.assertEqual(result.get("gym_session"), 2)
        kept = p.transformed_data["gym_session"]
        self.assertEqual(len(kept), 3)
        self.assertListEqual(
            sorted(kept["patient_id"].tolist()),
            ["P0001", "P0002", "P0003"],
        )

    def test_reconcile_fk_mixed_patient_widths_skip_realign(self):
        """Quand la largeur canonique des patients n'est pas unique, aucun
        ré-alignement n'est tenté (couvre la branche `canonical_digits is None`)
        et seules les lignes strictement orphelines sont supprimées."""
        p = self._make_pipeline()
        p.transformed_data["patient"] = pd.DataFrame(
            {"patient_id": ["P0001", "P00002"]}  # largeurs différentes
        )
        p.transformed_data["sante"] = pd.DataFrame(
            {"patient_id": ["P0001", "P00002", "P9999"], "v": [1, 2, 3]}
        )
        result = p._reconcile_foreign_keys()
        self.assertEqual(result.get("sante"), 1)
        self.assertSetEqual(
            set(p.transformed_data["sante"]["patient_id"].tolist()),
            {"P0001", "P00002"},
        )

    def test_reconcile_fk_non_matching_format_is_left_alone(self):
        """Les patient_id qui ne respectent pas le pattern P+chiffres sont
        laissés tels quels par _realign (couvre le early-return de la closure)
        puis supprimés comme orphelins."""
        p = self._make_pipeline()
        p.transformed_data["patient"] = pd.DataFrame({"patient_id": ["P0001"]})
        p.transformed_data["nutrition"] = pd.DataFrame(
            {"patient_id": ["P0001", "XYZ42", "P_BAD"], "v": [1, 2, 3]}
        )
        result = p._reconcile_foreign_keys()
        self.assertEqual(result.get("nutrition"), 2)
        kept = p.transformed_data["nutrition"]
        self.assertListEqual(kept["patient_id"].tolist(), ["P0001"])


if __name__ == "__main__":
    unittest.main()

