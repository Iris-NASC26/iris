import { describe, expect, it, vi } from 'vitest';
import { fetchHealth } from '../../src/data/health';

describe('health response validation', () => {
  it.each([null, {}, { status: 'ok' }, { schema_version: 'health.v1', status: 'ok', mode: 'local', analysis_ready: true }])('rejects incompatible payload %j', async payload => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(payload))));
    await expect(fetchHealth(new AbortController().signal)).rejects.toThrow('incompatible');
  });

  it('rejects HTTP errors even when JSON looks valid', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 503 })));
    await expect(fetchHealth(new AbortController().signal)).rejects.toThrow('unavailable');
  });
});
