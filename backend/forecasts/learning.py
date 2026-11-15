"""Regional quantile-correction experiment with chronological publication gates.

No model is trained from two disaster stories, synthetic fixtures or observations
that became available after prediction time. A dataset is an explicit, reviewed
archive export; software tests never make it eligible for production inference.
"""

import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_pinball_loss

from .catalog import ROOT, region

DIRECTORY = ROOT / "artifacts/runtime/forecasts/models"
FEATURES = [
    "raw_p10_mm",
    "raw_median_mm",
    "raw_p90_mm",
    "antecedent_7d_mm",
    "lead_hours",
    "month_sin",
    "month_cos",
]


def validate_rows(rows: list[dict]) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    if not 100 <= len(rows) <= 100000:
        raise ValueError(
            "Supply 100–100,000 genuine forecast/observation pairs; scientific gates require multiple years."
        )
    seen = set()
    for row in rows:
        issue = datetime.fromisoformat(row["retrieved_at"])
        target = datetime.fromisoformat(row["target_start"])
        known = datetime.fromisoformat(row["features_available_at"])
        end = datetime.fromisoformat(row["target_end"])
        if (
            any(t.tzinfo is None for t in (issue, target, known, end))
            or known > issue
            or issue >= target
            or (end - target).total_seconds() != 86400
            or target.utcoffset().total_seconds() != 0
            or target.hour
            or target.minute
            or target.second
        ):
            raise ValueError("Target/support or input-availability leakage detected.")
        if (
            abs((target - issue).total_seconds() / 3600 - row["lead_hours"]) > 1e-6
            or not 0 < row["lead_hours"] <= 72
        ):
            raise ValueError("Forecast lead does not match the declared target.")
        if len(row["forecast_sha256"]) != 64 or len(row["observation_sha256"]) != 64:
            raise ValueError(
                "Both forecast and observation provenance hashes are required."
            )
        observed_at = datetime.fromisoformat(row["observation_available_at"])
        if observed_at.tzinfo is None or observed_at < end:
            raise ValueError(
                "Observation availability must follow the entire reference day."
            )
        key = (row["retrieved_at"], row["target_start"])
        if key in seen:
            raise ValueError("Duplicate forecast/target pair.")
        seen.add(key)
        values = [row[f] for f in FEATURES] + [row["observed_mm"]]
        if any(
            isinstance(v, bool) or not isinstance(v, (int, float)) or not np.isfinite(v)
            for v in values
        ):
            raise ValueError(
                "Missing or invalid features are not imputed for this model."
            )
        if (
            min(
                row["raw_p10_mm"],
                row["raw_median_mm"],
                row["raw_p90_mm"],
                row["antecedent_7d_mm"],
                row["observed_mm"],
            )
            < 0
            or not row["raw_p10_mm"] <= row["raw_median_mm"] <= row["raw_p90_mm"]
        ):
            raise ValueError("Invalid precipitation features or quantile ordering.")
    return (
        np.array([[r[f] for f in FEATURES] for r in rows]),
        np.array([r["observed_mm"] for r in rows]),
        np.array([r["target_start"][:4] for r in rows]),
    )


def experiment(rows: list[dict]) -> tuple[dict, dict]:
    x, y, years = validate_rows(rows)
    distinct = sorted(set(years))
    if len(distinct) < 4:
        raise ValueError(
            "At least four target years are required: training years, calibration year and untouched test year."
        )
    train = years < distinct[-2]
    cal = years == distinct[-2]
    test = years == distinct[-1]
    # Embargo labels not yet available at the following fold's first issue.
    issue = np.array([datetime.fromisoformat(r["retrieved_at"]) for r in rows])
    label_available = np.array(
        [datetime.fromisoformat(r["observation_available_at"]) for r in rows]
    )
    train &= label_available < min(issue[cal])
    cal &= label_available < min(issue[test])
    # Split by target year, never randomly by overlapping forecast issue time.
    for mask in (train, cal, test):
        dates = {r["target_start"] for r, m in zip(rows, mask, strict=True) if m}
        if len(dates) < 90:
            raise ValueError("Each split needs at least 90 distinct target days.")
    models = {}
    for q in (0.1, 0.5, 0.9):
        model = HistGradientBoostingRegressor(
            loss="quantile",
            quantile=q,
            max_iter=100,
            max_leaf_nodes=7,
            min_samples_leaf=20,
            learning_rate=0.05,
            random_state=42,
            early_stopping=False,
        )
        model.fit(x[train], y[train])
        models[str(q)] = model
    # Calibration fixes a nonnegative scale using only the calibration split.
    center = np.maximum(0, models["0.5"].predict(x[cal]))
    scale = float(np.clip(np.sum(y[cal]) / max(np.sum(center), 1e-9), 0.5, 2))
    predicted = np.maximum(
        0,
        np.column_stack([models[str(q)].predict(x[test]) for q in (0.1, 0.5, 0.9)])
        * scale,
    )
    crossing = bool(np.any(np.diff(predicted, axis=1) < 0))
    raw = x[test, :3]
    mae = float(mean_absolute_error(y[test], predicted[:, 1]))
    baseline = float(mean_absolute_error(y[test], raw[:, 1]))
    pinball = [
        float(mean_pinball_loss(y[test], predicted[:, i], alpha=q))
        for i, q in enumerate((0.1, 0.5, 0.9))
    ]
    raw_pinball = [
        float(mean_pinball_loss(y[test], raw[:, i], alpha=q))
        for i, q in enumerate((0.1, 0.5, 0.9))
    ]
    coverage = float(
        np.mean((y[test] >= predicted[:, 0]) & (y[test] <= predicted[:, 2]))
    )
    # Predeclared engineering gates; no calibrated flood-probability claim.
    passed = (
        not crossing
        and baseline > 0
        and mae < 0.95 * baseline
        and sum(pinball) < sum(raw_pinball)
        and 0.7 <= coverage <= 0.9
    )
    report = {
        "state": "candidate_requires_review"
        if passed
        else "withheld_no_demonstrated_added_skill",
        "features": FEATURES,
        "target": "UTC_daily_precipitation_mm_at_declared_reference_cell",
        "test_year": distinct[-1],
        "calibration_year": distinct[-2],
        "training_years": distinct[:-2],
        "test_pairs": int(test.sum()),
        "test_distinct_days": len(
            {r["target_start"] for r, m in zip(rows, test, strict=True) if m}
        ),
        "mae_mm": mae,
        "raw_forecast_mae_mm": baseline,
        "pinball": pinball,
        "raw_pinball": raw_pinball,
        "empirical_80pct_coverage": coverage,
        "quantile_crossing": crossing,
        "scale": scale,
        "human_reviewed": False,
        "production_enabled": False,
        "limits": "Pooled engineering experiment. Local/horizon skill and event false-alarm/miss validation remain required before any deployment.",
    }
    return report, {"models": models, "scale": scale}


def train(dataset: Path, identifier: str) -> dict:
    region(identifier)
    if dataset.stat().st_size > 50 * 1024 * 1024:
        raise ValueError("Training archive exceeds 50 MiB.")
    raw = dataset.read_bytes()
    archive = json.loads(raw)
    if (
        archive.get("schema_version") != "iris.forecast-training.v1"
        or archive.get("region_id") != identifier
        or archive.get("synthetic") is not False
        or archive.get("reference_product") != "GPM_3IMERGDE.07"
        or archive.get("reference_units") != "mm/day"
        or archive.get("spatial_support") != "matched_imerg_cell"
        or not archive.get("source_manifest")
    ):
        raise ValueError(
            "A genuine, support-matched NASA reference and forecast archive manifest are required."
        )
    for source in archive["source_manifest"]:
        path = (dataset.parent / source["path"]).resolve()
        if (
            not path.is_relative_to(dataset.parent.resolve())
            or not path.is_file()
            or hashlib.sha256(path.read_bytes()).hexdigest() != source["sha256"]
        ):
            raise ValueError(
                "A source artifact is missing or its digest does not match."
            )
    hashes = {s["sha256"] for s in archive["source_manifest"]}
    if any(
        r["forecast_sha256"] not in hashes or r["observation_sha256"] not in hashes
        for r in archive["rows"]
    ):
        raise ValueError(
            "Every pair must reference pinned forecast and observation artifacts."
        )
    report, model = experiment(archive["rows"])
    report.update(
        {
            "region_id": identifier,
            "dataset_sha256": hashlib.sha256(raw).hexdigest(),
            "trained_at": datetime.now(UTC).isoformat(),
        }
    )
    directory = DIRECTORY / identifier
    directory.mkdir(parents=True, exist_ok=True)
    # Model files are local training output only. Never accept a downloaded pickle.
    joblib.dump(model, directory / "candidate.joblib")
    (directory / "validation.json").write_text(
        json.dumps(report, indent=2, allow_nan=False), encoding="utf-8"
    )
    return report


def status() -> dict:
    reports = list(DIRECTORY.glob("*/validation.json")) if DIRECTORY.exists() else []
    return {
        "state": "offline_experiment_only"
        if reports
        else "awaiting_verified_training_archive",
        "detail": "Iris quantile-correction pipeline is implemented; no reviewed, horizon-validated production model is enabled. Raw ECMWF ensemble forecasts remain the published predictions.",
    }


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", type=Path, required=True)
    parser.add_argument("--region", required=True)
    args = parser.parse_args()
    print(json.dumps(train(args.dataset, args.region), indent=2))
