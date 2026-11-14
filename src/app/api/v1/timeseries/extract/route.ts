import { NextResponse } from "next/server";
import type { ExtractionRequest } from "@/lib/dataRetrievalEngine";

const FASTAPI_BASE = process.env.FASTAPI_URL || "http://127.0.0.1:8000";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ExtractionRequest;
    const upstream = await fetch(`${FASTAPI_BASE}/api/v1/timeseries/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(50000),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      return NextResponse.json(
        { error: data?.detail || "Upstream NASA time-series extraction failed" },
        { status: upstream.status },
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          "Failed to execute live time-series extraction via Python FastAPI backend (http://127.0.0.1:8000).",
        detail: String(error),
      },
      { status: 502 },
    );
  }
}
