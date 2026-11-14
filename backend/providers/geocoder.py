"""
Live Geocoding Provider (`https://geocoding-api.open-meteo.com/v1/search`)
Resolves place names (countries, states, cities, basins) into real WGS84 coordinates and bounding boxes.
"""

from __future__ import annotations

from typing import Dict, List, Optional, Tuple
import httpx

_GEOCODE_CACHE: Dict[str, Dict[str, object]] = {}


async def geocode_place_live(
    place_name: str, client: Optional[httpx.AsyncClient] = None
) -> Optional[Dict[str, object]]:
    clean = place_name.strip()
    if not clean or clean.lower() in ("global", "world", "earth", "planetary"):
        return {
            "name": "Global Grid",
            "country": "Global",
            "lat": 0.0,
            "lon": 0.0,
            "bbox": [-180.0, -90.0, 180.0, 90.0],
            "spatial_level": "global",
        }

    key = clean.lower()
    if key in _GEOCODE_CACHE:
        return _GEOCODE_CACHE[key]

    url = "https://geocoding-api.open-meteo.com/v1/search"
    params = {"name": clean, "count": 1, "language": "en", "format": "json"}

    own_client = client is None
    http = client or httpx.AsyncClient(timeout=8.0)
    try:
        resp = await http.get(url, params=params)
        if resp.status_code == 200:
            results = resp.json().get("results") or []
            if results:
                top = results[0]
                lat = float(top["latitude"])
                lon = float(top["longitude"])
                fcode = str(top.get("feature_code", ""))
                # Construct realistic regional bounding box span based on administrative feature type
                half_span = 2.0 if fcode.startswith("PCL") or fcode.startswith("ADM1") else 1.0
                bbox = [
                    round(max(-180.0, lon - half_span), 3),
                    round(max(-90.0, lat - half_span), 3),
                    round(min(180.0, lon + half_span), 3),
                    round(min(90.0, lat + half_span), 3),
                ]
                country = top.get("country", "")
                admin1 = top.get("admin1", "")
                label_parts = [top.get("name", clean)]
                if admin1 and admin1 != label_parts[0]:
                    label_parts.append(admin1)
                if country and country not in label_parts:
                    label_parts.append(country)
                resolved = {
                    "name": ", ".join(label_parts),
                    "country": country,
                    "lat": round(lat, 4),
                    "lon": round(lon, 4),
                    "bbox": bbox,
                    "spatial_level": "regional",
                }
                _GEOCODE_CACHE[key] = resolved
                return resolved
    except Exception:
        pass
    finally:
        if own_client:
            await http.aclose()

    return None
