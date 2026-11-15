"""Phase-3 reproducible forecast evaluation — independent of the live path.

Walk-forward chronological backtests of the existing quantile
HistGradientBoosting model against availability-correct baselines, with a
reserved final holdout, typed availability evidence, and versioned
artifacts under an isolated experiment namespace.

Nothing here activates, overwrites, or relabels live models: evaluation
estimators live in their own artifact directory, and legacy model-card
scores stay what they always were.
"""
from .runner import run, run_final_assessment  # noqa: F401
from .spec import validate, fingerprint  # noqa: F401

PROTOCOL_VERSION = "iris-eval-v1"
