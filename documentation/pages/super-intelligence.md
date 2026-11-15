# Super Intelligence

**Super Intelligence** (SI) is the conversational front door to the Iris platform. It translates real-world questions into structured Earth observation searches across NASA and NOAA archives, helping you move from natural-language curiosity to defensible scientific data selection.

> Navigate to it via: **Workspace → Super Intelligence** in the left sidebar.

---

## What Super Intelligence does

Most users do not begin with dataset IDs, GCMD keywords, or provider names. They begin with an observational question such as:

- *Has air temperature increased in Los Angeles over the last 20 years?*
- *Is rainfall declining in the Sahel over the last 30 years?*
- *Are vegetation trends changing in the Amazon Basin since 2000?*
- *Is there a long-term drying signature in California's Central Valley?*

When you submit a question, Super Intelligence:

1. **Parses your intent**: Extracts the phenomenon (temperature, precipitation, vegetation, soil moisture), geographic region (Los Angeles, Amazon, Sahel, global), and temporal context from your query.
2. **Maps to scientific vocabulary**: Translates colloquial terms into standardized NASA GCMD (Global Change Master Directory) keywords and Climate & Forecast (CF) convention variable names.
3. **Searches provider catalogs simultaneously**: Queries NASA POWER, NASA CMR, AppEEARS, GES DISC, and NOAA catalogs in parallel.
4. **Returns ranked candidate products**: Presents dataset cards complete with provider metadata, native resolution, available temporal bounds, and extraction readiness indicators.

---

## Writing effective queries

Super Intelligence is designed to understand natural English, but more specific queries return better results.

**Recommended format:**
```
[phenomenon] [direction/trend optional] in [region] [time context optional]
```

**Examples:**

| Query | What it finds |
|---|---|
| `Temperature trends in the Amazon Basin` | Near-surface air temperature datasets covering the Amazon |
| `Has precipitation decreased in the Sahel over 30 years?` | Monthly precipitation products with long records for sub-Saharan Africa |
| `Vegetation health in California since 2000` | NDVI and related vegetation indices from MODIS/Terra |
| `Arctic sea ice and temperature` | Multiple co-located Arctic climate variables |
| `Drought indicators for Central Valley USA` | Soil moisture, precipitation, and vegetation stress products |

**Tips for best results:**
- Name the **region** explicitly — "Los Angeles County", "Amazon Basin", "Arctic", "Central Valley", or any country name.
- Mention the **phenomenon** even loosely — "warming", "drought", "greening", "soil moisture".
- Time context is optional — if omitted, the full available record is suggested.

---

## Understanding dataset cards

Each dataset card returned by Super Intelligence shows:

- **Variable name & units**: The physical quantity and measurement unit (e.g., Near-surface Air Temperature in °C).
- **Provider & mission**: The originating agency and instrument (e.g., NASA POWER / MERRA-2, MODIS/Terra).
- **Temporal coverage**: The verified archive range (e.g., 1981–present).
- **Native spatial resolution**: Grid cell grain (e.g., 0.5° × 0.625°).
- **Extraction status**:
  - **Extract verified**: Ready for immediate time-series retrieval.
  - **Catalog only**: Discoverable in catalog metadata, but direct time-series extraction endpoint is pending.

---

## Provider filtering

By default, Super Intelligence searches across all connected providers simultaneously. Use the **Advanced Source Filter** to restrict results to specific agencies:

- **NASA**: POWER, CMR / Harmony, AppEEARS, GES DISC (GiC)
- **NOAA**: Climate Data Online (CDO)
- **Copernicus / EODAG**: European Earth Observation
- **Global**: All providers simultaneously

---

## How queries are processed & AI governance

Iris uses `gemini-3.5-flash-lite` as its conversational intent router. To guarantee scientific integrity, strict guardrails are enforced:

- **Query parsing only**: The model extracts structured search parameters (variable, coordinates, bounding box, date range).
- **Zero fabricated numbers**: The AI **never** computes or estimates trend values, slopes, p-values, or anomaly scores. All scientific statistics are computed exclusively by verified, deterministic algorithms.
- **Deterministic offline fallback**: If the AI model or API key is unavailable, Iris seamlessly falls back to a deterministic GCMD ontology dictionary and rule-based geographic gazetteer. The platform always functions reliably offline.

---

## Next step: Moving to Data Selection

Once you select **"Use this dataset"** on any candidate card, Iris transfers the extracted parameters directly into the [Data Selection](#data-selection) step, pre-populating temporal bounds, cadence options, and bounding box coordinates for your investigation.
