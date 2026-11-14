import type { FieldResult } from '../contracts/generated';

export class FieldError extends Error {
  constructor(message: string, readonly retryable: boolean) { super(message); }
}

/** Runtime wire check: generated types describe the contract but do not validate a response. */
export function parseFieldResult(value: unknown): FieldResult {
  const result = value as FieldResult | null;
  const cells = result?.cell_lats?.length ?? 0;
  const cols = result?.cell_lons?.length ?? 0;
  if (!result || result.schema_version !== '1.0' || !/^\d{4}-\d{2}$/.test(result.month ?? '') ||
    !cells || !cols || !Array.isArray(result.values) || result.values.length !== cells * cols ||
    result.box?.selection !== 'native_cells_in_box' ||
    result.source?.scientifically_validated !== false || typeof result.source?.units !== 'string') {
    throw new FieldError('The local server returned an incompatible field.', false);
  }
  return result;
}

export interface FieldRequest { month: string; latMin: number; latMax: number; lonMin: number; lonMax: number }

export async function fetchField(variable: string, box: FieldRequest, signal: AbortSignal): Promise<FieldResult> {
  const params = `month=${box.month}&lat_min=${box.latMin}&lat_max=${box.latMax}&lon_min=${box.lonMin}&lon_max=${box.lonMax}`;
  const response = await fetch(`/api/v1/field/${variable}?${params}`, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(100_000)]), cache: 'no-store', credentials: 'omit',
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const problem = body as { detail?: unknown; retryable?: unknown } | null;
    throw new FieldError(typeof problem?.detail === 'string' ? problem.detail : 'The field could not be loaded.', problem?.retryable === true);
  }
  return parseFieldResult(body);
}
