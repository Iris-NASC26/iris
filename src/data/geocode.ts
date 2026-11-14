import type { GeocodeResult } from '../contracts/generated';

export class GeocodeError extends Error {
  constructor(message: string, readonly retryable: boolean) { super(message); }
}

/** Runtime wire check: the generated type describes the contract but does not validate a response. */
export function parseGeocodeResult(value: unknown): GeocodeResult {
  const result = value as GeocodeResult | null;
  if (!result || result.schema_version !== '1.0' || typeof result.query !== 'string' ||
    !Array.isArray(result.candidates) || result.source?.scientifically_validated !== false ||
    result.source?.provider !== 'open-meteo-geocoding' ||
    result.candidates.some(c => typeof c?.name !== 'string' || !c.name ||
      typeof c.lat !== 'number' || typeof c.lon !== 'number' ||
      Math.abs(c.lat) > 90 || Math.abs(c.lon) > 180)) {
    throw new GeocodeError('The local server returned an incompatible place lookup.', false);
  }
  return result;
}

export async function geocodePlace(name: string, signal: AbortSignal): Promise<GeocodeResult> {
  const response = await fetch(`/api/v1/geocode?name=${encodeURIComponent(name)}`, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(35_000)]), cache: 'no-store', credentials: 'omit',
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const problem = body as { detail?: unknown; retryable?: unknown } | null;
    throw new GeocodeError(typeof problem?.detail === 'string' ? problem.detail : 'The place lookup failed.', problem?.retryable === true);
  }
  return parseGeocodeResult(body);
}
