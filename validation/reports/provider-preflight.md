# F05 — NASA authentication, source and transfer preflight

**14 November 2026, Asia/Colombo. Technical preflight complete; domain review pending.**
Practice build. SRS/TDD v0.3 and Implementation Plan v1.0 remain unchanged.
Owner H2; reviewers H1/H3 remain provisional. The user explicitly requested merge
after implementation. Merge authorization does not confer scientific sign-off.

Trace: DA-02–07, SEC-2–3, DR-C7, PERF-5; TDD §3.1–3.8; plan F05.
[Machine-readable evidence](provider-preflight.json) contains exact source IDs,
parameters, times, measured bytes, checksums, successes, failed probes and sizing
assumptions. No token, password, signed download URL or private profile is included.

## Verified access and actual outputs

| Route | Actual result | Limit of this evidence |
| --- | --- | --- |
| POWER V01 UTC Zarr | Metadata, real compressed T2M chunk and coordinates decoded; units C | One spatial chunk, not global completeness |
| POWER V12 LST Zarr | Metadata, real compressed solar chunk and coordinates decoded; W m-2 | Preserve LST; do not equate with the UTC point query |
| POWER point REST | Real 2003 response, SB community, longitude −97.5/latitude 37.5 | Annual-summary key 200313 must be excluded from monthly data |
| CMR | Eight exact collection/version/DOI identities and genuine January 2005 granules | Discovery alone is not data admission |
| Provider HTTPS | Eight authenticated 64 KiB ranges with valid HDF signatures; bounded HDF5 header inspection for seven products | AIRS raw source is HDF4; its approved Giovanni output was inspected instead |
| Harmony HOSS | GLDAS field/bbox subset completed; 36,958-byte NetCDF4 verified | Demonstrates one actual operation, not every advertised capability combination |
| Giovanni | GLDAS regional CSV and global AIRS GeoTIFF completed and retrieved | Only one month per probe; no trend or record eligibility established |
| AppEEARS | Two approved B01/B02 engineering probes completed, each with NDVI, VI Quality and reliability rasters plus CSV/metadata | Final product presets remain unselected; these are not analysis-ready regional series |

All service output hashes were checked. Cross-host downloads strip Earthdata
Authorization headers and allow only the specific observed HTTPS distribution.
No signed URL or cookie was persisted. The original source URL, granule/job ID,
requested ranges, output hash and transformation metadata remain traceable.

| Provider job | Actual ID | Provider wall time, including queue |
| --- | --- | --- |
| Giovanni GLDAS B01 CSV | `1054ac36-33f1-48f5-b6da-778f6e9daa2c` | 769.384 s |
| Giovanni AIRS global map | `aabb96d9-d9de-48a7-8cc8-8be80054c34a` | 253.029 s |
| HOSS GLDAS B01 subset | `60538c0c-0c79-4a3d-8fc8-1086b87ded7c` | 5.306 s |
| AppEEARS B01 | `60d7e7fe-e49c-45ab-88b6-8ac2bd99d11e` | About 9 min 12 s |
| AppEEARS B02 | `995b87c2-b86b-4f7e-8090-372e42aaae50` | About 2 min 45 s |

Quota was checked before each Giovanni submission. Initial 401 cleared after the
user completed browser authorization. The final observed account fraction used
was **0.000001304**, not a count of free jobs. Warn at 0.8; stop at 0.9 or unknown.
Account deltas may include other account activity and are not universal job costs.

## Source facts and independent checks

- **POWER:** both stores report Version 10.0.0. Decode Blosc and the declared
  `fixedscaleoffset` filter before interpreting values. T2M stays C; solar stays
  W/m². The 12 overlapping 2003 temperature points agree with REST within
  **0.00002686 °C**. Solar LST/UTC differences are retained, not forced to match.
- **Future time coordinates:** both metadata ends advertise 2029-12-31. Actual
  finite samples end at 2026-09 for V01 and 2026-07 for V12 at the probed point.
  Neither establishes the latest complete global month. Missing/future values
  remain missing; no interpolation or zero filling was performed.
- **GPCP:** actual field is **`sat_gauge_precip`**, units mm/day, fill −99999;
  `quality_index` is present. This resolves the TDD's explicitly provisional
  `precip` field assumption without changing the selected product/version.
- **IMERG:** `Grid/precipitation`, mm/hr, source calendar `julian`; preserve its
  time units/bounds and use a calendar-aware decoder in D13. The eventual rate
  conversion is ×24, not an assumed identity.
- **GLDAS:** all four approved fields are present. Soil/SWE are kg/m²; Evap is
  kg/m²/s; Qs is kg/m² with `time: mean`. Retain the documented three-hour
  accumulation interpretation for Qs; do not multiply it by 86,400.
- **MERRA-2 AOD:** TOTEXTTAU is dimensionless on `[1,361,576]`; preserve native
  0.5°×0.625° support and its actual fill attributes.
- **OMI:** exact HDFEOS path is recorded; capitalized `Units`, `ScaleFactor`,
  `MissingValue` and `Offset` matter. Units are molec/cm², scale 1, and the field
  title confirms screening for cloud fraction <30%. Daily-to-monthly completeness
  and counts still require D11 validation.
- **Ocean color:** exact monthly 9 km MODIS/SeaWiFS products have chlor_a in
  mg m^-3, fill −32767 and declared valid range 0.001–100. Missions remain
  separate. Neither collection advertises Harmony services; approved HTTPS works.
- **AIRS map:** real 360×180 EPSG:4326 TIFF, units kg/m², AIRS3STM 7.0,
  DOI and ascending/daytime description in its header. Counts/QA are not included
  in this one-field map; its finite cells are not proof of observational coverage.

An independent float64 cosine-weighted mean from **400 real native GLDAS cells**
in the aligned B01 box is 28.966091398112653 kg/m²; Giovanni reports 28.96609.
Difference: **0.000001398113 kg/m²**. The HOSS subset's decoded float64 data hash
exactly matches the independently retrieved provider subset. This validates the
specific aligned sample, not general polygons, coasts, masks or all products.

## AppEEARS QA/scaling finding

The GeoTIFFs contain integer NDVI with **scale 0.0001 and fill −3000**; the CSV
already contains physical NDVI. QA rasters share the output grid. Negative valid
NDVI was retained. Fill was excluded before inspecting scaled values.

For both probes, CSV Count equals all nonfill NDVI pixels and the CSV mean matches
the **unfiltered, unweighted** raster mean at its printed precision. Those pixels
include reliability code 3 (cloudy): **4,703 in B01 and 120,104 in B02**. The lookup
tables, aligned raster hashes and diagnostic counts are recorded. This is direct
evidence against using these CSVs alone for our QA-filtered area-weighted series.

Use the already approved **task QA rasters → local calculation** path in D12/D14.
The geographic output extends into edge cells; use exact geometry/support weights,
not pixel count as eligible area. The production QA policy is not selected here.
January B02 is heavily snow/cloud affected; successful acquisition must not make
that month scientifically eligible. No AC-27 or ten-year trend acceptance is claimed.

## Transfer, storage and elapsed-time budgets

The first anonymous run transferred **3,266,649 body bytes in 31 requests**.
Subsequent samples are separately hashed. Two AppEEARS probe downloads total
**2,680,870 bytes**. Approximately **113.1 GB decimal** free disk was observed.
These are measurements; they are not the full cube size or a bandwidth benchmark.

| POWER quantity | V01 | V12 |
| --- | --- | --- |
| Compressed sample chunk | 648,508 B | 1,056,901 B |
| Padded decoded chunk | 2,116,800 B | 2,818,800 B |
| Advertised full array values | 489,065,472 B | 90,201,600 B |
| Sample chunk × global chunk count | 168,612,080 B | 33,820,832 B |

The last row is a one-chunk compression estimate. Source chunks span their entire
time axes, so a short time request does not imply a short transfer.

The JSON capacity table keeps fixed GPCP/IMERG cutoffs and labels every other
planning endpoint as **a sizing assumption or sample-point bound**, never verified
availability. Its native/coarsened values total about **3.31 GB**, or **6.61–9.92 GB**
with an illustrative 2–3× allowance for coverage/flags. Source retention, native
intermediates, masks, caches and temporary writes are additional. This is not a
measured release size or compression claim.

Full-file source fallbacks are costly: the sampled AIRS file is **211,131,480 B**;
the OMI file is **13,979,976 B per day**; GLDAS is **25,075,859 B per month**, shared
by four variables. The JSON shows their period multiplications and cadence. Avoid
full raw archive staging: stream supported subsets/selected fields, preserve
checksums, budget native processing and retain a disk reserve before bulk work.

At the observed cold AIRS-map latency, the 287-month sizing scenario would take
about **20.2 hours serially**, exceeding PERF-5's 12-hour target. One cold job is
not sustained/parallel throughput evidence. **Bulk-build feasibility has not passed.**
H2/H1 must benchmark a bounded batch and approve job/byte/disk budgets before D16.
Approved annual-map fallback remains conditional, with lost monthly capabilities
disclosed; it was not activated. Do not silently reduce P0 or assume unlimited
remote concurrency. V13's 252-month byte projection is likewise a one-month
compression illustration, not a queue-time prediction.

## Reproduction and security

Use [the isolated tool guide](../preflight/README.md). The public utility and
default tests never read credentials or submit jobs. Live checks require explicit
opt-in. Authenticated source inspections use fixed HTTPS providers, bounded
verified ranges and 4 MiB/file ceilings; selected provider job outputs use a
4 MiB/object ceiling. No raw archive or production ingestion service was created.

Original source/subset/output bodies remain in the ignored artifact directory
named in the JSON. SHA-256 records bind retained artifacts and code/lock inputs.
Small numerical test fixtures are explicitly synthetic; reported probe values
come from NASA, not a generated fixture. Service outputs can expire; reuse these
job IDs while available and record new IDs/hashes for a human-approved rerun.

The user's `%USERPROFILE%\.netrc` is outside Git; its Windows ACL was inspected.
An optional empty `%LOCALAPPDATA%\EarthTrendDetective\secrets\.env` containing
`EARTHDATA_TOKEN=` was created with current-user/SYSTEM access. The user may edit
it locally. Only opt-in preflight tools read it; the React app and health server
do not. Never use `VITE_` credentials. No token response, password, cookie or signed
URL is committed. The [tool-only licence inventory](../preflight/DEPENDENCY_LICENSES.md)
retains the existing NumPy/bundled-notice release gates; application locks are unchanged.

## Resolved probe errors and remaining gates

Initial CMR overlap queries admitted cumulative products/boundary months; exact
monthly queries corrected them. GPCP's provisional field failed and was resolved
from the actual header. An initial shortened Harmony URL omitted `/collections/`;
label-filtered lookup confirmed no job before a corrected request. Its relative
303 was then reconciled to the unique successful job. No duplicate job was submitted.

An exploratory two-variable AIRS HOSS request returned **400**; its body was not
retained, so the cause is unknown. It does not establish unsupported capability.
Do not retry blindly. Approved AIRS Giovanni output and GLDAS HOSS both succeeded.

Remaining work belongs to downstream tasks/review: complete-window and citation
validation, per-binding QA/support, grids/masks, production policies and build
throughput approval. F04 inference/calibration gates remain unchanged. This
preflight does not pass AC-25–27, PERF-5, scientific release acceptance or full MVP
requirements. Human domain review remains pending even if code is merged at the
user's explicit direction. No additional feature or application architecture is proposed.

Primary references: [POWER AWS](https://power.larc.nasa.gov/docs/tutorials/service-data-request/aws/),
[monthly API](https://power.larc.nasa.gov/docs/services/api/temporal/monthly/),
[Harmony API](https://harmony.earthdata.nasa.gov/docs),
[official Harmony client example](https://harmony-py.readthedocs.io/en/stable/user/tutorial.html),
[NASA Giovanni tutorial](https://github.com/nasa/gesdisc-tutorials/blob/main/notebooks/How_To_Access_the_Giovanni_Averaging_Service_Using_Python.ipynb),
[AppEEARS API](https://appeears.earthdatacloud.nasa.gov/api/),
[Earthdata tokens](https://urs.earthdata.nasa.gov/documentation/for_users/user_token).
