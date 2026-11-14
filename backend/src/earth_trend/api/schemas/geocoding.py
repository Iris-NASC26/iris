"""Provider-suggested place lookup. Suggestions are third-party geocoder output,
not verified geography; the user confirms the place before any data request.
"""

from typing import Annotated, Literal

from pydantic import AwareDatetime, Field

from .common import Contract, Number, Sha256, Versioned


class GeocodeCandidate(Contract):
    name: Annotated[str, Field(min_length=1, max_length=200)]
    country: Annotated[str, Field(max_length=100)] | None
    admin1: Annotated[str, Field(max_length=100)] | None
    lat: Number
    lon: Number


class GeocodeSource(Contract):
    provider: Literal["open-meteo-geocoding"]
    retrieved_at: AwareDatetime
    served_from_cache: bool
    stale_cache: bool
    artifact_sha256: dict[str, Sha256]
    acknowledgement: Annotated[str, Field(max_length=500)]
    caveats: list[Annotated[str, Field(min_length=1, max_length=300)]]
    scientifically_validated: Literal[False]


class GeocodeResult(Versioned):
    query: Annotated[str, Field(min_length=1, max_length=100)]
    candidates: list[GeocodeCandidate]
    source: GeocodeSource
