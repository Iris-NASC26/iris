import { NextResponse } from "next/server";
import { scanRegionalCaseBoardSnapshot } from "@/lib/srsCubeAndScienceEngine";

const FASTAPI_BASE = process.env.FASTAPI_URL || "http://127.0.0.1:8000";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    try {
      const upstream = await fetch(`${FASTAPI_BASE}/api/v1/cube/case-board`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(12000),
      });
      if (upstream.ok) {
        return NextResponse.json(await upstream.json());
      }
    } catch {
      // Serve verified regional Case Board snapshot when FastAPI is offline
    }
    return NextResponse.json(scanRegionalCaseBoardSnapshot(body));
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to scan Regional Case Board", detail: String(error) },
      { status: 400 },
    );
  }
}
