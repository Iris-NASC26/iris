# Living Globe

Living Globe displays authentic NASA POWER **monthly spatial fields**, with a 3D globe and a 2D fallback. Open **Workspace → Living Globe**. This page has no point-dataset discovery or extraction drawer; use **Plot & Visualize** for point time series.

## Load a layer

1. Choose a **Spatial variable** from the grouped dropdown.
2. Choose **Entire globe**, **Europe — bounding box**, another preset or a custom extent.
3. Select a **Spatial month**.
4. Press **Load spatial field**. Changing a selection alone does not download observations.

Small extents use bounded native-grid reads. Large extents use a documented overview with cosine-latitude-weighted aggregation when needed. Source resolution, output resolution, missing values and aggregation are displayed. Europe is a rectangular extent, not an administrative or continental polygon.

## Available variables

| Layer | Units |
| --- | --- |
| Air temperature at 2 m | °C |
| Earth skin temperature | °C |
| Dew/frost point at 2 m | °C |
| Corrected precipitation rate | mm/day |
| Snow depth | cm |
| Surface soil wetness | Dimensionless index, 0–1 |
| Root-zone soil wetness | Dimensionless index, 0–1 |
| Relative humidity at 2 m | % |
| Wind speed at 10 m | m/s |
| Surface pressure | hPa |
| Surface sunlight | W/m² |

Precipitation is a monthly mean daily rate, not a monthly accumulation. Snow depth is a model depth, not snowfall or snow-cover percentage. Soil wetness is not volumetric water content. Wind speed does not include direction. Surface pressure is not sea-level pressure.

MERRA-2 variables use UTC-labelled monthly data at 0.5° × 0.625°. The sunlight field uses CERES SYN1deg-based LST-labelled data at 1° × 1°. These maps do not establish trend significance or forecasting skill. They are not the precomputed trend cube described by earlier prototype screens.

## Explore and customize

Rotate and zoom the globe, frame the selected extent, or switch to **2D map**. The 2D map also supports drawing an extent. Inspect a cell to see its numerical source value, footprint, month and provenance. Values are read from the numeric grid, not inferred from imagery colours.

Use **Layers** to control field/basemap visibility and opacity. Choose a colour ramp, a fixed display range, the current field's automatic range or custom bounds. Fixed display ranges remain consistent across months; values outside their bounds clamp to the palette endpoints. Styling never changes the underlying values. Snow depth defaults to a blue–cyan–white palette. Missing cells stay transparent.

Use previous/next month or spatial playback to load distinct source months. Unsupported months and provider failures are reported rather than replaced with invented data. The loaded-month label identifies the field actually shown.

The tiled basemap has separate imagery attribution and resolution limits; zooming the basemap does not increase the scientific grid's resolution. A 2D fallback remains available when WebGL fails.

## Data access

These public NASA POWER grids do not require Earthdata credentials. Source details, cache status and artifact hashes are available with the loaded field. See [NASA POWER direct-access documentation](https://power.larc.nasa.gov/docs/services/aws/) and `docs/VISUALIZATION.md` for source bindings and limits.
