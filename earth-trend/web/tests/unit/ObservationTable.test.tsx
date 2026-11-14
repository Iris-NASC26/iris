import { render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import type { components } from '../../src/contracts/generated';
import { ObservationTable } from '../../src/features/preview/ObservationTable';
// TEST ONLY: the F03 invented contract example never enters the application bundle.
import fixture from '../../../backend/tests/contracts/fixtures/valid/series-with-missing-month.json';

it('preserves missing months, real zeros and coverage fractions in the typed preview table', () => {
  render(<ObservationTable series={fixture.payload as components['schemas']['Series']} />);
  const rows = screen.getAllByRole('row');
  expect(rows).toHaveLength(4);
  expect(within(rows[2]).getByText('Missing')).toBeVisible();
  expect(within(rows[2]).getByText('Unknown')).toBeVisible();
  expect(within(rows[3]).getByText('0', { exact: true })).toBeVisible();
  expect(within(rows[3]).getByText('0.8')).toBeVisible();
  expect(screen.getByRole('table')).toHaveAccessibleName(/V01 · °C/);
});
