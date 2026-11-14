"""Shared, allowlisted NASA POWER bindings; never user-supplied source URLs."""

import json
import re
from pathlib import Path
from typing import Any

VARIABLES: dict[str, dict[str, Any]] = json.loads(
    (Path(__file__).resolve().parents[2] / "shared" / "spatial-variables.json").read_text(encoding="utf-8")
)
VARIABLE_PATTERN = "^(?:" + "|".join(re.escape(key) for key in VARIABLES) + ")$"
SOURCES = {
    "merra2": {
        "temporal": "merra2/temporal/power_merra2_monthly_temporal_utc.zarr",
        "spatial": "merra2/spatial/power_merra2_monthly_spatial_utc.zarr",
        "time_standard": "UTC",
        "caveats": (
            "MERRA-2 reanalysis model output; not an independent direct observation.",
            "Changing assimilated inputs and production streams can introduce discontinuities; raw maps do not establish trends.",
        ),
    },
    "syn1deg": {
        "temporal": "syn1deg/temporal/power_syn1deg_monthly_temporal_lst.zarr",
        "spatial": "syn1deg/spatial/power_syn1deg_monthly_spatial_lst.zarr",
        "time_standard": "LST",
        "caveats": (
            "CERES SYN1deg-based radiation on a 1° grid, labelled in local solar time (LST).",
            "Do not combine with a UTC series or append a different solar product.",
        ),
    },
}
