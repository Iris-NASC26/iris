import type { PointSeriesResult } from '../contracts/generated';

export type SeriesResult = PointSeriesResult;
export const connectedVariables = ['V01', 'V12'] as const;
export const isConnected = (id: string | undefined): boolean => connectedVariables.includes(id as never);

export class SeriesError extends Error {
  constructor(message: string, readonly retryable: boolean) { super(message); }
}

/** Runtime wire check: generated types describe the contract but do not validate a response. */
export function parseSeriesResult(value: unknown): SeriesResult {
  const result = value as SeriesResult | null;
  const series = result?.series;
  const n = series?.time?.length;
  if (!result || result.schema_version !== '1.0' || !series || !n || series.frequency !== 'monthly' ||
    [series.value, series.coverage, series.valid, series.reason].some(array => !Array.isArray(array) || array.length !== n) ||
    result.source?.scientifically_validated !== false || typeof series.units !== 'string' ||
    series.valid.some((ok, i) => ok !== (series.value[i] !== null))) {
    throw new SeriesError('The local server returned an incompatible series.', false);
  }
  return result;
}

export async function fetchSeries(variable: string, lat: number, lon: number, signal: AbortSignal): Promise<SeriesResult> {
  const response = await fetch(`/api/v1/series/${variable}?lat=${lat}&lon=${lon}`, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(100_000)]), cache: 'no-store', credentials: 'omit',
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const problem = body as { detail?: unknown; retryable?: unknown } | null;
    throw new SeriesError(typeof problem?.detail === 'string' ? problem.detail : 'The series could not be loaded.', problem?.retryable === true);
  }
  return parseSeriesResult(body);
}
