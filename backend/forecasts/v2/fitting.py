"""Native-period supervised forecasting shared by fitting and live inference.

Sources are isolated, input availability is enforced, temporal splits are
purged by label availability, and calibration/test observations are never
used to fit the published estimator.
"""
from __future__ import annotations

import bisect
import hashlib
import json
import math
import pickle
from dataclasses import asdict
from datetime import UTC, datetime, timedelta

from . import datasets
from .schemas import ModelCard
from .variables import VARIABLES

VERSION = "native-period-v2"
COLUMNS = ([f"recent_{i}" for i in range(1, 7)] +
           ["recent_mean", "recent_std", "recent_delta", "input_age_days",
            "lead_days", "sin_doy", "cos_doy"])


def stamp(value):
    d = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    return d.replace(tzinfo=UTC) if d.tzinfo is None else d.astimezone(UTC)


def window(issue, horizon, target):
    """Next complete native calendar period, including short year-end periods."""
    issue = stamp(issue) if isinstance(issue, str) else issue
    step = VARIABLES[target]["composite_days"]
    day = issue.replace(hour=0, minute=0, second=0, microsecond=0)
    year = datetime(day.year, 1, 1, tzinfo=UTC)
    start = year + timedelta(days=((day - year).days // step) * step)
    if start <= issue:
        start = min(start + timedelta(days=step), datetime(start.year + 1, 1, 1, tzinfo=UTC))
    for _ in range(horizon):
        start = min(start + timedelta(days=step), datetime(start.year + 1, 1, 1, tzinfo=UTC))
    end = min(start + timedelta(days=step), datetime(start.year + 1, 1, 1, tzinfo=UTC))
    return start, end


class History:
    def __init__(self, records, target, source, lag_hours):
        self.target, self.source = target, source
        self.rows = []
        for r in records:
            if r.get("variable") != target or r.get("source_id") != source:
                continue
            value = float(r["value"])
            start, end = stamp(r["interval_start"]), stamp(r["interval_end"])
            if not math.isfinite(value) or start >= end:
                continue
            avail = stamp(r["available_at"]) if r.get("available_at") else end + timedelta(hours=lag_hours)
            self.rows.append({**r, "start": start, "end": end,
                              "available": max(avail, end), "value": value})
        if VARIABLES[target]["composite_days"] == 1 and self.rows and any(
                (r["end"] - r["start"]).total_seconds() < 86400 for r in self.rows):
            groups = {}
            for row in self.rows:
                groups.setdefault(row["start"].replace(hour=0, minute=0, second=0, microsecond=0), []).append(row)
            complete = []
            for day, group in groups.items():
                group.sort(key=lambda r: r["start"])
                end = day
                for row in group:
                    if row["start"] != end:
                        break
                    end = row["end"]
                else:
                    if end == day + timedelta(days=1):
                        seconds = [(r["end"] - r["start"]).total_seconds() for r in group]
                        value = sum(r["value"] for r in group) if VARIABLES[target]["aggregation"] == "sum" else sum(
                            r["value"] * sec for r, sec in zip(group, seconds)) / 86400
                        complete.append({**group[0], "start": day, "end": end, "value": value,
                                         "available": max(r["available"] for r in group)})
            self.rows = complete
        self.rows.sort(key=lambda r: r["start"])
        self.by_start = {r["start"]: r for r in self.rows}
        self.published = sorted(self.rows, key=lambda r: r["available"])
        self.available_times = [r["available"] for r in self.published]

    def inputs(self, issue):
        return self.published[:bisect.bisect_right(self.available_times, issue)]

    def feature(self, issue, horizon):
        issue = stamp(issue) if isinstance(issue, str) else issue
        start, _ = window(issue, horizon, self.target)
        past = sorted(self.inputs(issue), key=lambda r: r["end"])
        if len(past) < 6:
            return None
        recent = past[-6:]
        values = [r["value"] for r in recent][::-1]
        age = (issue - recent[-1]["end"]).total_seconds() / 86400
        lead = (start - recent[-1]["end"]).total_seconds() / 86400
        doy = start.timetuple().tm_yday
        mean = sum(values) / len(values)
        result = {f"recent_{i + 1}": v for i, v in enumerate(values)}
        result.update(recent_mean=mean, recent_std=math.sqrt(sum((v - mean) ** 2 for v in values) / len(values)),
                      recent_delta=values[0] - values[1], input_age_days=age, lead_days=lead,
                      sin_doy=math.sin(2 * math.pi * doy / 365.25),
                      cos_doy=math.cos(2 * math.pi * doy / 365.25))
        return result

    def baseline(self, issue, horizon, reference):
        """Seasonal reference and available persistence on the same scored row."""
        import numpy as np
        start, _ = window(issue, horizon, self.target)
        available = self.inputs(issue)
        if not available or not reference:
            return None
        doy = start.timetuple().tm_yday
        season = [r["value"] for r in reference
                  if min(abs(r["start"].timetuple().tm_yday - doy),
                         366 - abs(r["start"].timetuple().tm_yday - doy)) <= 24]
        qs = np.quantile(season or [r["value"] for r in reference], [.1, .5, .9])
        return qs, max(available, key=lambda r: r["end"])["value"]


def sufficiency(records, target, source, lag_hours):
    """The same history sufficiency gates fit() applies, without fitting —
    shared by the compatibility endpoint so the UI never invents thresholds."""
    history = History(records, target, source, lag_hours)
    reasons = []
    if len(history.rows) < 60:
        reasons.append("insufficient_history")
    if history.rows and (history.rows[-1]["end"] - history.rows[0]["start"]).days < 730:
        reasons.append("insufficient_history")
    return {"sufficient": not reasons, "reasons": sorted(set(reasons)),
            "native_periods": len(history.rows),
            "span_days": ((history.rows[-1]["end"] - history.rows[0]["start"]).days
                          if history.rows else 0)}


def fit(location, dataset_id, horizon, lag_hours, target, persist):
    import numpy as np
    from sklearn.ensemble import HistGradientBoostingRegressor
    from threadpoolctl import threadpool_limits

    records = datasets.load(location, dataset_id)
    manifest = datasets.manifest(location, dataset_id)
    if records is None or manifest is None:
        raise ValueError("Unknown historical dataset.")
    source = manifest["source_id"]
    history = History(records, target, source, lag_hours)
    identity = json.dumps([dataset_id, target, horizon, lag_hours, VERSION])
    card = ModelCard(model_id="m-" + hashlib.sha256(identity.encode()).hexdigest()[:14] +
                     "-" + target.replace("_", "")[:8] + f"-h{horizon}",
                     location_id=location, horizon_index=horizon, dataset_id=dataset_id,
                     dataset_hash=manifest["content_sha256"], trained_at=datetime.now(UTC).isoformat(),
                     metrics={"target": target, "source_id": source, "engine_version": VERSION})

    def reject(reason):
        card.state = "rejected"
        card.eligibility_reasons = [reason]
        persist(card, None)
        return asdict(card)

    if len(history.rows) < 60:
        return reject("At least 60 quality-controlled native observations are required.")
    if (history.rows[-1]["end"] - history.rows[0]["start"]).days < 730:
        return reject("At least two years of genuine history are required.")
    samples = []
    for r in history.rows:
        issue = r["start"]
        s, e = window(issue, horizon, target)
        actual = history.by_start.get(s)
        if not actual or actual["end"] != e:
            continue
        x = history.feature(issue, horizon)
        if x is not None:
            samples.append({"issue": issue, "label": actual, "x": x})
    if len(samples) < 60:
        return reject("Insufficient complete, availability-correct training targets.")
    # Boundaries are chronological origins; purge labels not yet available at
    # the next block, rather than splitting overlapping target rows randomly.
    n = len(samples)
    a, b, c = [samples[int(n * f)]["issue"] for f in (.55, .70, .85)]
    train = [s for s in samples if s["issue"] < a and s["label"]["available"] < a]
    validation = [s for s in samples if a <= s["issue"] < b and s["label"]["available"] < b]
    calibration = [s for s in samples if b <= s["issue"] < c and s["label"]["available"] < c]
    test = [s for s in samples if s["issue"] >= c]
    minimum = 12 if VARIABLES[target]["composite_days"] > 1 else 45
    if min(map(len, (train, validation, calibration, test))) < minimum:
        return reject("Not enough separated training, validation, calibration and test cases after availability embargo.")

    def matrix(rows):
        return np.array([[s["x"][k] for k in COLUMNS] for s in rows], dtype=float)

    def labels(rows):
        return np.array([s["label"]["value"] for s in rows])

    def estimator(q, leaves):
        return HistGradientBoostingRegressor(loss="quantile", quantile=q, max_iter=120,
                                            max_leaf_nodes=leaves, min_samples_leaf=15,
                                            l2_regularization=1.0, early_stopping=False, random_state=42)

    with threadpool_limits(limits=1):
        options = []
        for leaves in (3, 7):
            m = estimator(.5, leaves).fit(matrix(train), labels(train))
            options.append((float(np.mean(np.abs(m.predict(matrix(validation)) - labels(validation)))), leaves))
        leaves = min(options)[1]
        fitting = train + validation
        models = {name: estimator(q, leaves).fit(matrix(fitting), labels(fitting))
                  for name, q in (("q10", .1), ("median", .5), ("q90", .9))}

        def quantiles(rows):
            pred = np.column_stack([models[name].predict(matrix(rows)) for name in ("q10", "median", "q90")])
            pred.sort(axis=1)
            return np.clip(pred, VARIABLES[target]["min"], VARIABLES[target]["max"])

        cal = quantiles(calibration)
        residual = np.maximum(cal[:, 0] - labels(calibration), labels(calibration) - cal[:, 2])
        correction = max(0.0, float(np.quantile(residual, min(1.0, math.ceil((len(residual) + 1) * .8) / len(residual)), method="higher")))
        pred = quantiles(test)
        pred[:, 0] = np.maximum(VARIABLES[target]["min"], pred[:, 0] - correction)
        pred[:, 2] = np.minimum(VARIABLES[target]["max"], pred[:, 2] + correction)

    y = labels(test)
    reference = [s["label"] for s in fitting]
    baseline = [history.baseline(s["issue"], horizon, reference) for s in test]
    clim = np.array([b[0] for b in baseline])
    persistence = np.array([b[1] for b in baseline])
    mae = float(np.mean(np.abs(pred[:, 1] - y)))
    clim_mae = float(np.mean(np.abs(clim[:, 1] - y)))
    pers_mae = float(np.mean(np.abs(persistence - y)))
    baseline_mae = min(clim_mae, pers_mae)
    skill = 1 - mae / baseline_mae if baseline_mae > 0 else None
    cover = float(np.mean((pred[:, 0] <= y) & (y <= pred[:, 2])))

    def pinball(p):
        error = y[:, None] - p
        q = np.array([.1, .5, .9])
        return float(np.mean(np.maximum(q * error, (q - 1) * error)))

    metrics = {"model_mae": mae, "baseline_mae": baseline_mae,
               "climatology_mae": clim_mae, "persistence_mae": pers_mae,
               "skill_vs_best_baseline": skill, "model_pinball": pinball(pred),
               "climatology_pinball": pinball(clim), "coverage_80": cover,
               "mean_interval_width": float(np.mean(pred[:, 2] - pred[:, 0])),
               "rmse": float(np.sqrt(np.mean((pred[:, 1] - y) ** 2))),
               "n_train": len(train), "n_validation": len(validation), "n_calibration": len(calibration),
               "n_eval": len(test), "folds": 4, "test_start": test[0]["issue"].isoformat(),
               "test_end": test[-1]["label"]["end"].isoformat(),
               "evaluation_scope": "chronological held-out history; source availability is estimated, not a verified vintage archive",
               "prediction_scope": "experimental_local_model"}
    card.metrics.update(metrics)
    reasons = []
    if skill is None or skill <= 0:
        reasons.append("Model did not beat both persistence and seasonal climatology on the untouched chronological test.")
    if pinball(pred) > pinball(clim):
        reasons.append("Model quantiles did not improve on the seasonal distribution on the held-out test.")
    if cover < .65:
        reasons.append("Measured interval coverage is below the experimental publication minimum (65%).")
    card.state = "rejected" if reasons else "eligible"
    card.eligibility_reasons = reasons
    bundle = {"engine_version": VERSION, "models": models, "feature_columns": COLUMNS,
              "variable": target, "source_id": source, "dataset_id": dataset_id,
              "dataset_hash": manifest["content_sha256"], "horizon": horizon,
              "lag_hours": lag_hours, "interval_correction": correction,
              "max_input_age_days": max(s["x"]["input_age_days"] for s in calibration + test) + VARIABLES[target]["composite_days"] * 2,
              "evaluation": metrics}
    blob = pickle.dumps(bundle)
    card.metrics["model_sha256"] = hashlib.sha256(blob).hexdigest()
    persist(card, blob)
    return asdict(card)
