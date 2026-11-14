import { NextResponse } from "next/server";

const FASTAPI_BASE = process.env.FASTAPI_URL || "http://127.0.0.1:8000";

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;

  try {
    const upstream = await fetch(`${FASTAPI_BASE}/api/v1/timeseries/jobs/${jobId}/status`, {
      signal: AbortSignal.timeout(10000),
    });
    const data = await upstream.json();
    if (!upstream.ok) {
      return NextResponse.json(
        { error: data?.detail || `Job ${jobId} not found` },
        { status: upstream.status },
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to poll job status from backend", detail: String(error) },
      { status: 502 },
    );
  }
}
