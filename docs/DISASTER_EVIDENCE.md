# Disaster evidence and point precipitation outlooks

Current navigation update: the subsequent [forecast-first implementation](FORECASTS.md) replaces the landing globe and Living Globe sidebar's historical-case links with future forecast links. Historical investigations remain in Case Studies. The text below records the earlier bounded increment; its event-study navigation is superseded.

First bounded increment, authorized by the team on 15 November 2026. This adds an event-investigation workflow to Iris; it does not replace the approved trend-analysis architecture or connect its existing statistical Outlook to disaster warnings.

## What is implemented

| Increment | Result | Dependencies |
| --- | --- | --- |
| H01: sourced investigations | Nepal September 2024 and Sri Lanka Cyclone Ditwah November 2025; document dates, reconstruction cutoff, explicit hindsight reveal | Primary event reports; shared allowlisted catalogue |
| H02: authentic historical context | NASA POWER `PRECTOTCORR` daily point series with retained source response, units, UTC dates, missing-value handling and export | Public NASA POWER daily point API; no new Earthdata credentials |
| H03: prospective precipitation inspector | Explicitly requested, server-authenticated Meteomatics 72-hour point outlook; hourly and complete rolling 24-hour totals, freshness, optional research threshold and export | Local Meteomatics credentials and precipitation entitlement |

H01–H03 are identifiers for this newly requested increment, not retroactively assigned SRS requirement IDs. The user explicitly approved disaster-awareness implementation. ML training, automated notifications, scheduled scanning, global forecast rasters and operational hazard warnings are outside this increment.

The landing globe's Nepal and Sri Lanka links, both case libraries, and Living Globe's sidebar open these investigations. The globe remains illustrative navigation; no coloured global hazard field is inferred from these two points. Existing point/region selections and unrelated analysis results are not overwritten. No provider queries run when a landing page or investigation opens.

## Local setup and routes

Use the existing environments; no new model or chart library is needed. The visualization lock already pins `python-dotenv==1.2.4`; its direct use is declared in `backend/hazards/requirements.txt`.

```powershell
# From the repository root, in separate terminals:
cd backend
.venv/Scripts/python.exe -m uvicorn visualization_app:app --host 127.0.0.1 --port 8000

# From the repository root:
npx --yes pnpm@12.18.0 dev --hostname 127.0.0.1 --port 3000
```

Keep `METEOMATICS_USERNAME` and `METEOMATICS_PASSWORD` in ignored `backend/.env`, following `backend/meteomatics.env.example`, or in server environment variables. Existing environment entries are preserved. Never use `NEXT_PUBLIC_` credentials or credentials embedded in URLs. There is no need to put Earthdata credentials in this feature's configuration.

- `/workspace/case-studies/nepal-floods-2024`
- `/workspace/case-studies/ditwah-sri-lanka-2025`
- `GET /api/v1/hazards/history?case_id=<supported-id>`
- `GET /api/v1/hazards/rainfall?case_id=<supported-id>`

Next.js proxies the last two routes to `FASTAPI_URL`, defaulting to `http://127.0.0.1:8000`. The optional `visualization_app:app` entry adds routers without modifying `main.py`. A backend started with `main:app` alone returns a clear enablement message through the proxy. Only the two catalogue IDs are admitted; arbitrary URLs, coordinates, parameters and expensive date ranges are not accepted.

Errors: 422 unsupported investigation/input; 429 local concurrency/query-budget or provider-quota limit; 502 invalid/oversized data; 503 missing credentials, unavailable service or refused access. No sample observations replace failed downloads. Provider response bodies and account identifiers are omitted from errors and exports.

## Confirmed data meaning

### Historical NASA context

The [NASA POWER daily API](https://power.larc.nasa.gov/docs/services/api/temporal/daily/) request fixes `community=AG`, `parameters=PRECTOTCORR`, `format=JSON` and `time-standard=UTC`. Live responses confirmed `mm/day`, `header.sources=["MERRA2"]` and the source title `NASA/POWER Source Native Resolution Daily Data`. Admission checks the actual response metadata, not just this expected description.

| Investigation | Requested point | Fixed historical window | Expected daily rows |
| --- | --- | --- | --- |
| Nepal | 27.7172 N, 85.324 E | 2024-09-15 through 2024-10-08 | 24 |
| Ditwah | 6.9355 N, 79.8487 E | 2025-11-15 through 2025-12-03 | 19 |

This is a coarse-grid reanalysis point estimate, not an in-situ rain gauge, region/basin average, cyclone footprint or direct measurement of flood depth. The chart preserves the reported daily mean-rate unit; it does not silently relabel it as an instantaneous rate or infer a monthly trend from this short window. The source returns coordinates rounded to three decimals: allow at most 0.001 degree discrepancy and retain both requested and reported coordinates. Missing days and the declared negative fill value stay null; zero remains a measured/modelled zero. Wrong units, time standard, negative/nonfinite values or unexpected dates are rejected.

### Prospective Meteomatics outlook

The server requests [Meteomatics precipitation](https://www.meteomatics.com/en/api/available-parameters/weather-parameter/precipitation/) `precip_1h:mm`, `source=mix`, at the investigation's single point. It includes total liquid and frozen precipitation as water equivalent. Each number is the accumulation in the **preceding hour**, not a rain rate in `mm/h`. The first interval starts after request time; the next 72 hourly interval-end timestamps form a contiguous series. The full forecast horizon is deliberately distinct from the old event dates.

The provider's [JSON response](https://www.meteomatics.com/en/api/response/json/) `dateGenerated` is preserved as response generation time, **not model initialization or forecast issuance time**. The default response does not supply the latter; `forecast_initialization_at` is explicitly null. `mix` is the requested blend; component-model provenance is unresolved. No probabilities, ensemble spread or prediction intervals are invented from this deterministic response. The forecast is attributed to Meteomatics, not NASA.

The documented [reserved values](https://www.meteomatics.com/en/api/response/reserved-values/) -999, -888, -777 and -666, nulls and absent timestamps remain missing. Reject duplicate timestamps, wrong points/parameter, nonfinite or negative values, stale response-generation timestamps and data outside the requested window. Each rolling total sums exactly 24 contiguous usable hourly accumulations; one missing hour invalidates that window. There are 49 overlapping windows in a complete 72-hour result. Their exceedance count is not a count of independent flood events. No complete windows means a null peak and a withheld screen.

The optional threshold is supplied by the user, blank by default, and explicitly exploratory. The 0–2,000 mm input boundary is a UI processing constraint, **not a calibrated hazard threshold**. No exceedance means neither safety nor absence of a hazard. `warning_state=not_evaluated` and `hazard_model_validated=false` apply regardless of precipitation amount. Expired snapshots remain inspectable but cannot supply a current threshold screen.

## Historical evidence without hindsight leakage

- [Nepal DHM report](https://dhm.gov.np/uploads/dhm/downloads/Situational_Report_on_Extreme_Precipitation_and_Flooding_Event_of_27-29_September_2024.pdf): document dated 8 October 2024, covering 27–29 September. It retrospectively records earlier official bulletins, including 23 and 26 September. Official warnings existed; Iris does not claim to have discovered the event first.
- [UN Sri Lanka Flash Update 1](https://srilanka.un.org/en/306260-sri-lanka-tropical-cyclone-ditwah-flash-update-1): dated 29 November 2025; reports landfall on 28 November. The 28–30 November catalogue window is an investigation window, not a claim about a verified end of the cyclone.

The registry stores document dates separately from `availability_verified=false` and `verified_available_at=null`. A later report's description of an earlier bulletin is not an independently verified original issue-time archive. Both investigations therefore admit **zero independently verified issue-time records**. Default chronology filtering uses event dates for reconstruction; every visible entry still identifies its later report. Revealing later context is an explicit hindsight action, not a rerun of a model.

NASA data retrieved today are retrospective context, with `as_of_availability_verified=false`; their historic date does not prove pre-event availability. Current Meteomatics forecasts cannot be replayed as 2024/2025 forecasts. The official agency links are information links; Iris has not checked the current official-warning status. No casualty counterfactual, lives-saved estimate, hazard probability or warning lead-time score is computed.

## Isolation, provenance and resource bounds

- New Python code lives in `backend/hazards`; shared metadata in `shared/hazard-investigations.json`; UI and parsers in `src/features/hazards`. Existing durable backend data are untouched by this module.
- Basic authentication remains in server request headers, with normal TLS verification and redirects disabled. Provider hosts are fixed; response streaming is capped at 2 MiB. No credentials or provider account/user field is returned or persisted by this module.
- At most two simultaneous provider requests per service/process. Forecasts cache for 15 minutes, keyed by case and an internal account fingerprint, with a local limit of 100 remote requests per UTC day/process. This is a conservative local safeguard, not a shared provider-account quota guarantee. Restarting or running multiple workers resets/multiplies the local counter; no production rate-limiter claim is made.
- Historical context caches in memory until backend restart. Raw public NASA responses are atomically retained at `artifacts/runtime/hazards/nasa/<sha256>.json`, ignored by Git, with a 10 MiB budget. Full storage fails visibly rather than deleting cited evidence. Local exports include source URL, SHA-256, coordinates, units, retrieval time and quality flags.
- Meteomatics raw response SHA-256 identifies the received bytes, but its raw account-bearing payload is not retained. Normalized forecast exports support inspection; the hash alone does not make the historical provider request replayable. Model initialization/version and archived replay remain unavailable.
- All new automated fixtures are explicitly TEST-ONLY and are imported only by tests. Design prototypes under ignored `artifacts/design` contain synthetic mockup values and are never used as application data.

## Verification and scientific status

Run from `backend/`:

```powershell
.venv/Scripts/python.exe -m pytest hazards/tests visualization/tests tests/test_science_pipeline_statistics.py -q
```

Run from the repository root:

```powershell
npx --yes pnpm@12.18.0 test:visualization
npx tsc --noEmit
npx --yes pnpm@12.18.0 build
npx playwright test -c playwright.visualization.config.ts hazards.spec.ts landing.spec.ts immersive.spec.ts mapWorkspace.spec.ts
```

Backend tests cover right-aligned intervals, hand-calculated and independent prefix-sum totals, zero/missing values, reserved sentinels, malformed metadata, duplicate/equivalent timestamps, bounds, finite sums, cache isolation, quota and size failures, sanitized provider errors, route admission and atomic retention. Frontend tests independently recompute totals, validate source/case/calendar identity and withhold stale/insufficient-data screens. Browser tests exercise explicit fetch, cutoffs, hindsight, source display, exports, missing/error/expiry states, case changes, globe links and mobile layout.

Verification on the current `main` baseline (`491afa0`): **109 Python tests, 92 frontend tests and 18 browser tests passed**. Production build, separate TypeScript check, Ruff and staged whitespace checks passed. Python tests emit the existing Starlette/httpx test-client deprecation notice; no dependency migration is included in this feature. Live light/dark screenshots are retained locally under `artifacts/validation/hazards`.

Protected live checks on 15 November 2026 succeeded for both 72-hour point forecasts and both NASA windows. At verification time each had all expected rows and no missing values. Independently comparing the two live forecast arrays with NumPy convolution matched all 49 rolling totals at `rtol=atol=1e-12`. Sanitized normalized check artifacts remain local under ignored `artifacts/validation/hazards`. These checks establish access, shape and arithmetic consistency, **not disaster forecasting skill**.

## Next scientific milestone — not implemented

Before a disaster-risk model or warning-like output can be considered:

1. Confirm access to original issue-time archived forecasts, with model initialization, valid time, revision policy and historical coverage for the selected regions. Today's weather history is not a substitute.
2. Obtain documented basin geometry, hydrologic observations, labelled event/non-event outcomes and relevant antecedent inputs. Establish region and lead-time objectives with a scientific owner.
3. Freeze a chronological evaluation protocol, training-only feature preparation and thresholds, independent baselines, held-out years/events, leakage checks, probability calibration where applicable, and false-alarm/missed-event measures. Two case studies alone cannot establish generalization.
4. Evaluate model skill and local decision thresholds independently. Rainfall skill is distinct from flood/landslide skill; seasonal trends and historical significance are distinct from both.
5. Have the scientific owner review interpretations and official-warning integration before any public alert language or notifications. No unattended warning service is currently running.

ML may be useful after these inputs exist. It is not required to display a genuine provider forecast and cannot compensate for absent labels or issue-time evidence. Monthly Earth-system model evaluation remains a separate later increment described in `FORECAST_EXPLORATION.md`.
