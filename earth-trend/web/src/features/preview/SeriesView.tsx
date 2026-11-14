'use client';

/** Real native-cell monthly series for connected sources. Display only: no statistics are computed. */
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { fetchSeries, type SeriesResult } from '../../data/series';
import { Icon } from '../../components/ui/Icon';
import type { PlannedVariable } from '../catalog/plannedCatalog';
import { extent } from './chartMath';
import { ObservationTable } from './ObservationTable';
import { TimeSeriesChart } from './TimeSeriesChart';

const places = [
  { name: 'Colombo, Sri Lanka', lat: 6.93, lon: 79.85 },
  { name: 'Manaus, Brazil (rain forest)', lat: -3.12, lon: -60.02 },
  { name: 'Tamanrasset, Algeria (desert)', lat: 22.79, lon: 5.53 },
  { name: 'Los Angeles, USA (large city)', lat: 34.05, lon: -118.24 },
  { name: 'Kathmandu, Nepal', lat: 27.72, lon: 85.32 },
] as const;

type State = { kind: 'loading' } | { kind: 'error'; message: string; retryable: boolean } | { kind: 'ready'; result: SeriesResult };

export function SeriesView({ variable }: { variable: PlannedVariable }) {
  const [place, setPlace] = useState(0);
  const [lat, setLat] = useState(String(places[0].lat));
  const [lon, setLon] = useState(String(places[0].lon));
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [formError, setFormError] = useState('');
  const controller = useRef<AbortController | null>(null);

  const load = useCallback(async (latitude: number, longitude: number) => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setState({ kind: 'loading' });
    try {
      const result = await fetchSeries(variable.id, latitude, longitude, current.signal);
      if (!current.signal.aborted) setState({ kind: 'ready', result });
    } catch (error) {
      if (current.signal.aborted) return;
      const retryable = typeof error === 'object' && error !== null && 'retryable' in error && error.retryable === true;
      setState({ kind: 'error', message: error instanceof Error ? error.message : 'The series could not be loaded.', retryable });
    }
  }, [variable.id]);

  useEffect(() => { void load(places[0].lat, places[0].lon); return () => controller.current?.abort(); }, [load]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const latitude = Number(lat), longitude = Number(lon);
    if (lat.trim() === '' || lon.trim() === '' || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      return setFormError('Enter a latitude from -90 to 90 and a longitude from -180 to 180.');
    }
    setFormError('');
    void load(latitude, longitude);
  }
  function choose(index: number) {
    setPlace(index); setLat(String(places[index].lat)); setLon(String(places[index].lon)); setFormError('');
    void load(places[index].lat, places[index].lon);
  }

  const ready = state.kind === 'ready' ? state.result : null;
  const series = ready?.series;
  const range = series ? extent(series.value) : null;
  return <section className="series-view" aria-label={`${variable.name} series`}>
    <form className="series-form" onSubmit={submit}>
      <label>Example place<select value={place} onChange={event => choose(Number(event.target.value))}>
        {places.map((item, index) => <option key={item.name} value={index}>{item.name}</option>)}</select></label>
      <label>Latitude<input inputMode="decimal" value={lat} onChange={event => setLat(event.target.value)} aria-invalid={Boolean(formError)} /></label>
      <label>Longitude<input inputMode="decimal" value={lon} onChange={event => setLon(event.target.value)} aria-invalid={Boolean(formError)} /></label>
      <button className="primary-button" type="submit" disabled={state.kind === 'loading'}>Load series</button>
    </form>
    {formError && <p className="si-error" role="alert">{formError}</p>}
    {state.kind === 'loading' && <p className="series-status" aria-live="polite">Reading NASA POWER for this location. The first request can take about 15 seconds…</p>}
    {state.kind === 'error' && <div className="series-status error" role="alert"><Icon name="alert" size={18} /><span>{state.message}</span>
      {state.retryable && <button className="secondary-button" type="button" onClick={() => void load(Number(lat), Number(lon))}>Retry</button>}</div>}
    {ready && series && range && <>
      <div className="series-meta">
        <span className="availability-badge">Real NASA POWER data · {ready.source.data_kind === 'model' ? 'model output' : 'observations'} · not validated</span>
        <p>{variable.name} · {series.units} · {series.time[0]} to {series.time[series.time.length - 1]} · {ready.source.time_standard === 'UTC' ? 'UTC months' : 'local solar time months'}</p>
        <p>Requested {ready.location.requested_lat}°, {ready.location.requested_lon}° → native cell centred at {ready.location.cell_lat}°, {ready.location.cell_lon}° ({ready.location.cell_lat_step}° × {ready.location.cell_lon_step}°). This is one grid cell, not a regional mean.</p>
      </div>
      <dl className="series-summary" aria-label="Series summary">
        <div><dt>Months</dt><dd>{series.time.length}</dd></div>
        <div><dt>Missing</dt><dd>{ready.source.missing_months}</dd></div>
        <div><dt>Lowest</dt><dd>{range.min} {series.units} · {series.time[range.minIndex]}</dd></div>
        <div><dt>Highest</dt><dd>{range.max} {series.units} · {series.time[range.maxIndex]}</dd></div>
      </dl>
      <TimeSeriesChart series={series} label={`${variable.name}, monthly, ${series.units}`} />
      <div className="caution-note"><Icon name="info" size={17} /><p>Trend, confidence intervals, significance and Outlook are unavailable until the validated statistical methods are connected. Nothing here estimates a change.</p></div>
      <details className="series-details"><summary>Source, caveats and integrity</summary>
        <p>{ready.source.store_title} · {ready.source.store_version} · field <code>{ready.source.field}</code> ({ready.source.source_units} → {ready.source.units}, identity). Retrieved {ready.source.retrieved_at}{ready.source.served_from_cache ? ' from the verified local cache' : ''}{ready.source.stale_cache ? ' (the provider was unreachable; this copy may be out of date)' : ''}. The store declares coverage to {ready.source.declared_end.slice(0, 10)}; only months with finite values are shown.</p>
        <ul>{ready.source.caveats.map(text => <li key={text}>{text}</li>)}</ul>
        <p className="small-label">{ready.source.acknowledgement}</p>
        <table className="hash-table"><caption>SHA-256 of each source object read</caption><tbody>{Object.entries(ready.source.artifact_sha256).map(([name, hash]) =>
          <tr key={name}><th scope="row">{name}</th><td><code>{hash}</code></td></tr>)}</tbody></table>
      </details>
      <details className="series-details"><summary>Show all {series.time.length} monthly values (table)</summary><ObservationTable series={series} /></details>
    </>}
  </section>;
}
