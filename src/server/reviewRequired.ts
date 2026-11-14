import { NextResponse } from 'next/server';

/** Explicit availability gate for preserved, unadmitted prototype operations. */
export function reviewRequired() {
  return NextResponse.json({
    error: 'This prototype operation is awaiting integration and scientific/source review.',
    detail: 'Use Data Preview for real V01/V12 series and the Living Globe for raw fields.',
    code: 'INTEGRATION_REVIEW_REQUIRED',
  }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
}
