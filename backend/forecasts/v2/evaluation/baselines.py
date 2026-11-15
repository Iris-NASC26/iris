"""Availability-correct baselines on the exact cases each model is scored on."""
from __future__ import annotations

from datetime import UTC, datetime, timedelta

from ..fitting import History, window
from ..variables import VARIABLES


def _stamp(value):
    d = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    return d.astimezone(UTC) if d.tzinfo else d.replace(tzinfo=UTC)


def _circular_doy_delta(a: int, b: int) -> int:
    diff = abs(a - b)
    return min(diff, 366 - diff)


class Baselines:
    """Persistence / seasonal climatology / seasonal naive for one context.

    `reference` is the fold's permitted history rows (fitting-period rows
    only) — never outer-test or final-holdout labels.
    """

    def __init__(self, history: History, reference: list, seasonal_window=24):
        self.history, self.reference = history, reference
        self.seasonal_window = int(seasonal_window)

    def seasonal_values(self, doy: int) -> list:
        in_window = [r["value"] for r in self.reference
                     if _circular_doy_delta(r["start"].timetuple().tm_yday, doy)
                     <= self.seasonal_window]
        return in_window or [r["value"] for r in self.reference]

    def predict(self, name: str, issue, horizon):
        """Return (point_or_None, quantiles_or_None) for one baseline."""
        available = self.history.inputs(_stamp(issue))
        if not available or not self.reference:
            return None, None
        start, _ = window(issue, horizon, self.history.target)
        doy = start.timetuple().tm_yday
        if name == "persistence":
            return max(available, key=lambda r: r["end"])["value"], None
        if name == "seasonal_climatology":
            import numpy as np
            return None, np.quantile(self.seasonal_values(doy), [.1, .5, .9])
        if name == "seasonal_naive":
            step = timedelta(days=VARIABLES[self.history.target]["composite_days"])
            prior_start = start - timedelta(days=365)
            row = self.history.by_start.get(prior_start)
            if row is None:
                # nearest native period whose start is within one composite step
                best = min(
                    (r for r in self.reference if r["available"] <= _stamp(issue)),
                    key=lambda r: abs((prior_start - r["start"]).total_seconds()),
                    default=None)
                if (best is None
                        or abs((prior_start - best["start"]).total_seconds())
                        > step.total_seconds()):
                    return None, None  # honest: no valid seasonal match
                row = best
            if row["available"] > _stamp(issue):
                return None, None
            import numpy as np
            return row["value"], np.array([row["value"]] * 3)
        raise KeyError(f"unknown baseline '{name}'")
