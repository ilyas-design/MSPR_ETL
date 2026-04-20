import io
import json
import os
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path

from Pipelines.monitoring import (
    MonitoringThresholds,
    build_monitoring_snapshot,
    evaluate_report,
    load_reports,
    print_monitoring_summary,
    save_monitoring_snapshot,
)


def _report_payload(total_rows=1500, total_errors=0, total_warnings=10, rate=100.0,
                     timestamp="2026-04-16T10:00:00"):
    return {
        "timestamp": timestamp,
        "summary": {
            "tables_processed": 7,
            "total_rows": total_rows,
            "total_errors": total_errors,
            "total_warnings": total_warnings,
        },
        "validation_reports": {
            "patient": {"validation_rate": rate},
            "sante": {"validation_rate": rate},
        },
    }


class TestMonitoring(unittest.TestCase):
    def _write_report(self, folder: Path, name: str, total_rows: int, total_errors: int,
                       total_warnings: int, rate: float, timestamp="2026-04-16T10:00:00"):
        payload = _report_payload(total_rows, total_errors, total_warnings, rate, timestamp)
        (folder / name).write_text(json.dumps(payload), encoding="utf-8")

    def test_thresholds_to_dict(self):
        thresholds = MonitoringThresholds(max_errors=1, max_warnings=50,
                                          min_total_rows=10, min_validation_rate=95.0)
        self.assertEqual(thresholds.to_dict(), {
            "max_errors": 1,
            "max_warnings": 50,
            "min_total_rows": 10,
            "min_validation_rate": 95.0,
        })

    def test_evaluate_report_ok(self):
        result = evaluate_report(_report_payload(), MonitoringThresholds())
        self.assertEqual(result["status"], "OK")
        self.assertEqual(len(result["alerts"]), 0)

    def test_evaluate_report_critical_on_errors_and_rate(self):
        report = _report_payload(total_rows=500, total_errors=2,
                                 total_warnings=500, rate=80.0)
        result = evaluate_report(report, MonitoringThresholds())
        self.assertEqual(result["status"], "CRITICAL")
        codes = {alert["code"] for alert in result["alerts"]}
        self.assertIn("ERRORS_ABOVE_THRESHOLD", codes)
        self.assertIn("VALIDATION_RATE_BELOW_THRESHOLD", codes)
        self.assertIn("WARNINGS_ABOVE_THRESHOLD", codes)
        self.assertIn("ROW_VOLUME_BELOW_THRESHOLD", codes)

    def test_evaluate_report_warning_only(self):
        report = _report_payload(total_rows=500, total_errors=0,
                                 total_warnings=500, rate=100.0)
        result = evaluate_report(report, MonitoringThresholds())
        self.assertEqual(result["status"], "WARNING")

    def test_evaluate_report_handles_empty_validation_reports(self):
        payload = _report_payload()
        payload["validation_reports"] = {}
        result = evaluate_report(payload, MonitoringThresholds())
        self.assertEqual(result["status"], "OK")
        self.assertEqual(result["metrics"]["min_validation_rate"], 100.0)

    def test_load_reports_missing_directory(self):
        self.assertEqual(load_reports("/path/does/not/exist/hopefully"), [])

    def test_load_reports_skips_invalid_json(self):
        with tempfile.TemporaryDirectory(prefix="mspr_monitoring_bad_") as tmp:
            folder = Path(tmp)
            (folder / "etl_report_broken.json").write_text("{not json", encoding="utf-8")
            self._write_report(folder, "etl_report_ok.json", 1500, 0, 10, 100.0)
            reports = load_reports(str(folder))
            self.assertEqual(len(reports), 1)
            self.assertEqual(reports[0]["_source_file"], "etl_report_ok.json")

    def test_build_monitoring_snapshot_no_reports(self):
        with tempfile.TemporaryDirectory(prefix="mspr_monitoring_empty_") as tmp:
            snapshot = build_monitoring_snapshot(report_dir=tmp)
            self.assertEqual(snapshot["reports_found"], 0)
            self.assertEqual(snapshot["overall_status"], "WARNING")
            self.assertTrue(any(a["code"] == "NO_REPORT_FOUND" for a in snapshot["alerts"]))

    def test_build_monitoring_snapshot_warning(self):
        with tempfile.TemporaryDirectory(prefix="mspr_monitoring_") as tmp:
            report_dir = Path(tmp)
            self._write_report(report_dir, "etl_report_20260416_100000.json",
                               900, 0, 300, 98.0, "2026-04-16T10:00:00")
            self._write_report(report_dir, "etl_report_20260416_101000.json",
                               1000, 0, 200, 100.0, "2026-04-16T10:10:00")

            reports = load_reports(str(report_dir))
            self.assertEqual(len(reports), 2)

            snapshot = build_monitoring_snapshot(
                report_dir=str(report_dir),
                thresholds=MonitoringThresholds(max_warnings=250, min_total_rows=1000,
                                                min_validation_rate=99.0),
                trend_window=2,
            )

            self.assertEqual(snapshot["reports_found"], 2)
            self.assertIn(snapshot["overall_status"], {"OK", "WARNING", "CRITICAL"})
            self.assertIn("delta_vs_previous", snapshot["trend"])
            self.assertTrue(snapshot["trend"]["delta_vs_previous"])

    def test_build_monitoring_snapshot_single_report_no_delta(self):
        with tempfile.TemporaryDirectory(prefix="mspr_monitoring_single_") as tmp:
            folder = Path(tmp)
            self._write_report(folder, "etl_report_one.json", 1500, 0, 10, 100.0)
            snapshot = build_monitoring_snapshot(report_dir=str(folder), trend_window=0)
            self.assertEqual(snapshot["reports_found"], 1)
            self.assertEqual(snapshot["trend"]["delta_vs_previous"], {})

    def test_save_monitoring_snapshot_writes_json(self):
        with tempfile.TemporaryDirectory(prefix="mspr_monitoring_save_") as tmp:
            output = os.path.join(tmp, "nested", "snapshot.json")
            snapshot = {"overall_status": "OK", "alerts": []}
            path = save_monitoring_snapshot(snapshot, output)
            self.assertTrue(Path(path).is_file())
            self.assertEqual(json.loads(Path(path).read_text(encoding="utf-8")), snapshot)

    def test_print_monitoring_summary_outputs_sections(self):
        with tempfile.TemporaryDirectory(prefix="mspr_monitoring_print_") as tmp:
            folder = Path(tmp)
            self._write_report(folder, "etl_report_a.json", 900, 0, 300, 98.0,
                               "2026-04-16T10:00:00")
            self._write_report(folder, "etl_report_b.json", 1000, 1, 100, 99.5,
                               "2026-04-16T10:05:00")
            snapshot = build_monitoring_snapshot(
                report_dir=str(folder),
                thresholds=MonitoringThresholds(max_warnings=250, min_total_rows=1000,
                                                min_validation_rate=99.0),
                trend_window=2,
            )
            buf = io.StringIO()
            with redirect_stdout(buf):
                print_monitoring_summary(snapshot)
            output = buf.getvalue()
            self.assertIn("SUPERVISION ETL", output)
            self.assertIn("Dernier run", output)
            self.assertIn("Alertes", output)
            self.assertIn("Tendance", output)

    def test_print_monitoring_summary_without_validation_rate(self):
        snapshot = {
            "generated_at": "2026-04-16T10:00:00",
            "report_dir": "reports",
            "reports_found": 1,
            "overall_status": "OK",
            "latest_run": {
                "source_file": "etl_report.json",
                "timestamp": "2026-04-16T10:00:00",
                "status": "OK",
                "alerts": [],
                "metrics": {
                    "total_rows": 10,
                    "total_errors": 0,
                    "total_warnings": 0,
                    "min_validation_rate": None,
                    "timestamp": "2026-04-16T10:00:00",
                },
            },
            "alerts": [],
            "trend": {"window": 1, "series": [], "delta_vs_previous": {}},
        }
        buf = io.StringIO()
        with redirect_stdout(buf):
            print_monitoring_summary(snapshot)
        output = buf.getvalue()
        self.assertIn("Dernier run", output)
        self.assertNotIn("Taux validation", output)

    def test_print_monitoring_summary_without_alerts(self):
        snapshot = {
            "generated_at": "2026-04-16T10:00:00",
            "report_dir": "reports",
            "reports_found": 0,
            "overall_status": "OK",
            "latest_run": None,
            "alerts": [],
            "trend": {"window": 5, "series": [], "delta_vs_previous": {}},
        }
        buf = io.StringIO()
        with redirect_stdout(buf):
            print_monitoring_summary(snapshot)
        self.assertIn("Aucune alerte active", buf.getvalue())


if __name__ == "__main__":
    unittest.main()
