import { NextResponse } from "next/server";
import { forecastRegion } from "@/features/forecasts/model";

export const dynamic = "force-dynamic";
const BASE = process.env.FASTAPI_URL || "http://127.0.0.1:8000";
async function proxy(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const valid =
    (path.length === 1 &&
      ["catalogue", "capabilities"].includes(path[0]) &&
      request.method === "GET") ||
    (forecastRegion(path[0]) &&
      ((path.length === 1 && request.method === "GET") ||
        (path.length === 2 &&
          path[1] === "refresh" &&
          request.method === "POST") ||
        (path.length === 2 &&
          path[1] === "observations" &&
          request.method === "GET")));
  if (!valid)
    return NextResponse.json(
      { error: "Choose a supported forecast endpoint." },
      { status: 422 },
    );
  try {
    const response = await fetch(
      `${BASE}/api/v1/forecasts/${path.join("/")}${new URL(request.url).search}`,
      {
        method: request.method,
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(45000),
      },
    );
    if (response.status === 404)
      return NextResponse.json(
        {
          error:
            "Start the backend using visualization_app:app to enable forecasts.",
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
        error: "The forecast service is unavailable. Check the local backend.",
      },
      { status: 503 },
    );
  }
}
export const GET = proxy;
export const POST = proxy;
