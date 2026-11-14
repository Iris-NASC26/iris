import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App';

const health = { schema_version: 'health.v1', status: 'ok', mode: 'local', analysis_ready: false };

beforeEach(() => {
  window.history.replaceState(null, '', '/');
  window.localStorage.clear();
});

it('shows loading, then liveness without implying scientific readiness', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(health))));
  render(<App />);
  expect(screen.getByRole('status')).toHaveTextContent('Connecting');
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Local server connected'));
  expect(screen.getByText(/Analysis unavailable/)).toBeVisible();
});

it('offers a focusable retry after a failed connection', async () => {
  const request = vi.fn().mockRejectedValueOnce(new TypeError('offline'))
    .mockResolvedValueOnce(new Response(JSON.stringify(health)));
  vi.stubGlobal('fetch', request);
  render(<App />);
  const retry = await screen.findByRole('button', { name: 'Retry connection' });
  retry.focus();
  expect(retry).toHaveFocus();
  retry.click();
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Local server connected'));
  expect(request).toHaveBeenCalledTimes(2);
});

it('changes actual explanation content and theme without requesting an analysis', async () => {
  const request = vi.fn().mockResolvedValue(new Response(JSON.stringify(health)));
  vi.stubGlobal('fetch', request);
  render(<App />);
  await screen.findByText('Local server connected');
  fireEvent.change(screen.getByRole('combobox', { name: 'Explanation level' }), { target: { value: 'scientist' } });
  expect(screen.getByText(/Inspect product identity, temporal support/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }));
  expect(document.documentElement.dataset.theme).toBe('light');
  expect(window.localStorage.getItem('earth-trend.theme')).toBe('light');
  expect(request).toHaveBeenCalledTimes(1);
  expect(request.mock.calls[0][0]).toBe('/api/v1/health');
});

it('filters planned variables and preserves the chosen variable into an empty preview', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(health))));
  window.history.replaceState(null, '', '/workspace/data-selection');
  render(<App />);
  const list = screen.getByRole('region', { name: 'Planned variables' });
  expect(within(list).getAllByRole('button')).toHaveLength(13);
  fireEvent.change(screen.getByRole('textbox', { name: 'Search variables' }), { target: { value: 'NDVI' } });
  fireEvent.click(within(list).getByRole('button', { name: /Vegetation greenness/ }));
  const flashcard = screen.getByRole('complementary', { name: 'Selected variable' });
  expect(within(flashcard).getByText(/MOD13A3.061/)).toBeVisible();
  fireEvent.click(screen.getByRole('link', { name: 'Open data preview' }));
  expect(window.location.search).toBe('?variable=V13');
  expect(screen.getByRole('heading', { name: 'No observations loaded' })).toBeVisible();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  expect(screen.getByText('Not installed')).toBeVisible();
});

it('rejects unknown variable IDs and shows an explicit empty filter result', () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(health))));
  window.history.replaceState(null, '', '/workspace/data-selection?variable=not-approved');
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Unknown variable' })).toBeVisible();
  fireEvent.change(screen.getByRole('textbox', { name: 'Search variables' }), { target: { value: 'no-such-variable' } });
  expect(screen.getByRole('heading', { name: 'No matching variables' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  expect(screen.getByRole('textbox', { name: 'Search variables' })).toHaveValue('');
});

it('works when view-preference storage is unavailable', async () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('storage unavailable'); });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('storage unavailable'); });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(health))));
  render(<App />);
  await screen.findByText('Local server connected');
  fireEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }));
  expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toBeVisible();
});
