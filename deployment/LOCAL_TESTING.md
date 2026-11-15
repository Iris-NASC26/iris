# Iris – Local Docker Setup & Pre-VPS Testing Guide

Use this guide to install Docker on your machine, build the production containers (`Dockerfile.backend` and `Dockerfile.frontend`), and verify the full Caddy + Next.js + FastAPI stack on `localhost` before deploying to your VPS.

---

## 1. Local Architecture

`docker-compose.local.yml` mirrors the production VPS topology without requiring a domain name or Let's Encrypt certificates (`auto_https off`):

```
Browser
  ├─ http://localhost:3000 ──► Caddy (:3000) ──► frontend:3000 (Next.js standalone)
  │                                                 │  /api/v1/* (server-side proxy)
  │                                                 ▼
  │                                            backend:8000 (FastAPI, internal network only)
  │
  └─ http://localhost:3001 ──► Caddy (:3001) ──► /srv/docs (static documentation/ folder)
```

What this tests before you touch a VPS:
- Both production Dockerfiles (`Dockerfile.backend` and `Dockerfile.frontend`) build cleanly.
- `pnpm install --frozen-lockfile` and the Cesium/MapLibre `postinstall` asset copy succeed inside Linux containers.
- Next.js `standalone` output boots and proxies `/api/v1/*` requests over the internal Docker network to `http://backend:8000`.
- FastAPI remains isolated on the `internal` network (not exposed on host port `8000`).
- Documentation links from the dashboard resolve to `http://localhost:3001`.

---

## 2. Install & Set Up Docker Locally

### Windows (10/11)
1. **Enable WSL 2** (open PowerShell as Administrator):
   ```powershell
   wsl --install
   ```
   Reboot if prompted.
2. **Install Docker Desktop for Windows**:
   - Download from [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/) or install via Winget:
     ```powershell
     winget install Docker.DockerDesktop
     ```
3. **Configure resources**:
   - Open Docker Desktop → **Settings → General** → ensure **"Use the WSL 2 based engine"** is checked.
   - Ensure Docker Desktop has **at least 4 GB RAM** allocated (Next.js production build + Python scientific stack).
4. **Verify installation** in PowerShell:
   ```powershell
   docker --version
   docker compose version
   docker info
   ```

### macOS
1. Install [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/) (or `brew install --cask docker` / [OrbStack](https://orbstack.dev/)).
2. Allocate at least **4 GB RAM** in Docker Desktop → **Settings → Resources**.
3. Verify with `docker --version && docker compose version`.

### Linux (Ubuntu / Debian)
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && newgrp docker
docker --version && docker compose version
```

---

## 3. Configure Environment Files

Open a terminal and navigate to the `deployment/` directory:

```powershell
cd deployment
```

Create `backend.env` from the example template (or copy values from your existing `backend/.env`):

### PowerShell (Windows)
```powershell
if (!(Test-Path backend.env)) { Copy-Item backend.env.example backend.env }
notepad backend.env
```

### Bash (macOS / Linux / WSL)
```bash
cp -n backend.env.example backend.env
nano backend.env
```

Fill in the API keys you want to test locally:
- `GEMINI_API_KEY` – for conversational SI / assistant features
- `EARTHDATA_TOKEN` – for NASA CMR / Harmony / AppEEARS / GES DISC queries
- `NOAA_CDO_TOKEN`, `CDSAPI_KEY`, `METEOMATICS_USERNAME` / `METEOMATICS_PASSWORD` – for upstream climate/hazard feeds
- `IRIS_ML_ADMIN_TOKEN` – any random secret string (e.g., `local-dev-admin-token-12345`)

> [!NOTE]
> Make sure local dev servers (`pnpm dev` on port 3000 or `pnpm docs:serve` on port 3001) are stopped before starting the Docker stack so ports `3000` and `3001` are free.

---

## 4. Build and Start the Local Stack

From the `deployment/` folder, build and start all services using `docker-compose.local.yml`:

```powershell
docker compose -f docker-compose.local.yml up --build -d
```

> First build takes ~5–10 minutes while Docker downloads `python:3.13-slim` and `node:22-alpine`, installs the locked Python wheels, and compiles the Next.js standalone bundle. Subsequent builds reuse cached layers.

Check container health status:

```powershell
docker compose -f docker-compose.local.yml ps
```

Wait ~30–40 seconds until `backend` and `frontend` show `(healthy)` and `caddy` is `Up`:

```text
NAME                    STATUS                   PORTS
iris-local-backend-1    Up 45 seconds (healthy)  8000/tcp
iris-local-frontend-1   Up 20 seconds (healthy)  3000/tcp
iris-local-caddy-1      Up 15 seconds            0.0.0.0:3000-3001->3000-3001/tcp
```

---

## 5. Run Verification & Smoke Tests

### A. Command-line checks

**PowerShell:**
```powershell
# 1. Dashboard loads through Caddy (expect 200 OK)
curl.exe -I http://localhost:3000

# 2. Documentation site loads through Caddy (expect 200 OK)
curl.exe -I http://localhost:3001

# 3. Next.js API route proxies to FastAPI backend over internal network (expect JSON)
curl.exe -s http://localhost:3000/api/v1/capabilities

# 4. Forecast v2 health check via Next.js proxy (expect JSON)
curl.exe -s http://localhost:3000/api/v1/forecasts/v2/health

# 5. Confirm FastAPI is NOT directly exposed on the host (expect connection refused)
curl.exe -I http://localhost:8000
```

**Bash:**
```bash
curl -I http://localhost:3000
curl -I http://localhost:3001
curl -s http://localhost:3000/api/v1/capabilities | head -c 300
curl -s http://localhost:3000/api/v1/forecasts/v2/health
curl -sI http://localhost:8000 || echo "Backend properly isolated!"
```

### B. Browser checklist

1. **Dashboard UI**: Open `http://localhost:3000` in your browser.
2. **3D Globe & Map**: Switch to a view with the Cesium 3D globe or MapLibre map and confirm tiles/assets load with no `/cesium/...` 404s in DevTools (`F12` → Network).
3. **Backend Proxy**: Run a dataset search in **Data Selection** or open the **Forecast / Hazards** views and verify API requests to `/api/v1/...` return `200 OK`.
4. **Documentation Site**: Click the Documentation link in the UI (or open `http://localhost:3001`) and confirm the markdown docs render properly.

---

## 6. Inspecting Logs & Debugging Containers

**Follow live logs:**
```powershell
# All services
docker compose -f docker-compose.local.yml logs -f

# Single service
docker compose -f docker-compose.local.yml logs -f backend
docker compose -f docker-compose.local.yml logs -f frontend
docker compose -f docker-compose.local.yml logs -f caddy
```

**Open a shell inside a running container:**
```powershell
# Inspect Python backend environment / files
docker compose -f docker-compose.local.yml exec backend sh

# Test FastAPI OpenAPI schema directly from inside the backend container
docker compose -f docker-compose.local.yml exec backend python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/openapi.json').status)"
```

**Rebuild a single service after code changes:**
```powershell
# Rebuild and restart only the backend
docker compose -f docker-compose.local.yml up --build -d backend

# Rebuild and restart only the frontend
docker compose -f docker-compose.local.yml up --build -d frontend
```

---

## 7. Common Local Issues & Fixes

| Issue | Cause | Fix |
|---|---|---|
| `Bind for 0.0.0.0:3000 failed: port is already allocated` | Local `pnpm dev` or another process is using port 3000 or 3001. | Stop the local dev server (`Ctrl+C`), or find the PID with `netstat -ano \| findstr :3000` (Windows) / `lsof -i :3000` (macOS/Linux). |
| `error during connect ... dockerDesktopLinuxEngine` | Docker Desktop is not running. | Start the Docker Desktop application and wait for the engine status to turn green. |
| `ERR_PNPM_OUTDATED_LOCKFILE` during `frontend` build | `package.json` was modified without updating `pnpm-lock.yaml`. | Run `pnpm install` on your host machine, then re-run `docker compose -f docker-compose.local.yml build frontend`. |
| Frontend build fails with `exit code 137` (OOM) | Docker VM ran out of memory during `pnpm build`. | Increase memory limit in Docker Desktop (**Settings → Resources**) to ≥4 GB (or update `.wslconfig` on Windows). |
| `backend` stays `unhealthy` | Syntax/import error or missing env file. | Run `docker compose -f docker-compose.local.yml logs backend` to see the uvicorn traceback. |

---

## 8. Stopping & Cleaning Up

**Stop containers (preserves local SQLite / artifact volumes):**
```powershell
docker compose -f docker-compose.local.yml down
```

**Stop containers and wipe local test volumes (`iris_local_artifacts`, `iris_local_data`):**
```powershell
docker compose -f docker-compose.local.yml down -v
```

Once everything passes locally, follow [README.md](./README.md) to deploy the stack to your VPS.
