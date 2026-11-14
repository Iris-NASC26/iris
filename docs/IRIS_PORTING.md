# Iris → earth-trend porting assessment

Reviewed 14 November 2026 against `iris/main` (`dcffc86`, byte-identical to
`origin/initial-navida`). Verdict per component; "port" means re-implement
against our contracts and gates, not copy-paste.

## Worth porting

- **Place geocoding** (`backend/providers/geocoder.py`, `src/app/api/v1/geocode`):
  resolves place names to coordinates via the Open-Meteo geocoding API. Small,
  bounded, no credentials. Replaces our static 5-place list in Data preview and
  could drive region boxes. Needs the same treatment as POWER: fixed allowlisted
  host, size cap, cache, failure states, and a "results are provider-suggested"
  disclosure.
- **2D region-drawing map** (`src/components/map/IrisMap.tsx`, MapLibre +
  mapbox-gl-draw + turf): draw-a-box for series/field requests. Two blockers to
  decide first: it loads OSM raster tiles at runtime (external requests — policy
  decision needed) and pulls maplibre/draw/turf dependencies (licence +
  offline-basemap question). A drawn-box alternative that stays local is a form
  of bbox inputs, already present — map is a UX upgrade, not a capability gap.
- **Guided investigation / case-study UX shell** (`case-studies` page,
  `GUIDED_INVESTIGATIONS` structure): the quiz/walkthrough shape fits VC-tasks.
  Content must be authored from approved sources, not imported — their entries
  are unverified marketing-flavoured text.

## Keep excluded (already decided)

- **SI chat + `llm_router` + Gemini**: our rule-based assistant stands; a
  model-backed version is a separate reviewed task.
- **10 provider adapters** (CMR, Harmony, Giovanni, AppEEARS, OPeNDAP, NOAA…):
  excluded for centroid sampling, product substitution and unverified
  statistics. Revisit per-variable under the admission gates when V02–V11 are
  scheduled.
- **`srsCubeAndScienceEngine` / `dataRetrievalEngine`**: claim validated trend
  methods, case files and science pipeline outputs that do not exist. Our
  contract layer is the honest version of this.
- **Research papers / case studies data**: hard-coded, unverified claims.
- **`documentation/` site**: our `docs/` + OpenAPI set is the authoritative
  record; porting a second doc system adds drift risk.

## Bottom line

One clean port (geocoder), one conditional UX port (drawn-box map pending
tile/dependency policy), one content-shell port (guided investigations).
Everything else stays excluded for the reasons already on record in
`NAVIDA_INTEGRATION.md`.
