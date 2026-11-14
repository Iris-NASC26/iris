import { NextResponse } from "next/server";

const FASTAPI_BASE = process.env.FASTAPI_URL || "http://127.0.0.1:8000";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("product_id") || "";
  const sourceApi = searchParams.get("source_api") || "";
  const variableId = searchParams.get("variable_id") || "";

  if (!productId) {
    return NextResponse.json({ error: "product_id is required" }, { status: 400 });
  }

  try {
    const qs = new URLSearchParams({
      product_id: productId,
      ...(sourceApi ? { source_api: sourceApi } : {}),
      ...(variableId ? { variable_id: variableId } : {}),
    });
    const upstream = await fetch(`${FASTAPI_BASE}/api/v1/catalog/product-details?${qs.toString()}`, {
      signal: AbortSignal.timeout(25000),
    });
    const data = await upstream.json();
    if (!upstream.ok) {
      return NextResponse.json(
        { error: data?.detail || "Product details lookup failed" },
        { status: upstream.status },
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to reach backend for live product details", detail: String(error) },
      { status: 502 },
    );
  }
}
