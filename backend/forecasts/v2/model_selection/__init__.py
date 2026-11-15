"""Phase-5 model selection: versioned candidate contract, bounded tuning,
and frozen selection — all through the Phase-3 corrected evaluator."""
from . import candidates, search, store  # noqa: F401
from .search import compare, freeze  # noqa: F401
