# Dataset forecasts: operation and verification

The default Explore → Forecasts page now runs the historical-data workflow. It does not fetch provider future predictions. Explicit old SHA-256 snapshot links retain the legacy archive view.

## Use

1. Start the backend from `backend/` with `.venv/Scripts/python.exe -m uvicorn visualization_app:app --host 127.0.0.1 --port 8000`.
2. Run the Next.js application with the project scripts.
3. Open `/workspace/forecasts?forecastId=colombo`. Without an explicit target, the page selects an already published forecast when one exists. **Published forecasts — ready to view** links open saved results without NASA downloads or training.
4. Choose **Generate forecast from datasets**. A compatible active model predicts immediately. When no active model exists, a hash-verified evaluated rejected candidate can generate an explicitly labeled experimental preview. Otherwise Iris reuses a matching frozen local dataset, or a durable job extracts records, freezes a dataset, trains and evaluates three horizon models. Only eligible models activate; preview generation never changes rejected model state. A pending pipeline is reused rather than submitting duplicate extraction tasks.
5. The result shows a large estimate, three window cards, a shaded 10th–90th percentile range chart, and per-window error comparisons. Temperatures default to °C, with a K switch; exports retain original source units. **Save link** preserves the exact run and **Export** saves its provenance and evaluation. Saved runs remain readable after expiry and are labeled as archived snapshots. Source, model and pipeline details live in collapsed disclosure panels.

**Experimental preview** means the model did not meet the activation checks. A red banner and per-window badges show measured held-out error relative to the best baseline: `100 × (model MAE / baseline MAE − 1)`. A positive result means more error than baseline; a negative result means less error. This is a historical comparison, not a future error guarantee, probability, MAPE, or accuracy percentage. A zero-error baseline has no finite percentage comparison and is shown without an invented value. Detailed scores and failure reasons remain available in **Forecast details & evaluation** and in exports.

Previews still require an actual evaluated model, matching artifact hash and engine, quality-controlled historical inputs within evaluated age limits, and finite physically bounded predictions. Missing data, unavailable model files, unsupported input age, and corrupt artifacts still return unavailable rather than manufactured values. A failed execution shows its error and offers retry. NASA extraction may remain queued for hours or longer; closing the browser does not cancel the durable job.

The staged ingest/build/train controls remain available for inspecting individual stages. **Activate model** admits a hash-verified eligible artifact for its own target and horizon. It does not retire another target's model. Cancel/retry controls and server-side checkpoints preserve completed work. Reopening the page recovers the latest target-specific job and published run.

## Pitch walkthrough

1. Keep the backend and frontend running. Open `/workspace/forecasts?forecastId=colombo&target=merra2_t2m` for the working NASA MERRA-2 temperature pilot.
2. Explain the workflow: genuine historical records → frozen dataset → chronological training/evaluation → passing models → three future daily predictions and uncertainty ranges.
3. Choose **Generate forecast from datasets**. The active temperature models reuse staged data, so inference does not wait for a new NASA extraction. The result appears directly below the target selector.
4. Show **Model evaluation**, the displayed input age, and the prediction dates. Explain that this pilot is experimental and based on delayed reanalysis, with accuracy measured against held-out reanalysis rather than independent stations.
5. Open **Save link** and bookmark it before the presentation. That saved result can be reopened without NASA access or retraining, even when later labeled an archived snapshot. Export the forecast and evidence as a backup. The local backend and its saved runtime artifacts are still required; these data/model artifacts are intentionally excluded from Git.
6. Select **Soil moisture · GLDAS** or open `/workspace/forecasts?forecastId=colombo&target=gldas_sm`. The evaluated soil-moisture candidates generate experimental previews with red baseline error comparisons. Explain that these models remain below the activation threshold; the temperature pilot passed its checks. SMAP extraction is a separate pending NASA task.

## Sources

- Meteomatics history uses existing server credentials. A rejected or unsupported historical request fails visibly; it does not fall back to provider future predictions.
- SMAP and supported MODIS/VIIRS point histories use the current AppEEARS API, with explicit science and QA bands. Remote extraction can remain queued at NASA. The worker polls a retained task ID without submitting another extraction.
- MERRA-2 temperature and GLDAS soil-moisture/temperature use the authenticated Giovanni point time-series service. Requests cover bounded historical chunks. Source identity, units, nearest-cell coordinates, sentinels, timestamps, and complete UTC-day coverage are checked.
- Set `EARTHDATA_TOKEN=` in the ignored `backend/.env` file to supply your NASA Earthdata Login bearer token. MERRA-2 and GLDAS prefer this token over any cached login token; the file is reread before authentication, so editing the value does not require a backend restart. A rejected supplied token fails clearly without silently switching accounts. If the variable is empty, Giovanni can obtain a token using the existing login credentials.
- AppEEARS requires its own session token, obtained through Earthdata username/password credentials from environment variables, `NETRC`, or local `.netrc`/`_netrc`. A NASA Earthdata Login token does not replace an AppEEARS session token. Generated tokens stay in memory; supplied tokens remain only in your server environment/configuration and are not placed in exports or job checkpoints.

Run one backend worker process for this local SQLite configuration. It starts with the application lifespan. Pending remote jobs yield the worker, allowing other targets to proceed. The old provider refresh loop is disabled by default; `FORECAST_REFRESH_ENABLED=true` explicitly enables that legacy service.

Every five minutes while idle, the worker checks for expired local forecasts and runs inference from staged history and active models, or renews an existing experimental preview. It does not silently backfill or retrain. Use historical ingestion controls to update staged source records; input freshness checks still suppress unsupported stale-input predictions.

## Forecast semantics

Models use native-period, availability-correct input histories and direct predictions for three complete future periods. Daily targets use complete future UTC days; composites follow their actual calendar cadence, including short year-end intervals. Forecast intervals need not begin immediately after issue time. Every window records exact dates, units, lead hours, model hash, dataset ID and source.

Training and inference share the same feature construction. Inputs are isolated by variable and source. A chronological development/validation/calibration/test split purges labels unavailable at the next split. Internal random early-stopping validation is disabled. Published model weights are fitted before the calibration and final test periods.

Model activation requires positive median skill against both persistence and seasonal climatology, quantile improvement against the seasonal distribution, and the configured minimum interval coverage. Rejected candidates retain their actual evaluation and registry state. They can generate labeled experimental previews when no active model exists for that target/horizon. Preview selection uses the latest evaluated candidate, not test-score ranking. Each saved run/window preserves quality status, failure reasons and evaluation scores. Quantiles use a median quantile model, ordered outputs, physical bounds, and a calibration-only interval adjustment. Temporal dependence and source changes preclude a universal coverage guarantee.

These are **experimental local model forecasts**. Availability delays are estimated policies, not a verified historical source-vintage archive. Agreement against reanalysis or land-model targets is not independently measured station accuracy. Input age and held-out evidence are shown explicitly; stale inputs outside the evaluated range suppress a forecast. Soil moisture, surface temperature, air temperature, vegetation indices, and snow indices retain distinct units and physical meaning.

The SMAP geolocation-issue period in May–July 2026 is conservatively quarantined until an explicitly verified corrected source policy is adopted. Year-end gap-filled evapotranspiration is not treated as immediately available data.

## Main API additions

- `GET /api/v1/forecasts/v2/catalogue`: cached local model summaries for landing navigation, including target and units; no training/download side effect.
- `POST /api/v1/forecasts/v2/{location}/generate`: run the complete pipeline; optionally supply an existing `dataset_id` to train without another backfill.
- `GET /api/v1/forecasts/v2/{location}/prediction?target=...`: current target-specific immutable run, with freshness.
- `GET /api/v1/forecasts/v2/{location}/published`: locally saved current runs across targets, including expiry and explicit `quality_status`; includes experimental previews. Read-only, with no extraction, training or inference.
- `GET /api/v1/forecasts/v2/{location}/jobs?target=...`: recover the latest job after reconnecting.
- Existing job status, cancellation/retry, model activation, dataset, history and exact-run endpoints remain available.

The Next.js proxy allowlists these route shapes and forwards administrator credentials only when explicitly supplied. Configure `IRIS_ML_ADMIN_TOKEN` for existing administrator-gated mutation behavior when needed.

## Verification boundaries

Software tests use isolated fixtures, including actual sklearn fitting/inference, to verify transport, QA, source isolation, future-window support, calibration separation, job recovery, target-specific activation, artifact hashing and browser workflows. Those tests do not establish weather skill.

The live Colombo pilot retrieved genuine MERRA-2 and GLDAS histories from 2010 onward. Temperature models produced saved forecasts after passing held-out comparisons. GLDAS soil-moisture candidates failed those comparisons; they now produce labeled experimental previews with approximately 8.0%, 5.4%, and 8.2% more held-out MAE than the best baseline for the three daily windows. Separate SMAP, MODIS vegetation and MODIS surface-temperature extraction jobs were submitted to NASA; their current completion state is reported by the durable worker rather than assumed.

Validation commands from `backend/`: `.venv/Scripts/python.exe -m pytest forecasts/tests -q`. Frontend checks from the repository root: the visualization test script, `tsc --noEmit`, the production build, and the relevant Playwright forecast/landing/case-study suites.
