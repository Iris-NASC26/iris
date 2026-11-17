import { NextResponse } from "next/server";
import { FASTAPI_BASE } from "@/lib/backendConfig";
import { findPersistedPreviewByJobId } from "@/lib/manualCaseStudyServerLoader";

export async function GET(
  request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") || "1");
  const pageSize = Number(searchParams.get("page_size") || "500");

  try {
    const upstream = await fetch(
      `${FASTAPI_BASE}/api/v1/timeseries/jobs/${encodeURIComponent(jobId)}/preview?page=${page}&page_size=${pageSize}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (upstream.ok) {
      const data = await upstream.json();
      return NextResponse.json(data);
    }
  } catch {
    // Fall back to durable store / manual case study CSV loader below
  }

  const localPreview = findPersistedPreviewByJobId(jobId);
  if (localPreview) {
    const startIdx = Math.max(0, (page - 1) * pageSize);
    const endIdx = startIdx + pageSize;
    return NextResponse.json({
      ...localPreview,
      raw_rows: localPreview.chart_series.slice(startIdx, endIdx),
      page,
      page_size: pageSize,
    });
  }

  return NextResponse.json(
    { error: `Preview for job ${jobId} not found` },
    { status: 404 },
  );
}
