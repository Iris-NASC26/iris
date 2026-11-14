import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { plannedCatalog } from '../../src/features/catalog/plannedCatalog';
import { AssistantPage } from '../../src/features/discovery/AssistantPage';
import { extractKeywords, interpretTopic, suggest } from '../../src/features/discovery/discovery';

const approved = new Set(plannedCatalog.map(item => item.id));

it.each([
  ['Why might rainfall and soil moisture change in a rain forest?', ['V02', 'V04']],
  ['Is the air above a large city getting more polluted? Think of pollution and smog', ['V09', 'V10']],
  ['What changes in a desert over time?', ['V13', 'V01']],
  ['How is the ocean along a tidal estuary changing?', ['V11', 'V06']],
])('gives at least three approved, relevant suggestions for "%s"', (question, expected) => {
  const found = suggest(interpretTopic(question).keywords);
  expect(found.length).toBeGreaterThanOrEqual(3);
  expect(found.every(item => approved.has(item.variable.id) && item.matched.length > 0)).toBe(true);
  for (const id of expected) expect(found.map(item => item.variable.id)).toContain(id);
});

it('prefers the longest term and never overlaps matches', () => {
  expect(extractKeywords('Rain forest and rainfall')).toEqual(['rain forest', 'rainfall']);
});

it('records the place and period without inventing a suggestion', () => {
  const intent = interpretTopic('Monthly precipitation in Sri Lanka from 2005 to 2020');
  expect(intent.place).toBe('Sri Lanka');
  expect(intent.years).toEqual({ start: 2005, end: 2020 });
  expect(suggest(['quantum entanglement'])).toEqual([]);
  expect(interpretTopic('hello there').keywords).toEqual([]);
});

it('requires confirmation before suggesting, makes no request and lets terms be edited', () => {
  const request = vi.fn();
  vi.stubGlobal('fetch', request);
  render(<AssistantPage />);
  fireEvent.change(screen.getByRole('textbox', { name: 'Describe a research topic' }), { target: { value: 'Snow and glacier melt in Nepal' } });
  fireEvent.click(screen.getByRole('button', { name: /Send/ }));
  const review = screen.getByRole('region', { name: 'Review search terms' });
  expect(screen.queryByRole('region', { name: 'Suggested variables' })).not.toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Describe a research topic' })).toBeDisabled();
  fireEvent.click(within(review).getByRole('button', { name: 'Remove glacier' }));
  fireEvent.change(within(review).getByRole('textbox', { name: 'Add a search term' }), { target: { value: 'Runoff' } });
  fireEvent.click(within(review).getByRole('button', { name: 'Add' }));
  expect(within(review).getByText('runoff')).toBeVisible();
  fireEvent.click(within(review).getByRole('button', { name: /Confirm and search/ }));
  const results = screen.getByRole('region', { name: 'Suggested variables' });
  expect(within(results).getByRole('link', { name: /Inspect V07/ })).toHaveAttribute('href', '/workspace/data-selection?variable=V07');
  expect(screen.getByText(/no data have been searched or loaded/)).toBeVisible();
  expect(request).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'New topic' }));
  expect(screen.getByRole('textbox', { name: 'Describe a research topic' })).toBeEnabled();
});

it('says so honestly when nothing matches', () => {
  render(<AssistantPage />);
  fireEvent.change(screen.getByRole('textbox', { name: 'Describe a research topic' }), { target: { value: 'Tell me a joke' } });
  fireEvent.click(screen.getByRole('button', { name: /Send/ }));
  expect(screen.getByText(/could not match that to the approved variables/)).toBeVisible();
  expect(screen.getByRole('button', { name: /Confirm and search/ })).toBeDisabled();
});
