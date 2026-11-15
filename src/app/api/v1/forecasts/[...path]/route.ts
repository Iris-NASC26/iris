import { NextResponse } from "next/server";
import { forecastRegion } from "@/features/forecasts/model";

export const dynamic = "force-dynamic";
const BASE = process.env.FASTAPI_URL || "http://127.0.0.1:8000";
// Registry location ids are opaque server-generated strings; the proxy only
// validates identifier *shape* — existence/compatibility stay server-side.
const IDENT = /^[a-z0-9][a-z0-9-]{1,38}$/;
const JOB = /^v2-[a-f0-9]{12}$/;
const RUN = /^run-[a-f0-9]{16}$/;
const MODEL = /^m-[a-zA-Z0-9-]{2,40}$/;
const V2_READS = ["history", "datasets", "models", "trends", "prediction", "published", "jobs", "freshness"];
const V2_WRITES = ["ingest", "datasets", "train", "trends", "predict", "refresh", "generate", "update"];
const V2_STATIC_READS = ["capabilities", "catalogue", "datasets", "compatibility"];

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
    ((path.length === 2 && V2_STATIC_READS.includes(path[1]) && isGet) ||
      (path.length === 2 && path[1] === "locations" && (isGet || isPost)) ||
      (path.length === 3 && path[1] === "locations" && IDENT.test(path[2]) && isGet) ||
      (path.length === 3 && path[1] === "jobs" && JOB.test(path[2]) && isGet) ||
      (path.length === 4 &&
        path[1] === "jobs" &&
        JOB.test(path[2]) &&
        ["cancel", "retry"].includes(path[3]) &&
        isPost) ||
      (path.length === 4 && path[1] === "runs" && IDENT.test(path[2]) && RUN.test(path[3]) && isGet) ||
      (IDENT.test(path[1]) &&
        ((path.length === 3 && V2_READS.includes(path[2]) && isGet) ||
          (path.length === 3 && V2_WRITES.includes(path[2]) && isPost) ||
          (path.length === 5 &&
            path[2] === "models" &&
            MODEL.test(path[3]) &&
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
    // Real 404s (unknown location/dataset/run/job) are forwarded intact —
    // they are answers, not a missing backend. Only unreachable upstream is 503.
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
