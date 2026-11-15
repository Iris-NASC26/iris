import math
import unittest
from unittest.mock import AsyncMock, Mock

from providers.nasa_power import extract_nasa_power_timeseries
from schemas import ExtractionRequest


def _request(
    *,
    bbox=None,
    frequency="Monthly",
    start_date="2020-01-01",
    end_date="2020-02-01",
    reduction="mean",
):
    return ExtractionRequest(
        product_id="NASA_POWER_T2M",
        variable_id="T2M",
        source_api="NASA POWER",
        start_date=start_date,
        end_date=end_date,
        target_frequency=frequency,
        temporal_aggregation="mean",
        spatial_level="regional",
        spatial_Submode="bbox",
        bbox=bbox or [79.0, 29.0, 80.0, 31.0],
        point_lat=30.0,
        point_lon=79.5,
        spatial_reduction=reduction,
    )


def _response(payload):
    response = Mock(status_code=200)
    response.json.return_value = payload
    return response


class NasaPowerRegionalExtractionTests(unittest.IsolatedAsyncioTestCase):
    async def test_monthly_region_is_cosine_weighted_and_ignores_fill_values(self):
        payload = {
            "features": [
                {
                    "geometry": {"coordinates": [79.25, 29.25, 200]},
                    "properties": {"parameter": {"T2M": {"202001": 10, "202002": 12}}},
                },
                {
                    "geometry": {"coordinates": [79.25, 30.75, 400]},
                    "properties": {"parameter": {"T2M": {"202001": 30, "202002": -999}}},
                },
            ],
            "header": {"fill_value": -999, "sources": ["MERRA2"]},
            "parameters": {"T2M": {"units": "C", "longname": "Temperature"}},
        }
        client = AsyncMock()
        client.get.return_value = _response(payload)

        series, metadata, url = await extract_nasa_power_timeseries(
            _request(), 30.0, 79.5, client
        )

        lower_weight = math.cos(math.radians(29.25))
        upper_weight = math.cos(math.radians(30.75))
        expected_mean = (10 * lower_weight + 30 * upper_weight) / (
            lower_weight + upper_weight
        )
        self.assertIn("/monthly/regional?", url)
        self.assertAlmostEqual(series.iloc[0], expected_mean)
        self.assertAlmostEqual(series.iloc[1], 12)
        self.assertIn("weighted mean of 2 regional grid cells", metadata["spatial_semantics"])

    async def test_small_bbox_uses_point_endpoint_and_reports_why(self):
        payload = {
            "properties": {"parameter": {"T2M": {"202001": 11}}},
            "header": {"fill_value": -999, "sources": ["MERRA2"]},
            "parameters": {"T2M": {"units": "C"}},
        }
        client = AsyncMock()
        client.get.return_value = _response(payload)

        _, metadata, url = await extract_nasa_power_timeseries(
            _request(bbox=[79.0, 29.0, 80.0, 30.99]), 30.0, 79.5, client
        )

        self.assertIn("/monthly/point?", url)
        self.assertIn("require at least a 2-degree north-south span", metadata["spatial_semantics"])

    async def test_large_daily_region_is_rejected_before_upstream_request(self):
        client = AsyncMock()

        with self.assertRaisesRegex(RuntimeError, "above the 2,000,000 safety limit"):
            await extract_nasa_power_timeseries(
                _request(
                    bbox=[-10.0, -10.0, 10.0, 10.0],
                    frequency="Daily",
                    start_date="1981-01-01",
                    end_date="2025-01-01",
                ),
                0.0,
                0.0,
                client,
            )

        client.get.assert_not_awaited()

    async def test_region_over_twenty_degrees_is_rejected(self):
        client = AsyncMock()

        with self.assertRaisesRegex(RuntimeError, "limited to 20 degrees per side"):
            await extract_nasa_power_timeseries(
                _request(bbox=[-10.1, -10.0, 10.0, 10.0]),
                0.0,
                0.0,
                client,
            )

        client.get.assert_not_awaited()
