"""Fitted transformations — separate fit/transform, fitted only on the
permitted training partition, frozen for validation/calibration/test
and inference. Versioned, hashed, binding-checked on load."""
from __future__ import annotations

import hashlib
import json
import math
from datetime import datetime

VERSION = "iris-transform-v1"
BUCKETS = 12  # month-of-year seasonal reference


class SeasonalTransform:
    """Monthly climatology reference fitted on permitted rows only."""

    def __init__(self, params=None):
        self.params = params or {"mean": [None] * BUCKETS,
                                 "std": [None] * BUCKETS,
                                 "n": [0] * BUCKETS}
        self.cutoff = None
        self.spec_fingerprint = None

    def fit(self, rows, cutoff, spec_fingerprint):
        """rows: permitted History rows. FS-01: both the interval cutoff
        AND record availability are enforced — a record published after
        the boundary cannot enter the fitted reference."""
        self.cutoff = cutoff.isoformat() if hasattr(cutoff, "isoformat") \
            else str(cutoff)
        self.spec_fingerprint = spec_fingerprint
        groups = {}
        for r in rows:
            if r["end"].isoformat() >= self.cutoff:
                continue  # defence: nothing after the boundary enters
            avail = r.get("available")
            if avail is not None and avail.isoformat() >= self.cutoff:
                continue  # published after the cutoff — not yet usable
            groups.setdefault(r["end"].month - 1, []).append(r["value"])
        for b in range(BUCKETS):
            vals = groups.get(b, [])
            if vals:
                m = sum(vals) / len(vals)
                self.params["mean"][b] = m
                self.params["std"][b] = math.sqrt(
                    sum((v - m) ** 2 for v in vals) / len(vals)) or 1.0
                self.params["n"][b] = len(vals)
        return self

    def _bucket(self, when: datetime) -> int:
        return when.month - 1

    def anomaly(self, value, when):
        m = self.params["mean"][self._bucket(when)]
        return None if m is None else value - m

    def anomaly_z(self, value, when):
        m = self.params["mean"][self._bucket(when)]
        s = self.params["std"][self._bucket(when)]
        return None if m is None else (value - m) / s

    def to_dict(self) -> dict:
        state = {"version": VERSION, "cutoff": self.cutoff,
                 "spec_fingerprint": self.spec_fingerprint,
                 "params": self.params}
        state["transform_sha256"] = hashlib.sha256(
            json.dumps(state, sort_keys=True).encode()).hexdigest()
        return state

    @classmethod
    def from_dict(cls, state: dict, expected_spec_fp: str):
        if state.get("version") != VERSION:
            raise ValueError(f"Transform version {state.get('version')} "
                             f"!= {VERSION}")
        if state.get("spec_fingerprint") != expected_spec_fp:
            raise ValueError("Transform was fitted for a different feature "
                             "spec — refit instead of mixing artifacts")
        t = cls(state["params"])
        t.cutoff = state["cutoff"]
        t.spec_fingerprint = state["spec_fingerprint"]
        return t
