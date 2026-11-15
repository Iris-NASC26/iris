import { NextResponse } from "next/server";

const BASE = process.env.FASTAPI_URL || "http://127.0.0.1:8000";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const query = new URL(request.url).searchParams;
    const params = new URLSearchParams();
    for (const key of ["variable", "month", "lat_min", "lat_max", "lon_min", "lon_max", "baseline_start", "baseline_end", "min_valid_years"]) {
        const value = query.get(key);
        if (value !== null) {
            if (value.length > 32)
                return NextResponse.json({ error: `Parameter ${key} is too long.` }, { status: 422 });
            params.set(key, value);
        }
    }
    for (const required of ["variable", "month", "lat_min", "lat_max", "lon_min", "lon_max"]) {
        if (!params.has(required)) {
            return NextResponse.json({ error: `Missing required spatial parameter: ${required}` }, { status: 422 });
        }
    }
    try {
        const upstream = await fetch(`${BASE}/api/v1/visualization/anomaly?${params}`, {
            cache: "no-store",
            redirect: "error",
            signal: AbortSignal.timeout(90000),
            headers: { Accept: "application/json" },
        });
        if (upstream.status === 404)
            return NextResponse.json({ error: "Spatial extension not running. Start backend with visualization_app:app; your existing backend routes are preserved." }, { status: 503 });
        const payload = await upstream.json();
        return NextResponse.json(payload, { status: upstream.status, headers: { "Cache-Control": "no-store" } });
    }
    catch {
        return NextResponse.json({ error: "Spatial anomaly service unavailable. Check the visualization backend and retry." }, { status: 503 });
    }
}
