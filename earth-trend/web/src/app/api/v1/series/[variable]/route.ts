/** Narrow fixed-upstream proxy for native-cell series. No arbitrary URLs, credentials or cookies. */
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
  const lat = Number(query.get('lat')), lon = Number(query.get('lon'));
  if (!/^V(?:0[1-9]|1[0-3])$/.test(variable)) return problem(404, 'Variable IDs run from V01 to V13.', 'NOT_FOUND');
  if (!query.get('lat') || !query.get('lon') || !Number.isFinite(lat) || !Number.isFinite(lon) ||
    Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return problem(422, 'Check latitude (-90 to 90) and longitude (-180 to 180).', 'INVALID_PARAMETERS');
  }
  try {
    const upstream = await fetch(`http://127.0.0.1:8000/api/v1/series/${variable}?lat=${lat}&lon=${lon}`, {
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(90_000),
      headers: { Accept: 'application/json' },
    });
    const type = upstream.headers.get('content-type') ?? '';
    if (!type.includes('json')) throw new Error('Unexpected upstream content');
    return new NextResponse(await upstream.text(), { status: upstream.status, headers: { ...headers, 'Content-Type': type } });
  } catch {
    console.warn('Local FastAPI series request unavailable');
    return problem(503, 'The local backend is unavailable.', 'PROVIDER_UNAVAILABLE');
  }
}
