# Dataset forecasts: operation and verification

The default Explore → Forecasts page now runs the historical-data workflow. It does not fetch provider future predictions. Explicit old SHA-256 snapshot links retain the legacy archive view.

## Use

1. Start the backend from `backend/` with `.venv/Scripts/python.exe -m uvicorn visualization_app:app --host 127.0.0.1 --port 8000`.
2. Run the Next.js application with the project scripts.
3. Open `/workspace/forecasts?forecastId=colombo&target=merra2_t2m` to inspect the temperature pilot, or select another location/target.
4. Choose **Generate forecast from datasets**. An existing compatible active model can predict immediately; otherwise a durable job extracts historical records, freezes a dataset, trains three horizon models, evaluates them, activates only eligible models, and generates a forecast.
5. Inspect model evaluation and source/input age. Export the forecast and evidence as JSON.

The staged ingest/build/train controls remain available for inspecting individual stages. **Activate model** admits a hash-verified eligible artifact for its own target and horizon. It does not retire another target's model. Cancel/retry controls and server-side checkpoints preserve completed work. Reopening the page recovers the latest target-specific job and published run.

## Sources

- Meteomatics history uses existing server credentials. A rejected or unsupported historical request fails visibly; it does not fall back to provider future predictions.
- SMAP and supported MODIS/VIIRS point histories use the current AppEEARS API, with explicit science and QA bands. Remote extraction can remain queued at NASA. The worker polls a retained task ID without submitting another extraction.
- MERRA-2 temperature and GLDAS soil-moisture/temperature use the authenticated Giovanni point time-series service. Requests cover bounded historical chunks. Source identity, units, nearest-cell coordinates, sentinels, timestamps, and complete UTC-day coverage are checked.
- Earthdata credentials come from environment credentials, `NETRC`, or local `.netrc`/`_netrc`. Authentication tokens stay in memory. The standard Earthdata token endpoint supports the time-series service; credentials/tokens are not placed in exports or job checkpoints.

Run one backend worker process for this local SQLite configuration. It starts with the application lifespan. Pending remote jobs yield the worker, allowing other targets to proceed. The old provider refresh loop is disabled by default; `FORECAST_REFRESH_ENABLED=true` explicitly enables that legacy service.

Every five minutes while idle, the worker checks for expired local forecasts and runs inference again from staged history and active models. It does not silently backfill or retrain. Use historical ingestion controls to update the staged source records; input freshness checks still suppress unsupported stale-input predictions.

## Forecast semantics

Models use native-period, availability-correct input histories and direct predictions for three complete future periods. Daily targets use complete future UTC days; composites follow their actual calendar cadence, including short year-end intervals. Forecast intervals need not begin immediately after issue time. Every window records exact dates, units, lead hours, model hash, dataset ID and source.

Training and inference share the same feature construction. Inputs are isolated by variable and source. A chronological development/validation/calibration/test split purges labels unavailable at the next split. Internal random early-stopping validation is disabled. Published model weights are fitted before the calibration and final test periods.

Experimental publication requires positive median skill against both available persistence and seasonal climatology, quantile improvement against the seasonal distribution, and the configured minimum interval coverage. Rejected candidates retain their actual evaluation results. They are not activated. Quantiles use a median quantile model, ordered outputs, physical bounds, and a calibration-only interval adjustment. Temporal dependence and source changes preclude a universal coverage guarantee.

These are **experimental local model forecasts**. Availability delays are estimated policies, not a verified historical source-vintage archive. Agreement against reanalysis or land-model targets is not independently measured station accuracy. Input age and held-out evidence are shown explicitly; stale inputs outside the evaluated range suppress a forecast. Soil moisture, surface temperature, air temperature, vegetation indices, and snow indices retain distinct units and physical meaning.

The SMAP geolocation-issue period in May–July 2026 is conservatively quarantined until an explicitly verified corrected source policy is adopted. Year-end gap-filled evapotranspiration is not treated as immediately available data.

## Main API additions

- `GET /api/v1/forecasts/v2/catalogue`: cached local model summaries for landing navigation, including target and units; no training/download side effect.
- `POST /api/v1/forecasts/v2/{location}/generate`: run the complete pipeline; optionally supply an existing `dataset_id` to train without another backfill.
- `GET /api/v1/forecasts/v2/{location}/prediction?target=...`: current target-specific immutable run, with freshness.
- `GET /api/v1/forecasts/v2/{location}/jobs?target=...`: recover the latest job after reconnecting.
- Existing job status, cancellation/retry, model activation, dataset, history and exact-run endpoints remain available.

The Next.js proxy allowlists these route shapes and forwards administrator credentials only when explicitly supplied. Configure `IRIS_ML_ADMIN_TOKEN` for existing administrator-gated mutation behavior when needed.

## Verification boundaries

Software tests use isolated fixtures, including actual sklearn fitting/inference, to verify transport, QA, source isolation, future-window support, calibration separation, job recovery, target-specific activation, artifact hashing and browser workflows. Those tests do not establish weather skill.

The live Colombo pilot retrieved genuine MERRA-2 and GLDAS histories from 2010 onward. Temperature models produced saved forecasts after held-out baseline comparisons. GLDAS soil-moisture candidates failed the comparison and remained withheld. Separate SMAP, MODIS vegetation and MODIS surface-temperature extraction jobs were submitted to NASA; their current completion state is reported by the durable worker rather than assumed.

Validation commands from `backend/`: `.venv/Scripts/python.exe -m pytest forecasts/tests -q`. Frontend checks from the repository root: the visualization test script, `tsc --noEmit`, the production build, and the relevant Playwright forecast/landing/case-study suites.
