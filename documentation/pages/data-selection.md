# Data Selection

The **Data Selection** page is where you configure the exact parameters for your data extraction — the time window, spatial extent, cadence, and aggregation method. It is Step 2 in the Track A workflow.

> Navigate to it via: **Workspace → Data Selection**, or automatically from Super Intelligence after selecting a dataset.

---

## Dataset summary panel

The top of the page shows the authoritative specifications of the selected dataset:

- **Variable name and units** — e.g., "Near-surface Air Temperature (°C)"
- **Provider and mission** — e.g., "NASA POWER / MERRA-2"
- **Available date range** — the actual extent of the archived record
- **Native spatial resolution** — the spatial grain of the original data
- **Supported cadences** — which temporal frequencies are available
- **Authentication requirements** — whether an API key is needed

---

## Temporal configuration

### Date range

Set a **start date** and **end date** for the extraction. The interface enforces the dataset's authoritative bounds — you cannot select dates outside the available record.

**Preset buttons** are available for convenience:
- Last 1 Year
- Last 5 Years
- Last 10 Years
- Full Available Record

**Recommendation:** For meaningful trend analysis, use at least 10 years of monthly data. Shorter records may not have enough statistical power to detect slow trends.

### Cadence

Choose the temporal frequency of the returned observations:

| Cadence | Best for |
|---|---|
| **Monthly** | Long-term trend analysis (recommended) |
| **Seasonal** | Comparing annual seasons across decades |
| **Annual** | Broad multi-decadal patterns |
| **8-Day / 16-Day** | MODIS satellite composites |
| **Daily** | Short-term event analysis |

Iris disables cadences finer than the dataset's native resolution to prevent artificial oversampling. For example, if a dataset is natively monthly, daily cadence will be unavailable.

---

## Spatial configuration

### Spatial selection mode

Choose how to define your study area:

**Point**
A single latitude/longitude coordinate. The extraction returns the value of the nearest grid cell to that point.

**Bounding Box (BBox)**
Draw a rectangle on the interactive map, or enter decimal-degree coordinates manually. The extraction aggregates all grid cells within the bounding box.

**Preset Region**
Select from pre-defined geographic regions:
- Major river basins (Amazon, Congo, Nile, Mississippi…)
- Climate zones (Sahel, Arctic, Mediterranean…)
- Ocean regions (North Atlantic, Pacific ENSO box…)

**Country / Administrative**
Select an entire country or large sub-national unit. Iris uses standard boundary polygons.

**Global**
Aggregate across all land or ocean grid cells. Use for global mean trend analysis.

### Spatial aggregation

When a region contains multiple grid cells, choose how to summarize them:

| Method | Description | Best for |
|---|---|---|
| **Area mean** | Weighted average of all cells | General trend analysis |
| **Median** | Middle value across cells | Regions with high spatial variability |
| **Preserve grid** | Returns full gridded array (advanced) | Custom spatial analysis |

---

## Temporal aggregation

Applies when resampling data to a lower frequency (e.g., daily → monthly):

| Method | Description | Appropriate for |
|---|---|---|
| **Mean** | Average of source observations | Temperature, humidity |
| **Sum** | Total of source observations | Precipitation, runoff |
| **Min / Max** | Extreme values | Heat stress, drought peaks |

Iris enforces physically valid methods — for example, sum is not available for temperature, and mean is not available for precipitation accumulation. Incorrect aggregation would produce physically meaningless numbers.

---

## Extracting the data

Once your parameters are configured, click **"Extract data"**. Iris submits a retrieval request to the upstream provider's API.

The extraction goes through several stages:
1. **Request submitted** — job created in the queue
2. **Subsetting & QA masking** — provider clips to your spatial/temporal bounds and flags any corrupted or missing observations with specific reason codes
3. **Temporal resampling** — aggregated to your chosen cadence with valid-coverage fractions computed per bin
4. **Ready for preview** — data is available to inspect

Extraction time ranges from a few seconds to about a minute depending on the provider, region size, and time window.

---

## Understanding extraction vs. catalog state

A dataset appearing in Super Intelligence search results does **not** guarantee that live data retrieval is available. Each dataset has two independent states:

- **Catalog state** — the dataset is discoverable and its metadata is available
- **Extraction state** — live data retrieval via the API adapter is verified and working

If a dataset shows "catalog only", you can still use the Global Trend Cube (Track B) to explore related pre-computed trend maps for that variable.
