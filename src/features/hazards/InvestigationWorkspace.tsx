"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChartCanvas } from "@/features/visualization/Charts";
import { useTheme } from "@/context/ThemeContext";
import { format } from "@/features/visualization/model";
import {
  availableEvidence,
  INVESTIGATIONS,
  investigationHref,
  parseHistory,
  parseRainfall,
  thresholdScreen,
  type HistoricalContext,
  type Investigation,
  type RainfallOutlook,
} from "./model";
import "./hazards.css";

function localTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Colombo",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
async function json(url: string, signal: AbortSignal) {
  const response = await fetch(url, { cache: "no-store", signal });
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      typeof body?.error === "string"
        ? body.error
        : typeof body?.detail === "string"
          ? body.detail
          : "This data request could not be completed.",
    );
  return body;
}
function exportJson(value: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function InvestigationWorkspace({ item }: { item: Investigation }) {
  const { dark } = useTheme();
  const [view, setView] = useState<"history" | "forecast">("history");
  const [cutoff, setCutoff] = useState(item.default_cutoff);
  const [allContext, setAllContext] = useState(false);
  const [history, setHistory] = useState<HistoricalContext | null>(null),
    [outlook, setOutlook] = useState<RainfallOutlook | null>(null);
  const [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  const [plot, setPlot] = useState<"hourly" | "rolling">("hourly");
  const [threshold, setThreshold] = useState(""),
    [clock, setClock] = useState(Date.now());
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (!outlook) return;
    const timer = window.setInterval(() => setClock(Date.now()), 30000);
    return () => clearInterval(timer);
  }, [outlook]);
  const foreground = dark ? "#c8ddd6" : "#46645c",
    grid = dark ? "#29423a" : "#dce7e2";
  const facts = item.timeline.filter(
    (fact) => allContext || fact.date <= cutoff,
  );
  const sourceFacts = availableEvidence(item, cutoff);
  const visibleRows =
    history?.rows.filter((row) => allContext || row.timestamp <= cutoff) ?? [];
  const visibleOutlook =
    outlook && outlook.case_id === item.id ? outlook : null;
  const expired =
    !!visibleOutlook && clock >= Date.parse(visibleOutlook.expires_at);
  const screen = useMemo(() => {
    if (!visibleOutlook || !threshold.trim()) return null;
    try {
      return thresholdScreen(visibleOutlook, Number(threshold), clock);
    } catch (e) {
      return {
        state: "invalid" as const,
        message: e instanceof Error ? e.message : "Invalid threshold.",
      };
    }
  }, [visibleOutlook, threshold, clock]);
  async function load(kind: "history" | "forecast") {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(kind);
    setError("");
    // A failed refresh must not silently leave an old outlook looking current.
    if (kind === "forecast") setOutlook(null);
    try {
      const body = await json(
        `/api/v1/hazards/${kind === "history" ? "history" : "rainfall"}?case_id=${encodeURIComponent(item.id)}`,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      if (kind === "history") setHistory(parseHistory(body, item));
      else {
        setOutlook(parseRainfall(body, item));
        setClock(Date.now());
      }
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : "Data could not be loaded.");
    } finally {
      if (!controller.signal.aborted) setBusy("");
    }
  }
  const historicalOption = {
    animation: false,
    useUTC: true,
    aria: { enabled: true },
    backgroundColor: "transparent",
    textStyle: { color: foreground },
    tooltip: {
      trigger: "axis" as const,
      renderMode: "richText" as const,
      confine: true,
    },
    grid: { left: 58, right: 24, top: 42, bottom: 60 },
    xAxis: { type: "time" as const, axisLabel: { color: foreground } },
    yAxis: {
      type: "value" as const,
      name: "mm/day",
      min: 0,
      splitLine: { lineStyle: { color: grid } },
      axisLabel: { color: foreground },
    },
    dataZoom: [
      { type: "inside", filterMode: "none" as const },
      { type: "slider", bottom: 5, height: 18, filterMode: "none" as const },
    ],
    series: [
      {
        name: "NASA POWER daily precipitation estimate",
        type: "bar" as const,
        data: visibleRows.map((row) => [
          Date.parse(row.timestamp + "T00:00:00Z"),
          row.value,
        ]),
        itemStyle: { color: "#10947e" },
        barMaxWidth: 24,
      },
    ],
  };
  const forecastValues =
    plot === "hourly"
      ? visibleOutlook?.rows.map((row) => [
          Date.parse(row.timestamp),
          row.value,
        ])
      : visibleOutlook?.rolling_24h.map((row) => [
          Date.parse(row.end),
          row.value,
        ]);
  const forecastOption = {
    animation: false,
    useUTC: true,
    aria: { enabled: true },
    backgroundColor: "transparent",
    textStyle: { color: foreground },
    tooltip: {
      trigger: "axis" as const,
      renderMode: "richText" as const,
      confine: true,
    },
    grid: { left: 58, right: 24, top: 42, bottom: 60 },
    xAxis: {
      type: "time" as const,
      name: "UTC",
      axisLabel: { color: foreground },
    },
    yAxis: {
      type: "value" as const,
      name: plot === "hourly" ? "mm / preceding hour" : "mm / preceding 24 h",
      min: 0,
      splitLine: { lineStyle: { color: grid } },
      axisLabel: { color: foreground },
    },
    dataZoom: [
      { type: "inside", filterMode: "none" as const },
      { type: "slider", bottom: 5, height: 18, filterMode: "none" as const },
    ],
    series: [
      {
        name:
          plot === "hourly"
            ? "Provider hourly precipitation forecast"
            : "Complete rolling 24-hour forecast totals",
        type: "bar" as const,
        data: forecastValues ?? [],
        itemStyle: { color: expired ? "#82908a" : "#bc784d" },
        barMaxWidth: 18,
      },
    ],
  };
  return (
    <div className="hazard-workspace dashboard-page-inner">
      <div className="hazard-breadcrumb">
        <Link href="/workspace/case-studies">Case studies</Link>
        <span>/ Disaster evidence</span>
      </div>
      <header className="hazard-heading">
        <div>
          <span className="hazard-kicker">
            EARTH SYSTEM TREND DETECTIVE / EVENT INVESTIGATION
          </span>
          <h1>{item.title}</h1>
          <p>{item.summary}</p>
        </div>
        <div className="hazard-location">
          <strong>{item.point_name}</strong>
          <span>
            {item.latitude}° N, {item.longitude}° E
          </span>
          <span>One point · not a basin or cyclone footprint</span>
        </div>
      </header>
      <nav
        className="hazard-switch"
        aria-label="Choose a disaster investigation"
      >
        {INVESTIGATIONS.map((site) => (
          <Link
            aria-current={site.id === item.id ? "page" : undefined}
            href={investigationHref(site.id)}
            key={site.id}
          >
            {site.short_label}
          </Link>
        ))}
      </nav>
      <section className="hazard-question">
        <span className="hazard-kicker">THE QUESTION</span>
        <p>{item.question}</p>
      </section>
      <div
        className="hazard-view-tabs"
        role="group"
        aria-label="Investigation view"
      >
        <button
          aria-pressed={view === "history"}
          onClick={() => {
            setView("history");
            setError("");
          }}
        >
          Event evidence · {item.event_start.slice(0, 4)}
        </button>
        <button
          aria-pressed={view === "forecast"}
          onClick={() => {
            setView("forecast");
            setError("");
          }}
        >
          Current precipitation outlook
        </button>
      </div>
      {error && (
        <div className="hazard-error" role="alert">
          {error}
        </div>
      )}
      {view === "history" ? (
        <div className="hazard-detail-grid">
          <section className="hazard-panel">
            <div className="hazard-panel-heading">
              <div>
                <span className="hazard-kicker">HISTORICAL CONTEXT</span>
                <h2>Separate the event from hindsight.</h2>
              </div>
              <label>
                Reconstruction cutoff
                <input
                  aria-label="Reconstruction cutoff"
                  type="date"
                  min={item.history_start}
                  max={item.history_end}
                  value={cutoff}
                  onChange={(e) => {
                    if (
                      e.target.value >= item.history_start &&
                      e.target.value <= item.history_end
                    )
                      setCutoff(e.target.value);
                  }}
                />
              </label>
            </div>
            <p className="hazard-note">
              This chronology is reconstructed from later reports. It is not a
              run of Iris before the event and does not demonstrate warning lead
              time.
            </p>
            <label className="hazard-check">
              <input
                type="checkbox"
                checked={allContext}
                onChange={(e) => setAllContext(e.target.checked)}
              />{" "}
              Include after-cutoff context (hindsight)
            </label>
            <div className="hazard-timeline">
              {facts.map((fact) => {
                const source = item.sources.find(
                  (s) => s.id === fact.source_id,
                )!;
                return (
                  <article
                    key={fact.date + fact.title}
                    data-after-cutoff={fact.date > cutoff || undefined}
                  >
                    <time>{fact.date}</time>
                    <div>
                      <h3>{fact.title}</h3>
                      <p>{fact.detail}</p>
                      <a href={source.url} target="_blank" rel="noreferrer">
                        {source.publisher} · document dated{" "}
                        {source.published_on} ↗
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
            {!facts.length && (
              <p className="hazard-empty">
                No documented timeline entries on or before this cutoff. Change
                the date or reveal the hindsight context.
              </p>
            )}
            <div className="hazard-source-status">
              <strong>
                {sourceFacts.length} independently verified issue-time records
                admitted
              </strong>
              <p>
                Report dates do not prove public availability before the event.
                A hindsight-free forecast evaluation needs archived forecasts
                and original issue times.
              </p>
            </div>
          </section>
          <aside className="hazard-panel">
            <span className="hazard-kicker">FROM INFORMATION TO ACTION</span>
            <h2>What could earlier awareness add?</h2>
            <ol className="hazard-steps">
              <li>
                Connect an authoritative forecast to the affected basin and
                people.
              </li>
              <li>Compare it with local river, soil and terrain conditions.</li>
              <li>
                Support official preparedness decisions with uncertainty and
                clear timing.
              </li>
            </ol>
            <p className="hazard-note">
              These are questions to evaluate, not a claim that Iris predicted
              this event or that an untested warning would have prevented
              losses.
            </p>
            <a
              className="hazard-button"
              href={item.official_url}
              target="_blank"
              rel="noreferrer"
            >
              Official agency information ↗
            </a>
            <p className="hazard-small">
              Current official-warning status has not been checked by Iris.
            </p>
          </aside>
          <section className="hazard-panel hazard-wide">
            <div className="hazard-panel-heading">
              <div>
                <span className="hazard-kicker">NASA POWER / PRECTOTCORR</span>
                <h2>Inspect the historical precipitation estimate.</h2>
                <p>Daily mean rate · mm/day · UTC · coarse-grid point sample</p>
              </div>
              <button
                className="hazard-button"
                disabled={!!busy}
                onClick={() => void load("history")}
              >
                {busy === "history"
                  ? "Loading NASA context…"
                  : "Load NASA historical context"}
              </button>
            </div>
            {history ? (
              <>
                <div className="hazard-chart">
                  <ChartCanvas
                    option={historicalOption}
                    label={`NASA POWER historical daily precipitation context through ${allContext ? item.history_end : cutoff}; mm/day. Values retrieved now, not an issue-time archive.`}
                    resetable
                  />
                </div>
                <p className="hazard-small">
                  {visibleRows.filter((row) => row.value !== null).length}{" "}
                  usable daily values;{" "}
                  {visibleRows.filter((row) => row.value === null).length}{" "}
                  missing in the displayed window. {history.caveat} Display
                  cutoff:{" "}
                  {allContext
                    ? item.history_end + " (hindsight revealed)"
                    : cutoff}
                  . No trend significance is inferred from this short event
                  window.
                </p>
                <ObservationTable rows={visibleRows} units="mm/day" />
                <Provenance value={history} />
                <button
                  className="hazard-button"
                  onClick={() =>
                    exportJson(history, `iris-${item.id}-nasa-context.json`)
                  }
                >
                  Export historical evidence
                </button>
              </>
            ) : (
              <div className="hazard-empty">
                Load the authentic NASA series explicitly. No sample
                observations are substituted.
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="hazard-detail-grid">
          <section className="hazard-panel hazard-wide">
            <div className="hazard-panel-heading">
              <div>
                <span className="hazard-kicker">
                  METEOMATICS / PROSPECTIVE POINT PRECIPITATION
                </span>
                <h2>What is forecast at this point now?</h2>
                <p>
                  This is today’s outlook at {item.point_name}, separate from
                  the {item.event_start.slice(0, 4)} event reconstruction.
                </p>
              </div>
              <button
                className="hazard-button"
                disabled={!!busy}
                onClick={() => void load("forecast")}
              >
                {busy === "forecast"
                  ? "Loading protected forecast…"
                  : visibleOutlook
                    ? "Refresh current outlook"
                    : "Load current 72-hour outlook"}
              </button>
            </div>
            <p className="hazard-note">
              Experimental precipitation screening, not a flood probability or
              official warning. The parameter includes liquid and frozen
              precipitation water equivalent. No trained hazard model, archived
              issue-time evaluation or calibrated hazard thresholds are
              available yet.
            </p>
            {visibleOutlook ? (
              <>
                <div className="hazard-metrics">
                  <div>
                    <span>Peak complete rolling 24 h</span>
                    <strong>
                      {format(visibleOutlook.peak_24h_mm)} <small>mm</small>
                    </strong>
                  </div>
                  <div>
                    <span>Missing forecast hours</span>
                    <strong>
                      {visibleOutlook.missing_hours} <small>/ 72</small>
                    </strong>
                  </div>
                  <div>
                    <span>Snapshot freshness</span>
                    <strong className="hazard-metric-status">
                      {expired
                        ? "Expired · refresh required"
                        : "Within 15-minute cache window"}
                    </strong>
                  </div>
                </div>
                <div
                  className="hazard-view-tabs"
                  role="group"
                  aria-label="Precipitation display"
                >
                  <button
                    aria-pressed={plot === "hourly"}
                    onClick={() => setPlot("hourly")}
                  >
                    Hourly
                  </button>
                  <button
                    aria-pressed={plot === "rolling"}
                    onClick={() => setPlot("rolling")}
                  >
                    Rolling 24 hours
                  </button>
                </div>
                <p className="hazard-small">
                  Valid interval: {visibleOutlook.rows[0].interval_start} to{" "}
                  {visibleOutlook.rows[71].timestamp} (UTC). Each hourly value
                  covers the hour ending at its timestamp.
                </p>
                <div className="hazard-chart">
                  <ChartCanvas
                    option={forecastOption}
                    label={`Meteomatics ${plot === "hourly" ? "hourly" : "rolling 24-hour"} point precipitation outlook in millimetres. Missing intervals remain empty.`}
                    resetable
                  />
                </div>
                {expired && (
                  <p className="hazard-note" role="status">
                    This snapshot has expired. It is retained for inspection and
                    excluded from the current threshold screen.
                  </p>
                )}
                <section className="hazard-research">
                  <label>
                    Your exploratory 24-hour threshold (mm)
                    <input
                      aria-label="Exploratory 24-hour threshold"
                      type="number"
                      min="0.1"
                      max="2000"
                      step="any"
                      placeholder="Optional research value"
                      value={threshold}
                      onChange={(e) => setThreshold(e.target.value)}
                    />
                  </label>
                  <div aria-live="polite">
                    {!screen ? (
                      <p>
                        Choose a research threshold to inspect complete
                        overlapping 24-hour windows. No official threshold is
                        assumed.
                      </p>
                    ) : screen.state === "invalid" ? (
                      <p role="alert">{screen.message}</p>
                    ) : screen.state === "stale" ? (
                      <p>Screen withheld: refresh this expired snapshot.</p>
                    ) : screen.state === "insufficient_data" ? (
                      <p>Screen withheld: no complete 24-hour windows.</p>
                    ) : (
                      <p>
                        <strong>{screen.count} overlapping windows</strong> meet
                        your research threshold. These are not independent flood
                        events. Zero exceedances does not establish safety.
                      </p>
                    )}
                  </div>
                </section>
                <ObservationTable
                  rows={visibleOutlook.rows}
                  units="mm / preceding hour"
                />
                <Provenance value={visibleOutlook} />
                <button
                  className="hazard-button"
                  onClick={() =>
                    exportJson(
                      visibleOutlook,
                      `iris-${item.id}-precipitation-outlook.json`,
                    )
                  }
                >
                  Export outlook evidence
                </button>
              </>
            ) : (
              <div className="hazard-empty">
                Load a genuine provider forecast when ready. Credentials stay on
                the server; loading this page does not spend an API query.
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function Provenance({ value }: { value: HistoricalContext | RainfallOutlook }) {
  return (
    <details className="hazard-provenance">
      <summary>Source, timing and reproducibility</summary>
      <dl>
        <dt>Provider</dt>
        <dd>{value.provider}</dd>
        <dt>Parameter / units</dt>
        <dd>
          {value.parameter} / {value.units}
        </dd>
        <dt>Support</dt>
        <dd>
          Point sample · {value.latitude}, {value.longitude}
        </dd>
        <dt>Retrieved</dt>
        <dd>{localTime(value.retrieved_at)} · Asia/Colombo</dd>
        <dt>Artifact SHA-256</dt>
        <dd>{value.source_response_sha256}</dd>
        {"forecast_initialization_at" in value && (
          <>
            <dt>Response generated</dt>
            <dd>
              {localTime(value.provider_response_generated_at)} · Asia/Colombo
            </dd>
            <dt>Model initialization</dt>
            <dd>
              Not supplied; response generation time is not forecast issue time.
            </dd>
            <dt>Requested source</dt>
            <dd>Meteomatics mix · component-model provenance not resolved</dd>
            <dt>Valid end timestamps (UTC)</dt>
            <dd>
              {value.rows[0].timestamp} to{" "}
              {value.rows[value.rows.length - 1].timestamp}
            </dd>
            <dt>Hazard warning state</dt>
            <dd>Not evaluated</dd>
          </>
        )}
        <dt>Source request</dt>
        <dd>{value.source_url}</dd>
      </dl>
    </details>
  );
}

function ObservationTable({
  rows,
  units,
}: {
  rows: { timestamp: string; value: number | null; qa: string }[];
  units: string;
}) {
  return (
    <details className="hazard-provenance">
      <summary>Inspect the values</summary>
      <div
        className="hazard-table-scroll"
        tabIndex={0}
        role="region"
        aria-label="Precipitation values"
      >
        <table>
          <caption>Source values; missing observations remain missing.</caption>
          <thead>
            <tr>
              <th scope="col">Date / interval end (UTC)</th>
              <th scope="col">{units}</th>
              <th scope="col">Quality</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.timestamp}>
                <th scope="row">{row.timestamp}</th>
                <td>{row.value === null ? "Missing" : String(row.value)}</td>
                <td>{row.qa}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
