import { NextResponse } from "next/server";
import { CUBE_VERSION, PROVIDER_CAPABILITY_MATRIX } from "@/lib/srsCubeAndScienceEngine";

const FASTAPI_BASE = process.env.FASTAPI_URL || "http://127.0.0.1:8000";

export async function GET() {
  try {
    const upstream = await fetch(`${FASTAPI_BASE}/api/v1/capabilities`, {
      signal: AbortSignal.timeout(8000),
    });
    if (upstream.ok) {
      return NextResponse.json(await upstream.json());
    }
  } catch {
    // Serve verified snapshot capability matrix if FastAPI is offline
  }
  return NextResponse.json({
    cube_version: CUBE_VERSION,
    providers: PROVIDER_CAPABILITY_MATRIX,
  });
}
