import { NextResponse } from "next/server";
import { getGlobeCubeSnapshot } from "@/lib/srsCubeAndScienceEngine";

const FASTAPI_BASE = process.env.FASTAPI_URL || "http://127.0.0.1:8000";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const layerId = searchParams.get("layer_id") || "cube_t2m";
  const windowStr = searchParams.get("window") || "1981-2025";

  try {
    const upstream = await fetch(
      `${FASTAPI_BASE}/api/v1/cube/globe?layer_id=${encodeURIComponent(layerId)}&window=${encodeURIComponent(windowStr)}`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (upstream.ok) {
      return NextResponse.json(await upstream.json());
    }
  } catch {
    // Serve verified Global Trend Cube snapshot when FastAPI is offline
  }
  return NextResponse.json(getGlobeCubeSnapshot(layerId, windowStr));
}
