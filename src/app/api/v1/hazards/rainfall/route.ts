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
      `${BASE}/api/v1/hazards/rainfall?case_id=${encodeURIComponent(id)}`,
      {
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(40000),
        headers: { Accept: "application/json" },
      },
    );
    if (response.status === 404)
      return NextResponse.json(
        {
          error:
            "Start the backend with visualization_app:app to enable precipitation outlooks.",
        },
        { status: 503 },
      );
    const value = await response.json();
    return NextResponse.json(value, {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "The precipitation service is unavailable. Check the local backend and retry.",
      },
      { status: 503 },
    );
  }
}
