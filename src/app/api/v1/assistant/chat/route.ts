import { NextResponse } from "next/server";

const FASTAPI_BASE = process.env.FASTAPI_URL || "http://127.0.0.1:8000";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const upstream = await fetch(`${FASTAPI_BASE}/api/v1/assistant/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(35000),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      return NextResponse.json(
        { error: data?.detail || "Assistant backend request failed" },
        { status: upstream.status },
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          "Could not reach the Python FastAPI backend at http://127.0.0.1:8000. Ensure `uvicorn main:app --port 8000` is running in `backend/`.",
        detail: String(error),
      },
      { status: 502 },
    );
  }
}
