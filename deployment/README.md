# Iris – VPS Deployment Guide (Docker + Caddy)

## 1. How everything is connected

```
Browser ──HTTPS──► Caddy (80/443, auto Let's Encrypt)
                    ├─ iris.example.com      ──► frontend:3000  (Next.js dashboard)
                    │                               │  /api/v1/* route handlers (server-side proxy)
                    │                               ▼
                    │                          backend:8000  (FastAPI, visualization_app:app)
                    │                               │ outbound: NASA POWER/CMR/Harmony/AppEEARS/GES DISC,
                    │                               │ NOAA, Copernicus, OpenAlex, DataCite, Meteomatics, Gemini
                    └─ docs.iris.example.com ──► /srv/docs (static `documentation/` folder)
```

| Piece | Source | Notes |
|---|---|---|
| Dashboard | `src/` (Next.js 15, React 19, Cesium, MapLibre, ECharts) | Browser **never** calls Python directly. Every `src/app/api/v1/**/route.ts` forwards to `FASTAPI_URL` (default `http://127.0.0.1:8000`). One route (`analyze/timeseries`) uses `FASTAPI_BACKEND_URL` instead, so both are set in compose. |
| Backend | `backend/` – entry `visualization_app:app` (wraps `main:app` + visualization, hazards, forecasts v1/v2 routers) | Secrets read from env / `backend/.env`. Uses in-process threads, SQLite and a JSON job store → **run exactly 1 uvicorn worker**. |
| Docs | `documentation/` – plain HTML/JS, markdown rendered client-side (marked.js from CDN) | No build. Dashboard links to it via `NEXT_PUBLIC_DOCS_URL` (default `http://localhost:3001`), which is **inlined at build time** → passed as Docker build arg. |
| Shared data | `shared/*.json` | Read by backend via repo-relative path (`/app/shared`). |
| Persistent state | `artifacts/runtime/…` (forecast SQLite, NASA caches, ML models), `backend/data/iris_durable_store.json` | Docker volumes `iris_artifacts`, `iris_data`. |

Why this design: only Caddy publishes ports; frontend and backend are reachable solely on the internal Docker network, so the FastAPI backend (CORS `*`, no auth) is never exposed to the internet.

### Files in this folder

| File | Purpose |
|---|---|
| `Dockerfile.backend` | Python 3.13 image, installs the pinned `visualization-requirements.lock` |
| `Dockerfile.frontend` | Multi-stage Next.js standalone build |
| `docker-compose.yml` | caddy + frontend + backend, volumes, networks (production VPS) |
| `docker-compose.local.yml` | Local pre-VPS testing stack (`http://localhost:3000` & `:3001`, no TLS/DNS required) |
| `LOCAL_TESTING.md` | Step-by-step guide to install Docker locally and test before VPS deployment |
| `Caddyfile` | Routing, TLS, docs static hosting, www redirect |
| `.env.example` | Domains, ACME email → copy to `.env` |
| `backend.env.example` | API keys → copy to `backend.env` |

Repo-level changes made: root `.dockerignore`; `next.config.ts` enables `output: "standalone"` only when `NEXT_OUTPUT=standalone`; `.gitignore` ignores `deployment/.env` and `deployment/backend.env`.

## 2. Prerequisites

- VPS: Ubuntu 22.04/24.04, **≥2 vCPU, 4 GB RAM** (pandas/scipy/netCDF4 + the Next.js build; add 2 GB swap if you only have 2 GB), 30 GB disk.
- A domain with DNS control. Create **A records** (and AAAA if IPv6) pointing to the VPS IP:
  - `iris.example.com`
  - `www.iris.example.com`
  - `docs.iris.example.com`
- Ports 80, 443 (TCP+UDP) reachable.

## 3. Step-by-step

### Step 1 – Harden the server
```bash
ssh root@YOUR_VPS_IP
adduser deploy && usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy      # copy your SSH key
# (new terminal) ssh deploy@YOUR_VPS_IP   → confirm it works, then:
sudo sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/; s/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart ssh

sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443
sudo ufw enable
sudo apt update && sudo apt -y upgrade && sudo apt -y install unattended-upgrades git
```
> Docker bypasses UFW for *published* ports. That is fine here because only Caddy (80/443) publishes ports.

Optional swap (small VPS):
```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Step 2 – Install Docker
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker deploy && newgrp docker
docker --version && docker compose version
```

### Step 3 – Verify DNS before starting Caddy
```bash
dig +short iris.example.com docs.iris.example.com www.iris.example.com   # all must show the VPS IP
```
Let's Encrypt will rate-limit you if you start Caddy with wrong DNS.

### Step 4 – Get the code
```bash
sudo mkdir -p /opt/iris && sudo chown deploy:deploy /opt/iris
git clone <YOUR_REPO_URL> /opt/iris
cd /opt/iris/deployment
```
(Private repo: add a deploy key, or `rsync -az --exclude node_modules --exclude .venv --exclude .next ./ deploy@VPS:/opt/iris/` from your machine.)

### Step 5 – Configure
```bash
cp .env.example .env
cp backend.env.example backend.env
chmod 600 .env backend.env
nano .env           # APP_DOMAIN, DOCS_DOMAIN, ACME_EMAIL
nano backend.env    # GEMINI_API_KEY, EARTHDATA_TOKEN, NOAA_CDO_TOKEN, CDSAPI_KEY, METEOMATICS_*, IRIS_ML_ADMIN_TOKEN
```
Generate the admin token: `openssl rand -hex 32`.

### Step 6 – Build and start
```bash
docker compose build        # first build ~5–10 min
docker compose up -d
docker compose ps           # backend and frontend should become "healthy"
docker compose logs -f caddy   # watch certificates being issued
```

### Step 7 – Verify
```bash
curl -I https://iris.example.com
curl -I https://docs.iris.example.com
curl -s https://iris.example.com/api/v1/capabilities | head -c 300     # Next.js → FastAPI works
curl -sI http://YOUR_VPS_IP:8000 || echo "backend not exposed (good)"
```
In the browser: open the dashboard, run a data search in *Data Selection*, check the globe loads (Cesium assets), and click a docs link – it should open `https://docs.iris.example.com`.

## 4. Operations

**Update to a new version**
```bash
cd /opt/iris && git pull
cd deployment && docker compose up -d --build
docker image prune -f
```
If you change `DOCS_DOMAIN`, rebuild the frontend (`docker compose build --no-cache frontend`) — it's baked into the bundle. Docs-only edits need no rebuild (folder is bind-mounted; just `git pull`).

**Logs / status**
```bash
docker compose logs -f backend
docker compose logs -f frontend
docker stats
```

**Backup** (forecast DB, caches, ML models, job store, certificates)
```bash
mkdir -p ~/backups
for v in iris_iris_artifacts iris_iris_data iris_caddy_data; do
  docker run --rm -v $v:/v -v ~/backups:/b alpine tar czf /b/$v-$(date +%F).tar.gz -C /v .
done
```
(Compose prefixes volume names with the project name `iris_`; confirm names with `docker volume ls`.) Schedule with cron.

**Restart / stop**
```bash
docker compose restart backend
docker compose down            # keeps volumes; add -v to DELETE data
```

## 5. Troubleshooting

| Symptom | Fix |
|---|---|
| Caddy can't get certificate | DNS not pointing at VPS, or 80/443 blocked at the provider firewall. Check `docker compose logs caddy`. |
| Dashboard 502 | Frontend not up: `docker compose logs frontend`. |
| `Could not reach the Python FastAPI backend` | Backend unhealthy: `docker compose logs backend`; confirm `FASTAPI_URL=http://backend:8000` in compose. |
| Docs link points to localhost | Frontend was built without the arg; ensure `DOCS_DOMAIN` is set in `.env`, then rebuild frontend. |
| Globe blank | Check browser console for `/cesium/...` 404s; the build must run `pnpm install` with `scripts/` present (the Dockerfile does this). |
| Build OOM-killed | Add swap (Step 1) or build locally and push images to a registry. |
| pnpm `frozen-lockfile` error | Run `pnpm install` locally, commit the updated `pnpm-lock.yaml`. |

## 6. Known caveats / recommendations

- **Backend has no authentication and CORS is `*`.** It is safe only because it's not published. Don't add a `ports:` entry to `backend`.
- The dashboard itself is public; if it should be private, add `basic_auth` to the `{$APP_DOMAIN}` block in `Caddyfile`.
- Keep `uvicorn --workers 1` (threads, SQLite, JSON store are not multi-process safe).
- `FORECAST_REFRESH_ENABLED=false` by default; enable only when you want scheduled upstream pulls.
- Docs load `marked.js` from a CDN; for strict CSP/offline hosting vendor it into `documentation/assets/`.
- `next.config.ts` allows images only from `images.unsplash.com`; add other hosts there if needed.
- This setup was written by static analysis; I did not run `docker build` locally. Do a first build on the VPS (or locally with Docker Desktop) and report any errors.
