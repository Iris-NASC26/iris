import { NextResponse } from "next/server";
import { FASTAPI_BASE } from "@/lib/backendConfig";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const upstream = await fetch(`${FASTAPI_BASE}/api/v1/si/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(35000),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      return NextResponse.json(
        { error: data?.detail || "SI chat backend request failed" },
        { status: upstream.status },
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          `Could not reach the Python FastAPI backend at ${FASTAPI_BASE}.`,
        detail: String(error),
      },
      { status: 502 },
    );
  }
}
