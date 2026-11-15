"""Additive routes for two allowlisted point investigations."""

from fastapi import APIRouter, HTTPException, Query

from .catalog import CASES
from .history import history
from .meteomatics import ForecastUnavailable, forecast

router = APIRouter(
    prefix="/api/v1/hazards", tags=["Disaster evidence and rainfall outlooks"]
)


@router.get("/history")
def historical_context(case_id: str = Query(pattern=r"^[a-z0-9-]{1,60}$")) -> dict:
    if case_id not in CASES:
        raise HTTPException(422, "Choose a supported investigation.")
    try:
        return history(case_id)
    except ForecastUnavailable as exc:
        raise HTTPException(exc.status, str(exc)) from None


@router.get("/rainfall")
def rainfall(case_id: str = Query(pattern=r"^[a-z0-9-]{1,60}$")) -> dict:
    if case_id not in CASES:
        raise HTTPException(422, "Choose a supported investigation.")
    try:
        return forecast(case_id)
    except ForecastUnavailable as exc:
        raise HTTPException(exc.status, str(exc)) from None
