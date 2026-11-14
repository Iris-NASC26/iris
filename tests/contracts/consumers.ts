/** Compile-only consumers. Synthetic types/examples never enter product data. */
import type {
  AnalysisRequest, AnalysisResult, AvailableEstimate, Capabilities, ComparisonResult,
  DatasetBinding, Error as Problem, Estimate, Job, JobAccepted, LayerManifest,
  OutlookResult, RegionSpec, ScanResult, Series,
} from '../../src/contracts/generated';

export const syntheticRequest = {
  schema_version: '1.0', variable_id: 'V01', region: { kind: 'global' },
  window: { start: '2003-01', end: '2023-12' }, baseline: { kind: 'analysis_window' },
  alpha: 0.05, method_profile: 'srs-p0-v1', data_release_id: 'synthetic-release',
} satisfies AnalysisRequest;

export function describeRegion(region: RegionSpec): string {
  switch (region.kind) {
    case 'global': return 'Whole world';
    case 'cell': return `${region.grid_id}:${region.cell_id}`;
    case 'bbox': return region.bbox.join(',');
    case 'polygon': return `${region.geometry.type}:${region.interior}`;
    case 'preset': return `${region.preset_id}:${region.version}`;
  }
}

export function estimateLabel(estimate: Estimate): string {
  if (estimate.status === 'available') {
    const value: number = estimate.value;
    return `${value} ${estimate.units}`;
  }
  const absent: null = estimate.value;
  return `${absent}: ${estimate.reason}`;
}

export function resultLinks(analysis: AnalysisResult, scan: ScanResult, comparison: ComparisonResult) {
  return {
    analysis: analysis.result_id,
    rows: scan.rows.map(row => row.status === 'analysed' ? row.result_id : row.reason),
    difference: estimateLabel(comparison.difference),
    primary: analysis.primary_branch,
    fdrContext: analysis.fdr?.family_id ?? analysis.fdr_reason,
  };
}

export function jobStatus(job: Job | JobAccepted): string {
  switch (job.state) {
    case 'failed': return job.error.code;
    case 'succeeded': return job.result_ids.join(',');
    case 'cancelled': return job.remote_work;
    default: return job.status_url;
  }
}

export function outcome(outlook: OutlookResult): string {
  return outlook.forecast.status === 'available'
    ? outlook.forecast.quantiles.map(row => row.time).join(',')
    : outlook.forecast.reason;
}

export function metadata(series: Series, binding: DatasetBinding, layer: LayerManifest, capabilities: Capabilities, error: Problem) {
  return [series.units, binding.product_version, layer.fdr.family_kind, capabilities.mode, error.code];
}

// These diagnostics must remain errors. Widening a generated type makes tsc fail.
// @ts-expect-error Unknown region kind is not in the approved union.
export const badRegion: RegionSpec = { kind: 'circle' };
// @ts-expect-error Physical units must not silently admit Kelvin display values.
export const badUnit: AvailableEstimate['units'] = 'K';
// @ts-expect-error Available estimates cannot have missing values.
export const badNull: AvailableEstimate['value'] = null;
// @ts-expect-error Schema versions must remain explicit literals.
export const badVersion: AnalysisRequest['schema_version'] = '2.0';
// @ts-expect-error Unavailable estimates must retain null values.
export const contradictory: Extract<Estimate, { status: 'unavailable' | 'unbounded' }>['value'] = 1;
