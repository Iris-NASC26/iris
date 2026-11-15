"""
SRS v1.0 Scientific Case File & Statistical Pipeline Engine
Implements:
1. Hamed-Rao (1998) autocorrelation-adjusted Mann-Kendall test & effective sample size (n_eff)
2. Theil-Sen robust slope estimator & 95% confidence interval
3. OLS linear regression adjusted for lag-1 autocorrelation
4. Seasonal Kendall test & 12-month Seasonal Fingerprint (Jan-Dec)
5. Trend Triangle multi-window robustness matrix
6. Deterministic Evidence Grade (A-D) rules & Caveat Registry
7. Three-level deterministic explanations (Explorer, Student, Scientist) — zero LLM-invented numbers
8. Skill-Gated Short-Term Outlook & Trend Continuation ("Not a prediction")
"""

from __future__ import annotations

import hashlib
import json
import math
from typing import Dict, List, Literal, Optional, Tuple

import numpy as np
import pandas as pd
from scipy import stats
from statsmodels.tsa.seasonal import STL

from adapters.extraction_adapters import _EXTRACTION_JOBS
from schemas import (
    CaseFileObservation,
    CaseFileAnalysisRequest,
    CaseFileAnalysisResponse,
    CaveatEvent,
    MonthlyFingerprintItem,
    OutlookProjectionPoint,
    OutlookSectionData,
    PreviewResponse,
    TrendTriangleCell,
)
from services.job_store import load_persisted_job

MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def _compute_hamed_rao_mk(
    series: np.ndarray,
    max_lag_param: int = 24,
    correction_mode: str = "hamed_rao",
) -> Tuple[float, float, float, float, float]:
    """
    Computes Mann-Kendall S, Kendall's Tau, lag-1 autocorrelation r1,
    effective sample size n_eff, and Hamed-Rao variance-corrected Z and p-value.
    """
    clean = series[~np.isnan(series)]
    n = len(clean)
    if n < 6:
        return 0.0, 1.0, 0.0, float(n), 0.0

    s = 0
    for i in range(n - 1):
        diff = clean[i + 1 :] - clean[i]
        s += int(np.sum(diff > 0) - np.sum(diff < 0))

    _, tie_counts = np.unique(clean, return_counts=True)
    tie_term = float(np.sum(tie_counts * (tie_counts - 1) * (2 * tie_counts + 5)))
    var_s0 = (n * (n - 1) * (2 * n + 5) - tie_term) / 18.0
    pair_count = n * (n - 1) / 2.0
    tie_pairs = float(np.sum(tie_counts * (tie_counts - 1) / 2.0))
    tau_denominator = math.sqrt(pair_count * max(0.0, pair_count - tie_pairs))
    tau = float(s / tau_denominator) if tau_denominator else 0.0

    if var_s0 <= 0:
        return 0.0, 1.0, round(tau, 3), float(n), 0.0

    x = np.arange(n, dtype=float)
    theil = stats.theilslopes(clean, x)
    detrended = clean - (theil[1] + theil[0] * x)
    ranks = stats.rankdata(detrended)
    r_mean = np.mean(ranks)
    denom = float(np.sum((ranks - r_mean) ** 2)) or 1.0

    r1 = float(np.sum((ranks[:-1] - r_mean) * (ranks[1:] - r_mean)) / denom)
    r1 = max(-0.9, min(0.95, r1))

    if correction_mode in ("none", "standard"):
        vif = 1.0
    else:
        # Hamed & Rao (1998) variance inflation factor n / n_S*
        sig_threshold = 1.96 / math.sqrt(max(1.0, n))
        correction_sum = 0.0
        max_lag = min(n - 3, max(3, int(max_lag_param)))
        for k in range(1, max_lag + 1):
            rk = float(np.sum((ranks[:-k] - r_mean) * (ranks[k:] - r_mean)) / denom)
            if abs(rk) > sig_threshold:
                correction_sum += (n - k) * (n - k - 1) * (n - k - 2) * rk

        vif = 1.0 + (2.0 / (n * (n - 1) * (n - 2))) * correction_sum
        vif = max(0.5, min(6.0, vif))

    var_s_corrected = var_s0 * vif
    n_eff = round(float(min(n, n / max(1.0, vif))), 1)

    if s > 0:
        z = (s - 1.0) / math.sqrt(var_s_corrected)
    elif s < 0:
        z = (s + 1.0) / math.sqrt(var_s_corrected)
    else:
        z = 0.0

    p_val = float(2.0 * stats.norm.sf(abs(z)))
    return round(z, 3), round(min(1.0, p_val), 8), round(tau, 3), n_eff, round(r1, 3)


def _compute_lag_correlogram(series: np.ndarray, max_lag_param: int = 24) -> List[Dict[str, float]]:
    clean = series[~np.isnan(series)]
    n = len(clean)
    if n < 6:
        return []
    x = np.arange(n, dtype=float)
    theil = stats.theilslopes(clean, x)
    detrended = clean - (theil[1] + theil[0] * x)
    ranks = stats.rankdata(detrended)
    r_mean = np.mean(ranks)
    denom = float(np.sum((ranks - r_mean) ** 2)) or 1.0
    sig_threshold = round(1.96 / math.sqrt(max(1.0, n)), 4)
    max_lag = min(n - 3, max(3, int(max_lag_param)), 24)
    lags: List[Dict[str, float]] = []
    for k in range(1, max_lag + 1):
        rk = float(np.sum((ranks[:-k] - r_mean) * (ranks[k:] - r_mean)) / denom)
        rk = max(-0.99, min(0.99, rk))
        lags.append({"lag": float(k), "r": round(rk, 4), "bound": sig_threshold})
    return lags


def _compute_seasonal_kendall(
    series: pd.Series,
    min_years: int = 2,
) -> Tuple[Optional[float], Optional[float]]:
    total_s = 0
    total_variance = 0.0
    min_obs = max(2, int(min_years))

    for _, group in series.groupby(series.index.month):
        values = group.to_numpy(dtype=float)
        n = len(values)
        if n < min_obs:
            continue
        s = 0
        for i in range(n - 1):
            differences = values[i + 1 :] - values[i]
            s += int(np.sum(differences > 0) - np.sum(differences < 0))
        _, tie_counts = np.unique(values, return_counts=True)
        tie_term = float(np.sum(tie_counts * (tie_counts - 1) * (2 * tie_counts + 5)))
        total_s += s
        total_variance += (n * (n - 1) * (2 * n + 5) - tie_term) / 18.0

    if total_variance <= 0:
        return None, None
    if total_s > 0:
        z = (total_s - 1.0) / math.sqrt(total_variance)
    elif total_s < 0:
        z = (total_s + 1.0) / math.sqrt(total_variance)
    else:
        z = 0.0
    return round(z, 3), round(min(1.0, float(2.0 * stats.norm.sf(abs(z)))), 8)


def _compute_sens_slope_decadal(
    series: np.ndarray,
    steps_per_year: int = 12,
    time_years: Optional[np.ndarray] = None,
    confidence_level: float = 0.95,
) -> Tuple[float, float, float]:
    clean = series[~np.isnan(series)]
    if len(clean) < 4:
        return 0.0, 0.0, 0.0
    x = (
        np.asarray(time_years, dtype=float)[~np.isnan(series)]
        if time_years is not None
        else np.arange(len(clean), dtype=float) / float(steps_per_year)
    )
    slopes = np.asarray(
        [(clean[j] - clean[i]) / (x[j] - x[i]) for i in range(len(clean) - 1) for j in range(i + 1, len(clean)) if x[j] != x[i]],
        dtype=float,
    )
    if len(slopes) == 0:
        return 0.0, 0.0, 0.0
    slopes.sort()
    _, tie_counts = np.unique(clean, return_counts=True)
    tie_term = float(np.sum(tie_counts * (tie_counts - 1) * (2 * tie_counts + 5)))
    n = len(clean)
    variance_s = (n * (n - 1) * (2 * n + 5) - tie_term) / 18.0
    conf = max(0.80, min(0.999, float(confidence_level)))
    z_crit = float(stats.norm.ppf(0.5 + conf / 2.0))
    rank_offset = z_crit * math.sqrt(max(0.0, variance_s))
    lower_rank = max(0, min(len(slopes) - 1, math.floor((len(slopes) - rank_offset) / 2.0)))
    upper_rank = max(0, min(len(slopes) - 1, math.ceil((len(slopes) + rank_offset) / 2.0)))
    factor = 10.0
    return (
        round(float(np.median(slopes) * factor), 3),
        round(float(slopes[lower_rank] * factor), 3),
        round(float(slopes[upper_rank] * factor), 3),
    )


def _compute_ols_trend(
    values: np.ndarray,
    time_years: np.ndarray,
    effective_sample_size: float,
    alpha: float = 0.05,
    use_effective_df: bool = True,
) -> Tuple[float, float, float, float, float, float]:
    result = stats.linregress(time_years, values)
    raw_df = max(1.0, float(len(values) - 2))
    degrees_freedom = (
        max(1.0, min(raw_df, effective_sample_size - 2.0))
        if use_effective_df
        else raw_df
    )
    standard_error = float(result.stderr) * math.sqrt(raw_df / degrees_freedom)
    t_statistic = float(result.slope / standard_error) if standard_error > 0 else 0.0
    p_value = float(2.0 * stats.t.sf(abs(t_statistic), df=degrees_freedom))
    clamped_alpha = max(0.001, min(0.20, float(alpha)))
    critical_value = float(stats.t.ppf(1.0 - clamped_alpha / 2.0, df=degrees_freedom))
    scale = 10.0
    return (
        round(float(result.slope * scale), 3),
        round(t_statistic, 3),
        round(degrees_freedom, 1),
        round(min(1.0, p_value), 8),
        round(float((result.slope - critical_value * standard_error) * scale), 3),
        round(float((result.slope + critical_value * standard_error) * scale), 3),
    )


def _compute_pettitt(
    series: pd.Series,
    min_segment: int = 1,
    date_format: str = "%Y-%m",
) -> Tuple[Optional[str], Optional[float], Optional[float]]:
    clean = series.dropna()
    values = clean.to_numpy(dtype=float)
    n = len(values)
    if n < 10 or np.all(values == values[0]):
        return None, None, None

    ranks = stats.rankdata(values)
    cumulative = np.cumsum(ranks)
    statistics_by_split = 2.0 * cumulative[:-1] - np.arange(1, n) * (n + 1.0)
    guard = max(1, min(int(min_segment), (n - 2) // 2))
    if guard > 1 and n - 2 * guard > 1:
        window_slice = np.abs(statistics_by_split[guard - 1 : n - guard])
        split_index = int(np.argmax(window_slice)) + (guard - 1)
    else:
        split_index = int(np.argmax(np.abs(statistics_by_split)))
    statistic = float(abs(statistics_by_split[split_index]))
    p_value = min(1.0, 2.0 * math.exp((-6.0 * statistic**2) / (n**3 + n**2)))
    return clean.index[split_index].strftime(date_format), round(statistic, 3), round(p_value, 8)


def _compute_pettitt_details(
    series: pd.Series,
    raw_series: pd.Series,
    min_segment: int = 2,
    date_format: str = "%Y-%m",
) -> Tuple[List[Dict[str, object]], Optional[float], Optional[float]]:
    clean = series.dropna()
    values = clean.to_numpy(dtype=float)
    n = len(values)
    if n < 10 or np.all(values == values[0]):
        return [], None, None
    ranks = stats.rankdata(values)
    cumulative = np.cumsum(ranks)
    statistics_by_split = 2.0 * cumulative[:-1] - np.arange(1, n) * (n + 1.0)
    guard = max(1, min(int(min_segment), (n - 2) // 2))
    if guard > 1 and n - 2 * guard > 1:
        window_slice = np.abs(statistics_by_split[guard - 1 : n - guard])
        split_index = int(np.argmax(window_slice)) + (guard - 1)
    else:
        split_index = int(np.argmax(np.abs(statistics_by_split)))

    raw_clean = raw_series.reindex(clean.index).dropna()
    if len(raw_clean) >= n and 0 < split_index < len(raw_clean) - 1:
        raw_vals = raw_clean.to_numpy(dtype=float)
        mean_before = round(float(np.mean(raw_vals[: split_index + 1])), 3)
        mean_after = round(float(np.mean(raw_vals[split_index + 1 :])), 3)
    else:
        mean_before = round(float(np.mean(values[: split_index + 1])), 3)
        mean_after = round(float(np.mean(values[split_index + 1 :])), 3)

    step = max(1, len(statistics_by_split) // 180)
    ut_series: List[Dict[str, object]] = []
    for idx in range(0, len(statistics_by_split), step):
        ut_series.append(
            {
                "timestamp": clean.index[idx].strftime(date_format),
                "ut": round(float(statistics_by_split[idx]), 2),
                "abs_ut": round(float(abs(statistics_by_split[idx])), 2),
            }
        )
    if (len(statistics_by_split) - 1) % step != 0 and len(statistics_by_split) > 0:
        last_i = len(statistics_by_split) - 1
        ut_series.append(
            {
                "timestamp": clean.index[last_i].strftime(date_format),
                "ut": round(float(statistics_by_split[last_i]), 2),
                "abs_ut": round(float(abs(statistics_by_split[last_i])), 2),
            }
        )
    return ut_series, mean_before, mean_after


def _benjamini_hochberg_q_value(p_values: List[float], target: float) -> float:
    ordered = sorted(p_values)
    target_rank = max((rank for rank, p in enumerate(ordered, start=1) if p == target), default=1)
    adjusted = [
        ordered[index] * len(ordered) / (index + 1)
        for index in range(target_rank - 1, len(ordered))
    ]
    return round(min(1.0, min(adjusted, default=1.0)), 8)


def _build_caveats_for_variable(parameter_code: str, source_agency: str, completeness_pct: float) -> List[CaveatEvent]:
    code_up = parameter_code.upper()
    events: List[CaveatEvent] = []
    if "MERRA-2" in source_agency.upper():
        events.append(
            CaveatEvent(
                date_or_period="1998-01 / 2012-01",
                category="Reanalysis Boundary",
                severity="info",
                title="MERRA-2 Observing System Transitions (ATOVS / IASI)",
                description="Changes in satellite radiance assimilation in MERRA-2 can introduce subtle step changes in high-altitude or moisture-sensitive fields.",
            )
        )
    if "NDVI" in code_up or "EVI" in code_up or "MOD13" in code_up:
        events.append(
            CaveatEvent(
                date_or_period="2002-07 / 2022-10",
                category="Sensor Transition",
                severity="caution",
                title="Terra/Aqua MODIS Orbital Drift & Collection 6.1 Calibration",
                description="Late-record Terra orbital constellation drift requires cross-checking with VIIRS VNP13 before attributing subtle post-2022 reflectance shifts.",
            )
        )
    if "SNOW" in code_up or "NDSI" in code_up:
        events.append(
            CaveatEvent(
                date_or_period="Persistent Monsoon / Winter Cloud",
                category="QA Coverage Gap",
                severity="caution",
                title="Optical Cloud Masking in High-Relief Cryosphere",
                description="Optical snow-cover retrievals cannot penetrate persistent cloud decks; winter/monsoon months carry lower effective sampling density.",
            )
        )
    if completeness_pct < 95.0:
        events.append(
            CaveatEvent(
                date_or_period="Record Completeness Check",
                category="QA Coverage Gap",
                severity="warning" if completeness_pct < 85.0 else "caution",
                title=f"Observed Data Completeness: {completeness_pct:.1f}%",
                description="Missing or QA-masked intervals are preserved without synthetic gap-filling prior to Hamed-Rao trend estimation.",
            )
        )
    return events


def _evaluate_evidence_grade(
    years_span: int,
    completeness_pct: float,
    hamed_rao_p: float,
    sens_slope: float,
    ols_slope: float,
    caveats: List[CaveatEvent],
) -> Tuple[Literal["A", "B", "C", "D"], str, List[str]]:
    reasons: List[str] = []
    same_sign = (sens_slope >= 0 and ols_slope >= 0) or (sens_slope < 0 and ols_slope < 0)
    rel_diff = abs(sens_slope - ols_slope) / max(0.01, abs(sens_slope))
    concordant = same_sign and rel_diff <= 0.35

    reasons.append(
        f"Temporal span: {years_span} years ({'meets >=15 yr benchmark' if years_span >= 15 else 'short record <15 yr'})."
    )
    reasons.append(
        f"Valid observation coverage: {completeness_pct:.1f}% ({'passes >=85% threshold' if completeness_pct >= 85.0 else 'below 85% completeness gate'})."
    )
    reasons.append(
        f"Autocorrelation-adjusted Hamed-Rao Mann-Kendall p = {hamed_rao_p:.4f} ({'statistically significant at alpha=0.05' if hamed_rao_p < 0.05 else 'does not pass alpha=0.05'})."
    )
    reasons.append(
        f"Non-parametric Sen's slope ({sens_slope:+.3f}) and parametric OLS ({ols_slope:+.3f}) are {'concordant in direction and magnitude' if concordant else 'divergent due to outlier/step sensitivity'}."
    )

    has_severe_caveat = any(c.severity == "warning" for c in caveats)

    if years_span >= 15 and completeness_pct >= 90.0 and hamed_rao_p < 0.05 and concordant and not has_severe_caveat:
        return "A", "Grade A — Robust Multi-Method Verified Signal", reasons
    if years_span >= 10 and completeness_pct >= 80.0 and hamed_rao_p < 0.05 and same_sign:
        return "B", "Grade B — Credible Trend with Minor Autocorrelation / Coverage Caveats", reasons
    if years_span >= 8 and completeness_pct >= 70.0 and hamed_rao_p < 0.15:
        return "C", "Grade C — Emerging / Regional Signal Requiring Longer Baseline", reasons
    return "D", "Grade D — Inconclusive or Coverage-Limited Record", reasons


def execute_case_file_analysis(
    series: pd.Series,
    req: CaseFileAnalysisRequest,
    provenance_mode: Literal["live_extracted_result", "pinned_real_snapshot", "live_nasa_power"],
    source_agency: str = "NASA Langley Research Center / GMAO MERRA-2",
    citation_doi: str = "https://doi.org/10.1175/JCLI-D-16-0758.1",
) -> CaseFileAnalysisResponse:
    """
    Runs the full SRS v1.0 scientific Case File pipeline over a monthly time series.
    """
    source_qa_flags = series.attrs.get("qa_flags", {})
    s_num = pd.to_numeric(series, errors="coerce").replace([np.inf, -np.inf], np.nan)
    if not isinstance(s_num.index, pd.DatetimeIndex):
        s_num.index = pd.to_datetime(s_num.index)
    s_num = s_num.sort_index()
    if s_num.index.has_duplicates:
        raise ValueError("The analysis series contains duplicate timestamps.")

    total_steps_per_year = {
        "Daily": 365,
        "8-Day": 46,
        "16-Day": 23,
        "Monthly": 12,
        "Seasonal": 4,
        "Yearly": 1,
    }.get(req.cadence, 12)
    date_format = "%Y-%m-%d" if req.cadence in ("Daily", "8-Day", "16-Day") else "%Y-%m"
    total_expected = (
        max(len(s_num), (req.end_year - req.start_year + 1) * 12)
        if req.cadence == "Monthly"
        else max(1, len(s_num))
    )
    valid_s = s_num.dropna()
    valid_count = len(valid_s)
    if valid_count < 6:
        raise ValueError("At least 6 valid observations are required for trend analysis.")
    completeness_pct = round(min(100.0, (valid_count / max(1, total_expected)) * 100.0), 1)

    monthly_means = valid_s.groupby(valid_s.index.month).mean()
    observed_months = valid_s.index.to_period("M")
    is_complete_monthly_record = (
        req.cadence == "Monthly"
        and len(valid_s) >= 24
        and bool(s_num.notna().all())
        and observed_months.is_unique
        and bool(np.all(np.diff(observed_months.asi8) == 1))
    )
    if req.seasonal_adjustment == "none" or req.cadence == "Yearly":
        seasonal_component_series = pd.Series(0.0, index=valid_s.index)
        seasonal_adjustment_method = (
            "No seasonal adjustment (raw observations)"
            if req.seasonal_adjustment == "none"
            else "No seasonal adjustment (annual cadence)"
        )
    elif req.seasonal_adjustment == "stl":
        if not is_complete_monthly_record:
            raise ValueError(
                "Robust STL requires at least 24 complete, consecutive monthly observations."
            )
        seasonal_component_series = pd.Series(
            STL(valid_s.to_numpy(dtype=float), period=12, robust=True).fit().seasonal,
            index=valid_s.index,
        )
        seasonal_adjustment_method = "Robust STL decomposition (period=12)"
    elif req.seasonal_adjustment == "calendar_climatology":
        seasonal_component_series = valid_s.index.to_series().map(
            lambda timestamp: monthly_means.get(timestamp.month, np.nan)
        )
        seasonal_adjustment_method = "Calendar-month climatology"
    elif is_complete_monthly_record:
        seasonal_component_series = pd.Series(
            STL(valid_s.to_numpy(dtype=float), period=12, robust=True).fit().seasonal,
            index=valid_s.index,
        )
        seasonal_adjustment_method = "Robust STL decomposition (period=12)"
    else:
        seasonal_component_series = valid_s.index.to_series().map(
            lambda timestamp: monthly_means.get(timestamp.month, np.nan)
        )
        seasonal_adjustment_method = "Calendar-month climatology (gaps/cadence preclude STL)"
    deseasonalized_series = valid_s - seasonal_component_series.to_numpy(dtype=float)
    seasonal_component_by_timestamp = seasonal_component_series.to_dict()
    deseas_vals = deseasonalized_series.to_numpy(dtype=float)
    time_years = (
        (valid_s.index - valid_s.index[0]).total_seconds().to_numpy(dtype=float)
        / (365.2425 * 24.0 * 60.0 * 60.0)
    )

    hr_z, hr_p, tau, n_eff, r1 = _compute_hamed_rao_mk(
        deseas_vals,
        max_lag_param=req.mk_max_lag,
        correction_mode=req.mk_autocorrelation_correction,
    )
    lag_autocorrelations = _compute_lag_correlogram(deseas_vals, max_lag_param=req.mk_max_lag)
    sens_dec, sens_low, sens_high = _compute_sens_slope_decadal(
        deseas_vals,
        steps_per_year=total_steps_per_year,
        time_years=time_years,
        confidence_level=req.sens_confidence_level,
    )
    (
        ols_dec,
        ols_t,
        ols_df,
        ols_p,
        ols_ci_low,
        ols_ci_high,
    ) = _compute_ols_trend(
        deseas_vals,
        time_years,
        n_eff,
        alpha=req.alpha,
        use_effective_df=req.ols_autocorrelation_adjustment,
    )
    ols_linreg = stats.linregress(time_years, deseas_vals)
    ols_r_squared = round(float(ols_linreg.rvalue ** 2), 4) if pd.notna(ols_linreg.rvalue) else 0.0
    ols_raw_df = max(1.0, float(len(deseas_vals) - 2))
    ols_std_error_decadal = round(
        float(ols_linreg.stderr) * math.sqrt(ols_raw_df / max(1.0, ols_df)) * 10.0, 4
    )

    if req.cadence == "Monthly":
        seasonal_kendall_z, seasonal_kendall_p = _compute_seasonal_kendall(
            valid_s, min_years=req.seasonal_kendall_min_years
        )
    else:
        seasonal_kendall_z, seasonal_kendall_p = None, None

    change_point_timestamp, change_point_statistic, change_point_p_value = _compute_pettitt(
        deseasonalized_series,
        min_segment=req.pettitt_min_segment,
        date_format=date_format,
    )
    pettitt_ut_series, pettitt_mean_before, pettitt_mean_after = _compute_pettitt_details(
        deseasonalized_series,
        valid_s,
        min_segment=req.pettitt_min_segment,
        date_format=date_format,
    )

    # Monthly Fingerprint & Seasonal Kendall
    fingerprint: List[MonthlyFingerprintItem] = []
    abs_slopes_sum = 0.0
    temp_month_stats: List[
        Tuple[int, str, Optional[float], Optional[float], Optional[float], Optional[bool]]
    ] = []
    p_values_months: List[float] = []

    for m_idx in range(1, 13):
        m_sub = valid_s[valid_s.index.month == m_idx]
        if req.cadence == "Monthly" and len(m_sub) >= 4:
            m_vals = m_sub.to_numpy(dtype=float)
            m_p: Optional[float] = None
            if len(m_sub) >= 6:
                _, m_p, _, _, _ = _compute_hamed_rao_mk(
                    m_vals,
                    max_lag_param=req.mk_max_lag,
                    correction_mode=req.mk_autocorrelation_correction,
                )
                p_values_months.append(m_p)
            month_time_years = (
                (m_sub.index - m_sub.index[0]).total_seconds().to_numpy(dtype=float)
                / (365.2425 * 24.0 * 60.0 * 60.0)
            )
            m_slope, _, _ = _compute_sens_slope_decadal(
                m_vals,
                time_years=month_time_years,
                confidence_level=req.sens_confidence_level,
            )
            m_mean: Optional[float] = round(float(np.mean(m_vals)), 3)
            m_slope_value: Optional[float] = m_slope
            m_p_value = m_p
            m_significant = m_p < req.alpha if m_p is not None else None
        else:
            m_mean = (
                round(float(monthly_means[m_idx]), 3)
                if m_idx in monthly_means.index
                else None
            )
            m_slope_value = None
            m_p_value = None
            m_significant = None
        if m_slope_value is not None:
            abs_slopes_sum += abs(m_slope_value)
        temp_month_stats.append(
            (m_idx, MONTH_NAMES[m_idx - 1], m_mean, m_slope_value, m_p_value, m_significant)
        )

    for m_idx, m_name, m_mean, m_slope, m_p, m_sig in temp_month_stats:
        contrib = (
            round((abs(m_slope) / abs_slopes_sum) * 100.0, 1)
            if m_slope is not None and abs_slopes_sum > 0
            else None
        )
        fingerprint.append(
            MonthlyFingerprintItem(
                month_index=m_idx,
                month_name=m_name,
                climatology_mean=m_mean,
                decadal_slope=m_slope,
                mk_p_value=m_p,
                significant=m_sig,
                contribution_pct=contrib,
            )
        )

    # Benjamini-Hochberg FDR q-value across tested family
    test_family = [hr_p, ols_p] + p_values_months
    if seasonal_kendall_p is not None:
        test_family.append(seasonal_kendall_p)
    fdr_q = _benjamini_hochberg_q_value(test_family, hr_p)

    # Annual Warming / Trend Stripes (requiring >= stripes_min_months valid months per year for Monthly)
    annual_stripes: List[Dict[str, object]] = []
    yearly_groups = valid_s.groupby(valid_s.index.year)
    annual_means: List[Tuple[int, float]] = []
    min_pts_per_year = req.stripes_min_months if req.cadence == "Monthly" else 1
    for yr, grp in yearly_groups:
        if len(grp) >= min_pts_per_year:
            annual_means.append((int(yr), float(grp.mean())))

    if annual_means:
        all_yr_vals = np.array([v for _, v in annual_means], dtype=float)
        clim_mean = float(np.mean(all_yr_vals))
        clim_std = float(np.std(all_yr_vals, ddof=1)) if len(all_yr_vals) > 1 else 0.0
        for yr, v in annual_means:
            anom = v - clim_mean
            z_yr = anom / clim_std if clim_std > 0 else None
            annual_stripes.append(
                {
                    "year": yr,
                    "mean": round(v, 3),
                    "anomaly": round(anom, 3),
                    "z": round(z_yr, 2) if z_yr is not None else None,
                }
            )

    # Trend Triangle (Multi-window start/end sensitivity matrix)
    years_avail = sorted(list({int(ts.year) for ts in valid_s.index}))
    trend_triangle: List[TrendTriangleCell] = []
    min_win_yr = max(3, int(req.triangle_min_window_years))
    if len(years_avail) >= min_win_yr + 1:
        min_yr = years_avail[0]
        max_yr = years_avail[-1]
        step_yr = max(2, (max_yr - min_yr) // 5)
        start_candidates = list(range(min_yr, max_yr - (min_win_yr - 1), step_yr))[:5]
        end_candidates = list(range(min_yr + min_win_yr, max_yr + 1, step_yr))[-5:]
        min_sub_obs = 24 if req.cadence == "Monthly" else max(6, min_win_yr)
        for sy in start_candidates:
            for ey in end_candidates:
                if ey - sy < min_win_yr:
                    continue
                sub = valid_s[(valid_s.index.year >= sy) & (valid_s.index.year <= ey)]
                if len(sub) >= min_sub_obs:
                    sub_deseas = deseasonalized_series.loc[sub.index].to_numpy(dtype=float)
                    _, sub_p, _, _, _ = _compute_hamed_rao_mk(
                        sub_deseas,
                        max_lag_param=req.mk_max_lag,
                        correction_mode=req.mk_autocorrelation_correction,
                    )
                    sub_time_years = (
                        (sub.index - sub.index[0]).total_seconds().to_numpy(dtype=float)
                        / (365.2425 * 24.0 * 60.0 * 60.0)
                    )
                    sub_slope, _, _ = _compute_sens_slope_decadal(
                        sub_deseas,
                        time_years=sub_time_years,
                        confidence_level=req.sens_confidence_level,
                    )
                    trend_triangle.append(
                        TrendTriangleCell(
                            start_year=sy,
                            end_year=ey,
                            span_years=ey - sy,
                            decadal_slope=sub_slope,
                            mk_p_value=sub_p,
                            significant=sub_p < req.alpha,
                        )
                    )

    years_span = max(2, req.end_year - req.start_year)
    caveats = _build_caveats_for_variable(req.parameter_code, source_agency, completeness_pct)
    grade, grade_title, grade_reasons = _evaluate_evidence_grade(
        years_span=years_span,
        completeness_pct=completeness_pct,
        hamed_rao_p=hr_p,
        sens_slope=sens_dec,
        ols_slope=ols_dec,
        caveats=caveats,
    )

    # Skill-Gated Outlook & Trend Continuation
    last_yr = int(valid_s.index[-1].year)
    last_val = float(valid_s.iloc[-1])
    slope_per_yr = sens_dec / 10.0
    ci_low_yr = sens_low / 10.0
    ci_high_yr = sens_high / 10.0
    horizon_years = max(4, min(30, int(req.outlook_horizon_years)))
    step_offset = max(1, horizon_years // 5)

    continuation_pts: List[OutlookProjectionPoint] = []
    offsets = list(range(0, horizon_years + 1, step_offset))
    if offsets[-1] != horizon_years:
        offsets.append(horizon_years)
    for offset in offsets:
        target_yr = last_yr + offset
        continuation_pts.append(
            OutlookProjectionPoint(
                year=target_yr,
                central_value=round(last_val + slope_per_yr * offset, 3),
                ci_low=round(last_val + min(ci_low_yr, ci_high_yr) * offset, 3),
                ci_high=round(last_val + max(ci_low_yr, ci_high_yr) * offset, 3),
            )
        )

    # Hindcast Backtest Skill Gate (Train on first 80% of annual record, test on last 20%)
    rmse_model: Optional[float] = None
    rmse_clim: Optional[float] = None
    skill_pss: Optional[float] = None
    if len(annual_means) >= 8:
        split_idx = max(5, int(len(annual_means) * 0.78))
        train_yrs = np.array([y for y, _ in annual_means[:split_idx]], dtype=float)
        train_vals = np.array([v for _, v in annual_means[:split_idx]], dtype=float)
        test_yrs = np.array([y for y, _ in annual_means[split_idx:]], dtype=float)
        test_vals = np.array([v for _, v in annual_means[split_idx:]], dtype=float)

        th_fit = stats.theilslopes(train_vals, train_yrs - train_yrs[0])
        pred_model = th_fit[1] + th_fit[0] * (test_yrs - train_yrs[0])
        clim_pred = np.full_like(test_vals, float(np.mean(train_vals)))

        rmse_model = float(np.sqrt(np.mean((test_vals - pred_model) ** 2)))
        rmse_clim = float(np.sqrt(np.mean((test_vals - clim_pred) ** 2)))
        if rmse_clim > 0:
            skill_pss = round(1.0 - (rmse_model / rmse_clim), 3)

    skill_passed = skill_pss is not None and skill_pss > 0.05 and hr_p < 0.10
    short_term_pts: List[OutlookProjectionPoint] = []
    if skill_passed and rmse_model is not None:
        for step in (1, 2, 3):
            short_term_pts.append(
                OutlookProjectionPoint(
                    year=last_yr + step,
                    central_value=round(last_val + slope_per_yr * step, 3),
                    ci_low=round(last_val + slope_per_yr * step - 1.96 * rmse_model, 3),
                    ci_high=round(last_val + slope_per_yr * step + 1.96 * rmse_model, 3),
                )
            )

    outlook = OutlookSectionData(
        horizon_year=last_yr + horizon_years,
        continuation_points=continuation_pts,
        skill_gate_passed=skill_passed,
        backtest_rmse=round(rmse_model, 3) if rmse_model is not None else None,
        climatology_baseline_rmse=round(rmse_clim, 3) if rmse_clim is not None else None,
        skill_score_pss=skill_pss,
        skill_gate_reason=(
            f"Hindcast skill gate PASSED (PSS = {skill_pss:+.2f} > +0.05; model RMSE {rmse_model:.3f} vs climatology RMSE {rmse_clim:.3f} {req.unit})."
            if skill_passed
            else (
                "Hindcast skill gate not evaluated: at least 8 complete annual means and a non-zero baseline error are required."
                if skill_pss is None
                else f"Hindcast skill gate SUPPRESSED short-term forecast (PSS = {skill_pss:+.2f} <= +0.05; interannual noise exceeds short-term linear predictability)."
            )
        ),
        short_term_forecast_points=short_term_pts,
        cmip6_Reference_note=(
            "P2 Scenario Context (NASA NEX-GDDP-CMIP6 SSP2-4.5 / SSP5-8.5): kept strictly separate from historical observational trend analysis."
        ),
    )

    dir_word = "increasing" if sens_dec >= 0 else "decreasing"
    sig_word = "statistically significant" if hr_p < req.alpha else "statistically inconclusive"

    seasonal_kendall_explanation = (
        f"Seasonal Kendall Z = {seasonal_kendall_z:+.3f}, p = {seasonal_kendall_p:.8f}."
        if seasonal_kendall_p is not None and seasonal_kendall_z is not None
        else "Seasonal Kendall was not estimable because the record lacks repeated observations within calendar months."
    )
    explanations: Dict[Literal["explorer", "student", "scientist"], str] = {
        "explorer": (
            f"In {req.location} ({req.start_year}–{req.end_year}), {req.dataset_name.lower()} shows a {sig_word} {dir_word} pattern of "
            f"{sens_dec:+.3f} {req.unit} per decade (Evidence Grade {grade}). This means the long-term shift is "
            f"{'stronger than ordinary year-to-year weather swings' if hr_p < req.alpha else 'currently masked by year-to-year variability'}."
        ),
        "student": (
            f"After seasonal pre-treatment ({seasonal_adjustment_method}), Sen's non-parametric median slope is {sens_dec:+.3f} {req.unit}/decade "
            f"({int(round(req.sens_confidence_level * 100))}% CI: [{sens_low:+.3f}, {sens_high:+.3f}] {req.unit}/decade). The Hamed-Rao Mann-Kendall test yields "
            f"Z = {hr_z:+.2f} (p = {hr_p:.4f}, BH-FDR q = {fdr_q:.4f}) across {valid_count} valid observations ({completeness_pct:.1f}% completeness)."
        ),
        "scientist": (
            f"Hamed-Rao (1998) variance-corrected Mann-Kendall analysis (lag-1 r1 = {r1:+.3f}, n_eff = {n_eff:.1f} from N = {valid_count}) yields "
            f"tau = {tau:+.3f}, Z_HR = {hr_z:+.3f}, p = {hr_p:.8f} (BH-FDR q = {fdr_q:.8f}). Theil-Sen estimator β = {sens_dec:+.3f} {req.unit}/dec "
            f"({int(round(req.sens_confidence_level * 100))}% CI [{sens_low:+.3f}, {sens_high:+.3f}]) vs. OLS β_OLS = {ols_dec:+.3f} {req.unit}/dec "
            f"(t = {ols_t:+.3f}, df = {ols_df:.1f}, p = {ols_p:.8f}, CI [{ols_ci_low:+.3f}, {ols_ci_high:+.3f}]); "
            f"{seasonal_kendall_explanation} Assigned Evidence Grade {grade}."
        ),
    }

    anomaly_mean = float(np.mean(deseas_vals))
    anomaly_std = float(np.std(deseas_vals, ddof=1)) if len(deseas_vals) > 1 else 0.0
    anomaly_median = float(np.median(deseas_vals))
    anomaly_mad = float(np.median(np.abs(deseas_vals - anomaly_median))) if len(deseas_vals) > 1 else 0.0
    ols_slope_per_year = ols_dec / 10.0
    ols_intercept = float(np.mean(deseas_vals) - ols_slope_per_year * np.mean(time_years))
    sen_slope_per_year = sens_dec / 10.0
    sen_intercept = float(np.median(deseas_vals - sen_slope_per_year * time_years))
    valid_analysis_by_timestamp = {
        timestamp: (float(anomaly), float(x_value))
        for timestamp, anomaly, x_value in zip(valid_s.index, deseas_vals, time_years)
    }

    analysis_series: List[CaseFileObservation] = []
    anomaly_count = 0
    for timestamp, raw_value in s_num.items():
        month_climatology = monthly_means.get(timestamp.month)
        raw_number = float(raw_value) if pd.notna(raw_value) else None
        deseasonalized_value: Optional[float] = None
        anomaly_z: Optional[float] = None
        ols_trend: Optional[float] = None
        sen_trend: Optional[float] = None
        seasonal_component = seasonal_component_by_timestamp.get(timestamp)
        if raw_number is not None and seasonal_component is not None:
            deseasonalized_value = raw_number - float(seasonal_component)
            valid_metrics = valid_analysis_by_timestamp.get(timestamp)
            if valid_metrics is not None:
                if req.anomaly_dispersion_method in ("mad", "robust_mad") and anomaly_mad > 0:
                    anomaly_z = (0.6745 * (valid_metrics[0] - anomaly_median)) / anomaly_mad
                else:
                    anomaly_z = (
                        (valid_metrics[0] - anomaly_mean) / anomaly_std
                        if anomaly_std > 0
                        else None
                    )
                if anomaly_z is not None and abs(anomaly_z) >= req.anomaly_z_threshold:
                    anomaly_count += 1
                ols_trend = ols_intercept + ols_slope_per_year * valid_metrics[1]
                sen_trend = sen_intercept + sen_slope_per_year * valid_metrics[1]

        qa_flag = source_qa_flags.get(timestamp.isoformat())
        if qa_flag is None:
            qa_flag = "Valid" if raw_number is not None else "Missing"
        analysis_series.append(
            CaseFileObservation(
                timestamp=timestamp.strftime(date_format),
                value=raw_number,
                seasonal_component=(
                    float(seasonal_component)
                    if seasonal_component is not None
                    else (float(month_climatology) if month_climatology is not None else None)
                ),
                deseasonalized_value=deseasonalized_value,
                anomaly_z=anomaly_z,
                ols_trend=ols_trend,
                sen_trend=sen_trend,
                qa_flag=str(qa_flag),
            )
        )

    recommended_views = ["Deseasonalized Trend & Sen's Slope", "Annual Trend Stripes", "12-Month Seasonal Fingerprint"]
    if len(trend_triangle) > 0:
        recommended_views.append("Multi-Window Trend Triangle")
    if caveats:
        recommended_views.append("Caveat & Sensor Timeline")

    raw_digest = hashlib.sha256(
        json.dumps(
            {
                "loc": req.location,
                "param": req.parameter_code,
                "start": req.start_year,
                "end": req.end_year,
                "observations": [
                    [point.timestamp, point.value, point.qa_flag]
                    for point in analysis_series
                ],
            },
            sort_keys=True,
        ).encode("utf-8")
    ).hexdigest()

    applied_parameters: Dict[str, object] = {
        "alpha": req.alpha,
        "seasonal_adjustment": req.seasonal_adjustment,
        "ols_autocorrelation_adjustment": req.ols_autocorrelation_adjustment,
        "mk_autocorrelation_correction": req.mk_autocorrelation_correction,
        "mk_max_lag": req.mk_max_lag,
        "seasonal_kendall_min_years": req.seasonal_kendall_min_years,
        "sens_confidence_level": req.sens_confidence_level,
        "sens_rate_scale": req.sens_rate_scale,
        "pettitt_min_segment": req.pettitt_min_segment,
        "anomaly_z_threshold": req.anomaly_z_threshold,
        "anomaly_dispersion_method": req.anomaly_dispersion_method,
        "fingerprint_color_cap": req.fingerprint_color_cap,
        "outlook_horizon_years": req.outlook_horizon_years,
        "stripes_min_months": req.stripes_min_months,
        "triangle_min_window_years": req.triangle_min_window_years,
    }

    return CaseFileAnalysisResponse(
        result_id=f"cf-{raw_digest[:12]}",
        source_job_id=req.job_id,
        provenance_mode=provenance_mode,
        sha256_hash=raw_digest,
        dataset_name=req.dataset_name,
        parameter_code=req.parameter_code,
        unit=req.unit,
        location=req.location,
        start_year=req.start_year,
        end_year=req.end_year,
        cadence=req.cadence,
        completeness_pct=completeness_pct,
        valid_months_count=valid_count,
        seasonal_adjustment_method=seasonal_adjustment_method,
        requested_seasonal_adjustment=req.seasonal_adjustment,
        requested_analysis_methods=req.analysis_methods,
        method_version=(
            "SRS-v1.0-STL-HamedRao-Sen"
            if is_complete_monthly_record
            else "SRS-v1.0-monthly-climatology-HamedRao-Sen"
        ),
        hamed_rao_mk_z=hr_z,
        hamed_rao_mk_p=hr_p,
        fdr_q_value=fdr_q,
        effective_sample_size_n_eff=n_eff,
        lag1_autocorrelation=r1,
        kendall_tau=tau,
        sens_slope_decadal=sens_dec,
        sens_ci_low=sens_low,
        sens_ci_high=sens_high,
        ols_slope_decadal=ols_dec,
        ols_t_statistic=ols_t,
        ols_t_degrees_freedom=ols_df,
        ols_p_value=ols_p,
        ols_ci_low_decadal=ols_ci_low,
        ols_ci_high_decadal=ols_ci_high,
        ols_intercept=round(ols_intercept, 4),
        ols_r_squared=ols_r_squared,
        ols_std_error_decadal=ols_std_error_decadal,
        seasonal_kendall_z=seasonal_kendall_z,
        seasonal_kendall_p=seasonal_kendall_p,
        change_point_timestamp=change_point_timestamp,
        change_point_statistic=change_point_statistic,
        change_point_p_value=change_point_p_value,
        pettitt_mean_before=pettitt_mean_before,
        pettitt_mean_after=pettitt_mean_after,
        pettitt_ut_series=pettitt_ut_series,
        lag_autocorrelations=lag_autocorrelations,
        anomaly_threshold_used=req.anomaly_z_threshold,
        anomaly_dispersion_used=req.anomaly_dispersion_method,
        anomaly_count=anomaly_count,
        applied_parameters=applied_parameters,
        analysis_series=analysis_series,
        evidence_grade=grade,
        evidence_grade_title=grade_title,
        evidence_grade_reasons=grade_reasons,
        explanations=explanations,
        recommended_views=recommended_views,
        annual_stripes=annual_stripes,
        monthly_fingerprint=fingerprint,
        trend_triangle=trend_triangle,
        caveats=caveats,
        outlook=outlook,
        citation_doi=citation_doi,
        source_agency=source_agency,
    )


def load_series_from_job_id(job_id: str) -> Optional[Tuple[pd.Series, PreviewResponse]]:
    rec = _EXTRACTION_JOBS.get(job_id) or load_persisted_job(job_id)
    if not rec:
        return None
    preview: PreviewResponse = rec["preview"]  # type: ignore[assignment]
    timestamps: List[str] = []
    values: List[float] = []
    qa_flags: Dict[str, str] = {}
    for row in preview.chart_series:
        timestamp = row.timestamp if len(row.timestamp) > 7 else f"{row.timestamp}-01"
        parsed_timestamp = pd.Timestamp(timestamp)
        timestamps.append(timestamp)
        is_valid = row.qa_flag == "Valid" and row.value is not None and math.isfinite(row.value)
        values.append(float(row.value) if is_valid else float("nan"))
        qa_flags[parsed_timestamp.isoformat()] = row.qa_flag
    s = pd.Series(values, index=pd.to_datetime(timestamps), dtype=float)
    s.attrs["qa_flags"] = qa_flags
    return s.sort_index(), preview
