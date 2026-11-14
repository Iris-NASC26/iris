# F04 independent scientific references

This directory is a **validation-only environment**, approved by the user for F04. It is not installed by the application, imported by backend/frontend code, or a production statistical engine. F01–F03 review/merge gates remain open. Owner: H3; independent scientific review: qualified H2/another human; H1 reviews integration/ownership and H6 independently reruns checks.

## Run and reproduce

Use the repository's pinned Python 3.13.15 and uv 0.12.9. From the repository root:

```powershell
uv --directory validation sync --locked
uv --directory validation run --locked pytest
uv --directory validation run --locked python -m reference.build_fixtures --check
uv --directory validation run --locked python -m reference.run_checks --check
python scripts/dev.py check
python scripts/dev.py browser
```

The first command installs the separately approved NumPy/SciPy/pyMannKendall/pytest pins in `validation/.venv`. Application dependencies and shared lockfiles are unchanged. No Earthdata credentials or observation downloads are needed. The last two commands run the existing application checks; they intentionally do not install/import this environment.

For an explicit, reviewed fixture rebuild, omit `--check` from `reference.build_fixtures`. To regenerate the evidence report after a reference/fixture/source/environment change, omit `--check` from `reference.run_checks`. Review changes rather than refreshing expected values just to make a failing test pass. Ordinary checks do not modify fixtures/reports.

Optional lint/type checks use the already installed application development tools:

```powershell
backend/.venv/Scripts/python.exe -m ruff check validation/reference validation/tests --config validation/pyproject.toml
backend/.venv/Scripts/python.exe -m ruff format --check validation/reference validation/tests --config validation/pyproject.toml
backend/.venv/Scripts/python.exe -m mypy --config-file validation/pyproject.toml --python-executable validation/.venv/Scripts/python.exe validation/reference validation/tests
```

On POSIX use the corresponding `.venv/bin/python` paths. Numeric tests use explicit tolerances. The JSON report's exact reproducibility check is for the same pinned platform/environment; another BLAS/platform may produce harmless last-bit differences. Preserve the old report and review an environment change rather than assuming byte-identical floating point everywhere.

## What the references establish

`reference/oracles.py` uses separate mathematical constructions, exact arithmetic and established-library comparisons. It imports **no application code or schemas**; tests inspect imports and confirm the application package is absent from the isolated environment. Future production code must not import these references. If production later calls the same library, agreement with that library alone becomes a circular check: retain analytic examples and independent scientific review.

| Reference | Independent evidence | Applicability |
| --- | --- | --- |
| Calendar axis | Literal midpoint-day offsets checked with Gregorian dates, including leap February | Missing positions retain their elapsed distance. A year conversion must be supplied explicitly; 365.2425 days/year is a provisional reference ruler for H3 review |
| Climatology/anomalies | Frozen integer seasonal patterns and same-month arithmetic; baseline subset/count and 9/10 annual-month boundaries | No interpolation. Baseline support is explicit; this is not a complete production eligibility/QA implementation |
| Sen point slope | Enumerated pair slopes and median, exact affine identities, sorted rational tie fixture, SciPy comparator | Actual x coordinates are supplied; no sequence-index substitute across gaps. Outliers remain valid observations |
| OLS | Matrix least squares versus rational hand sums and independent `scipy.stats.linregress` | Reference F uses numerator df=1/denominator df=n−2, and matches t². The four-point case has an independently closed-form F(1,2) tail and t(2) CI |
| Ordinary MK | Explicit pair scores/tie counts and continuity-corrected normal tail versus pyMannKendall | Normal approximation is not an exact small-sample test. A five-point permutation example demonstrates the difference. All ties give S=0, variance=0, p=1 under the stated special-case convention |
| Complete-series HR | Pinned pyMannKendall comparator, actual library source inspected; independent MK score check | **PROVISIONAL**, not original-paper/correction validation. Reject gaps. Fix diagnostic alpha at 0.05 because the library couples alpha to lag selection |
| iid Sen CI | SciPy interval versus independently listed pair-slope ranks | On the six-point tie fixture, one-based bounds are ranks 2 and 14. Installed source confirms nearest-even rounding and index offsets. This is a slope CI for independent errors, not an autocorrelation-aware interval or a fitted-line/prediction band |
| Effective-df OLS | Supplied-rho algebra versus visually inspected Santer equations/discussion | **PROVISIONAL** approximation. Negative-rho effective n is conservatively capped by observed n per TDD. No residual-rho normalization/estimator is silently chosen; adjacent-month pairing is checked separately |
| BH | Exact rational lower envelope, hand q fractions, original-order/exclusion/tie tests, SciPy comparator | No alpha-dependent recomputation of q. Family identity/dependence/repeated exploration are separate concerns |
| Weighted support | Exact fractional numerators/denominators and analytic latitude weights | Separates missing support from zero. No real geometry, mask, cube or service weighting is validated |

For the hand OLS case, the input is `(t,y) = ([0,29.5,59,89.5], [1,2,1,3])`. Exact sums are in the fixture; slope is `150/8881`, R² is `45000/97691`, and F is `90000/52691`. Its F(1,2) p equals `1−sqrt(R²)`. This expectation does not call the reference regression or a production function.

All inference is unavailable for an OLS fit with reference SSE/SST ≤1e−24; point estimates remain reported. That tolerance is an explicit numerical reference convention, not a rule for discarding observations or a scientifically calibrated production threshold. Constant/perfect-fit cases cannot create JSON Infinity or a fabricated significant result.

## Fixtures and evidence

`fixtures/synthetic-v1.json` contains 13 time-series cases: constant, positive/negative line, nonconstant zero trend, calendar gaps, hand OLS, ties, outlier, pure seasonality, seasonal-plus-year trend, all missing, insufficient observations and one seeded AR(1). The BH/area-weight fixtures and dimensional unit cases are also synthetic. Each series/family records inputs, calendar positions, units, generation, expected properties/source, tolerances and limitations. Spatial/p-value fixtures have no time axis; unit cases inherit the manifest's synthetic disclosure and dimensional-check limitation.

The AR example uses PCG64 seed 20261114, 200 burn-in steps, φ=0.6 and 120 retained months. Generating trend zero does not mean sample slope zero or p≥0.05. Stationary variance 25/16 is a model identity, not an asserted realized variance. No seed was tuned to a desired result. The fixture builder does not import the oracle functions.

The installed HR library detrends against observation/month indices even for complete series. That is not identical to the TDD's actual elapsed midpoint-time detrending. Its output is labelled accordingly and cannot serve as the sole golden target for the planned calendar-aware implementation. Review matching coordinate conventions before comparing variance corrections. Degenerate library rank variance is converted to explicit unavailability rather than publishing NaN.

`reports/f04-reference-results.json` contains actual reference outputs, versions, hashes of fixtures/reference/tests/lockfile and relevant external functions, and checked invariants. All non-finite results are rejected during report serialization. The report explicitly records **SM-12 NOT_RUN**, **NASA reproduction NOT_RUN**, and **human sign-off PENDING**. Its source hashes bind the tested reference tree without a self-referential commit/report hash cycle; the final Git commit identifies the submitted change.

`fixtures/acker-source-facts.json` is a small **literature transcription**, not synthetic observations or retrieved SeaWiFS data. It records the visually checked boxes and source p/sign facts. Actual reproduction remains S14. [Primary-source records and inspection anchors](reference/sources.json) distinguish visual checks from accessible text and failed access attempts. Full papers/inspection images are not distributed in Git.

## Scientific gates and human decisions

The machine-readable [method register](fixtures/method-gates.json) distinguishes VERIFIED facts/arithmetic, PROVISIONAL approximations/applicability and BLOCKED methods. These labels never automatically set F03 `Method.validation_status=validated`. Every method still requires the plan's human review and downstream empirical/source acceptance.

Blocking questions for H3:

1. Obtain and inspect the original Hamed–Rao equations; review complete-series lag/variance conventions. Then derive and independently calibrate any calendar-gap extension. The current wrapper returns `method_unvalidated_for_gaps` rather than compressing months.
2. Review autocorrelation-adjusted Sen interval validity and coverage before publication. The current adjusted-CI stub returns `method_validation_required`; no unreviewed bootstrap or iid interval is substituted.
3. Choose/justify residual lag-one normalization, actual calendar pair handling and the 24-pair rule; calibrate the effective-df approximation. Only supplied-rho algebra is evaluated here.
4. Visually verify Weatherhead's equation and sampling derivation. Primary text supports monthly sampling with annual trend units, but rendering/download failed. No detectability equation or horizon is implemented from incomplete evidence.
5. Confirm the reference year ruler and the manuscript's window/support/slope-unit ambiguities before production/reproduction.

The [calibration manifest](fixtures/calibration-plan.json) preserves required downstream scenarios, ≥2,000 ×300-month realizations, metrics and scope. This task runs deterministic reference checks, **not** the full Monte Carlo suite, forecast calibration, paired-bootstrap coverage, paper reproduction or any NASA validation. Scientific readiness and VL-01/VL-02/AC-30/AC-31 remain open.

Primary references: [Santer et al.](https://www.arl.noaa.gov/wp_arl/wp-content/uploads/documents/JournalPDFs/SanterEtal.JGR2000.pdf), [Weatherhead et al.](https://doi.org/10.1029/98JD00995), [Hamed–Rao](https://doi.org/10.1016/S0022-1694(97)00125-X), [Acker manuscript](https://ntrs.nasa.gov/api/citations/20090042747/downloads/20090042747.pdf), [pyMannKendall authors' software paper](https://doi.org/10.21105/joss.01556). See source records for failed-access details and exact pages; no unsupported original-paper verification is claimed.
