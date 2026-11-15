import { NextResponse } from "next/server";
import { FASTAPI_BASE as BASE } from "@/lib/backendConfig";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
    const query = new URL(request.url).searchParams;
    const params = new URLSearchParams();
    for (const key of ["variable", "month", "lat_min", "lat_max", "lon_min", "lon_max"]) {
        const value = query.get(key);
        if (value === null || value.length > 32)
            return NextResponse.json({ error: "Missing or invalid spatial parameters." }, { status: 422 });
        params.set(key, value);
    }
    try {
        const upstream = await fetch(`${BASE}/api/v1/visualization/field?${params}`, {
            cache: "no-store", redirect: "error", signal: AbortSignal.timeout(90000), headers: { Accept: "application/json" },
        });
        if (upstream.status === 404)
            return NextResponse.json({ error: "Spatial extension not running. Start backend with visualization_app:app; your existing backend routes are preserved." }, { status: 503 });
        const payload = await upstream.json();
        return NextResponse.json(payload, { status: upstream.status, headers: { "Cache-Control": "no-store" } });
    }
    catch {
        return NextResponse.json({ error: "Spatial service unavailable. Check the visualization backend and retry." }, { status: 503 });
    }
}
