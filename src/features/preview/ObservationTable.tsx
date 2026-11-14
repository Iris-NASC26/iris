/** Adapted from Navida's DataPreviewView. No statistics, resampling or fill substitution. */
import type { components } from '../../contracts/generated';

export function ObservationTable({ series }: { series: components['schemas']['Series'] }) {
  return <div className="table-scroll" role="region" aria-label="Monthly observations" tabIndex={0}>
    <table><caption>Monthly observations · {series.variable_id} · {series.units}</caption>
      <thead><tr><th scope="col">Month</th><th scope="col">Value ({series.units})</th><th scope="col">Area coverage</th><th scope="col">Validity / reason</th></tr></thead>
      <tbody>{series.time.map((time, index) => <tr key={time}>
        <th scope="row">{time}</th><td>{series.value[index] ?? 'Missing'}</td>
        <td>{series.coverage[index] === null ? 'Unknown' : series.coverage[index]}</td>
        <td>{series.valid[index] ? 'Valid' : series.reason[index]?.replaceAll('_', ' ') ?? 'Invalid'}</td>
      </tr>)}</tbody></table><p className="small-label">Coverage is a fraction from 0 to 1. Missing values remain missing.</p>
  </div>;
}
