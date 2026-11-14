"""Problem documents, pending jobs and honest mode/capability declarations."""

from typing import Annotated, Literal, Self

from pydantic import AwareDatetime, Field, RootModel, field_validator, model_validator

from .common import (
    Contract,
    Count,
    Id,
    MonthlyWindow,
    Probability,
    Reason,
    Sha256,
    Timestamped,
    VariableId,
    Versioned,
)

ErrorCode = Literal[
    "MALFORMED_JSON",
    "INVALID_PARAMETERS",
    "INVALID_GEOMETRY",
    "NOT_FOUND",
    "MODE_UNAVAILABLE",
    "OUTSIDE_PRODUCT_DOMAIN",
    "INSUFFICIENT_COVERAGE",
    "UNKNOWN_UNITS",
    "AUTH_REQUIRED",
    "PROVIDER_QUOTA",
    "PROVIDER_TIMEOUT",
    "PROVIDER_RESPONSE_INVALID",
    "PROVIDER_UNAVAILABLE",
    "ARTIFACT_INTEGRITY",
    "SNAPSHOT_NOT_BUNDLED",
    "METHOD_VALIDATION_REQUIRED",
]


class FieldError(Contract):
    location: list[str | int]
    code: Id
    message: Annotated[str, Field(min_length=1, max_length=300)]
    # Never serialize Pydantic's raw "input" or provider response bodies.


class Error(Versioned):
    """Wire shape for application/problem+json; no HTTP handler is installed by F03."""

    type: Annotated[str, Field(pattern=r"^(?:about:blank|urn:earth-trend:problem:[a-z0-9-]+)$")]
    title: Annotated[str, Field(min_length=1, max_length=150)]
    status: Literal[400, 401, 404, 409, 422, 429, 500, 502, 503]
    detail: Annotated[str, Field(min_length=1, max_length=500)]
    code: ErrorCode
    request_id: Id
    retryable: bool
    retry_after_seconds: Count | None
    field_errors: list[FieldError]

    @model_validator(mode="after")
    def mapping(self) -> Self:
        allowed: dict[str, set[int]] = {
            "MALFORMED_JSON": {400},
            "INVALID_PARAMETERS": {422},
            "INVALID_GEOMETRY": {422},
            "NOT_FOUND": {404},
            "MODE_UNAVAILABLE": {409},
            "SNAPSHOT_NOT_BUNDLED": {409},
            "AUTH_REQUIRED": {401},
            "PROVIDER_QUOTA": {429},
            "PROVIDER_TIMEOUT": {503},
            "PROVIDER_RESPONSE_INVALID": {502},
            "PROVIDER_UNAVAILABLE": {503},
            "ARTIFACT_INTEGRITY": {500},
            "METHOD_VALIDATION_REQUIRED": {409},
            "OUTSIDE_PRODUCT_DOMAIN": {422},
            "INSUFFICIENT_COVERAGE": {422},
            "UNKNOWN_UNITS": {422},
        }
        if self.status not in allowed[self.code]:
            raise ValueError("problem code and HTTP status must agree")
        if self.retry_after_seconds is not None and (
            not self.retryable or self.status not in (429, 503)
        ):
            raise ValueError("Retry-After is only valid for retryable quota/unavailability errors")
        if (
            self.code
            in ("MALFORMED_JSON", "INVALID_PARAMETERS", "INVALID_GEOMETRY", "AUTH_REQUIRED")
            and self.retryable
        ):
            raise ValueError("invalid inputs/credentials must not be blindly retried")
        return self


class JobIdentity(Timestamped):
    job_id: Id
    request_hash: Sha256
    status_url: Annotated[str, Field(pattern=r"^/api/v1/jobs/[A-Za-z0-9._:-]+$")]

    @model_validator(mode="after")
    def own_status_url(self) -> Self:
        if self.status_url != f"/api/v1/jobs/{self.job_id}":
            raise ValueError("status URL must identify this job on the local API")
        return self


class JobAccepted(JobIdentity):
    """Future transport: HTTP 202 and Location=status_url; no result payload yet."""

    state: Literal["queued", "running", "waiting_provider"]


class JobRecord(JobIdentity):
    updated_at: AwareDatetime
    stage: Id
    attempt: Count
    provider_job_ids: list[Id]

    @field_validator("updated_at")
    @classmethod
    def updated_utc(cls, value: AwareDatetime) -> AwareDatetime:
        return Timestamped.utc_only(value)

    @model_validator(mode="after")
    def chronological(self) -> Self:
        if self.updated_at < self.created_at:
            raise ValueError("job updated_at cannot precede created_at")
        return self


class ActiveJob(JobRecord):
    state: Literal["queued", "running", "waiting_provider"]
    progress: Probability | None
    progress_reason: Reason | None

    @model_validator(mode="after")
    def known_progress(self) -> Self:
        if (self.progress is None) != (self.progress_reason is not None):
            raise ValueError("unknown progress requires a reason")
        if self.state == "waiting_provider" and self.progress is not None:
            raise ValueError("do not fabricate provider progress percentages")
        return self


class SucceededJob(JobRecord):
    state: Literal["succeeded"]
    result_ids: list[Id]
    artifact_ids: list[Id]

    @model_validator(mode="after")
    def output(self) -> Self:
        if not self.result_ids and not self.artifact_ids:
            raise ValueError("succeeded jobs must reference completed results or source artifacts")
        return self


class FailedJob(JobRecord):
    state: Literal["failed"]
    error: Error


class CancelledJob(JobRecord):
    state: Literal["cancelled"]
    cancellation_scope: Literal["local_polling_only", "local_and_remote"]
    remote_work: Literal["may_continue", "cancelled", "not_submitted"]

    @model_validator(mode="after")
    def cancellation(self) -> Self:
        if self.cancellation_scope == "local_and_remote" and self.remote_work == "may_continue":
            raise ValueError(
                "confirmed remote cancellation cannot also claim remote work may continue"
            )
        return self


class Job(
    RootModel[
        Annotated[
            ActiveJob | SucceededJob | FailedJob | CancelledJob,
            Field(discriminator="state"),
        ]
    ]
):
    pass


class ProductCapability(Contract):
    variable_id: VariableId
    binding_id: Id
    window: MonthlyWindow


class PreparedCase(Contract):
    result_id: Id
    request_hash: Sha256


class Readiness(Contract):
    schema_compatible: bool
    release_hashes_verified: bool
    cube_readable: bool
    sufficient_disk: bool


class Capabilities(Versioned):
    mode: Literal["local", "snapshot"]
    build_id: Id
    supported_schema_versions: Annotated[list[Literal["1.0"]], Field(min_length=1)]
    data_release_id: Id | None
    available_products: list[ProductCapability]
    prepared_cases: list[PreparedCase]
    enabled_operations: list[
        Literal["analyse", "scan", "compare", "outlook", "acquire", "export", "read_prepared"]
    ]
    arbitrary_regions: bool
    analysis_ready: bool
    readiness: Readiness
    limitations: list[Reason]

    @model_validator(mode="after")
    def honest(self) -> Self:
        if len(set(self.enabled_operations)) != len(self.enabled_operations):
            raise ValueError("enabled operations must be distinct")
        if self.mode == "snapshot" and (
            self.arbitrary_regions
            or self.analysis_ready
            or set(self.enabled_operations) - {"export", "read_prepared"}
        ):
            raise ValueError(
                "snapshot supports only bundled prepared reads/exports, not recomputation"
            )
        compute = {"analyse", "scan", "compare", "outlook"}
        if not self.analysis_ready and (
            self.arbitrary_regions or compute.intersection(self.enabled_operations)
        ):
            raise ValueError("unready capabilities cannot advertise scientific computation")
        if self.analysis_ready and (
            not all(self.readiness.model_dump().values())
            or not self.available_products
            or not self.data_release_id
        ):
            raise ValueError(
                "analysis readiness requires verified readable installed data and capacity"
            )
        if self.mode == "snapshot" and "snapshot_not_bundled" not in self.limitations:
            raise ValueError("snapshot must disclose its bundled-query limitation")
        return self
