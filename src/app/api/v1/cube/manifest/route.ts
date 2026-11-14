import { NextResponse } from "next/server";
import { CUBE_LAYERS, CUBE_VERSION, SNAPSHOT_TIMESTAMP_UTC } from "@/lib/srsCubeAndScienceEngine";

const FASTAPI_BASE = process.env.FASTAPI_URL || "http://127.0.0.1:8000";

export async function GET() {
  try {
    const upstream = await fetch(`${FASTAPI_BASE}/api/v1/cube/manifest`, {
      signal: AbortSignal.timeout(8000),
    });
    if (upstream.ok) {
      return NextResponse.json(await upstream.json());
    }
  } catch {
    // Serve verified cube manifest snapshot if FastAPI is offline
  }
  return NextResponse.json({
    cube_version: CUBE_VERSION,
    snapshot_timestamp_utc: SNAPSHOT_TIMESTAMP_UTC,
    layers: CUBE_LAYERS,
  });
}
