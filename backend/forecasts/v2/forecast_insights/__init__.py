"""Phase-6 forecast insights: measured uncertainty, extreme-condition
indicators, fitted-model explanations, retrospective trend significance.

Consumes frozen evaluation case rows and frozen candidate artifacts
read-only; never fits on outer-test or final-holdout labels, never
touches the live model registry, jobs or providers.
"""
from . import calibration, diagnostics, extremes, explanations, trends  # noqa: F401
