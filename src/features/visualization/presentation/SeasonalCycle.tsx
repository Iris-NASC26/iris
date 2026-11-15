"use client";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ChartCanvas, DataChart } from "../Charts";
import { MONTHS, format, type Datum } from "../model";
import { useStudio } from "../studio/state";
import { useStudioTheme } from "../studio/display";
import { recordScene, seasonalSummary } from "./model";
import { ObservationNavigator } from "./ObservationNavigator";
import "./presentation.css";

const RecordScene = dynamic(
  () => import("./RecordScene").then((m) => m.RecordScene),
  {
    ssr: false,
    loading: () => <p className="viz-muted">Preparing the seasonal orbit…</p>,
  },
);

export function SeasonalCycle() {
  const s = useStudio(),
    { dark } = useStudioTheme();
  const [view, setView] = useState<"orbit" | "profile" | "heatmap">("orbit"),
    [year, setYear] = useState("all"),
    [unavailable, setUnavailable] = useState("");
  const model = useMemo(
    () =>
      recordScene(
        s.primaryRows,
        s.primary?.preview.extraction_config.target_frequency ?? "",
        s.primary?.preview.summary_stats.unit ?? "",
        "cycle",
      ),
    [s.primaryRows, s.primary],
  );
  const focusYear =
    year !== "all" && model.years.includes(Number(year)) ? Number(year) : null;
  const selectedTime =
    s.selection?.seriesId === s.primary?.id ? s.selection?.time : null;
  const select = (time: number) => {
    const i = s.primaryRows.findIndex((r) => r.time === time);
    if (i >= 0 && s.primary) {
      s.setPlaying(false);
      s.setTimeIndex(i);
      s.select({
        seriesId: s.primary.id,
        time,
        timestamp: s.primaryRows[i].timestamp,
      });
    }
  };
  if (!s.primary)
    return (
      <div className="viz-empty">
        <h3>A seasonal story starts with observations.</h3>
        <p>Select a monthly dataset to explore its real annual cycles.</p>
      </div>
    );
  return (
    <div className="viz-panel viz-cycle-panel">
      <div className="viz-record-heading">
        <div>
          <span className="viz-record-eyebrow">THE ANNUAL RHYTHM</span>
          <h3>Every year has a shape.</h3>
        </div>
        <span className="viz-record-count">
          {model.points.length} monthly values · {model.years.length} years
        </span>
      </div>
      <div className="viz-panel-tools">
        <span
          className="viz-chart-types"
          role="group"
          aria-label="Seasonal view"
        >
          <button
            aria-pressed={view === "orbit"}
            onClick={() => {
              setUnavailable("");
              setView("orbit");
            }}
          >
            3D Seasonal orbit
          </button>
          <button
            aria-pressed={view === "profile"}
            onClick={() => setView("profile")}
          >
            Seasonal profile
          </button>
          <button
            aria-pressed={view === "heatmap"}
            onClick={() => setView("heatmap")}
          >
            Year-by-month
          </button>
        </span>
        <label>
          Year
          <select
            aria-label="Highlight seasonal year"
            value={focusYear ?? "all"}
            onChange={(e) => setYear(e.target.value)}
          >
            <option value="all">All years</option>
            {model.years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        {s.entries.length > 1 && (
          <select
            aria-label="Seasonal series"
            value={s.primary.id}
            onChange={(e) => s.setPrimaryId(e.target.value)}
          >
            {s.entries.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
        )}
      </div>
      {model.reason ? (
        <div className="viz-empty">
          <p>{model.reason}</p>
        </div>
      ) : (
        <>
          {view === "orbit" && !unavailable ? (
            <RecordScene
              model={model}
              dark={dark}
              selectedTime={selectedTime ?? null}
              focusYear={focusYear}
              onSelect={select}
              onUnavailable={setUnavailable}
            />
          ) : view === "heatmap" ? (
            <DataChart
              kind="heatmap"
              entries={s.entries}
              primary={s.primary}
              data={s.data}
              normalized={false}
              onSelect={(e) => {
                if (e.kind === "month") {
                  const row = s.primaryRows.find(
                    (r) =>
                      new Date(r.time).getUTCFullYear() === Number(e.year) &&
                      new Date(r.time).getUTCMonth() === e.month,
                  );
                  if (row) select(row.time);
                }
              }}
            />
          ) : (
            <SeasonalProfile
              rows={s.primaryRows}
              unit={model.unit}
              label={s.primary.label}
              focusYear={focusYear}
              onSelect={select}
            />
          )}
          {unavailable && view === "orbit" && (
            <p className="viz-notice" role="status">
              {unavailable}
            </p>
          )}
          {view === "orbit" && !unavailable && (
            <div className="viz-cycle-key">
              <span>
                <i />
                Earlier years
              </span>
              <span className="viz-cycle-key-line" />
              <span>
                Later years
                <i />
              </span>
              <strong>{model.unit}</strong>
            </div>
          )}
          <ObservationNavigator />
        </>
      )}
      <p className="viz-panel-foot">
        {view === "orbit" && !unavailable
          ? "Angle identifies calendar month; height identifies year; radius maps the labelled value range. Each coloured path belongs to one year. Missing months and year boundaries remain open. Drag to orbit; click an observation to link views."
          : view === "heatmap"
            ? "Calendar-month departures use the selected record as their descriptive baseline. Blank cells remain missing."
            : "The profile shows selected-period monthly means and observed min–max ranges, not confidence intervals or a climate normal. Click a yearly observation to link its exact source timestamp."}
      </p>
    </div>
  );
}

function SeasonalProfile({
  rows,
  unit,
  label,
  focusYear,
  onSelect,
}: {
  rows: Datum[];
  unit: string;
  label: string;
  focusYear: number | null;
  onSelect: (time: number) => void;
}) {
  const { dark } = useStudioTheme(),
    summary = useMemo(() => seasonalSummary(rows), [rows]);
  const years = [
    ...new Set(rows.map((r) => new Date(r.time).getUTCFullYear())),
  ].sort((a, b) => a - b);
  const foreground = dark ? "#c4dbd2" : "#506b60",
    grid = dark ? "#2b433b" : "#e0eae4";
  const byCell = new Map(
    rows.map((r) => [
      `${new Date(r.time).getUTCFullYear()}-${new Date(r.time).getUTCMonth()}`,
      r,
    ]),
  );
  const option = {
    animation: false,
    backgroundColor: "transparent",
    aria: { enabled: true },
    textStyle: { color: foreground },
    grid: { left: 65, right: 22, top: 42, bottom: 34 },
    legend: {
      data: ["Selected-period mean", ...(focusYear ? [String(focusYear)] : [])],
      top: 0,
      textStyle: { color: foreground },
    },
    xAxis: {
      type: "category" as const,
      data: MONTHS,
      boundaryGap: false,
      axisLabel: { color: foreground },
      axisLine: { lineStyle: { color: grid } },
    },
    yAxis: {
      type: "value" as const,
      name: unit,
      scale: true,
      axisLabel: { color: foreground },
      splitLine: { lineStyle: { color: grid } },
    },
    tooltip: {
      trigger: "axis" as const,
      renderMode: "richText" as const,
      confine: true,
      formatter: (input: unknown) => {
        const p = (Array.isArray(input) ? input[0] : input) as {
          dataIndex?: number;
        };
        const m = summary[p.dataIndex ?? 0];
        return `${MONTHS[m.month]}\nMean: ${format(m.mean)} ${unit}\nObserved range: ${format(m.min)} to ${format(m.max)} ${unit}\n${m.count} available years\nDescriptive range, not an uncertainty interval`;
      },
    },
    series: [
      {
        name: "Observed minimum",
        type: "line" as const,
        stack: "observed-range",
        stackStrategy: "all" as const,
        showSymbol: false,
        data: summary.map((m) => m.min),
        lineStyle: { opacity: 0 },
        areaStyle: { opacity: 0 },
        silent: true,
      },
      {
        name: "Observed min–max range",
        type: "line" as const,
        stack: "observed-range",
        stackStrategy: "all" as const,
        showSymbol: false,
        data: summary.map((m) =>
          m.min === null || m.max === null ? null : m.max - m.min,
        ),
        lineStyle: { opacity: 0 },
        areaStyle: { color: "#4bb99b", opacity: 0.12 },
        silent: true,
      },
      ...years.map((year, i) => ({
        name: String(year),
        type: "line" as const,
        connectNulls: false,
        showSymbol: focusYear === year,
        symbolSize: 7,
        lineStyle: {
          width: focusYear === year ? 2.5 : 1,
          opacity: focusYear === null ? 0.4 : focusYear === year ? 1 : 0.1,
          color: focusYear === year ? "#d99d58" : i % 2 ? "#6e9fb1" : "#6aa692",
          type: "dashed" as const,
        },
        itemStyle: { color: "#d99d58" },
        data: MONTHS.map((_, m) => {
          const r = byCell.get(`${year}-${m}`);
          return {
            value: r?.value ?? null,
            sourceTime: r?.value !== null ? r?.time : undefined,
          };
        }),
      })),
      {
        name: "Selected-period mean",
        type: "line" as const,
        connectNulls: false,
        data: summary.map((m) => m.mean),
        showSymbol: true,
        symbolSize: 7,
        lineStyle: { width: 3, color: "#159d7e" },
        itemStyle: {
          color: dark ? "#10271f" : "#fff",
          borderWidth: 2,
          borderColor: "#159d7e",
        },
      },
    ],
  };
  return (
    <ChartCanvas
      option={option}
      label={`Seasonal profile for ${label}. Monthly means and observed min–max range; individual years keep real gaps.`}
      onSelect={(value) => {
        const t = (value as { sourceTime?: number })?.sourceTime;
        if (typeof t === "number") onSelect(t);
      }}
    />
  );
}
