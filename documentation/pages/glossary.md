# Glossary

Key terms used throughout Iris and its documentation.

---

## A

**Anomaly**
An observation that deviates significantly from the expected seasonal baseline. In Iris, anomalies are defined as observations with an absolute Z-score ≥ 2.0 (approximately 2 standard deviations from the seasonal mean).

**Area-weighted mean**
A spatial aggregation method where each grid cell's value is weighted by its actual area on Earth's surface. Cells at higher latitudes cover less area than cells near the equator, so this correction is important for accurate regional averages.

**Autocorrelation**
The correlation between a time series and a delayed copy of itself. In climate data, consecutive monthly observations tend to be similar (positively autocorrelated). Autocorrelation inflates the apparent significance of Mann-Kendall tests if not corrected.

---

## B

**Benjamini-Hochberg (BH) FDR**
A statistical procedure for controlling the False Discovery Rate when many tests are run simultaneously. When testing trend significance for every grid cell globally, some will appear significant by chance. BH-FDR adjusts p-values to control the expected proportion of false discoveries. Iris reports the adjusted value as the **q-value**.

**Bounding Box (BBox)**
A rectangular geographic region defined by minimum and maximum latitude and longitude coordinates. The simplest way to define a custom study area in Iris.

---

## C

**Case File**
Iris's structured output for a completed investigation. Contains the statistical verdict, all computed metrics, the time-series charts, anomaly detection results, evidence grade, and a full provenance record. Each Case File has a unique immutable ID.

**Cadence**
The temporal frequency of observations. Common cadences in Iris include daily, 8-day, 16-day, monthly, seasonal, and annual.

**Catalog state**
Whether a dataset has been indexed and is discoverable in Iris's provider catalog. A dataset with catalog state "available" can be found through System Intelligence but may not yet support live data extraction.

**Change point**
A date at which a statistically significant structural shift (step change) occurs in a time series, detected using the Pettitt test. Can indicate a real environmental shift, a policy change, or a sensor artifact.

**Completeness**
The fraction of a requested time window for which valid, non-missing observations are available. Expressed as a percentage. High completeness (≥ 90%) is essential for reliable trend analysis.

**Confidence interval (CI)**
A range of plausible values for a statistical estimate. In Iris, the 95% CI for Sen's slope means that if the same study were repeated many times, 95% of the computed intervals would contain the true slope.

---

## D

**Deseasonalization**
The removal of a repeating seasonal cycle from a time series, leaving the underlying long-term trend and residual variability. Iris uses STL decomposition for this step.

**Deterministic algorithm**
A computation that always produces the same output from the same input, with no randomness. All statistical calculations in Iris (Mann-Kendall, Sen's slope, STL, Pettitt) are deterministic. The AI component is not involved in any scientific computation.

---

## E

**Evidence grade**
A quality rating (A through D) assigned to each Case File based on data length, completeness, and statistical robustness. Grade A is the highest confidence; Grade D is preliminary.

**Extraction state**
Whether Iris can retrieve live data from a dataset's upstream provider API. Separate from catalog state — a dataset may be discoverable but not yet extraction-ready.

---

## F

**False Discovery Rate (FDR)**
The expected proportion of significant test results that are actually false positives, when many tests are conducted simultaneously. Controlled by the Benjamini-Hochberg procedure.

---

## G

**Global Trend Cube**
Iris's pre-computed database of trend statistics for every 0.5° × 0.5° grid cell on Earth across six core climate variables, covering 1981–2025. Powers the Living Globe and Regional Case Board.

**GCMD keywords**
Global Change Master Directory keywords — a hierarchical vocabulary maintained by NASA for standardizing the naming of Earth science variables, instruments, platforms, and locations. Used internally by Iris to match plain-language queries to dataset metadata.

---

## H

**Hamed-Rao correction**
A modification to the Mann-Kendall test (Hamed & Rao, 1998) that accounts for autocorrelation in the time series. Prevents artificially inflated significance due to serially correlated observations. Applied by default in Iris for all series with n ≥ 10 years of monthly data.

---

## M

**Mann-Kendall test**
A non-parametric statistical test for detecting monotonic trends in time series data. Does not assume a normal distribution. Iris uses the Hamed-Rao autocorrelation-corrected version.

**MERRA-2**
Modern Era Retrospective analysis for Research and Applications, Version 2. A NASA global atmospheric reanalysis product used as the basis for many variables in NASA POWER.

**Missingness**
The proportion of a time window where valid observations are absent. The complement of completeness (missingness = 1 − completeness).

**MODIS**
Moderate Resolution Imaging Spectroradiometer. A sensor aboard NASA's Terra and Aqua satellites producing global land surface observations including vegetation indices (NDVI), land surface temperature, and snow cover.

---

## N

**NDVI (Normalized Difference Vegetation Index)**
A widely used satellite-derived measure of vegetation density and health, calculated from the ratio of near-infrared and red light reflectance. Values range from −1 (water, bare rock) to +1 (dense green vegetation). Most vegetated land areas fall between 0.1 and 0.9.

**Non-parametric test**
A statistical test that makes no assumptions about the underlying distribution of the data. The Mann-Kendall test and Sen's slope are both non-parametric, making them appropriate for skewed and non-normal environmental data.

---

## P

**p-value**
The probability of observing a test result as extreme as the computed one if no real trend exists. A low p-value (e.g., p < 0.05) means the observed pattern is unlikely to be due to random chance. It does not measure the magnitude or practical importance of the trend.

**Pettitt test**
A non-parametric test for detecting a single change point in a time series — the point where the distribution of values shifts most significantly.

**Provenance record**
A complete chain of documentation tracing a result back to its original source data. Iris's provenance records follow ISO 19115 and PROV-O standards and include the upstream provider, product version, extraction timestamp, spatial reduction method, and pipeline version.

---

## Q

**q-value**
The Benjamini-Hochberg FDR-adjusted version of a p-value. Accounts for the fact that many tests are being run simultaneously. Use q-values when interpreting significance from the Living Globe or Case Board (which test all variables simultaneously).

---

## S

**Sen's slope**
A robust estimator of the rate of change in a time series. Computed as the median of all pairwise slopes between observations. Resistant to outliers because it uses the median rather than the mean.

**Signal-to-noise ratio (S/N)**
A measure of how clearly the trend signal rises above background variability. Iris tracks S/N over time — when S/N > 2, the trend is considered "emerged" from the noise.

**Statistical significance**
A result is statistically significant when the probability of observing it by chance (p-value) falls below a chosen threshold (typically 0.05). Statistical significance does not imply practical or environmental importance.

**STL decomposition**
Seasonal and Trend decomposition using Loess. A robust method for separating a time series into seasonal, trend, and remainder components. Used in Iris to remove the repeating annual cycle before trend testing.

---

## T

**Teleconnection**
A statistical relationship between climate anomalies at geographically distant locations, mediated by large-scale atmospheric or oceanic circulation patterns (e.g., ENSO, the North Atlantic Oscillation).

**Temporal aggregation**
The process of combining observations at a fine time resolution into a coarser one (e.g., daily → monthly). The appropriate aggregation method depends on the variable: sum for precipitation, mean for temperature.

**Track A / Track B**
Iris's two investigation workflows. Track A is live ad-hoc discovery (System Intelligence → Data Selection → Data Preview → Visualize). Track B uses the pre-computed Global Trend Cube (Living Globe → Case Board → Visualize).

**Trend**
A consistent, directional change in a time series over a sustained period. In Iris, trends are defined as monotonic (consistently increasing or decreasing) and are tested using the Mann-Kendall method.

---

## Z

**Z-score**
A standardized measure of how many standard deviations an observation is from the mean. Z = (observation − mean) / standard deviation. Used in Iris for anomaly detection.

---

*This glossary will be expanded as new features and variables are added to the platform.*
