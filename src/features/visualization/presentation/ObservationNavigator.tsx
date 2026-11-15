"use client";
import { format } from "../model";
import { useStudio } from "../studio/state";

export function ObservationNavigator() {
  const s = useStudio();
  if (!s.primary || !s.primaryRows.length) return null;
  const selected =
    s.selection?.seriesId === s.primary.id
      ? s.primaryRows.findIndex((r) => r.time === s.selection!.time)
      : -1;
  const index =
      selected >= 0
        ? selected
        : Math.min(s.timeIndex, s.primaryRows.length - 1),
    row = s.primaryRows[index];
  const choose = (i: number) => {
    const r = s.primaryRows[i];
    if (!r) return;
    s.setPlaying(false);
    s.setTimeIndex(i);
    s.select({ seriesId: s.primary!.id, time: r.time, timestamp: r.timestamp });
  };
  return (
    <div
      className="viz-observation-nav"
      aria-label="Exact source observation inspector"
    >
      <div>
        <span>SOURCE OBSERVATION</span>
        <strong>{row.timestamp}</strong>
        <small>
          {row.qa === "Valid" ? "Provider QA: valid" : `Provider QA: ${row.qa}`}
        </small>
      </div>
      <div className="viz-observation-value">
        <strong>{format(row.value)}</strong>
        <span>{s.primary.preview.summary_stats.unit}</span>
      </div>
      <div className="viz-observation-scrub">
        <button
          aria-label="Previous source observation"
          disabled={index === 0}
          onClick={() => choose(index - 1)}
        >
          ←
        </button>
        <label>
          <span className="viz-sr-only">Inspect source observation</span>
          <input
            aria-label="Inspect source observation"
            type="range"
            min="0"
            max={s.primaryRows.length - 1}
            value={index}
            onChange={(e) => choose(Number(e.target.value))}
          />
        </label>
        <button
          aria-label="Next source observation"
          disabled={index === s.primaryRows.length - 1}
          onClick={() => choose(index + 1)}
        >
          →
        </button>
      </div>
    </div>
  );
}
