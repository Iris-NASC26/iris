"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  parseMlCapabilities,
  parseMlDatasets,
  parseMlHistory,
  parseMlModels,
  parseMlPrediction,
  parseMlTrends,
  type MlCapabilities,
  type MlDataset,
  type MlHistory,
  type MlJob,
  type MlModelCard,
  type MlPrediction,
  type MlTrendReport,
} from "./model";

const number = (v: number | null | undefined, digits = 2) =>
  v == null
    ? "—"
    : new Intl.NumberFormat("en", { maximumFractionDigits: digits }).format(v);

/** Iris historical-ML pipeline panel. Everything shown comes from v2 routes;
 *  missing pieces are stated, never filled with plausible output. */
export function MlForecastSection({ id }: { id: string }) {
  const [caps, setCaps] = useState<MlCapabilities | null>(null);
  const [target, setTarget] = useState("precip_24h");
  const [history, setHistory] = useState<MlHistory | null>(null);
  const [datasets, setDatasets] = useState<MlDataset[]>([]);
  const [models, setModels] = useState<MlModelCard[]>([]);
  const [reports, setReports] = useState<MlTrendReport[]>([]);
  const [prediction, setPrediction] = useState<MlPrediction | null>(null);
  const [job, setJob] = useState<MlJob | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const [c, h, d, m, t] = await Promise.all([
        fetch("/api/v1/forecasts/v2/capabilities", { cache: "no-store" }).then((r) =>
          r.ok ? r.json() : null,
        ),
        fetch(`/api/v1/forecasts/v2/${id}/history`, { cache: "no-store" }).then((r) =>
          r.ok ? r.json() : null,
        ),
        fetch(`/api/v1/forecasts/v2/${id}/datasets`, { cache: "no-store" }).then((r) =>
          r.ok ? r.json() : null,
        ),
        fetch(`/api/v1/forecasts/v2/${id}/models`, { cache: "no-store" }).then((r) =>
          r.ok ? r.json() : null,
        ),
        fetch(`/api/v1/forecasts/v2/${id}/trends`, { cache: "no-store" }).then((r) =>
          r.ok ? r.json() : null,
        ),
      ]);
      if (c) setCaps(parseMlCapabilities(c));
      if (h) setHistory(parseMlHistory(h));
      if (d) setDatasets(parseMlDatasets(d));
      if (m) setModels(parseMlModels(m));
      if (t) setReports(parseMlTrends(t));
    } catch {
      setError("Iris ML status is unavailable; values shown may be incomplete.");
    }
  }, [id]);

  useEffect(() => {
    void load();
    return () => {
      if (poll.current) clearInterval(poll.current);
    };
  }, [load]);

  async function act(
    kind: "ingest" | "trends" | "predict" | "train" | "datasets",
    body: object,
  ) {
    setBusy(kind);
    setError("");
    try {
      const url = kind === "predict" && (body as { target?: string }).target
        ? `/api/v1/forecasts/v2/${id}/predict?target=${encodeURIComponent((body as { target?: string }).target!)}`
        : `/api/v1/forecasts/v2/${id}/${kind}`;
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const v = await r.json();
      if (!r.ok) throw new Error(v.detail || "Request refused.");
      if (kind === "predict") {
        setPrediction(parseMlPrediction(v));
      } else {
        setJob(v as MlJob);
        if (poll.current) clearInterval(poll.current);
        poll.current = setInterval(async () => {
          const jr = await fetch(`/api/v1/forecasts/v2/jobs/${v.job_id}`, {
            cache: "no-store",
          });
          if (!jr.ok) return;
          const j = (await jr.json()) as MlJob;
          setJob(j);
          if (j.status !== "queued" && j.status !== "running") {
            if (poll.current) clearInterval(poll.current);
            void load();
          }
        }, 3000);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy("");
    }
  }

  const adminLocked = !!caps?.admin_token_required;
  const active = models.filter(
    (m) => m.state === "active" && (m.metrics?.target ?? "precip_24h") === target,
  );
  const targetModels = models.filter(
    (m) => (m.metrics?.target ?? "precip_24h") === target,
  );
  const targetInfo = caps?.targets?.[target];
  const targetSource =
    target === "precip_24h" ? "era5" : (targetInfo?.sources?.[0] ?? "era5");
  const isEarthdata = target !== "precip_24h";
  return (
    <section className="forecast-panel ml-forecast" aria-labelledby="ml-heading">
      <span className="forecast-kicker">IRIS HISTORICAL ML · iris.ml-forecast.v2</span>
      <h2 id="ml-heading">Local predictions from verified history.</h2>
      <p className="forecast-small">
        Separate from the provider ensemble above: this pipeline trains only on
        Meteomatics <em>past</em> records. Nothing here is a provider forecast,
        and missing stages are reported rather than simulated.
      </p>
      <label className="ml-target">
        Forecast target
        <select
          aria-label="ML forecast target"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        >
          {caps?.targets ? (
            Object.entries(caps.targets).map(([k, t]) => (
              <option value={k} key={k}>
                {t.label} ({t.unit})
              </option>
            ))
          ) : (
            <option value="precip_24h">Precipitation (24h) (mm)</option>
          )}
        </select>
      </label>
      {targetInfo && (
        <p className="forecast-small">
          {targetInfo.label} · native step {targetInfo.composite_days} day
          {targetInfo.composite_days > 1
            ? "s (composite — value is valid only after the full window and publication delay)"
            : ""}
          {" · "}source {targetSource}
          {caps?.earthdata_products?.[targetSource]
            ? ` · ${caps.earthdata_products[targetSource].note}`
            : ""}
        </p>
      )}
      {error && (
        <div role="alert" className="forecast-notice">
          {error}
        </div>
      )}
      <div className="ml-grid">
        <article>
          <span>Credentials</span>
          <strong>{caps ? (caps.credentials.configured ? "Configured" : "Missing") : "…"}</strong>
          <p className="forecast-small">
            {caps?.credentials.configured
              ? "Server-side only; never sent to this browser."
              : caps?.credentials.reason || "Historical ingestion cannot start."}
          </p>
        </article>
        <article>
          <span>Staged history</span>
          <strong>
            {history?.state === "available"
              ? `${number(history.coverage.complete_days, 0)} days`
              : "None"}
          </strong>
          <p className="forecast-small">
            {history?.state === "available"
              ? `${history.coverage.first_day} → ${history.coverage.last_day} · ${history.source_id}`
              : "Run an ingest job to stage bounded historical records."}
          </p>
        </article>
        <article>
          <span>Datasets</span>
          <strong>{datasets.length || "None"}</strong>
          <p className="forecast-small">
            {datasets.length
              ? `Latest: ${datasets[datasets.length - 1].dataset_id} · ${number(
                  datasets[datasets.length - 1].precip_complete_days,
                  0,
                )} complete days`
              : "Immutable, content-addressed; built from staged records."}
          </p>
        </article>
        <article>
          <span>Models</span>
          <strong>
            {models.length
              ? `${active.length} active / ${models.length} trained`
              : "None"}
          </strong>
          <p className="forecast-small">
            {models.length
              ? models
                  .map(
                    (m) =>
                      `h${m.horizon_index}:${m.state}${m.metrics?.skill_vs_best_baseline != null ? ` (${(100 * m.metrics.skill_vs_best_baseline).toFixed(0)}% vs baseline)` : ""}`,
                  )
                  .join(" · ")
              : "Candidates are published only after beating the strongest baseline."}
          </p>
        </article>
      </div>
      {job && (
        <p className="forecast-small" aria-live="polite">
          Job {job.job_id} ({job.kind}): {job.status}
          {job.status === "running" && ` · ${(100 * job.progress).toFixed(0)}%`}
          {job.error && ` · ${job.error}`}
        </p>
      )}
      <div className="ml-actions">
        <button
          disabled={
            !!busy ||
            adminLocked ||
            (target === "precip_24h" && caps?.credentials.configured === false)
          }
          onClick={() =>
            void act(
              "ingest",
              isEarthdata
                ? { source_id: targetSource, variable: target, backfill_days: 365 }
                : { source_id: "era5", backfill_days: 365 },
            )
          }
        >
          {busy === "ingest"
            ? "Queueing…"
            : `Queue history ingest (${targetSource}, 1 yr)`}
        </button>
        <button
          disabled={!!busy || adminLocked || !history?.coverage.complete_days}
          onClick={() => void act("datasets", { source_id: targetSource })}
        >
          {busy === "datasets" ? "Queueing…" : "Build dataset revision"}
        </button>
        <button
          disabled={!!busy || adminLocked || !datasets.length}
          title={
            datasets.length
              ? `Train horizons 0–2 on ${datasets[datasets.length - 1].dataset_id}`
              : "Build a dataset first"
          }
          onClick={() =>
            void act("train", {
              dataset_id: datasets[datasets.length - 1].dataset_id,
              variable: target,
            })
          }
        >
          {busy === "train" ? "Queueing…" : "Queue model training"}
        </button>
        <button
          disabled={!!busy || adminLocked || !history?.coverage.complete_days}
          onClick={() => void act("trends", { family_id: "annual_total", variable: target })}
        >
          {busy === "trends" ? "Queueing…" : "Queue trend analysis"}
        </button>
        <button
          disabled={!!busy || adminLocked}
          onClick={() => void act("predict", { target })}
        >
          {busy === "predict" ? "Predicting…" : "Predict from active models"}
        </button>
      </div>
      {adminLocked && (
        <p className="forecast-small">
          Pipeline mutations require an administrator token in this deployment.
        </p>
      )}
      {prediction &&
        (prediction.state === "unavailable" ? (
          <p className="forecast-small" role="status">
            Prediction unavailable: {prediction.reason}
            {prediction.horizons?.length
              ? ` (${prediction.horizons.map((h) => `h${h.horizon}: ${h.reason}`).join("; ")})`
              : ""}
          </p>
        ) : (
          <div className="forecast-table">
            <table>
              <caption>
                Iris ML run {prediction.run_id} · issued {prediction.issued_at} ·{" "}
                {prediction.uncertainty_method}
              </caption>
              <thead>
                <tr>
                  <th>Window</th>
                  <th>q10</th>
                  <th>Median</th>
                  <th>q90</th>
                </tr>
              </thead>
              <tbody>
                {prediction.predictions?.map((w) => (
                  <tr key={w.window_start}>
                    <td>
                      {w.window_start.slice(0, 10)} → {w.window_end.slice(0, 10)}
                    </td>
                    <td>{number(w.q10)}</td>
                    <td>{number(w.q50)}</td>
                    <td>{number(w.q90)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      {reports.length > 0 && (
        <details className="ml-trends">
          <summary>Historical trend reports (retrospective — not forecast features)</summary>
          <div className="forecast-table">
            <table>
              <thead>
                <tr>
                  <th>Family</th>
                  <th>State</th>
                  <th>Slope /decade</th>
                  <th>90% CI</th>
                  <th>p (raw)</th>
                  <th>q (BH)</th>
                  <th>Coverage</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r, i) => (
                  <tr key={i}>
                    <td>{r.family_id}</td>
                    <td>{r.state}{r.reason ? ` · ${r.reason}` : ""}</td>
                    <td>{number(r.slope_per_decade)}</td>
                    <td>
                      {r.ci_90
                        ? `${number(r.ci_90[0])} … ${number(r.ci_90[1])}`
                        : "—"}
                    </td>
                    <td>{r.p_raw == null ? "—" : r.p_raw.toExponential(2)}</td>
                    <td>{r.q_bh == null ? "—" : r.q_bh.toFixed(3)}</td>
                    <td>
                      {number(100 * r.completeness, 0)}% ·{" "}
                      {r.n_complete_months} months
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="forecast-small">
            Trend analysis is retrospective only; feature importance never
            establishes significance. Autocorrelation is handled via block
            bootstrap; raw and BH-adjusted values are both shown.
          </p>
        </details>
      )}
      {datasets.length > 0 && (
        <details className="ml-datasets">
          <summary>Dataset revisions ({datasets.length})</summary>
          <ul className="ml-dataset-list">
            {datasets.map((d) => (
              <li key={d.dataset_id}>
                <code>{d.dataset_id}</code> · {d.source_id} ·{" "}
                {number(d.precip_complete_days, 0)} days · quarantined{" "}
                {d.quarantine.count}
                {d.quarantine.reasons.length
                  ? ` (${d.quarantine.reasons.join(", ")})`
                  : ""}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
