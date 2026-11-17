import { NextResponse } from "next/server";
import { FASTAPI_BASE } from "@/lib/backendConfig";
import { findPersistedPreviewByJobId } from "@/lib/manualCaseStudyServerLoader";

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;

  try {
    const upstream = await fetch(
      `${FASTAPI_BASE}/api/v1/timeseries/jobs/${encodeURIComponent(jobId)}/status`,
      { signal: AbortSignal.timeout(6000) },
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
    return NextResponse.json({
      job_id: jobId,
      status: "completed",
      progress_percent: 100,
      status_message: `Loaded ${localPreview.extraction_config.target_frequency} NASA Giovanni time series (${localPreview.total_rows} observations).`,
      source_api: localPreview.product.source_api,
      product_id: localPreview.product.product_id,
      variable_id: localPreview.product.variable_id,
      steps: [
        { step: 1, label: `NASA Giovanni Telemetry Loaded (${localPreview.product.source_api})`, status: "completed" },
        { step: 2, label: "Fill-Value Filtering & QA Flagging", status: "completed" },
        { step: 3, label: `Temporal Alignment (${localPreview.extraction_config.target_frequency})`, status: "completed" },
        { step: 4, label: "Ready for Preview, Statistical Analysis & Visualization", status: "completed" },
      ],
    });
  }

  return NextResponse.json(
    { error: `Job ${jobId} not found` },
    { status: 404 },
  );
}
