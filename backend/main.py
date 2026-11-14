"""Canonical Iris FastAPI entry. Shared scientific contracts live in earth_trend."""
from earth_trend.api.app import create_app

app = create_app()
