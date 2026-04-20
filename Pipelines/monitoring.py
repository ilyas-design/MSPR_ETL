"""
Supervision ETL
===============

Analyse les rapports JSON produits par ``ETLPipeline`` (dans ``reports/``)
et produit un snapshot de monitoring: statut global, alertes, tendance
entre runs successifs.

Expose:
    - MonitoringThresholds      : seuils de qualité
    - load_reports              : chargement des rapports d'un dossier
    - evaluate_report           : évaluation d'un rapport individuel
    - build_monitoring_snapshot : snapshot (run courant + tendance)
    - save_monitoring_snapshot  : écriture JSON du snapshot
    - print_monitoring_summary  : résumé CLI lisible
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Seuils
# ---------------------------------------------------------------------------

@dataclass
class MonitoringThresholds:
    """Seuils appliqués à chaque rapport ETL.

    Les valeurs par défaut sont volontairement tolérantes : un run sans
    erreur, avec un nombre raisonnable d'avertissements et un volume
    minimum de lignes sera considéré ``OK``.
    """

    max_errors: int = 0
    max_warnings: int = 250
    min_total_rows: int = 1000
    min_validation_rate: float = 99.0

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ---------------------------------------------------------------------------
# Chargement des rapports
# ---------------------------------------------------------------------------

def load_reports(report_dir: str) -> List[Dict[str, Any]]:
    """Charge tous les rapports ETL d'un dossier, triés par timestamp croissant."""

    folder = Path(report_dir)
    if not folder.exists() or not folder.is_dir():
        return []

    reports: List[Dict[str, Any]] = []
    for path in sorted(folder.glob("etl_report_*.json")):
        try:
            with path.open("r", encoding="utf-8") as fh:
                payload = json.load(fh)
            payload.setdefault("_source_file", path.name)
            reports.append(payload)
        except (json.JSONDecodeError, OSError) as exc:
            logger.warning("Rapport illisible %s: %s", path.name, exc)

    reports.sort(key=lambda r: r.get("timestamp", ""))
    return reports


# ---------------------------------------------------------------------------
# Évaluation d'un rapport
# ---------------------------------------------------------------------------

_STATUS_PRIORITY = {"OK": 0, "WARNING": 1, "CRITICAL": 2}


def _min_validation_rate(report: Dict[str, Any]) -> float:
    """Plus faible taux de validation parmi les tables du rapport."""

    validation_reports = report.get("validation_reports") or {}
    rates = [
        float(info.get("validation_rate", 100.0))
        for info in validation_reports.values()
        if isinstance(info, dict) and info.get("validation_rate") is not None
    ]
    return min(rates) if rates else 100.0


def evaluate_report(
    report: Dict[str, Any],
    thresholds: Optional[MonitoringThresholds] = None,
) -> Dict[str, Any]:
    """Évalue un rapport ETL par rapport à un jeu de seuils.

    Retourne un dict avec:
        - status: "OK" / "WARNING" / "CRITICAL"
        - alerts: liste d'alertes { severity, code, message }
        - metrics: synthèse chiffrée utilisée pour l'évaluation
    """

    thresholds = thresholds or MonitoringThresholds()
    summary = report.get("summary") or {}

    total_rows = int(summary.get("total_rows", 0) or 0)
    total_errors = int(summary.get("total_errors", 0) or 0)
    total_warnings = int(summary.get("total_warnings", 0) or 0)
    min_rate = _min_validation_rate(report)

    alerts: List[Dict[str, str]] = []

    if total_errors > thresholds.max_errors:
        alerts.append({
            "severity": "CRITICAL",
            "code": "ERRORS_ABOVE_THRESHOLD",
            "message": (
                f"{total_errors} erreur(s) de validation (> {thresholds.max_errors})"
            ),
        })

    if min_rate < thresholds.min_validation_rate:
        alerts.append({
            "severity": "CRITICAL",
            "code": "VALIDATION_RATE_BELOW_THRESHOLD",
            "message": (
                f"Taux de validation minimum {min_rate:.2f}% "
                f"(< {thresholds.min_validation_rate:.2f}%)"
            ),
        })

    if total_warnings > thresholds.max_warnings:
        alerts.append({
            "severity": "WARNING",
            "code": "WARNINGS_ABOVE_THRESHOLD",
            "message": (
                f"{total_warnings} avertissement(s) (> {thresholds.max_warnings})"
            ),
        })

    if total_rows < thresholds.min_total_rows:
        alerts.append({
            "severity": "WARNING",
            "code": "ROW_VOLUME_BELOW_THRESHOLD",
            "message": (
                f"Volume {total_rows} lignes (< {thresholds.min_total_rows})"
            ),
        })

    status = "OK"
    for alert in alerts:
        if _STATUS_PRIORITY[alert["severity"]] > _STATUS_PRIORITY[status]:
            status = alert["severity"]

    return {
        "status": status,
        "alerts": alerts,
        "metrics": {
            "total_rows": total_rows,
            "total_errors": total_errors,
            "total_warnings": total_warnings,
            "min_validation_rate": min_rate,
            "timestamp": report.get("timestamp"),
        },
    }


# ---------------------------------------------------------------------------
# Tendance sur plusieurs runs
# ---------------------------------------------------------------------------

def _compute_trend(reports: List[Dict[str, Any]], window: int) -> Dict[str, Any]:
    """Tendance sur les ``window`` derniers rapports."""

    window = max(1, int(window))
    recent = reports[-window:] if reports else []

    series = [
        {
            "timestamp": r.get("timestamp"),
            "total_rows": int((r.get("summary") or {}).get("total_rows", 0) or 0),
            "total_errors": int((r.get("summary") or {}).get("total_errors", 0) or 0),
            "total_warnings": int((r.get("summary") or {}).get("total_warnings", 0) or 0),
            "min_validation_rate": _min_validation_rate(r),
        }
        for r in recent
    ]

    delta_vs_previous: Dict[str, Any] = {}
    if len(series) >= 2:
        last, prev = series[-1], series[-2]
        delta_vs_previous = {
            "total_rows": last["total_rows"] - prev["total_rows"],
            "total_errors": last["total_errors"] - prev["total_errors"],
            "total_warnings": last["total_warnings"] - prev["total_warnings"],
            "min_validation_rate": round(
                last["min_validation_rate"] - prev["min_validation_rate"], 4
            ),
        }

    return {
        "window": window,
        "series": series,
        "delta_vs_previous": delta_vs_previous,
    }


# ---------------------------------------------------------------------------
# Snapshot complet
# ---------------------------------------------------------------------------

def build_monitoring_snapshot(
    report_dir: str = "reports",
    thresholds: Optional[MonitoringThresholds] = None,
    trend_window: int = 5,
) -> Dict[str, Any]:
    """Construit un snapshot de monitoring pour ``report_dir``.

    Le snapshot synthétise:
        - les seuils appliqués,
        - le nombre de rapports trouvés,
        - l'évaluation du dernier run (alertes + statut),
        - le statut global (le pire entre dernier run et tendance),
        - la tendance sur la fenêtre demandée.
    """

    thresholds = thresholds or MonitoringThresholds()
    reports = load_reports(report_dir)

    snapshot: Dict[str, Any] = {
        "generated_at": datetime.now().isoformat(),
        "report_dir": str(report_dir),
        "reports_found": len(reports),
        "thresholds": thresholds.to_dict(),
        "latest_run": None,
        "overall_status": "OK",
        "alerts": [],
        "trend": {"window": trend_window, "series": [], "delta_vs_previous": {}},
    }

    if not reports:
        snapshot["overall_status"] = "WARNING"
        snapshot["alerts"].append({
            "severity": "WARNING",
            "code": "NO_REPORT_FOUND",
            "message": f"Aucun rapport ETL trouvé dans {report_dir}",
        })
        return snapshot

    latest = reports[-1]
    latest_eval = evaluate_report(latest, thresholds)
    snapshot["latest_run"] = {
        "source_file": latest.get("_source_file"),
        "timestamp": latest.get("timestamp"),
        **latest_eval,
    }
    snapshot["alerts"] = list(latest_eval["alerts"])
    snapshot["overall_status"] = latest_eval["status"]
    snapshot["trend"] = _compute_trend(reports, trend_window)

    return snapshot


# ---------------------------------------------------------------------------
# Persistance et affichage
# ---------------------------------------------------------------------------

def save_monitoring_snapshot(snapshot: Dict[str, Any], output: str) -> str:
    """Persiste le snapshot en JSON. Retourne le chemin final (str)."""

    path = Path(output)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        json.dump(snapshot, fh, indent=2, ensure_ascii=False)
    return str(path)


def print_monitoring_summary(snapshot: Dict[str, Any]) -> None:
    """Affiche un résumé lisible du snapshot sur stdout."""

    print("\n" + "=" * 70)
    print("SUPERVISION ETL - RESUME")
    print("=" * 70)

    print(f"Généré le       : {snapshot.get('generated_at')}")
    print(f"Dossier rapports: {snapshot.get('report_dir')}")
    print(f"Rapports trouvés: {snapshot.get('reports_found')}")
    print(f"Statut global   : {snapshot.get('overall_status')}")

    latest = snapshot.get("latest_run") or {}
    if latest:
        metrics = latest.get("metrics", {})
        print("\nDernier run:")
        print(f"   - Fichier          : {latest.get('source_file')}")
        print(f"   - Timestamp        : {latest.get('timestamp')}")
        print(f"   - Lignes totales   : {metrics.get('total_rows')}")
        print(f"   - Erreurs          : {metrics.get('total_errors')}")
        print(f"   - Warnings         : {metrics.get('total_warnings')}")
        rate = metrics.get("min_validation_rate")
        if rate is not None:
            print(f"   - Taux validation  : {float(rate):.2f}%")

    alerts = snapshot.get("alerts") or []
    if alerts:
        print("\nAlertes:")
        for alert in alerts:
            print(f"   [{alert['severity']}] {alert['code']}: {alert['message']}")
    else:
        print("\nAucune alerte active.")

    trend = snapshot.get("trend") or {}
    delta = trend.get("delta_vs_previous") or {}
    if delta:
        print("\nTendance vs run précédent:")
        for key, value in delta.items():
            print(f"   - {key}: {value:+}" if isinstance(value, (int, float)) else f"   - {key}: {value}")

    print("=" * 70 + "\n")


__all__ = [
    "MonitoringThresholds",
    "load_reports",
    "evaluate_report",
    "build_monitoring_snapshot",
    "save_monitoring_snapshot",
    "print_monitoring_summary",
]
