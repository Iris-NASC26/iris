"""Dataset identity, transformation, provenance and gap-preserving series contracts."""

from typing import Annotated, Literal, Self

from pydantic import Field, model_validator

from .common import (
    BranchId,
    Contract,
    Count,
    Id,
    Month,
    MonthlyWindow,
    Number,
    PhysicalUnit,
    Probability,
    Reason,
    Sha256,
    Timestamped,
    Unit,
    VariableId,
    Versioned,
    Year,
    month_index,
)


class Transform(Contract):
    transform_id: Id
    version: Id
    kind: Literal["identity", "linear", "log10"]
    input_units: Annotated[str, Field(min_length=1, max_length=100)]
    output_units: Unit
    scale: Number
    offset: Number
    order: Annotated[
        list[
            Literal[
                "decode_fill",
                "qa",
                "scale_units",
                "weighted_regional_mean",
                "log10",
                "monthly_climatology",
                "anomaly",
                "annual_mean",
            ]
        ],
        Field(min_length=1),
    ]

    @model_validator(mode="after")
    def identity(self) -> Self:
        if self.kind == "identity" and (self.scale != 1 or self.offset != 0):
            raise ValueError("identity transform requires scale=1 and offset=0")
        if self.kind == "log10" and (
            "log10" not in self.order or self.output_units != "log10(mg/m³)"
        ):
            raise ValueError("log10 branch must disclose transform order and log units")
        if "log10" in self.order and "weighted_regional_mean" in self.order:
            if self.order.index("log10") < self.order.index("weighted_regional_mean"):
                raise ValueError("aggregate concentrations before log10 transformation")
        return self


class DatasetBinding(Versioned):
    binding_id: Id
    variable_id: VariableId
    product: Id
    product_version: Id
    doi: Annotated[str, Field(pattern=r"^10\.[0-9]{4,9}/[^\s?#]+$")] | None
    concept_id: Id | None
    field: Id
    provider: Literal["power", "earthdata", "giovanni", "appeears", "obdaac", "synthetic_contract"]
    resource: Annotated[str, Field(min_length=1, max_length=200)]
    native_units: Annotated[str, Field(min_length=1, max_length=100)] | None
    units: PhysicalUnit
    unit_evidence: Literal["header_required", "header_verified", "synthetic_contract"]
    evidence_refs: list[Id]
    transform: Transform
    domain: Literal["land", "ocean", "global"]
    native_grid_id: Id
    analysis_grid_id: Id
    source_calendar: Id
    time_convention: Literal["UTC", "LST", "source_native"]
    coverage: MonthlyWindow
    scale_type: Literal["interval", "ratio", "index"]
    data_kind: Literal["observations", "model", "synthetic_contract"]
    caveat_ids: list[Id]

    @model_validator(mode="after")
    def source_evidence(self) -> Self:
        if self.data_kind == "synthetic_contract":
            if self.provider != "synthetic_contract" or self.unit_evidence != "synthetic_contract":
                raise ValueError("synthetic bindings must be explicitly labelled throughout")
        else:
            if not self.doi and not self.concept_id:
                raise ValueError("a scientific binding needs a DOI or concept ID")
            if self.provider == "synthetic_contract" or self.unit_evidence == "synthetic_contract":
                raise ValueError("synthetic evidence cannot authenticate a scientific binding")
        if self.unit_evidence == "header_verified" and (
            not self.native_units or not self.evidence_refs
        ):
            raise ValueError("verified units need a source header and evidence reference")
        if self.transform.output_units != self.units:
            raise ValueError("binding and conversion output units must agree")
        return self


class Series(Versioned):
    series_id: Id
    variable_id: VariableId
    binding_id: Id
    branch_id: BranchId
    frequency: Literal["monthly", "annual"]
    time: Annotated[list[Month | Year], Field(min_length=1, max_length=600)]
    value: list[Number | None]
    coverage: list[Probability | None]
    valid: list[bool]
    reason: list[Reason | None]
    units: Unit
    transform: Transform
    grid_id: Id
    provenance_id: Id

    @model_validator(mode="after")
    def aligned(self) -> Self:
        size = len(self.time)
        if any(
            len(array) != size for array in (self.value, self.coverage, self.valid, self.reason)
        ):
            raise ValueError("series arrays must have equal lengths")
        if self.units != self.transform.output_units:
            raise ValueError("series units must match transform output")
        if self.branch_id == "log10_monthly_anomaly" and (
            self.transform.kind != "log10" or self.units != "log10(mg/m³)"
        ):
            raise ValueError("log10 series must retain the log transformation and units")
        positions = []
        for time in self.time:
            if (len(time) == 7) != (self.frequency == "monthly"):
                raise ValueError("series time labels must match frequency")
            positions.append(month_index(time) if self.frequency == "monthly" else int(time))
        if any(b != a + 1 for a, b in zip(positions, positions[1:], strict=False)):
            raise ValueError("calendar positions must be consecutive; retain gaps as null rows")
        for value, coverage, valid, reason in zip(
            self.value, self.coverage, self.valid, self.reason, strict=True
        ):
            if valid and (value is None or coverage is None or reason is not None):
                raise ValueError("valid observations require a value, known coverage and no reason")
            if not valid and (value is not None or reason is None):
                raise ValueError("invalid observations require a null value and an explicit reason")
        return self


class Provenance(Timestamped):
    provenance_id: Id
    data_kind: Literal["scientific", "synthetic_contract"]
    binding_ids: list[Id]
    source_artifact_hashes: list[Sha256]
    granule_or_job_ids: list[Id]
    parent_ids: list[Id]
    code_version: Annotated[str, Field(pattern=r"^[0-9a-f]{7,40}$")]
    software_versions: dict[Id, Id]
    processing_steps: list[Id]
    mask_id: Id | None
    qa_policy_id: Id
    request_hash: Sha256
    result_hash: Sha256
    random_seed: Count | None
    # No arbitrary endpoint URLs, access tokens or raw provider request bodies.
