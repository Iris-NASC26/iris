/** Narrow fixed-upstream proxy for regional mean series. No arbitrary URLs or credentials. */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'no-store' };
const problem = (status: number, detail: string, code: string) => NextResponse.json({
  schema_version: '1.0', type: 'about:blank', title: 'Request rejected', status, detail, code,
  request_id: 'req-proxy', retryable: false, retry_after_seconds: null, field_errors: [],
}, { status, headers: { ...headers, 'Content-Type': 'application/problem+json' } });

export async function GET(request: Request, { params }: { params: Promise<{ variable: string }> }) {
  const { variable } = await params;
  const query = new URL(request.url).searchParams;
  const latMin = Number(query.get('lat_min')), latMax = Number(query.get('lat_max'));
  const lonMin = Number(query.get('lon_min')), lonMax = Number(query.get('lon_max'));
  if (!/^V(?:0[1-9]|1[0-3])$/.test(variable)) return problem(404, 'Variable IDs run from V01 to V13.', 'NOT_FOUND');
  if (![latMin, latMax, lonMin, lonMax].every(Number.isFinite) ||
    Math.abs(latMin) > 90 || Math.abs(latMax) > 90 || Math.abs(lonMin) > 180 || Math.abs(lonMax) > 180 ||
    latMin >= latMax || lonMin >= lonMax) {
    return problem(422, 'Check latitude (-90 to 90) and longitude (-180 to 180); min must be below max.', 'INVALID_PARAMETERS');
  }
  const target = `/api/v1/regional-series/${variable}?lat_min=${latMin}&lat_max=${latMax}&lon_min=${lonMin}&lon_max=${lonMax}`;
  try {
    const upstream = await fetch(`http://127.0.0.1:8000${target}`, {
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(90_000),
      headers: { Accept: 'application/json' },
    });
    const type = upstream.headers.get('content-type') ?? '';
    if (!type.includes('json')) throw new Error('Unexpected upstream content');
    return new NextResponse(await upstream.text(), { status: upstream.status, headers: { ...headers, 'Content-Type': type } });
  } catch {
    console.warn('Local FastAPI regional series request unavailable');
    return problem(503, 'The local backend is unavailable.', 'PROVIDER_UNAVAILABLE');
  }
}
