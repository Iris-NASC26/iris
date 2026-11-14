# F05 source inspection tools

This separate, pinned environment inspects real NASA bytes. It is not an
application dependency, data-release builder, statistical engine or ingestion
adapter. See [the preflight report](../reports/provider-preflight.md) for actual
evidence, unresolved admission/feasibility gates and source references.

From the repository root:

```powershell
uv --directory validation/preflight sync --locked
python scripts/provider_preflight.py --run-public
```

The public command prints a new ignored `artifacts/f05/<UTC>/manifest.json` path.
Use that directory explicitly below; replace `<run>` with the printed directory
name. These commands operate on its authentic retained samples:

```powershell
uv run --project validation/preflight --locked python -m validation.preflight.inspect_power --run-public --artifact-dir artifacts/f05/<run>
uv run --project validation/preflight --locked python -m validation.preflight.inspect_sources --run-authenticated --artifact-dir artifacts/f05/<run>
```

POWER decodes the source compressor/filter and actual coordinates, checks chunk
hashes and compares a fixed 2003 point with REST. Cached coordinates are reused
only when their recorded hashes match. Source UTC/LST labels stay distinct.
This is not global completeness, regional aggregation or trend validation.

The authenticated reader uses the fixed public source identities and first-range
hashes in the committed evidence when private operational manifests are absent.
It makes no provider job submission. A changed/missing source or unsupported
format fails explicitly. HDF4 AIRS is skipped; the actual approved Giovanni map
is recorded separately. Each HDF5 read uses real HTTP 206 ranges, verifies offset,
length, total size and stable ETag, caches pages and stops at 4 MiB/64 requests per
file. It never pads a partial file to impersonate a full granule.

For authentication, configure external `.netrc` with the Earthdata host, login
and password; verify its private OS permissions before use. The optional token file
is now the Git-ignored project-root `.env`, moved by explicit user request during U01.
The legacy Windows path `%LOCALAPPDATA%\EarthTrendDetective\secrets\.env` remains a fallback:

```dotenv
EARTHDATA_TOKEN=
```

Set the value only in a local editor. Token environment variable takes precedence,
then the project-root file, then the legacy Windows file; otherwise the tool obtains/reuses an Earthdata
token from the external `.netrc`. It never evaluates shell syntax or prints a
token. An explicitly configured invalid token is not silently replaced. The
health server and React application do not load these files. AppEEARS requires its
separate login/token, kept in memory during operator probes. No secret belongs in
`VITE_` variables, source, fixtures, job metadata or a pull request.

Only `EARTHDATA_TOKEN` is read, without shell evaluation or export of other entries.
The historical F05 report records the original inspected source hashes and original
credential location. This U01 parser/location change does not regenerate historical
evidence or claim fresh authenticated access; offline parser regression tests cover it.

AppEEARS samples were operator-submitted for the user-approved B01/B02 boxes in
January 2005, requesting MOD13A3.061 NDVI, VI Quality and pixel reliability as
geographic GeoTIFFs. Exact payloads, job IDs, bundle descriptors and verified
download hashes are in the evidence. Downloads strip credentials at the provider's
specific observed CDN. File paths are generated locally from IDs, not remote paths.

To inspect those retained verified exports:

```powershell
uv run --project validation/preflight --locked python -m validation.preflight.inspect_appeears --benchmark B01 --artifact-dir artifacts/f05/<run>
uv run --project validation/preflight --locked python -m validation.preflight.inspect_appeears --benchmark B02 --artifact-dir artifacts/f05/<run>
```

These need `appeears-b01-downloads.json`/`appeears-b02-downloads.json` and the
referenced authentic outputs in the same directory. A fresh clone has no private
provider output cache. Reuse the captured task IDs on the same authorized account,
or have the operator submit equivalent bounded tasks and record fresh IDs/hashes;
do not automatically duplicate a queued job. Native rasters remain ignored.

The inspection verifies hashes, file/pixel limits, same-grid QA, nodata and declared
scale before comparing service statistics. Reliability/QA counts are diagnostics,
not a selected production QA policy or a scientifically accepted monthly mean.
Pillow is an **F05-only read-only format inspection tool**; the TDD's runtime GIS
choice remains rasterio. No product feature or architecture change is introduced.

## Offline checks

```powershell
backend/.venv/Scripts/python.exe -m unittest discover -s scripts/tests -v
uv run --project validation/preflight --locked python -m unittest discover -s validation/preflight/tests -v
backend/.venv/Scripts/python.exe -m ruff check --config backend/pyproject.toml scripts/provider_preflight.py scripts/tests validation/preflight
backend/.venv/Scripts/python.exe -m ruff format --check --config backend/pyproject.toml scripts/provider_preflight.py scripts/tests validation/preflight
backend/.venv/Scripts/python.exe -m mypy --strict --explicit-package-bases --ignore-missing-imports scripts/provider_preflight.py scripts/tests validation/preflight
```

The two test suites contain synthetic transport/format fixtures, not NASA
observations. They run without credentials, external APIs or provider jobs.
Record scientific package versions and hashes with actual probe evidence. Default
application setup/checks and both shared lockfiles are unchanged; F06 owns CI
integration. Code/transport tests passing is not scientific release acceptance.

Provider examples and snapshots may differ on a rerun because services update.
Keep failures and new hashes; never repair observations to force agreement.
Human H2/H3 review and the existing F04 scientific gates remain required.
