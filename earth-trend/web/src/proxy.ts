import { NextResponse, type NextRequest } from 'next/server';
import { localRequestAllowed } from './server/localBoundary';

export function proxy(request: NextRequest) {
  if (!localRequestAllowed(request.headers)) {
    return NextResponse.json({ detail: 'Local request required' }, { status: 403 });
  }
  return NextResponse.next();
}

export const config = { matcher: '/:path*' };
