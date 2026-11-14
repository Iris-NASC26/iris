# System Intelligence

**System Intelligence** (SI) is Iris's natural language interface for discovering Earth observation datasets. It is the entry point for Track A investigations.

> Navigate to it via: **Workspace → System Intelligence** in the left sidebar.

---

## What it does

When you type a question in plain English, System Intelligence:

1. **Parses your intent** — extracts the phenomenon (temperature, precipitation, vegetation…), region (Los Angeles, Amazon, global…), and time context from your query
2. **Maps to scientific vocabulary** — translates colloquial terms to standardized NASA GCMD keywords and CF-convention variable names
3. **Searches multiple provider catalogs simultaneously** — queries NASA CMR, NASA POWER, AppEEARS, GES DISC, and other connected providers in parallel
4. **Returns matched datasets** — presents ranked dataset cards with provider metadata, extraction readiness, and quality indicators

---

## Writing effective queries

System Intelligence is designed to understand natural language, but more specific queries return better results.

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

**Tips:**
- Name the **region** explicitly — "Los Angeles County", "Amazon Basin", "Arctic", "Sahara", or any country name
- Mention the **phenomenon** even if loosely — "warming", "drought", "greening", "soil moisture"
- Time context is optional — if omitted, the full available record is suggested

---

## The results panel

After searching, you will see a list of **dataset cards**. Each card shows:

- **Variable name** — the scientific name and physical units (e.g., Near-surface Air Temperature in °C)
- **Provider** — the upstream agency and dataset (e.g., NASA POWER / MERRA-2)
- **Temporal coverage** — available date range
- **Native resolution** — spatial grain of the original observations
- **Extraction status** — whether live data retrieval is currently available for this provider:
  - ✅ **Extract verified** — ready for retrieval
  - ⚠️ **Catalog only** — dataset is discoverable but live extraction is not yet enabled

---

## Provider filtering

By default, System Intelligence searches all connected providers. Use the **Advanced Source Filter** panel to restrict results to specific agencies:

- **NASA** — POWER, CMR/Harmony, AppEEARS, GES DISC (GiC)
- **NOAA** — NOAA Climate Data Online
- **Copernicus/EODAG** — European Space Agency Earth Observation
- **Global** — all providers simultaneously

Filtering is useful when you need data from a specific sensor mission (e.g., MODIS-only vegetation products) or when certain providers are unavailable.

---

## How queries are processed

Iris uses `gemini-3.5-flash-lite` as the AI intent router. This model:

- **Only parses queries** — it extracts structured search facets (variable, region, time range) from your text
- **Never generates scientific numbers** — all statistics, trend values, and p-values are computed by deterministic algorithms, never by the AI model
- **Has a deterministic fallback** — if the AI is unavailable, Iris falls back to a rule-based GCMD ontology dictionary and geographic gazetteer so the platform always works offline

> **Important:** The AI component in Iris is strictly limited to language understanding and plain-language explanation. All scientific computation is performed by verified, deterministic algorithms independent of the AI model.

---

## After selecting a dataset

Once you click **"Use this dataset"** on a card, Iris loads the dataset's full metadata into the [Data Selection](#data-selection) page, pre-populating the temporal bounds, cadence options, and spatial selection controls with the dataset's authoritative specifications.
