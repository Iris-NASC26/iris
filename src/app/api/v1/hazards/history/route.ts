import { NextResponse } from "next/server";
import { investigation } from "@/features/hazards/model";

const BASE = process.env.FASTAPI_URL || "http://127.0.0.1:8000";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("case_id") ?? "";
  if (!investigation(id))
    return NextResponse.json(
      { error: "Choose a supported investigation." },
      { status: 422 },
    );
  try {
    const response = await fetch(
      `${BASE}/api/v1/hazards/history?case_id=${encodeURIComponent(id)}`,
      {
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(45000),
        headers: { Accept: "application/json" },
      },
    );
    if (response.status === 404)
      return NextResponse.json(
        {
          error:
            "Start the backend with visualization_app:app to enable historical context.",
        },
        { status: 503 },
      );
    return NextResponse.json(await response.json(), {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "NASA historical context is unavailable. Check the backend and retry.",
      },
      { status: 503 },
    );
  }
}
