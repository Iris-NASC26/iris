"""Optional entry: uvicorn visualization_app:app --host 127.0.0.1 --port 8000.

Loads the existing app unchanged and adds only the independent spatial-data router.
The default main:app entry remains available to teammates without this extension.
"""

from main import app
from visualization.router import router

app.include_router(router)
