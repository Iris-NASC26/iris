import { NextResponse } from "next/server";
import { loadManualCaseStudyWorkspaceData } from "@/lib/manualCaseStudyServerLoader";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("caseId") || "nepal-glacier-flood-2026";
    const data = loadManualCaseStudyWorkspaceData(caseId);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to load manual case study datasets.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
