/** Narrow fixed-upstream proxy. No provider access, secret loading or arbitrary URLs. */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const response = await fetch('http://127.0.0.1:8000/api/v1/health', {
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(5000),
      headers: { Accept: 'application/json' },
    });
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
      throw new Error('Upstream health unavailable');
    }
    return NextResponse.json(await response.json(), { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    console.warn('Local FastAPI health check unavailable');
    return NextResponse.json({ detail: 'Local backend unavailable' }, {
      status: 503, headers: { 'Cache-Control': 'no-store' },
    });
  }
}
