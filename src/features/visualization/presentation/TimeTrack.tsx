"use client";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useStudio } from "../studio/state";
import { useStudioTheme } from "../studio/display";
import { DataChart } from "../Charts";
import { standardize } from "../model";
import { recordScene } from "./model";
const RecordScene = dynamic(
  () => import("./RecordScene").then((m) => m.RecordScene),
  {
    ssr: false,
    loading: () => <p className="viz-muted">Preparing the 3D time track…</p>,
  },
);

export function TimeTrack() {
  const s = useStudio(),
    { dark } = useStudioTheme(),
    [unavailable, setUnavailable] = useState("");
  const model = useMemo(
    () =>
      recordScene(
        s.normalized ? standardize(s.primaryRows) : s.primaryRows,
        s.primary?.preview.extraction_config.target_frequency ?? "",
        s.normalized
          ? "standard deviations"
          : (s.primary?.preview.summary_stats.unit ?? ""),
        "timeline",
      ),
    [s.primaryRows, s.primary, s.normalized],
  );
  if (!s.primary) return null;
  const select = (time: number) => {
    const row = s.primaryRows.find((r) => r.time === time);
    if (row) {
      s.setPlaying(false);
      s.setTimeIndex(s.times.indexOf(time));
      s.select({ seriesId: s.primary!.id, time, timestamp: row.timestamp });
    }
  };
  if (model.reason || unavailable)
    return (
      <>
        <p className="viz-notice" role="status">
          {model.reason || unavailable}
        </p>
        <DataChart
          kind="line"
          entries={s.entries}
          primary={s.primary}
          data={s.data}
          normalized={s.normalized}
          onSelect={(e) => select(e.time)}
        />
      </>
    );
  return (
    <>
      <RecordScene
        model={model}
        dark={dark}
        selectedTime={
          s.selection?.seriesId === s.primary.id ? s.selection.time : null
        }
        focusYear={null}
        onSelect={select}
        onUnavailable={setUnavailable}
      />
      <p className="viz-panel-foot">
        Primary series only · horizontal spacing follows UTC elapsed time;
        height follows the labelled value range. Depth and lighting are
        presentation only. Lines join adjacent observations; missing intervals
        stay open.
      </p>
    </>
  );
}
