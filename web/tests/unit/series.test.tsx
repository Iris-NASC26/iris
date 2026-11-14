import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SeriesResult } from '../../src/data/series';
import { fetchSeries, parseSeriesResult } from '../../src/data/series';
import { findPlannedVariable } from '../../src/features/catalog/plannedCatalog';
import { extent, niceTicks, tickDecimals, validRuns } from '../../src/features/preview/chartMath';
import { SeriesView } from '../../src/features/preview/SeriesView';

/** TEST-ONLY response shaped like the endpoint's; the application never bundles it. */
function response(overrides: Partial<SeriesResult['series']> = {}): SeriesResult {
  const value = [24.38, 25.38, null, 27.63, 26.1, 25.9];
  const series = {
    schema_version: '1.0', series_id: 'retrieved:V01:7:80', variable_id: 'V01', binding_id: 'unadmitted-power-T2M',
    branch_id: 'raw_monthly', frequency: 'monthly', time: ['2000-01', '2000-02', '2000-03', '2000-04', '2000-05', '2000-06'], value,
    coverage: value.map(v => (v === null ? null : 1)), valid: value.map(v => v !== null),
    reason: value.map(v => (v === null ? 'missing_observation' : null)), units: '°C',
    transform: { transform_id: 'identity-power', version: '1', kind: 'identity', input_units: 'C', output_units: '°C', scale: 1, offset: 0, order: ['decode_fill'] },
    grid_id: 'power-native-0.5x0.625', provenance_id: 'retrieval:abc', ...overrides,
  } as SeriesResult['series'];
  return {
    schema_version: '1.0', series,
    location: { requested_lat: 6.93, requested_lon: 79.85, cell_lat: 7, cell_lon: 80, cell_lat_step: 0.5, cell_lon_step: 0.625, selection: 'nearest_native_cell' },
    source: {
      variable_id: 'V01', store_title: 'Test store', store_version: 'TEST', field: 'T2M', source_units: 'C', units: '°C', time_standard: 'UTC',
      data_kind: 'model', first_month: '2000-01', last_finite_month: '2000-06', declared_end: '2029-12-31T00:00:00', missing_months: 1,
      retrieved_at: '2026-11-14T10:00:00Z', served_from_cache: false, stale_cache: false, artifact_sha256: { 'T2M/0.1.1': 'a'.repeat(64) },
      acknowledgement: 'Test acknowledgement', caveats: ['Value of the nearest native grid cell, not an area-weighted regional mean.'], scientifically_validated: false,
    },
  } as SeriesResult;
}
const ok = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const v01 = findPlannedVariable('V01')!;

describe('chart helpers', () => {
  it('breaks runs at every gap and keeps isolated months', () => {
    expect(validRuns([true, true, false, true, false, false, true, true])).toEqual([{ start: 0, end: 1 }, { start: 3, end: 3 }, { start: 6, end: 7 }]);
    expect(validRuns([false, false])).toEqual([]);
  });
  it('finds extremes ignoring missing values, including negative and zero', () => {
    expect(extent([null, 0, -2, null, 3])).toMatchObject({ min: -2, max: 3, minIndex: 2, maxIndex: 4 });
    expect(extent([null])).toBeNull();
  });
  it('produces round ticks that cover the data', () => {
    const ticks = niceTicks(23.9, 28.2);
    expect(ticks[0]).toBeGreaterThanOrEqual(23.9);
    expect(ticks.at(-1)).toBeLessThanOrEqual(28.2);
    expect(tickDecimals(niceTicks(0.01, 0.05))).toBeGreaterThanOrEqual(2);
    expect(niceTicks(5, 5)).toEqual([5]);
  });
});

describe('series wire validation', () => {
  it.each([null, {}, { ...response(), schema_version: '2' }, { ...response(), source: { ...response().source, scientifically_validated: true } },
    response({ valid: [true, true, true, true, true, true] }), response({ coverage: [1] })])('rejects an incompatible payload', payload => {
    expect(() => parseSeriesResult(payload)).toThrow('incompatible');
  });
  it('turns a problem response into a readable error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({ detail: 'The store could not be reached.', retryable: true }, 503)));
    await expect(fetchSeries('V01', 1, 1, new AbortController().signal)).rejects.toMatchObject({ message: 'The store could not be reached.', retryable: true });
  });
});

describe('SeriesView', () => {
  it('shows a real-data series whose chart, readout and table agree and never bridges a gap', async () => {
    const request = vi.fn().mockResolvedValue(ok(response()));
    vi.stubGlobal('fetch', request);
    render(<SeriesView variable={v01} />);
    expect(screen.getByText(/Reading NASA POWER/)).toBeVisible();
    const chart = await screen.findByRole('img', { name: /Air temperature near the ground, monthly/ });
    expect(request).toHaveBeenCalledWith('/api/v1/series/V01?lat=6.93&lon=79.85', expect.anything());
    expect(chart).toHaveAttribute('data-points', '5');
    expect(chart).toHaveAttribute('data-gaps', '1');
    expect(chart.querySelectorAll('polyline')).toHaveLength(2);
    expect(chart.querySelectorAll('.gap-mark')).toHaveLength(1);
    expect(screen.getByText(/not validated/)).toBeVisible();
    expect(screen.getByText(/one grid cell, not a regional mean/)).toBeVisible();
    expect(screen.getByText(/Trend, confidence intervals, significance and Outlook are unavailable/)).toBeVisible();
    const slider = screen.getByRole('slider', { name: 'Inspect month' });
    const table = screen.getByRole('table', { name: /Monthly observations/ });
    const rows = within(table).getAllByRole('row').slice(1);
    for (const [index, row] of rows.entries()) {
      fireEvent.change(slider, { target: { value: String(index) } });
      const cells = within(row).getAllByRole('cell');
      const readout = screen.getByText(new RegExp(`^2000-0${index + 1} ·`));
      if (index === 2) {
        expect(readout).toHaveTextContent('Missing (missing observation)');
        expect(cells[0]).toHaveTextContent('Missing');
      } else expect(readout).toHaveTextContent(`${cells[0].textContent} °C`);
    }
    expect(within(table).getAllByRole('row')).toHaveLength(7);
    expect(screen.getByText('Lowest').nextSibling).toHaveTextContent('24.38 °C · 2000-01');
    expect(screen.getByText('Highest').nextSibling).toHaveTextContent('27.63 °C · 2000-04');
  });

  it('reports problems with a retry and ignores out-of-range coordinates before any request', async () => {
    const request = vi.fn().mockResolvedValueOnce(ok({ detail: 'The store could not be reached.', retryable: true }, 503)).mockResolvedValueOnce(ok(response()));
    vi.stubGlobal('fetch', request);
    render(<SeriesView variable={v01} />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('The store could not be reached.');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await screen.findByRole('img', { name: /monthly/ });
    fireEvent.change(screen.getByRole('textbox', { name: 'Latitude' }), { target: { value: '95' } });
    fireEvent.click(screen.getByRole('button', { name: 'Load series' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a latitude');
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('keeps only the latest response when the place changes quickly', async () => {
    let release: (value: Response) => void = () => undefined;
    const first = new Promise<Response>(resolve => { release = resolve; });
    const base = response();
    const second = { ...base, location: { ...base.location, cell_lat: -3 } } as SeriesResult;
    const request = vi.fn().mockReturnValueOnce(first).mockResolvedValueOnce(ok(second));
    vi.stubGlobal('fetch', request);
    render(<SeriesView variable={v01} />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Example place' }), { target: { value: '1' } });
    await screen.findByText(/native cell centred at -3°/);
    release(ok(response()));
    await waitFor(() => expect(screen.getByText(/native cell centred at -3°/)).toBeVisible());
    expect(screen.queryByText(/native cell centred at 7°/)).not.toBeInTheDocument();
  });
});
