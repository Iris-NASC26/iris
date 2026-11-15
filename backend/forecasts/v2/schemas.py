"""Typed v2 contracts (iris.ml-forecast.v2) — dependency-free validation."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

SCHEMA_VERSION = "iris.ml-forecast.v2"
SENTINELS = (-666.0, -777.0, -888.0, -999.0)


def _iso(v: str) -> str:
    datetime.fromisoformat(str(v).replace("Z", "+00:00"))
    return str(v)


@dataclass
class HistoricalRecord:
    location_id: str
    source_id: str
    lat: float
    lon: float
    variable: str
    unit: str
    interval_start: str
    interval_end: str
    value: float
    station_id: str | None = None
    quality: str = "valid"
    source_artifact_hash: str = ""
    retrieved_at: str = ""
    available_at: str | None = None

    def __post_init__(self):
        _iso(self.interval_start)
        _iso(self.interval_end)
        if not (self.value == self.value and self.value not in (float("inf"), float("-inf"))):
            raise ValueError("nonfinite record value")


@dataclass
class QuantilePrediction:
    window_start: str
    window_end: str
    lead_hours: float
    q10: float
    q50: float
    q90: float
    unit: str = "mm"
    nonnegative: bool = True
    model_id: str = ""
    model_hash: str = ""
    dataset_id: str = ""
    source_id: str = ""
    evaluation_ref: str = ""
    quality_status: str = "passed_checks"
    error_vs_baseline_pct: float | None = None
    evaluation: dict = field(default_factory=dict)
    quality_reasons: list[str] = field(default_factory=list)

    def __post_init__(self):
        if self.quality_status not in ("passed_checks", "experimental_preview"):
            raise ValueError("unknown forecast quality status")
        if self.error_vs_baseline_pct is not None:
            import math
            if not math.isfinite(self.error_vs_baseline_pct):
                raise ValueError("error comparison must be finite")
        for name, v in (("q10", self.q10), ("q50", self.q50), ("q90", self.q90)):
            if v != v or v in (float("inf"), float("-inf")):
                raise ValueError(f"{name} must be finite")
            if self.nonnegative and v < 0:
                raise ValueError(f"{name} must be nonnegative")
        if not self.q10 <= self.q50 <= self.q90:
            raise ValueError("quantiles must be ordered q10<=q50<=q90")


@dataclass
class ForecastRun:
    run_id: str
    model_id: str
    model_hash: str
    dataset_revision: str
    issued_at: str
    input_cutoff: str
    valid_until: str
    uncertainty_method: str
    predictions: list[QuantilePrediction] = field(default_factory=list)
    latest_input_at: str | None = None
    input_age_hours: float | None = None
    evaluation_ref: str | None = None
    schema_version: str = SCHEMA_VERSION
    target: str = "precip_24h"
    scope: str = "experimental_local_model"
    horizons_unavailable: list[dict] = field(default_factory=list)
    quality_status: str = "passed_checks"

    def __post_init__(self):
        if not 1 <= len(self.predictions) <= 3:
            raise ValueError("a run publishes 1-3 declared windows — no fake ensemble")
        _iso(self.issued_at)


@dataclass
class ModelCard:
    model_id: str
    location_id: str
    horizon_index: int
    state: str = "candidate"  # candidate|eligible|active|rejected|stale|retired
    dataset_id: str = ""
    dataset_hash: str = ""
    trained_at: str = ""
    metrics: dict = field(default_factory=dict)
    eligibility_reasons: list[str] = field(default_factory=list)


@dataclass
class JobRecord:
    job_id: str
    kind: str
    location_id: str
    status: str = "queued"
    progress: float = 0.0
    checkpoint: dict = field(default_factory=dict)
    error: str | None = None
    idem: str = ""
    created_at: str = ""
    updated_at: str = ""
