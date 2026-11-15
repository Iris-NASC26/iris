"""Read the allowlisted case catalogue shared with the frontend."""

import json
from pathlib import Path

CATALOG_PATH = (
    Path(__file__).resolve().parents[2] / "shared" / "hazard-investigations.json"
)
CASES = {
    case["id"]: case
    for case in json.loads(CATALOG_PATH.read_text(encoding="utf-8"))["cases"]
}


def case_by_id(case_id: str) -> dict:
    if case_id not in CASES:
        raise ValueError("Choose a supported disaster investigation.")
    return CASES[case_id]
