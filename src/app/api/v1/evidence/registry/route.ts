import { NextResponse } from "next/server";
import { EVIDENCE_METHODS_REGISTRY } from "@/lib/srsCubeAndScienceEngine";

const FASTAPI_BASE = process.env.FASTAPI_URL || "http://127.0.0.1:8000";

export async function GET() {
  try {
    const upstream = await fetch(`${FASTAPI_BASE}/api/v1/evidence/registry`, {
      signal: AbortSignal.timeout(8000),
    });
    if (upstream.ok) {
      return NextResponse.json(await upstream.json());
    }
  } catch {
    // Serve verified Evidence & Methods registry snapshot
  }
  return NextResponse.json(EVIDENCE_METHODS_REGISTRY);
}
