"""Optional entry: uvicorn visualization_app:app --host 127.0.0.1 --port 8000.

Loads the existing app and adds spatial-data and disaster-investigation routers.
The default main:app entry remains available to teammates without this extension.
"""

from hazards.router import router as hazards_router
from main import app
from visualization.router import router

app.include_router(router)
app.include_router(hazards_router)
