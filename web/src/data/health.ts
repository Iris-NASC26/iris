import type { HealthResponse } from '../contracts/generated';

/** The existing health wire shape, now sourced from Python alongside F03 types. */
export type Health = HealthResponse;

export async function fetchHealth(signal: AbortSignal): Promise<Health> {
  const response = await fetch('/api/v1/health', {
    signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]),
    cache: 'no-store',
    credentials: 'omit',
  });
  if (!response.ok) throw new Error('The local server is unavailable.');
  const value: unknown = await response.json();
  if (
    typeof value !== 'object' || value === null ||
    !('schema_version' in value) || value.schema_version !== 'health.v1' ||
    !('status' in value) || value.status !== 'ok' ||
    !('mode' in value) || value.mode !== 'local' ||
    !('analysis_ready' in value) || value.analysis_ready !== false
  ) throw new Error('The local server returned an incompatible health response.');
  return value as Health;
}
