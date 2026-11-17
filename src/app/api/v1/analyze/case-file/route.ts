import { NextResponse } from "next/server";
import { FASTAPI_BASE } from "@/lib/backendConfig";
import {
  computeLocalCaseFileAnalysis,
  findPersistedPreviewByJobId,
} from "@/lib/manualCaseStudyServerLoader";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const jobId = typeof body.job_id === "string" ? body.job_id : null;

    // Ensure durable store has the job if it belongs to a manual case study
    const localPreview = jobId ? findPersistedPreviewByJobId(jobId) : null;

    try {
      const upstream = await fetch(`${FASTAPI_BASE}/api/v1/analyze/case-file`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });
      if (upstream.ok) {
        const responseBody = await upstream.json();
        return NextResponse.json(responseBody, { status: upstream.status });
      }
      if (!localPreview) {
        const responseBody = await upstream.json().catch(() => ({}));
        return NextResponse.json(responseBody, { status: upstream.status });
      }
    } catch (error) {
      if (!localPreview) {
        return NextResponse.json(
          {
            error: "Scientific analysis service is unavailable.",
            detail: error instanceof Error ? error.message : String(error),
          },
          { status: 503 },
        );
      }
    }

    if (localPreview) {
      const fallbackResult = computeLocalCaseFileAnalysis(localPreview, body);
      return NextResponse.json(fallbackResult, { status: 200 });
    }

    return NextResponse.json(
      { error: "Unable to complete scientific analysis." },
      { status: 500 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to read the scientific analysis request.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 400 },
    );
  }
}
