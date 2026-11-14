import { render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { App } from '../../src/app/App';

const health = { schema_version: 'health.v1', status: 'ok', mode: 'local', analysis_ready: false };

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
