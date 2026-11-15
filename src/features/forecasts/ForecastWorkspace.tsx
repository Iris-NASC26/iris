"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChartCanvas } from "@/features/visualization/Charts";
import { MlForecastSection } from "./MlForecastSection";
import { useTheme } from "@/context/ThemeContext";
import {
  FORECAST_REGIONS,
  forecastRegion,
  forecastHref,
  memberTotals,
  parseForecast,
  parseContext,
  type ForecastContext,
  windows,
  type Aggregation,
  type Forecast,
} from "./model";
import "./forecasts.css";

const ForecastMap = dynamic(
  () => import("./ForecastMap").then((m) => m.ForecastMap),
  { ssr: false, loading: () => <p>Loading forecast-point map…</p> },
);

const number = (v: number | null | undefined) =>
  v == null
    ? "—"
    : new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(v);
function exportForecast(value: Forecast) {
  const u = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = u;
  a.download = `iris-${value.id}-forecast.json`;
  a.click();
  URL.revokeObjectURL(u);
}

export function ForecastWorkspace({
  id,
  artifactId,
}: {
  id: string;
  artifactId?: string;
}) {
  const site = forecastRegion(id),
    router = useRouter(),
    { dark } = useTheme();
  const [forecast, setForecast] = useState<Forecast | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [aggregation, setAggregation] = useState<Aggregation>("three-hour"),
    [style, setStyle] = useState<"ribbon" | "bars" | "members">("ribbon");
  const [clock, setClock] = useState(Date.now()),
    [selected, setSelected] = useState(0),
    [threshold, setThreshold] = useState(""),
    [utc, setUtc] = useState(false);
  const [capabilities, setCapabilities] = useState<Record<
    string,
    { state: string; detail: string }
  > | null>(null);
  const [observations, setObservations] = useState<ForecastContext | null>(
    null,
  );
  const [nasaBusy, setNasaBusy] = useState(false);
  const nasaRequest = useRef<AbortController | null>(null);
  async function loadContext() {
    nasaRequest.current?.abort();
    const request = new AbortController();
    nasaRequest.current = request;
    setNasaBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/forecasts/${id}/observations`, {
        cache: "no-store",
        signal: request.signal,
      });
      const value = await response.json();
      if (!response.ok)
        throw new Error(
          value.detail || value.error || "NASA context unavailable.",
        );
      const parsed = parseContext(value, id);
      if (!request.signal.aborted) setObservations(parsed);
    } catch (e) {
      if (!request.signal.aborted)
        setError(e instanceof Error ? e.message : "NASA context unavailable.");
    } finally {
      if (!request.signal.aborted) setNasaBusy(false);
    }
  }
  const controller = useRef<AbortController | null>(null);
  async function load(refresh = false) {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/v1/forecasts/${encodeURIComponent(id)}${refresh ? "/refresh" : artifactId ? `?artifact_id=${artifactId}` : ""}`,
        {
          method: refresh ? "POST" : "GET",
          cache: "no-store",
          signal: request.signal,
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.detail || data.error || "Forecast unavailable.");
      const parsed = parseForecast(data, id);
      if (!request.signal.aborted) {
        setForecast(parsed);
        setClock(Date.now());
        if (refresh) router.replace(forecastHref(id, parsed.artifact_id));
      }
    } catch (e) {
      if (!request.signal.aborted)
        setError(e instanceof Error ? e.message : "Forecast unavailable.");
    } finally {
      if (!request.signal.aborted) setBusy(false);
    }
  }
  useEffect(() => {
    void load();
    const timer = setInterval(() => setClock(Date.now()), 30000);
    void fetch("/api/v1/forecasts/capabilities", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((v) => setCapabilities(v?.capabilities ?? null))
      .catch(() => {});
    return () => {
      controller.current?.abort();
      nasaRequest.current?.abort();
      clearInterval(timer);
    };
  }, [id, artifactId]);
  const f =
      forecast?.id === id &&
      (!artifactId || forecast.artifact_id === artifactId)
        ? forecast
        : null,
    stale = !!f && Date.parse(f.expires_at) <= clock;
  const data = f ? windows(f, aggregation) : [],
    index = Math.min(selected, Math.max(0, data.length - 1)),
    current = data[index];
  const zone = utc ? "UTC" : site?.timezone || "UTC";
  const date = (s: string) =>
    new Intl.DateTimeFormat("en", {
      timeZone: zone,
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(s));
  const thresholdNumber = Number(threshold),
    thresholdValid =
      threshold.trim() !== "" &&
      Number.isFinite(thresholdNumber) &&
      thresholdNumber > 0 &&
      thresholdNumber <= 2000;
  const totals = f && current ? memberTotals(f, aggregation, index) : [];
  const above =
    thresholdValid &&
    totals.length === 51 &&
    totals.every((v) => v !== null) &&
    !stale
      ? totals.filter((v) => v! >= thresholdNumber).length
      : null;
  const option = useMemo(() => {
    const color = dark ? "#adc9c1" : "#526d65",
      grid = dark ? "#284139" : "#e2ebe7";
    const xy = (key: "p10" | "median" | "p90") =>
      data.map((w) => [Date.parse(w.end), w[key]]);
    const series =
      style === "members" && f
        ? f.members.map((m, mi) => ({
            name: `Member ${m.id}`,
            type: "line" as const,
            showSymbol: false,
            connectNulls: false,
            lineStyle: { width: 1, opacity: 0.2, color: "#159e87" },
            data: data.map((w, i) => [
              Date.parse(w.end),
              memberTotals(f, aggregation, i)[mi],
            ]),
          }))
        : style === "bars"
          ? [
              {
                name: "Ensemble median",
                type: "bar" as const,
                data: xy("median"),
                itemStyle: { color: "#16977f" },
                barMaxWidth: 24,
              },
            ]
          : [
              {
                name: "10th percentile",
                type: "line" as const,
                stack: "range",
                showSymbol: false,
                lineStyle: { opacity: 0 },
                areaStyle: { opacity: 0 },
                data: xy("p10"),
              },
              {
                tooltip: { show: false },
                name: "10th–90th ensemble range",
                type: "line" as const,
                stack: "range",
                showSymbol: false,
                lineStyle: { opacity: 0 },
                areaStyle: { color: "#2abb9a", opacity: 0.2 },
                data: data.map((w) => [
                  Date.parse(w.end),
                  w.p10 === null || w.p90 === null ? null : w.p90 - w.p10,
                ]),
              },
              {
                name: "90th percentile",
                type: "line" as const,
                showSymbol: false,
                lineStyle: { width: 0 },
                data: xy("p90"),
              },
              {
                name: "Ensemble median",
                type: "line" as const,
                showSymbol: false,
                connectNulls: false,
                lineStyle: { width: 2.5, color: "#10947c" },
                data: xy("median"),
              },
            ];
    return {
      animation: false,
      useUTC: true,
      backgroundColor: "transparent",
      aria: { enabled: true },
      textStyle: { color },
      tooltip: {
        trigger: "axis" as const,
        renderMode: "richText" as const,
        confine: true,
        formatter: (input: unknown) => {
          const first = Array.isArray(input) ? input[0] : input;
          const index = (first as { dataIndex?: number } | undefined)
            ?.dataIndex;
          const w = typeof index === "number" ? data[index] : undefined;
          return w
            ? `${w.start} → ${w.end}\n10th percentile: ${number(w.p10)} mm\nMedian: ${number(w.median)} mm\n90th percentile: ${number(w.p90)} mm\nUsable members: ${w.members_available}/51`
            : "";
        },
      },
      grid: { left: 60, right: 25, top: 30, bottom: 65 },
      xAxis: { type: "time" as const, name: "UTC", axisLabel: { color } },
      yAxis: {
        type: "value" as const,
        name: "mm",
        min: 0,
        splitLine: { lineStyle: { color: grid } },
        axisLabel: { color },
      },
      dataZoom: [
        { type: "inside" as const },
        { type: "slider" as const, bottom: 6, height: 18 },
      ],
      series,
    };
  }, [data, style, f, aggregation, dark]);
  if (!site)
    return (
      <div className="forecast-workspace dashboard-page-inner">
        <h1>Forecast not found</h1>
        <Link href={forecastHref("colombo")}>Open supported forecasts</Link>
      </div>
    );
  return (
    <div className="forecast-workspace dashboard-page-inner">
      <header className="forecast-header">
        <div>
          <span className="forecast-kicker">
            UPCOMING CONDITIONS / ECMWF ENSEMBLE
          </span>
          <h1>What comes next in {site.name}?</h1>
          <p>
            72 forecast hours · 51 model members · one point at {site.latitude}
            °, {site.longitude}°
          </p>
          <p className="forecast-small">
            Total precipitation water equivalent, including rain and snow,
            accumulated over the selected intervals.
          </p>
        </div>
        <label>
          Forecast location
          <select
            aria-label="Forecast location"
            value={id}
            onChange={(e) => router.push(forecastHref(e.target.value))}
          >
            {FORECAST_REGIONS.map((r) => (
              <option value={r.id} key={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
      </header>
      {error && (
        <div role="alert" className="forecast-notice">
          {error}{" "}
          {f
            ? "The previous snapshot is retained below; check its freshness."
            : "No sample predictions have been substituted."}
          <button disabled={busy} onClick={() => void load(true)}>
            Retry forecast
          </button>
        </div>
      )}
      {!f ? (
        <section className="forecast-loading" aria-live="polite">
          <div className={busy ? "forecast-orbit" : ""} />
          <h2>
            {busy
              ? "Preparing the next 72 forecast hours…"
              : "Forecast unavailable"}
          </h2>
          <p>
            {busy
              ? "Loading genuine ensemble predictions for this point."
              : "Check the local backend, credentials and provider access."}
          </p>
        </section>
      ) : (
        <>
          <div className="forecast-status">
            <span className={stale ? "forecast-expired" : "forecast-fresh"}>
              {stale
                ? "Expired snapshot · refresh required"
                : "Current forecast snapshot"}
            </span>
            <span>
              Valid {date(f.rows[0].start)} → {date(f.rows[23].end)} · {zone}
            </span>
            <button disabled={busy} onClick={() => void load(true)}>
              {busy ? "Refreshing…" : "Refresh forecast"}
            </button>
          </div>
          <section className="forecast-metrics">
            <article>
              <span>First 24 forecast hours</span>
              <strong>
                {number(f.daily[0].median)}
                <small>mm</small>
              </strong>
              <p>Ensemble median accumulation</p>
            </article>
            <article>
              <span>Wettest complete rolling 24 h</span>
              <strong>
                {number(f.peak_24h?.median)}
                <small>mm</small>
              </strong>
              <p>
                {f.peak_24h
                  ? `Window ends ${date(f.peak_24h.end)}`
                  : "Insufficient member coverage"}
              </p>
            </article>
            <article>
              <span>Forecast coverage</span>
              <strong>
                {f.missing_member_intervals === 0
                  ? "Complete"
                  : `${f.missing_member_intervals} missing`}
              </strong>
              <p>51 members × 24 three-hour intervals</p>
            </article>
          </section>
          <section className="forecast-panel">
            <div className="forecast-toolbar">
              <div>
                <span className="forecast-kicker">THE PREDICTED PATH</span>
                <h2>Follow the next change.</h2>
              </div>
              <div>
                <label>
                  Accumulation
                  <select
                    aria-label="Forecast accumulation"
                    value={aggregation}
                    onChange={(e) => {
                      setAggregation(e.target.value as Aggregation);
                      setSelected(0);
                    }}
                  >
                    <option value="three-hour">Three-hour intervals</option>
                    <option value="rolling">Rolling 24 hours</option>
                    <option value="daily">Three forecast-day totals</option>
                  </select>
                </label>
                <label>
                  Display
                  <select
                    aria-label="Forecast display"
                    value={style}
                    onChange={(e) => setStyle(e.target.value as typeof style)}
                  >
                    <option value="ribbon">Median & ensemble ribbon</option>
                    <option value="bars">Median bars</option>
                    <option value="members">All 51 members</option>
                  </select>
                </label>
              </div>
            </div>
            <p className="forecast-small">
              {style === "ribbon"
                ? "The ribbon spans the ensemble’s 10th–90th percentiles. It is not a calibrated 80% probability interval."
                : style === "members"
                  ? "Each line is one forecast member; overlapping lines remain separate possible model outcomes."
                  : "Bars show the median of member accumulations for the selected interval."}{" "}
              All chart timestamps are UTC.
            </p>
            <div className="forecast-chart">
              <ChartCanvas
                option={option}
                label={`Future ${aggregation} precipitation forecast at ${site.name}; millimetres; ${style}; missing values remain gaps.`}
                resetable
              />
            </div>
            <div className="forecast-inspector">
              <label>
                Inspect forecast interval
                <input
                  type="range"
                  aria-label="Inspect forecast interval"
                  min="0"
                  max={data.length - 1}
                  value={index}
                  onChange={(e) => setSelected(Number(e.target.value))}
                />
              </label>
              <div>
                {current && (
                  <>
                    <span>
                      {date(current.start)} → {date(current.end)} · {zone}
                    </span>
                    <strong>
                      {number(current.median)} mm <small>median</small>
                    </strong>
                    <span>
                      {number(current.p10)}–{number(current.p90)} mm ensemble
                      range · {current.members_available}/51 members
                    </span>
                  </>
                )}
              </div>
              <label className="forecast-checkbox">
                <input
                  type="checkbox"
                  checked={utc}
                  onChange={(e) => setUtc(e.target.checked)}
                />{" "}
                Show details in UTC
              </label>
            </div>
          </section>
          <ForecastMap key={id} site={site} />
          <div className="forecast-detail-grid">
            <section className="forecast-panel">
              <span className="forecast-kicker">EXPLORE AN AMOUNT</span>
              <h2>How many members exceed it?</h2>
              <label>
                Research threshold for the selected interval (mm)
                <input
                  aria-label="Forecast research threshold"
                  type="number"
                  min="0.01"
                  max="2000"
                  step="any"
                  value={threshold}
                  placeholder="Optional amount"
                  onChange={(e) => setThreshold(e.target.value)}
                />
              </label>
              <p aria-live="polite">
                {!threshold.trim()
                  ? "Choose an amount to inspect the selected forecast window."
                  : !thresholdValid
                    ? "Enter a value above zero and at most 2,000 mm."
                    : stale
                      ? "Exceedance screen withheld for an expired snapshot."
                      : above === null
                        ? "Exceedance screen withheld: all 51 members are required."
                        : `${above} of 51 members (${number((100 * above) / 51)}%) exceed your amount.`}
              </p>
              <p className="forecast-small">
                This is an ensemble fraction, not a flood probability or
                official warning. A zero count does not establish safety. No
                hazard threshold is assumed.
              </p>
            </section>
            <section className="forecast-panel">
              <span className="forecast-kicker">MODEL & VALIDATION</span>
              <h2>Know what produced this.</h2>
              <p>
                ECMWF ensemble supplied by Meteomatics. Iris computes member
                accumulations and summary quantiles; no Iris ML correction is
                applied.
              </p>
              <p className="forecast-small">
                Forecast initialization is not supplied in this response.
                Response generation ({date(f.provider_response_generated_at)})
                and retrieval ({date(f.retrieved_at)}) are recorded separately.
              </p>
              <div className="forecast-capabilities">
                {capabilities ? (
                  Object.entries(capabilities).map(([name, c]) => (
                    <div key={name}>
                      <strong>{name.replaceAll("_", " ")}</strong>
                      <span>
                        {c.state.replaceAll("_", " ")} · {c.detail}
                      </span>
                    </div>
                  ))
                ) : (
                  <p>Additional model-validation status unavailable.</p>
                )}
              </div>
            </section>
          </div>
          <section className="forecast-panel">
            <div className="forecast-toolbar">
              <div>
                <span className="forecast-kicker">
                  NASA OBSERVATIONAL CONTEXT
                </span>
                <h2>What preceded this forecast?</h2>
              </div>
              <button disabled={nasaBusy} onClick={() => void loadContext()}>
                {nasaBusy
                  ? "Loading NASA context..."
                  : "Load recent NASA context"}
              </button>
            </div>
            {observations ? (
              <>
                <p>{observations.caveat}</p>
                <div className="forecast-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>{observations.units}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {observations.rows.map((r) => (
                        <tr key={r.timestamp}>
                          <td>{r.timestamp}</td>
                          <td>{number(r.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="forecast-small">
                  Retrieved {date(observations.retrieved_at)} ·{" "}
                  {observations.source_url}
                </p>
              </>
            ) : (
              <p>
                Recent NASA satellite precipitation estimates can provide
                context. They remain observations, separately identified from
                the future predictions above.
              </p>
            )}
          </section>
          <section className="forecast-panel">
            <details>
              <summary>Forecast values and reproducibility</summary>
              <p className="forecast-small">
                {f.source_url}
                <br />
                Source SHA-256: {f.source_response_sha256}
                <br />
                Accumulate each member first, then calculate linear quantiles.
                Missing member intervals never become zero.
              </p>
              <div className="forecast-table">
                <table>
                  <caption>
                    Predicted accumulations · millimetres · interval ends in UTC
                  </caption>
                  <thead>
                    <tr>
                      <th>Interval end</th>
                      <th>10th percentile</th>
                      <th>Median</th>
                      <th>90th percentile</th>
                      <th>Members</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((w) => (
                      <tr key={w.end}>
                        <td>{w.end}</td>
                        <td>{number(w.p10)}</td>
                        <td>{number(w.median)}</td>
                        <td>{number(w.p90)}</td>
                        <td>{w.members_available}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
            <button onClick={() => exportForecast(f)}>
              Export forecast & member evidence
            </button>
          </section>
        </>
      )}
      <MlForecastSection id={id} />
    </div>
  );
}
