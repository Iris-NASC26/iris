"""Target-variable and source-product registry — the multi-variable contract.

Every target declares its units, aggregation semantics, plausibility range,
composite cadence, and eligible source products with per-product publication
delays. Rainfall behaviour is unchanged; new variables never pass through
rainfall-only assumptions (nonnegativity, 24h summation).
"""
from __future__ import annotations

# aggregation: how interval values combine to the daily/model step
#   sum       — accumulation (precip, ET native composite totals)
#   mean      — intensive state (soil moisture, temperature, NDVI, snow %)
#   composite — value already spans `composite_days`; no further summing
VARIABLES: dict[str, dict] = {
    "precip_24h": {
        "label": "Precipitation (24h)",
        "unit": "mm",
        "aggregation": "sum",
        "min": 0.0, "max": 2000.0,
        "composite_days": 1,
        "nonnegative": True,
        "sources": ["era5", "mix"],        # existing Meteomatics path
    },
    "smap_surface_sm": {
        "label": "Surface soil moisture (SMAP L3)",
        "unit": "m3/m3",
        "aggregation": "mean",
        "min": 0.0, "max": 0.7,
        "composite_days": 1,
        "nonnegative": True,
        "sources": ["SPL3SMP_E.006"],
    },
    "smap_rootzone_sm": {
        "label": "Root-zone soil moisture (SMAP L4)",
        "unit": "m3/m3",
        "aggregation": "mean",
        "min": 0.0, "max": 0.7,
        "composite_days": 1,
        "nonnegative": True,
        "sources": ["SPL4SMGP.008"],
    },
    "merra2_t2m": {
        "label": "2 m air temperature (MERRA-2)",
        "unit": "K",
        "aggregation": "mean",
        "min": 150.0, "max": 340.0,
        "composite_days": 1,
        "nonnegative": False,
        "sources": ["M2T1NXSLV.5.12.4"],
    },
    "modis_lst_day": {
        "label": "Daytime land-surface temperature (MODIS)",
        "unit": "K",
        "aggregation": "mean",
        "min": 150.0, "max": 400.0,
        "composite_days": 1,
        "nonnegative": False,
        "sources": ["MOD11A1.061"],
    },
    "modis_ndvi": {
        "label": "NDVI (MODIS 16-day composite)",
        "unit": "1",
        "aggregation": "composite",
        "min": -0.2, "max": 1.0,
        "composite_days": 16,
        "nonnegative": False,
        "sources": ["MOD13Q1.061"],
    },
    "viirs_ndvi": {
        "label": "NDVI (VIIRS 16-day composite)",
        "unit": "1",
        "aggregation": "composite",
        "min": -0.2, "max": 1.0,
        "composite_days": 16,
        "nonnegative": False,
        "sources": ["VNP13A1.002"],
    },
    "modis_et": {
        "label": "Evapotranspiration (MODIS 8-day, year-end gap-filled)",
        "unit": "kg/m^2/8day",
        "aggregation": "composite",
        "min": 0.0, "max": 500.0,
        "composite_days": 8,
        "nonnegative": True,
        "sources": ["MOD16A2GF.061"],
    },
    "gldas_sm": {
        "label": "Soil moisture 0–10 cm (GLDAS Noah)",
        "unit": "kg/m^2",
        "aggregation": "mean",
        "min": 0.0, "max": 500.0,
        "composite_days": 1,
        "nonnegative": True,
        "sources": ["GLDAS_NOAH025_3H.2.1"],
    },
    "gldas_tair": {
        "label": "Air temperature (GLDAS Noah)",
        "unit": "K",
        "aggregation": "mean",
        "min": 150.0, "max": 340.0,
        "composite_days": 1,
        "nonnegative": False,
        "sources": ["GLDAS_NOAH025_3H.2.1"],
    },
    "modis_snow": {
        "label": "Snow cover (MODIS NDSI)",
        "unit": "%",
        "aggregation": "mean",
        "min": 0.0, "max": 100.0,
        "composite_days": 1,
        "nonnegative": True,
        "sources": ["MOD10A1.061"],
    },
}

# Earthdata products -> access + availability metadata. `delay_days` is the
# declared publication lag AFTER interval end — composite products also finish
# only at composite end, so availability = interval_end + delay.
# Access: "opendap" point subset (implemented); "appeears"/"harmony" documented
# alternatives for area statistics (not implemented here).
PRODUCTS: dict[str, dict] = {
    "SPL3SMP_E.006": {
        "daac": "NSIDC", "variable": "SMAP_L3_surface_soil_moisture",
        "native_cadence": "daily", "delay_days": 3, "access": "opendap",
        "note": "SMAP L3 radiometer daily; ~3d science latency",
    },
    "SPL4SMGP.008": {
        "daac": "NSIDC", "variable": "SMAP_L4_rootzone_soil_moisture",
        "native_cadence": "3h->daily", "delay_days": 10, "access": "opendap",
        "note": "L4 assimilation product; multi-day analysis latency",
    },
    "M2T1NXSLV.5.12.4": {
        "daac": "GES DISC", "variable": "T2M",
        "native_cadence": "hourly->daily", "delay_days": 30, "access": "opendap",
        "note": "MERRA-2 monthly files; end-of-month publication",
    },
    "MOD11A1.061": {
        "daac": "LP DAAC", "variable": "LST_Day_1km",
        "native_cadence": "daily", "delay_days": 5, "access": "opendap",
        "note": "MODIS C6.1 daily LST; scale factor 0.02 applied at parse",
    },
    "MOD13Q1.061": {
        "daac": "LP DAAC", "variable": "NDVI",
        "native_cadence": "16-day composite", "delay_days": 10, "access": "opendap",
        "note": "Composite completes at window end; scale 1e-4",
    },
    "VNP13A1.002": {
        "daac": "LP DAAC", "variable": "NDVI",
        "native_cadence": "16-day composite", "delay_days": 10, "access": "opendap",
        "note": "VIIRS analogue of MOD13Q1; scale 1e-4",
    },
    "MOD16A2GF.061": {
        "daac": "LP DAAC", "variable": "ET_500m",
        "native_cadence": "8-day composite", "delay_days": 60, "access": "opendap",
        "note": "Year-end gap-filled; never treat as current observation",
    },
    "GLDAS_NOAH025_3H.2.1": {
        "daac": "GES DISC", "variable": "SoilMoist_inst,Tair_f_inst",
        "native_cadence": "3h->daily", "delay_days": 45, "access": "opendap",
        "note": "GLDAS-2.1 monthly files; delayed publication",
    },
    "MOD10A1.061": {
        "daac": "NSIDC", "variable": "NDSI_Snow_Cover",
        "native_cadence": "daily", "delay_days": 5, "access": "opendap",
        "note": "Daily NDSI snow cover 0-100%",
    },
    "NASADEM_NC.001": {
        "daac": "LP DAAC", "variable": "elevation",
        "native_cadence": "static", "delay_days": 0, "access": "opendap",
        "note": "Static terrain predictor only — not a time series",
    },
}

# Variables forecastable as targets (static predictors excluded).
def targets() -> list[str]:
    return list(VARIABLES)


def variable(name: str) -> dict:
    if name not in VARIABLES:
        raise ValueError(f"Unknown target variable '{name}'.")
    return VARIABLES[name]


def product(shortname: str) -> dict:
    if shortname not in PRODUCTS:
        raise ValueError(f"Unknown Earthdata product '{shortname}'.")
    return PRODUCTS[shortname]


def check_value(var: str, value: float) -> str | None:
    """Variable-aware plausibility; returns a quarantine reason or None."""
    spec = VARIABLES[var]
    if spec["nonnegative"] and value < 0:
        return f"impossible_negative_{var}"
    if value < spec["min"] or value > spec["max"]:
        return f"implausible_{var}"
    return None
