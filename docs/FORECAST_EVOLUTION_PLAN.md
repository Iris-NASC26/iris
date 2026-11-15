# Forecast evolution: phased implementation

## Product goal

Users prepare a historical dataset for a supported spatial scope, choose the matching forecast target, generate a forecast, and understand its estimate, range, data age and measured quality. The six original locations become examples and backward-compatible shortcuts, rather than an application whitelist.

The workflow must distinguish a point/grid-cell estimate from an average across an area. A geographically valid location is not automatically supported by a selected dataset, and a dataset's rectangular outer bounds do not prove that every point inside has observations.

## Phases and completion gates

| Phase | Scope | Completion gate |
|---|---|---|
| 1. Dataset-bound locations and user explanation | Durable dynamic point locations, server-resolved location metadata, dataset selection and compatibility, location-specific job/model/run handling, a short introduction, and old-link compatibility. Define spatial metadata for area aggregates without pretending point records are area averages. | A non-seeded point can be registered, populated using an existing source adapter, selected, trained/predicted through the existing pipeline, and reopened after restart. Unsupported selections clearly explain what data is needed. |
| 2. Fresh inputs and true area datasets | Incremental data updates; product-specific observed publication delays; acquisition/vintage metadata; reliable current input streams; actual bounding-box extraction and documented area aggregation. Reuse existing regional extraction only where source, target, units and spatial semantics are compatible. | A point and an actual area-average dataset can both generate correctly labeled results. Changing the area changes data/model identity. Retrieval budgets, missing cells, aggregation weights and input freshness are verified. |
| 3. Trustworthy evaluation framework | Repeated chronological forecast backtests, a separately reserved final evaluation period, spatial holdouts where appropriate, actual as-of availability where archives permit it, and stronger baselines. Correct the misleading `folds: 4` metadata and remove test-derived freshness policy. | A reproducible evaluation report distinguishes training, tuning, calibration and final assessment, with comparable cases across methods, seasons, horizons and locations. |
| 4. Better inputs and features | Target-specific lag windows and anomalies; rainfall/ET/temperature/radiation/vegetation inputs for soil moisture; relevant atmospheric inputs for temperature; spatial/static predictors when available. Preserve source and availability provenance. | Feature additions improve the established development/backtest results without leaking future observations. Test ablations demonstrate which inputs contribute. |
| 5. Model challengers | More systematic tuning of the existing boosted trees; seasonal/statistical alternatives; appropriate boosted-tree challengers; selected pretrained time-series models as experiments. Consider pooled multi-location models only with explicit spatial features and spatial evaluation. | Models are compared under the same evaluation protocol. New model complexity is accepted only with justified skill, uncertainty and operational cost. |
| 6. Uncertainty, extremes and explanations | Calibration and coverage by lead/season/location; interval width and quantile scores; target-relevant extremes; explanations tied to predictive features; separate statistical trend significance. | Uncertainty is measured and reported without claiming a universal coverage guarantee. Forecast explanations do not imply causation or statistical significance from feature importance. |
| 7. Operations and monitoring | Scheduled ingestion, versioned experiments and model artifacts, scheduled retraining, drift monitoring, reproducible promotion/rollback, and forecast freshness handling. | The system distinguishes reissuing a forecast, updating its input data, and retraining. Qualified models and below-threshold experimental previews remain clearly distinguishable. |

## Location and area policy

- **Point:** the requested coordinates plus the actual source/grid-cell coordinates and spatial support. Display both when they differ. Never imply station-level accuracy from a coarse grid.
- **Area mean:** a documented aggregate of the area's actual source cells or observations, with geometry, aggregation method, coverage and units. An area's centroid is not an area mean.
- **Unsupported geometry or coverage:** explain whether the selection needs new extraction, an area aggregate, another source, or more historical records. Do not silently substitute data from the nearest original city.
- **Phase 1 boundary:** arbitrary supported point locations are implemented end to end. An already materialized, explicitly described area-aggregate dataset may be used only if the current pipeline can bind it correctly. New area extraction/aggregation is Phase 2. The data contract should accommodate it, but the UI must not advertise unimplemented area forecasting.
- **Existing data first:** populated forecast dataset revisions are selectable. If no matching data exists for a new point, the user explicitly prepares history using the existing bounded ingestion workflow. Do not reuse a different location's dataset or model.

## Short introduction in Forecasts

Keep a compact explanation near the top, consistent with the request to reduce page text:

> Choose a place and historical records. Iris learns patterns in those observations to estimate upcoming conditions and a likely range. Check the data age and model error before using a result.

Three small steps can supplement it: **Choose data → Generate → View estimate and range**. Put technical details in the existing disclosure panels. The introduction describes a statistical estimate and its limitations without requiring users to understand ML terminology.

## Delivery approach

Use one reviewed change per phase, with explicit data/schema migrations and preserved legacy artifacts. Phase 1's complete implementation prompt is in [FORECAST_PHASE_1_PROMPT.md](FORECAST_PHASE_1_PROMPT.md). The UI revamp remains a separate design-system effort; integrate these controls into the existing Forecasts design first.

Do not alter the Data Analysis methods as part of the forecast work. Preserve the authentic temperature forecast and the explicitly labeled soil-moisture previews throughout the migration. Scientific behavior changes need their own versions and evaluation evidence.
