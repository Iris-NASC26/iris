# Iris FastAPI backend — visualization_app (forecasts v1+v2, hazards,
# analysis, geocode, ops).
#
# Build from the REPOSITORY ROOT — the code resolves repo-relative paths
# (backend/forecasts/catalog.py: parents[2], shared/*.json):
#     docker build -f backend/Dockerfile -t iris-backend .
#
# Image layout mirrors the repo: /app/backend, /app/shared, /app/artifacts.
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app/backend

# visualization-requirements.txt transitively -r's the other two files;
# copy them first so dependency install stays cached across source edits.
COPY backend/requirements.txt backend/visualization-requirements.txt ./
COPY backend/hazards/requirements.txt hazards/requirements.txt
COPY backend/forecasts/requirements.txt forecasts/requirements.txt
RUN pip install --upgrade pip && \
    pip install -r visualization-requirements.txt

COPY backend/ /app/backend/
COPY shared/ /app/shared/

# Runtime state lives outside the image: /app/artifacts (forecast catalogue,
# datasets, eval/release artifacts, hazard NASA caches) and
# /app/backend/data (durable store). Mount volumes there.
RUN useradd --system --uid 1001 iris && \
    mkdir -p /app/artifacts /app/backend/data && \
    chown -R iris:iris /app
USER iris

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/v1/forecasts/v2/capabilities', timeout=4)" || exit 1

CMD ["python", "-m", "uvicorn", "visualization_app:app", "--host", "0.0.0.0", "--port", "8000"]
