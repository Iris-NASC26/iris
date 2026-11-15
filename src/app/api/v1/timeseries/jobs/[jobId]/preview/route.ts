import { NextResponse } from "next/server";
import { FASTAPI_BASE } from "@/lib/backendConfig";

export async function GET(
  request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") || "1");
  const pageSize = Number(searchParams.get("page_size") || "100");

  try {
    const upstream = await fetch(
      `${FASTAPI_BASE}/api/v1/timeseries/jobs/${jobId}/preview?page=${page}&page_size=${pageSize}`,
      { signal: AbortSignal.timeout(15000) },
    );
    const data = await upstream.json();
    if (!upstream.ok) {
      return NextResponse.json(
        { error: data?.detail || `Preview for job ${jobId} not found` },
        { status: upstream.status },
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to retrieve job preview from backend", detail: String(error) },
      { status: 502 },
    );
  }
}
