import { NextResponse } from "next/server";

const FASTAPI_BASE = process.env.FASTAPI_URL || "http://127.0.0.1:8000";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  if (!q) {
    return NextResponse.json({ error: "q query parameter is required" }, { status: 400 });
  }
  try {
    const upstream = await fetch(`${FASTAPI_BASE}/api/v1/geocode?q=${encodeURIComponent(q)}`, {
      signal: AbortSignal.timeout(10000),
    });
    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch (error) {
    return NextResponse.json(
      { error: "Geocoding request failed", detail: String(error) },
      { status: 502 },
    );
  }
}
