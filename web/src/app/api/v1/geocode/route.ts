/** Narrow fixed-upstream proxy for the place geocoder. No arbitrary URLs or credentials. */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'no-store' };
const problem = (status: number, detail: string, code: string) => NextResponse.json({
  schema_version: '1.0', type: 'about:blank', title: 'Request rejected', status, detail, code,
  request_id: 'req-proxy', retryable: false, retry_after_seconds: null, field_errors: [],
}, { status, headers: { ...headers, 'Content-Type': 'application/problem+json' } });

export async function GET(request: Request) {
  const name = new URL(request.url).searchParams.get('name')?.trim() ?? '';
  if (!name || name.length > 100) {
    return problem(422, 'Enter a place name of up to 100 characters.', 'INVALID_PARAMETERS');
  }
  try {
    const upstream = await fetch(`http://127.0.0.1:8000/api/v1/geocode?name=${encodeURIComponent(name)}`, {
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(30_000),
      headers: { Accept: 'application/json' },
    });
    const type = upstream.headers.get('content-type') ?? '';
    if (!type.includes('json')) throw new Error('Unexpected upstream content');
    return new NextResponse(await upstream.text(), { status: upstream.status, headers: { ...headers, 'Content-Type': type } });
  } catch {
    console.warn('Local FastAPI geocode request unavailable');
    return problem(503, 'The local backend is unavailable.', 'PROVIDER_UNAVAILABLE');
  }
}
