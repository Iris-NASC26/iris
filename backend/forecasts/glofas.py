"""Explicitly unavailable until EWDS access and river-cell support are verified.

The user elected to proceed without EWDS. Do not request, approximate or publish
river discharge from precipitation, and do not invent a supported basin mapping.
"""


def status() -> dict:
    return {
        "state": "awaiting_ewds_access",
        "detail": "River-flow forecasts disabled: EWDS access and a scientifically verified river-cell mapping are required.",
    }
