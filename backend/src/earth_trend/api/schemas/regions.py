"""WGS84 wire shapes; topology, area and weighting belong to D14."""

from typing import Annotated, Literal, Self

from pydantic import Field, RootModel, model_validator

from .common import Contract, Id

Longitude = Annotated[float, Field(strict=True, ge=-180, le=180, allow_inf_nan=False)]
Latitude = Annotated[float, Field(strict=True, ge=-90, le=90, allow_inf_nan=False)]
Position = tuple[Longitude, Latitude]
Ring = Annotated[list[Position], Field(min_length=4, max_length=2000)]
PolygonCoordinates = Annotated[list[Ring], Field(min_length=1, max_length=50)]


class GlobalRegion(Contract):
    kind: Literal["global"]


class CellRegion(Contract):
    kind: Literal["cell"]
    grid_id: Id
    layer_id: Id
    cell_id: Annotated[int, Field(strict=True, ge=0)]


class BboxRegion(Contract):
    kind: Literal["bbox"]
    bbox: tuple[Longitude, Latitude, Longitude, Latitude]
    dateline: Literal["not_crossing", "crossing"] = "not_crossing"

    @model_validator(mode="after")
    def bounds(self) -> Self:
        west, south, east, north = self.bbox
        if south >= north or west == east:
            raise ValueError("bbox must have positive latitude and longitude extent")
        if (west > east) != (self.dateline == "crossing"):
            raise ValueError("dateline crossing requires west > east and dateline='crossing'")
        if west == -180 and east == 180 and south == -90 and north == 90:
            raise ValueError("use kind='global' for the whole world")
        return self


class PolygonGeometry(Contract):
    type: Literal["Polygon"]
    coordinates: PolygonCoordinates


class MultiPolygonGeometry(Contract):
    type: Literal["MultiPolygon"]
    coordinates: Annotated[list[PolygonCoordinates], Field(min_length=1, max_length=50)]


class PolygonRegion(Contract):
    """Dateline-crossing rings must arrive split; no implicit complement selection."""

    kind: Literal["polygon"]
    geometry: Annotated[PolygonGeometry | MultiPolygonGeometry, Field(discriminator="type")]
    dateline: Literal["not_crossing", "split"]
    interior: Literal["bounded", "complement"]

    @model_validator(mode="after")
    def rings(self) -> Self:
        polygons = (
            [self.geometry.coordinates]
            if isinstance(self.geometry, PolygonGeometry)
            else self.geometry.coordinates
        )
        rings = [ring for polygon in polygons for ring in polygon]
        if len(rings) > 50 or sum(len(ring) for ring in rings) > 2000:
            raise ValueError("geometry exceeds 50 rings or 2000 vertices")
        if self.dateline == "split" and not isinstance(self.geometry, MultiPolygonGeometry):
            raise ValueError("a dateline split must use MultiPolygon")
        for ring in rings:
            if ring[0] != ring[-1]:
                raise ValueError("GeoJSON rings must be closed")
            if len(set(ring[:-1])) < 3:
                raise ValueError("a ring needs at least three distinct vertices")
            if any(abs(a[0] - b[0]) > 180 for a, b in zip(ring, ring[1:], strict=False)):
                raise ValueError("split dateline-crossing edges before submitting")
        return self


class PresetRegion(Contract):
    kind: Literal["preset"]
    preset_id: Id
    version: Id


class RegionSpec(
    RootModel[
        Annotated[
            GlobalRegion | CellRegion | BboxRegion | PolygonRegion | PresetRegion,
            Field(discriminator="kind"),
        ]
    ]
):
    """A region specification, not proof of valid topology or scientific support."""
