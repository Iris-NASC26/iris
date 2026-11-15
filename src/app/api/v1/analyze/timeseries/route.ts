import { NextResponse } from "next/server";
import { FASTAPI_BASE as FASTAPI_URL } from "@/lib/backendConfig";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const upstreamRes = await fetch(`${FASTAPI_URL}/api/v1/analyze/timeseries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await upstreamRes.json();
    if (!upstreamRes.ok) {
      return NextResponse.json(
        {
          error: data?.detail || "Live time-series statistical analysis failed.",
          status: upstreamRes.status,
        },
        { status: upstreamRes.status },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to connect to live Python FastAPI statistical engine.",
        detail: String(error),
      },
      { status: 502 },
    );
  }
}
