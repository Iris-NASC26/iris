"""Optional entry: uvicorn visualization_app:app --host 127.0.0.1 --port 8000.

Loads the existing app and adds spatial-data and disaster-investigation routers.
The default main:app entry remains available to teammates without this extension.
"""

from contextlib import asynccontextmanager

from forecasts.router import router as forecast_router
from forecasts.v2.router import router as forecast_v2_router
from forecasts.v2 import workers as forecast_workers
from forecasts.v2.operations import lifecycle as ops_lifecycle
from forecasts.service import start as start_forecasts
from forecasts.service import stop as stop_forecasts
from hazards.router import router as hazards_router
from main import app
from visualization.router import router

app.include_router(router)
app.include_router(hazards_router)
app.include_router(forecast_router)
app.include_router(forecast_v2_router)
_original_lifespan = app.router.lifespan_context


@asynccontextmanager
async def forecast_lifespan(application):
    async with _original_lifespan(application) as state:
        start_forecasts()
        forecast_workers.start()
        ops_lifecycle.start()  # no-op unless IRIS_OPS_ENABLED=1
        try:
            yield state
        finally:
            ops_lifecycle.stop()
            stop_forecasts()
            forecast_workers.stop()


app.router.lifespan_context = forecast_lifespan
