import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { Workspace } from '../../src/features/workspace/Workspace';
import { Overview } from '../../src/features/workspace/Overview';
import { Catalog } from '../../src/features/catalog/Catalog';
import { PreviewPage } from '../../src/features/preview/PreviewPage';
import { PreferencesProvider } from '../../src/state/preferences';
import type { ReactNode } from 'react';

function View({ children = <Overview /> }: { children?: ReactNode }) {
  return <PreferencesProvider><Workspace>{children}</Workspace></PreferencesProvider>;
}

const health = { schema_version: 'health.v1', status: 'ok', mode: 'local', analysis_ready: false };

beforeEach(() => {
  window.history.replaceState(null, '', '/');
  window.localStorage.clear();
});

it('shows loading, then liveness without implying scientific readiness', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(health))));
  render(<View />);
  expect(screen.getByRole('status')).toHaveTextContent('Connecting');
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Local server connected'));
  expect(screen.getByText(/Analysis unavailable/)).toBeVisible();
});

it('offers a focusable retry after a failed connection', async () => {
  const request = vi.fn().mockRejectedValueOnce(new TypeError('offline'))
    .mockResolvedValueOnce(new Response(JSON.stringify(health)));
  vi.stubGlobal('fetch', request);
  render(<View />);
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
  render(<View />);
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
  const view = render(<View><Catalog /></View>);
  const list = screen.getByRole('region', { name: 'Planned variables' });
  expect(within(list).getAllByRole('button')).toHaveLength(13);
  fireEvent.change(screen.getByRole('textbox', { name: 'Search variables' }), { target: { value: 'NDVI' } });
  fireEvent.click(within(list).getByRole('button', { name: /Vegetation greenness/ }));
  view.rerender(<View><Catalog /></View>);
  const flashcard = screen.getByRole('complementary', { name: 'Selected variable' });
  expect(within(flashcard).getByText(/MOD13A3.061/)).toBeVisible();
  expect(screen.getByRole('link', { name: 'Open data preview' })).toHaveAttribute('href', '/workspace/data-preview?variable=V13');
  view.rerender(<View><PreviewPage /></View>);
  expect(window.location.search).toBe('?variable=V13');
  expect(screen.getByRole('heading', { name: 'No observations loaded' })).toBeVisible();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  expect(screen.getByText('Not installed')).toBeVisible();
});

it('rejects unknown variable IDs and shows an explicit empty filter result', () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(health))));
  window.history.replaceState(null, '', '/workspace/data-selection?variable=not-approved');
  render(<View><Catalog /></View>);
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
  render(<View />);
  await screen.findByText('Local server connected');
  fireEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }));
  expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toBeVisible();
});
