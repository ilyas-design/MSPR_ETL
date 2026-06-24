import json
import subprocess
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[3]
SCRIPT = REPO_ROOT / "scripts" / "eval_food_model.py"


def _import_eval_module():
    scripts_dir = str(REPO_ROOT / "scripts")
    if scripts_dir not in sys.path:
        sys.path.insert(0, scripts_dir)
    import eval_food_model

    return eval_food_model


def test_compute_metrics_perfect():
    mod = _import_eval_module()
    metrics = mod.compute_metrics(["apple_pie", "pizza"], ["apple_pie", "pizza"])
    assert metrics["accuracy"] == 1.0
    assert metrics["macro_f1"] == 1.0


def test_compute_metrics_partial():
    mod = _import_eval_module()
    metrics = mod.compute_metrics(
        ["apple_pie", "apple_pie", "pizza"],
        ["apple_pie", "pizza", "pizza"],
    )
    assert metrics["accuracy"] == pytest.approx(0.6667)
    assert metrics["per_class"]["apple_pie"]["recall"] == 0.5
    assert metrics["per_class"]["pizza"]["precision"] == 0.5


def test_mock_predict_is_deterministic():
    mod = _import_eval_module()
    assert mod.mock_predict("apple_pie", 0) == "apple_pie"
    assert mod.mock_predict("apple_pie", 2) != "apple_pie"


def test_eval_cli_mock_writes_report(tmp_path):
    output = tmp_path / "food_model_eval.json"
    result = subprocess.run(
        [
            sys.executable,
            str(SCRIPT),
            "--mock",
            "--output",
            str(output),
        ],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr or result.stdout

    report = json.loads(output.read_text(encoding="utf-8"))
    assert report["mode"] == "mock"
    assert report["model"] == "nateraw/food"
    assert report["dataset"]["evaluated"] == 10
    assert "macro_f1" in report["metrics"]
    assert report["metrics"]["accuracy"] == 0.8
    assert len(report["predictions"]) == 10
