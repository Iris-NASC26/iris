"use client";

import { ConnectionStatus } from '@/features/workspace/ConnectionStatus';
import { usePreferences, type ExplanationLevel } from '@/state/preferences';

export function RuntimeBanner() {
  const { level, setLevel, reducedMotion, setReducedMotion } = usePreferences();
  return (
    <div className="runtime-banner">
      <span>Practice build | Trend analysis unavailable | Raw NASA retrieval available</span>
      <ConnectionStatus />
      <label>Explanation level
        <select value={level} onChange={event => setLevel(event.target.value as ExplanationLevel)}>
          <option value="explorer">Explorer</option>
          <option value="student">Student</option>
          <option value="scientist">Scientist</option>
        </select>
      </label>
      <label>
        <input type="checkbox" checked={reducedMotion} onChange={event => setReducedMotion(event.target.checked)} />
        Reduce motion
      </label>
    </div>
  );
}
