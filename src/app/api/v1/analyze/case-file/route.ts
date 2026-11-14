import { NextResponse } from "next/server";

const FASTAPI_BASE = process.env.FASTAPI_URL || "http://127.0.0.1:8000";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let upstream: Response;
    try {
      upstream = await fetch(`${FASTAPI_BASE}/api/v1/analyze/case-file`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20000),
      });
    } catch (error) {
      return NextResponse.json(
        {
          error: "Scientific analysis service is unavailable.",
          detail: error instanceof Error ? error.message : String(error),
        },
        { status: 503 },
      );
    }
    const responseBody = await upstream.json();
    return NextResponse.json(responseBody, { status: upstream.status });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to read the scientific analysis response.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 400 },
    );
  }
}
