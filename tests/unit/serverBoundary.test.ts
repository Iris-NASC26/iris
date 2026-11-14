import { afterEach, describe, expect, it, vi } from 'vitest';
import { localRequestAllowed } from '../../src/server/localBoundary';
import { GET } from '../../src/app/api/v1/health/route';

afterEach(() => { vi.unstubAllGlobals(); });

describe('local Next.js boundary', () => {
  it('accepts only the declared loopback hosts and browser origins', () => {
    expect(localRequestAllowed(new Headers({ host: '127.0.0.1:5173' }))).toBe(true);
    expect(localRequestAllowed(new Headers({ host: 'localhost:5173', origin: 'http://localhost:5173' }))).toBe(true);
    const rejected: Record<string, string>[] = [
      {}, { host: 'attacker.test:5173' }, { host: '127.0.0.1.attacker.test:5173' },
      { host: '127.0.0.1:5173', origin: 'https://attacker.test' },
      { host: '127.0.0.1:5173', origin: 'null' },
    ];
    for (const headers of rejected) expect(localRequestAllowed(new Headers(headers))).toBe(false);
  });

  it('forwards health only to the fixed backend, with no user credentials or cache', async () => {
    const health = { schema_version: 'health.v1', status: 'ok', mode: 'local', analysis_ready: false };
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify(health), { headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', request);
    const response = await GET();
    expect(await response.json()).toEqual(health);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(request.mock.calls[0][0]).toBe('http://127.0.0.1:8000/api/v1/health');
    expect(request.mock.calls[0][1]).toMatchObject({ cache: 'no-store', redirect: 'error', headers: { Accept: 'application/json' } });
    expect(Object.keys(request.mock.calls[0][1].headers)).toEqual(['Accept']);
  });

  it('returns an unavailable response for upstream errors or HTML, with no fabricated health', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    for (const upstream of [new Response('unavailable', { status: 503 }), new Response('<html>login</html>', { headers: { 'Content-Type': 'text/html' } })]) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(upstream));
      const response = await GET();
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ detail: 'Local backend unavailable' });
    }
  });
});
