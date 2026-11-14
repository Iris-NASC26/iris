'use client';

/** Gap-preserving monthly series chart. Every plotted value comes from the same Series as the table. */
import { useId, useState, type PointerEvent } from 'react';
import type { components } from '../../contracts/generated';
import { extent, niceTicks, tickDecimals, validRuns } from './chartMath';

type Series = components['schemas']['Series'];
const W = 900, H = 330, M = { top: 18, right: 22, bottom: 42, left: 62 };

export function TimeSeriesChart({ series, label }: { series: Series; label: string }) {
  const sliderId = useId();
  const [index, setIndex] = useState(series.time.length - 1);
  const n = series.time.length;
  const range = extent(series.value);
  const pad = range ? Math.max((range.max - range.min) * 0.06, 1e-6) : 1;
  const low = range ? range.min - pad : 0, high = range ? range.max + pad : 1;
  const ticks = niceTicks(low, high);
  const decimals = tickDecimals(ticks);
  const x = (i: number) => M.left + (n === 1 ? 0.5 : i / (n - 1)) * (W - M.left - M.right);
  const y = (v: number) => H - M.bottom - ((v - low) / (high - low)) * (H - M.top - M.bottom);
  const runs = validRuns(series.valid);
  const gaps = series.valid.filter(ok => !ok).length;
  const yearTicks = series.time.flatMap((time, i) => (time.endsWith('-01') && Number(time.slice(0, 4)) % 5 === 0 ? [{ i, text: time.slice(0, 4) }] : []));
  const selectedValue = series.value[index];
  const choose = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const fraction = ((event.clientX - box.left) / box.width * W - M.left) / (W - M.left - M.right);
    setIndex(Math.min(n - 1, Math.max(0, Math.round(fraction * (n - 1)))));
  };

  return <figure className="series-chart">
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${sliderId}-t ${sliderId}-d`} onPointerMove={choose} onPointerDown={choose}
      data-points={series.valid.filter(Boolean).length} data-gaps={gaps}>
      <title id={`${sliderId}-t`}>{label}</title>
      <desc id={`${sliderId}-d`}>{`Monthly values from ${series.time[0]} to ${series.time[n - 1]} in ${series.units}. ${gaps} missing months are shown as breaks, not interpolated. The same values are in the table below.`}</desc>
      {ticks.map(tick => <g key={tick}><line className="grid" x1={M.left} x2={W - M.right} y1={y(tick)} y2={y(tick)} />
        <text className="tick" x={M.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle">{tick.toFixed(decimals)}</text></g>)}
      {yearTicks.map(tick => <g key={tick.text}><line className="grid" x1={x(tick.i)} x2={x(tick.i)} y1={H - M.bottom} y2={H - M.bottom + 5} />
        <text className="tick" x={x(tick.i)} y={H - M.bottom + 19} textAnchor="middle">{tick.text}</text></g>)}
      <text className="axis-label" transform={`translate(15 ${(H - M.bottom + M.top) / 2}) rotate(-90)`} textAnchor="middle">{series.units}</text>
      {series.valid.map((ok, i) => !ok && <line className="gap-mark" key={i} x1={x(i)} x2={x(i)} y1={M.top} y2={H - M.bottom} />)}
      {runs.map(run => run.start === run.end
        ? <circle className="point" key={run.start} cx={x(run.start)} cy={y(series.value[run.start] as number)} r={2.6} />
        : <polyline className="line" key={run.start} fill="none" points={series.value.slice(run.start, run.end + 1).map((v, k) => `${x(run.start + k).toFixed(2)},${y(v as number).toFixed(2)}`).join(' ')} />)}
      <line className="cursor" x1={x(index)} x2={x(index)} y1={M.top} y2={H - M.bottom} />
      {selectedValue !== null && <circle className="point selected" cx={x(index)} cy={y(selectedValue)} r={4.5} />}
    </svg>
    <figcaption>
      <label htmlFor={sliderId}>Inspect month</label>
      <input id={sliderId} type="range" min={0} max={n - 1} value={index} onChange={event => setIndex(Number(event.target.value))}
        aria-valuetext={`${series.time[index]}: ${selectedValue === null ? 'missing' : `${selectedValue} ${series.units}`}`} />
      <p className="series-readout" aria-live="polite">{series.time[index]} · {selectedValue === null
        ? `Missing (${series.reason[index]?.replaceAll('_', ' ') ?? 'no observation'})` : `${selectedValue} ${series.units}`}</p>
    </figcaption>
  </figure>;
}
