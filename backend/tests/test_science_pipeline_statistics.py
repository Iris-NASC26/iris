import unittest

import numpy as np
import pandas as pd

from schemas import CaseFileAnalysisRequest
from services.science_pipeline import (
    _compute_hamed_rao_mk,
    _compute_ols_trend,
    _compute_pettitt,
    _compute_seasonal_kendall,
    _compute_sens_slope_decadal,
    execute_case_file_analysis,
)


class TrendStatisticsTests(unittest.TestCase):
    def test_sen_slope_uses_elapsed_time_and_bounds_the_known_rate(self):
        x_years = np.arange(120, dtype=float) / 12.0
        values = 0.2 * x_years

        slope, lower, upper = _compute_sens_slope_decadal(values, time_years=x_years)

        self.assertAlmostEqual(slope, 2.0, places=3)
        self.assertLessEqual(lower, slope)
        self.assertGreaterEqual(upper, slope)

    def test_hamed_rao_handles_ties_without_fabricating_significance(self):
        z, p_value, tau, effective_n, _ = _compute_hamed_rao_mk(np.ones(24))

        self.assertEqual(z, 0)
        self.assertEqual(p_value, 1)
        self.assertEqual(tau, 0)
        self.assertEqual(effective_n, 24)

    def test_ols_t_test_and_interval_detect_a_linear_slope(self):
        x_years = np.arange(40, dtype=float)
        values = 3.0 * x_years + np.sin(x_years)

        slope, t_stat, degrees_freedom, p_value, lower, upper = _compute_ols_trend(
            values, x_years, effective_sample_size=40
        )

        self.assertGreater(t_stat, 0)
        self.assertLess(p_value, 0.05)
        self.assertLess(lower, slope)
        self.assertGreater(upper, slope)
        self.assertEqual(degrees_freedom, 38)

    def test_seasonal_kendall_compares_like_months(self):
        dates = pd.date_range("2000-01-01", periods=120, freq="MS")
        values = np.array([date.year + date.month / 100 for date in dates], dtype=float)

        z, p_value = _compute_seasonal_kendall(pd.Series(values, index=dates))

        self.assertIsNotNone(z)
        self.assertLess(p_value, 0.05)

    def test_pettitt_reports_a_candidate_for_a_step_change(self):
        dates = pd.date_range("2000-01-01", periods=48, freq="MS")
        values = pd.Series(np.r_[np.zeros(24), np.full(24, 5.0)], index=dates)

        timestamp, statistic, p_value = _compute_pettitt(values)

        self.assertIsNotNone(timestamp)
        self.assertIsNotNone(statistic)
        self.assertLess(p_value, 0.05)
        self.assertIn("2001", timestamp)
        self.assertRegex(timestamp, r"^\d{4}-\d{2}$")

    def test_case_file_returns_only_observed_rows_and_preserves_missingness(self):
        dates = pd.date_range("2010-01-01", periods=72, freq="MS")
        values = np.array(
            [
                12 + 0.03 * index / 12 + 4 * np.sin(2 * np.pi * date.month / 12)
                for index, date in enumerate(dates)
            ],
            dtype=float,
        )
        values[18] = np.nan
        series = pd.Series(values, index=dates)
        series.attrs["qa_flags"] = {dates[18].isoformat(): "Missing"}
        request = CaseFileAnalysisRequest(
            dataset_name="Observed temperature",
            parameter_code="T2M",
            unit="C",
            location="Test region",
            start_year=2010,
            end_year=2015,
        )

        result = execute_case_file_analysis(
            series=series,
            req=request,
            provenance_mode="live_extracted_result",
            source_agency="NASA POWER",
            citation_doi="https://example.test/data",
        )

        self.assertEqual(len(result.analysis_series), len(dates))
        self.assertEqual(result.analysis_series[0].timestamp, "2010-01")
        self.assertEqual(result.analysis_series[0].value, values[0])
        self.assertIsNone(result.analysis_series[18].value)
        self.assertEqual(result.analysis_series[18].qa_flag, "Missing")
        self.assertEqual(result.valid_months_count, 71)
        self.assertIn("climatology", result.seasonal_adjustment_method.lower())
        self.assertNotEqual(result.sens_slope_decadal, 0)
        self.assertLessEqual(result.sens_ci_low, result.sens_slope_decadal)
        self.assertGreaterEqual(result.sens_ci_high, result.sens_slope_decadal)
        self.assertTrue(result.result_id.startswith("cf-"))

    def test_complete_monthly_record_uses_real_stl_decomposition(self):
        dates = pd.date_range("2000-01-01", periods=48, freq="MS")
        values = np.array(
            [
                15 + 0.02 * index + 3 * np.sin(2 * np.pi * date.month / 12)
                for index, date in enumerate(dates)
            ],
            dtype=float,
        )
        request = CaseFileAnalysisRequest(
            dataset_name="Observed temperature",
            parameter_code="T2M",
            unit="C",
            location="Test region",
            start_year=2000,
            end_year=2003,
        )

        result = execute_case_file_analysis(
            series=pd.Series(values, index=dates),
            req=request,
            provenance_mode="live_nasa_power",
            source_agency="NASA POWER",
            citation_doi="https://example.test/data",
        )

        self.assertIn("STL", result.seasonal_adjustment_method)
        self.assertTrue(
            any(
                point.seasonal_component is not None
                and abs(point.seasonal_component) > 0
                for point in result.analysis_series
            )
        )

    def test_user_can_request_unadjusted_observations(self):
        dates = pd.date_range("2000-01-01", periods=36, freq="MS")
        values = np.linspace(2.0, 7.0, len(dates))
        request = CaseFileAnalysisRequest(
            dataset_name="Observed temperature",
            parameter_code="T2M",
            unit="C",
            location="Test region",
            start_year=2000,
            end_year=2002,
            seasonal_adjustment="none",
            analysis_methods=["ols"],
        )

        result = execute_case_file_analysis(
            series=pd.Series(values, index=dates),
            req=request,
            provenance_mode="live_nasa_power",
        )

        self.assertIn("No seasonal adjustment", result.seasonal_adjustment_method)
        self.assertEqual(result.requested_analysis_methods, ["ols"])
        self.assertTrue(
            all(
                point.seasonal_component == 0
                and point.deseasonalized_value == point.value
                for point in result.analysis_series
            )
        )

    def test_stl_request_rejects_incomplete_monthly_records(self):
        dates = pd.date_range("2000-01-01", periods=36, freq="MS")
        values = np.linspace(2.0, 7.0, len(dates))
        values[10] = np.nan
        request = CaseFileAnalysisRequest(
            dataset_name="Observed temperature",
            parameter_code="T2M",
            unit="C",
            location="Test region",
            start_year=2000,
            end_year=2002,
            seasonal_adjustment="stl",
        )

        with self.assertRaisesRegex(ValueError, "Robust STL requires"):
            execute_case_file_analysis(
                series=pd.Series(values, index=dates),
                req=request,
                provenance_mode="live_nasa_power",
            )

    def test_short_or_duplicate_series_is_rejected(self):
        request = CaseFileAnalysisRequest(
            dataset_name="Observed temperature",
            parameter_code="T2M",
            unit="C",
            location="Test region",
            start_year=2010,
            end_year=2011,
        )
        short_series = pd.Series(
            [1.0, 2.0, 3.0, 4.0, 5.0],
            index=pd.date_range("2010-01-01", periods=5, freq="MS"),
        )
        duplicate_series = pd.Series(
            [1.0, 2.0, 3.0, 4.0, 5.0, 6.0],
            index=pd.to_datetime(
                [
                    "2010-01-01",
                    "2010-02-01",
                    "2010-03-01",
                    "2010-04-01",
                    "2010-05-01",
                    "2010-05-01",
                ]
            ),
        )

        with self.assertRaisesRegex(ValueError, "At least 6"):
            execute_case_file_analysis(short_series, request, "live_nasa_power")
        with self.assertRaisesRegex(ValueError, "duplicate timestamps"):
            execute_case_file_analysis(duplicate_series, request, "live_nasa_power")


if __name__ == "__main__":
    unittest.main()
