import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REGIONS = {
    r["id"]: r
    for r in json.loads(
        (ROOT / "shared/forecast-regions.json").read_text(encoding="utf-8")
    )["regions"]
}


def region(identifier: str) -> dict:
    if identifier not in REGIONS:
        raise ValueError("Choose a supported forecast location.")
    return REGIONS[identifier]
