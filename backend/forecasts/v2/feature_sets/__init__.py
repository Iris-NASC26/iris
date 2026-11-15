"""Phase-4 feature engine: versioned specs, availability-safe
materialization, fit/transform boundaries, snapshot artifacts and a
bounded ablation path through the Phase-3 evaluator.

Nothing here mutates the live pipeline: `features.py` and
`fitting.COLUMNS` are untouched, the legacy 13-column profile is
byte-identical, and fitted candidates live in their own experiment
namespace.
"""
from .spec import validate, fingerprint  # noqa: F401
from .runner import materialize, fit_and_score, ablate  # noqa: F401

FEATURE_VERSION = "iris-features-v1"
