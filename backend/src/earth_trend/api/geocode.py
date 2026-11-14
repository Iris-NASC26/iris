"""Place-name lookup endpoint backed by the bounded Open-Meteo geocoder."""

from typing import Annotated

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from earth_trend.sources.geocoder import Lookup, geocode
from earth_trend.sources.power_zarr import SourceFormatError, SourceUnavailable

from .schemas.geocoding import GeocodeCandidate, GeocodeResult, GeocodeSource
from .series import problem

router = APIRouter()

ACKNOWLEDGEMENT = (
    "Geocoding by Open-Meteo (CC BY 4.0), geocoding-api.open-meteo.com. "
    "Suggestions are provider output, not verified geography."
)


def build_result(lookup: Lookup) -> GeocodeResult:
    return GeocodeResult(
        schema_version="1.0",
        query=lookup.query,
        candidates=[
            GeocodeCandidate(
                name=item.name, country=item.country, admin1=item.admin1, lat=item.lat, lon=item.lon
            )
            for item in lookup.candidates
        ],
        source=GeocodeSource(
            provider="open-meteo-geocoding",
            retrieved_at=lookup.retrieved_at,
            served_from_cache=lookup.from_cache,
            stale_cache=lookup.stale_cache,
            artifact_sha256=lookup.artifact_hashes,
            acknowledgement=ACKNOWLEDGEMENT,
            caveats=[
                "Place suggestions come from a third-party geocoder; confirm the "
                "intended place before loading data.",
                "Retrieved data only: no trend, significance or validation is implied.",
            ],
            scientifically_validated=False,
        ),
    )


@router.get("/api/v1/geocode", response_model=GeocodeResult)
def lookup(
    name: Annotated[str, Query(min_length=1, max_length=100)],
) -> GeocodeResult | JSONResponse:
    try:
        return build_result(geocode(name))
    except SourceFormatError:
        return problem(
            502,
            "PROVIDER_RESPONSE_INVALID",
            "Unexpected geocoder content",
            "The geocoding provider returned content this reader cannot safely interpret.",
        )
    except SourceUnavailable:
        return problem(
            503,
            "PROVIDER_UNAVAILABLE",
            "Geocoder unreachable",
            "The geocoding provider could not be reached and no cached copy exists.",
            retryable=True,
        )
