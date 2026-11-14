"""Minimal, local-only HTTP boundary for the F02 foundation."""

import logging
from collections.abc import Awaitable, Callable
from typing import Literal

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, ConfigDict
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.responses import JSONResponse, Response

from .series import problem
from .series import router as series_router

logger = logging.getLogger(__name__)
LOCAL_ORIGINS = frozenset(
    f"http://{host}:{port}" for host in ("127.0.0.1", "localhost") for port in (5173, 8000)
)


class HealthResponse(BaseModel):
    """Liveness only: an available server does not imply available science."""

    model_config = ConfigDict(extra="forbid", frozen=True)
    schema_version: Literal["health.v1"] = "health.v1"
    status: Literal["ok"] = "ok"
    mode: Literal["local"] = "local"
    analysis_ready: Literal[False] = False


def create_app() -> FastAPI:
    """Create an independent app without provider calls or filesystem side effects."""
    app = FastAPI(title="Earth Trend Detective", version="0.1.0")

    @app.middleware("http")
    async def local_origin_only(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        # Host validation alone does not stop a remote page from targeting localhost.
        origin = request.headers.get("origin")
        if origin is not None and origin not in LOCAL_ORIGINS:
            logger.warning("Rejected request from an unsupported browser origin")
            return JSONResponse(status_code=403, content={"detail": "Origin not allowed"})
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    @app.exception_handler(RequestValidationError)
    async def invalid_parameters(request: Request, error: RequestValidationError) -> Response:
        return problem(
            422,
            "INVALID_PARAMETERS",
            "Invalid parameters",
            "Check latitude (-90 to 90) and longitude (-180 to 180).",
        )

    app.include_router(series_router)
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=["127.0.0.1", "localhost"])

    @app.get("/api/v1/health", response_model=HealthResponse)
    def health() -> HealthResponse:
        return HealthResponse()

    return app
