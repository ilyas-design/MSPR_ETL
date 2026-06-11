#!/usr/bin/env python3
"""Evaluate the nateraw/food vision classifier against a labeled image dataset."""

from __future__ import annotations

import argparse
import csv
import json
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_LABELS = REPO_ROOT / "eval_dataset" / "labels.csv"
DEFAULT_IMAGES = REPO_ROOT / "eval_dataset" / "images"
DEFAULT_OUTPUT = REPO_ROOT / "reports" / "food_model_eval.json"
MODEL_ID = "nateraw/food"
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}
MOCK_WRONG_LABELS = ("beignets", "pizza", "sushi", "ramen")


def normalize_label(label: str) -> str:
    return label.strip().lower().replace(" ", "_").replace("-", "_")


def load_labels(path: Path) -> list[dict[str, str]]:
    if not path.is_file():
        raise FileNotFoundError(f"Labels file not found: {path}")

    rows: list[dict[str, str]] = []
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames or "filename" not in reader.fieldnames or "true_label" not in reader.fieldnames:
            raise ValueError("labels.csv must contain columns: filename,true_label")
        for line_no, row in enumerate(reader, start=2):
            filename = (row.get("filename") or "").strip()
            true_label = normalize_label(row.get("true_label") or "")
            if not filename or not true_label:
                raise ValueError(f"Invalid row at line {line_no}: filename and true_label are required")
            rows.append({"filename": filename, "true_label": true_label})
    return rows


def compute_metrics(y_true: list[str], y_pred: list[str]) -> dict:
    if len(y_true) != len(y_pred):
        raise ValueError("y_true and y_pred must have the same length")
    if not y_true:
        return {
            "accuracy": 0.0,
            "macro_precision": 0.0,
            "macro_recall": 0.0,
            "macro_f1": 0.0,
            "per_class": {},
            "support_total": 0,
        }

    classes = sorted(set(y_true) | set(y_pred))
    per_class: dict[str, dict[str, float | int]] = {}

    for label in classes:
        tp = sum(1 for truth, pred in zip(y_true, y_pred, strict=True) if truth == label and pred == label)
        fp = sum(1 for truth, pred in zip(y_true, y_pred, strict=True) if truth != label and pred == label)
        fn = sum(1 for truth, pred in zip(y_true, y_pred, strict=True) if truth == label and pred != label)
        support = sum(1 for truth in y_true if truth == label)

        precision = tp / (tp + fp) if (tp + fp) else 0.0
        recall = tp / (tp + fn) if (tp + fn) else 0.0
        f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) else 0.0

        per_class[label] = {
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1": round(f1, 4),
            "support": support,
        }

    correct = sum(1 for truth, pred in zip(y_true, y_pred, strict=True) if truth == pred)
    accuracy = correct / len(y_true)

    macro_precision = sum(per_class[c]["precision"] for c in classes) / len(classes)
    macro_recall = sum(per_class[c]["recall"] for c in classes) / len(classes)
    macro_f1 = sum(per_class[c]["f1"] for c in classes) / len(classes)

    return {
        "accuracy": round(accuracy, 4),
        "macro_precision": round(macro_precision, 4),
        "macro_recall": round(macro_recall, 4),
        "macro_f1": round(macro_f1, 4),
        "per_class": per_class,
        "support_total": len(y_true),
    }


def mock_predict(true_label: str, index: int) -> str:
    if index % 4 == 2:
        return MOCK_WRONG_LABELS[index % len(MOCK_WRONG_LABELS)]
    return true_label


def build_live_classifier():
    from transformers import pipeline

    return pipeline("image-classification", model=MODEL_ID)


def predict_live(classifier, image_path: Path, top_k: int = 1) -> str:
    from PIL import Image

    with Image.open(image_path) as image:
        rgb = image.convert("RGB")
    results = classifier(rgb, top_k=top_k)
    return normalize_label(results[0]["label"])


def run_evaluation(
    *,
    mock: bool,
    labels_path: Path,
    images_dir: Path,
    top_k: int,
) -> dict:
    dataset = load_labels(labels_path)
    y_true: list[str] = []
    y_pred: list[str] = []
    predictions: list[dict] = []
    skipped_missing_images: list[str] = []

    classifier = None
    if not mock:
        classifier = build_live_classifier()

    for index, row in enumerate(dataset):
        filename = row["filename"]
        true_label = row["true_label"]
        image_path = images_dir / filename

        if mock:
            predicted = mock_predict(true_label, index)
        else:
            if not image_path.is_file():
                skipped_missing_images.append(filename)
                continue
            predicted = predict_live(classifier, image_path, top_k=top_k)

        y_true.append(true_label)
        y_pred.append(predicted)
        predictions.append(
            {
                "filename": filename,
                "true_label": true_label,
                "predicted_label": predicted,
                "correct": predicted == true_label,
                "image_found": image_path.is_file(),
            }
        )

    metrics = compute_metrics(y_true, y_pred)
    return {
        "model": MODEL_ID,
        "evaluated_at": datetime.now(timezone.utc).isoformat(),
        "mode": "mock" if mock else "live",
        "dataset": {
            "labels_file": str(labels_path),
            "images_dir": str(images_dir),
            "total_labels": len(dataset),
            "evaluated": len(predictions),
            "skipped_missing_images": len(skipped_missing_images),
            "missing_files": skipped_missing_images,
        },
        "metrics": metrics,
        "predictions": predictions,
    }


def print_summary(report: dict) -> None:
    metrics = report["metrics"]
    dataset = report["dataset"]

    print(f"Model: {report['model']} ({report['mode']} mode)")
    print(f"Evaluated: {dataset['evaluated']} / {dataset['total_labels']} labeled samples")
    if dataset["skipped_missing_images"]:
        print(f"Skipped (missing image): {dataset['skipped_missing_images']}")
    print()
    print(f"Accuracy:         {metrics['accuracy']:.4f}")
    print(f"Macro precision:  {metrics['macro_precision']:.4f}")
    print(f"Macro recall:     {metrics['macro_recall']:.4f}")
    print(f"Macro F1:         {metrics['macro_f1']:.4f}")
    print()
    print("Per-class metrics:")
    for label, stats in sorted(report["metrics"]["per_class"].items()):
        print(
            f"  {label:24s}  P={stats['precision']:.4f}  "
            f"R={stats['recall']:.4f}  F1={stats['f1']:.4f}  n={stats['support']}"
        )


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate the nateraw/food vision model.")
    parser.add_argument("--mock", action="store_true", help="Use deterministic mock predictions (no model download).")
    parser.add_argument("--labels", type=Path, default=DEFAULT_LABELS, help="Path to labels.csv")
    parser.add_argument("--images-dir", type=Path, default=DEFAULT_IMAGES, help="Directory containing evaluation images")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="JSON report output path")
    parser.add_argument("--top-k", type=int, default=1, help="Top-k predictions for live mode (top-1 used for metrics)")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    report = run_evaluation(
        mock=args.mock,
        labels_path=args.labels,
        images_dir=args.images_dir,
        top_k=args.top_k,
    )

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print_summary(report)
    print()
    print(f"Report written to {args.output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
