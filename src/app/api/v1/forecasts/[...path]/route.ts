import { NextResponse } from "next/server";
import { forecastRegion } from "@/features/forecasts/model";
import { FASTAPI_BASE as BASE } from "@/lib/backendConfig";

export const dynamic = "force-dynamic";
async function proxy(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const isGet = request.method === "GET";
  const isPost = request.method === "POST";
  // iris.ml-forecast.v2 routes — explicit shapes only, never arbitrary paths.
  const v2 =
    path[0] === "v2" &&
    ((path.length === 2 && ["capabilities", "catalogue"].includes(path[1]) && isGet) ||
      (path.length === 3 && path[1] === "jobs" && isGet) ||
      (path.length === 4 &&
        path[1] === "jobs" &&
        ["cancel", "retry"].includes(path[3]) &&
        isPost) ||
      (path.length === 4 && path[1] === "runs" && isGet) ||
      (forecastRegion(path[1]) &&
        ((path.length === 3 &&
          ["history", "datasets", "models", "trends", "prediction", "published", "jobs"].includes(path[2]) &&
          isGet) ||
          (path.length === 3 &&
            ["ingest", "datasets", "train", "trends", "predict", "refresh", "generate"].includes(
              path[2],
            ) &&
            isPost) ||
          (path.length === 5 &&
            path[2] === "models" &&
            path[4] === "activate" &&
            isPost))));
  const valid =
    v2 ||
    (path.length === 1 &&
      ["catalogue", "capabilities"].includes(path[0]) &&
      isGet) ||
    (forecastRegion(path[0]) &&
      ((path.length === 1 && isGet) ||
        (path.length === 2 && path[1] === "refresh" && isPost) ||
        (path.length === 2 && path[1] === "observations" && isGet)));
  if (!valid)
    return NextResponse.json(
      { error: "Choose a supported forecast endpoint." },
      { status: 422 },
    );
  try {
    const body = isPost ? await request.text() : undefined;
    if (body && body.length > 8192)
      return NextResponse.json({ error: "Payload too large." }, { status: 413 });
    const response = await fetch(
      `${BASE}/api/v1/forecasts/${path.join("/")}${new URL(request.url).search}`,
      {
        method: request.method,
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(45000),
        headers: {
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...(request.headers.get("x-iris-admin") ? { "x-iris-admin": request.headers.get("x-iris-admin")! } : {}),
        },
        body: body || undefined,
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
