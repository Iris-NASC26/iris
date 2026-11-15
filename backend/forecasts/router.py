from fastapi import APIRouter, HTTPException, Query
from hazards.meteomatics import ForecastUnavailable

from . import glofas, learning, nasa, store
from .catalog import region
from .service import catalogue, obtain

router = APIRouter(prefix="/api/v1/forecasts", tags=["Future forecasts"])


@router.get("/catalogue")
def get_catalogue():
    return catalogue()


@router.get("/capabilities")
def capabilities():
    return {
        "capabilities": {
            "river_forecast": glofas.status(),
            "iris_ml": learning.status(),
            "weather_forecast": {
                "state": "provider_ensemble",
                "detail": "51 ECMWF ensemble members supplied by Meteomatics; local calibration is not established.",
            },
            "nasa_context": {
                "state": "on_demand",
                "detail": "Authentic GPM IMERG Early daily point subsets using local Earthdata authentication.",
            },
        }
    }


@router.get("/{identifier}/observations")
def get_observations(identifier: str):
    try:
        region(identifier)
        return nasa.observations(identifier)
    except ValueError:
        raise HTTPException(422, "Choose a supported forecast location.") from None
    except ForecastUnavailable as exc:
        raise HTTPException(exc.status, str(exc)) from None


@router.get("/{identifier}")
def get_forecast(
    identifier: str,
    artifact_id: str | None = Query(default=None, pattern=r"^[a-f0-9]{64}$"),
):
    if artifact_id:
        try:
            region(identifier)
        except ValueError:
            raise HTTPException(422, "Choose a supported forecast.") from None
        value = store.run(identifier, artifact_id)
        if value is None:
            raise HTTPException(
                410,
                "This forecast snapshot is no longer retained. Open the current forecast instead.",
            )
        return value
    return _get(identifier)


@router.post("/{identifier}/refresh")
def refresh_forecast(identifier: str):
    return _get(identifier, True)


def _get(identifier: str, refresh: bool = False):
    try:
        region(identifier)
    except ValueError:
        raise HTTPException(422, "Choose a supported forecast.") from None
    try:
        return obtain(identifier, refresh)
    except ForecastUnavailable as exc:
        raise HTTPException(exc.status, str(exc)) from None
