"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChartCanvas } from "@/features/visualization/Charts";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
export function MlForecastSection({ id, artifactId }: { id: string; artifactId?: string }) {
  const search = useSearchParams(), router = useRouter(), pathname = usePathname();
  const [caps, setCaps] = useState<MlCapabilities | null>(null);
  const [target, setTarget] = useState(search.get("target") || "precip_24h");
  const [history, setHistory] = useState<MlHistory | null>(null);
  const [datasets, setDatasets] = useState<MlDataset[]>([]);
  const [models, setModels] = useState<MlModelCard[]>([]);
  const [reports, setReports] = useState<MlTrendReport[]>([]);
  const [prediction, setPrediction] = useState<MlPrediction | null>(null);
  const [job, setJob] = useState<MlJob | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const pendingLoad = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    pendingLoad.current?.abort();
    const controller = new AbortController();
    pendingLoad.current = controller;
    const options = { cache: "no-store" as const, signal: controller.signal };
    try {
      const cr = await fetch("/api/v1/forecasts/v2/capabilities", options);
      const c = cr.ok ? parseMlCapabilities(await cr.json()) : null;
      const source = c?.targets?.[target]?.sources[0] || "era5";
      const [h, d, m, t, prediction, latestJob] = await Promise.all([
        fetch(`/api/v1/forecasts/v2/${id}/history?source_id=${encodeURIComponent(source)}&variable=${encodeURIComponent(target)}`, options).then((r) =>
          r.ok ? r.json() : null,
        ),
        fetch(`/api/v1/forecasts/v2/${id}/datasets`, options).then((r) =>
          r.ok ? r.json() : null,
        ),
        fetch(`/api/v1/forecasts/v2/${id}/models`, options).then((r) =>
          r.ok ? r.json() : null,
        ),
        fetch(`/api/v1/forecasts/v2/${id}/trends`, options).then((r) =>
          r.ok ? r.json() : null,
        ),
        fetch(artifactId ? `/api/v1/forecasts/v2/runs/${id}/${encodeURIComponent(artifactId)}` : `/api/v1/forecasts/v2/${id}/prediction?target=${encodeURIComponent(target)}`, options).then(r => r.ok ? r.json() : null),
        fetch(`/api/v1/forecasts/v2/${id}/jobs?target=${encodeURIComponent(target)}`, options).then(r => r.ok ? r.json() : null),
      ]);
      if (controller.signal.aborted) return;
      if (c) setCaps(c);
      if (h) setHistory(parseMlHistory(h));
      if (d) setDatasets(parseMlDatasets(d).filter(d => d.source_id === source && (!d.variables || d.variables.includes(target))));
      if (m) setModels(parseMlModels(m));
      if (t) setReports(parseMlTrends(t));
      if (prediction && (prediction.state === "unavailable" || Array.isArray(prediction.predictions))) {
        if (artifactId && prediction.target && prediction.target !== target) setTarget(prediction.target);
        else setPrediction(parseMlPrediction(prediction));
      }
      if (latestJob?.job) setJob(latestJob.job);
    } catch {
      if (controller.signal.aborted) return;
      setError("Iris ML status is unavailable; values shown may be incomplete.");
    }
  }, [id, target, artifactId]);

  useEffect(() => {
    setHistory(null); setDatasets([]); setModels([]); setReports([]); setPrediction(null); setJob(null);
    void load();
    return () => {
      pendingLoad.current?.abort();
    };
  }, [load]);

  const queryTarget = search.get("target");
  useEffect(() => { if (!artifactId) setTarget(queryTarget || "precip_24h"); }, [queryTarget, artifactId]);

  useEffect(() => {
    if (!job || !["queued", "running"].includes(job.status)) return;
    const jobId = job.job_id;
    let stopped = false;
    const timer = setInterval(async () => {
      try {
        const response = await fetch(`/api/v1/forecasts/v2/jobs/${jobId}`, { cache: "no-store" });
        if (!response.ok || stopped) return;
        const value = await response.json() as MlJob;
        if (stopped) return;
        setJob(value);
        if (!["queued", "running"].includes(value.status)) {
          clearInterval(timer);
          await load();
        }
      } catch { /* The durable server job survives a temporary browser disconnect. */ }
    }, 3000);
    return () => { stopped = true; clearInterval(timer); };
  }, [job?.job_id, job?.status, load]);

  async function act(
    kind: "ingest" | "trends" | "predict" | "train" | "datasets" | "generate",
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
      if (kind === "predict" || Array.isArray(v.predictions)) {
        setPrediction(parseMlPrediction(v));
      } else {
        setJob(v as MlJob);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy("");
    }
  }

  async function activateModel(modelId: string) {
    setBusy("activate"); setError("");
    try {
      const response = await fetch(`/api/v1/forecasts/v2/${id}/models/${modelId}/activate`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || "Model activation failed.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Model activation failed."); }
    finally { setBusy(""); }
  }

  async function jobAction(action: "cancel" | "retry") {
    if (!job) return;
    setBusy(action); setError("");
    try {
      const response = await fetch(`/api/v1/forecasts/v2/jobs/${job.job_id}/${action}`, { method: "POST" });
      const value = await response.json();
      if (!response.ok) throw new Error(value.detail || "Job action failed.");
      setJob(value);
    } catch (e) { setError(e instanceof Error ? e.message : "Job action failed."); }
    finally { setBusy(""); }
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
  const running = job?.status === "queued" || job?.status === "running";
  const forecastChart = useMemo(() => {
    const windows = prediction?.predictions || [];
    return {
      animation: false,
      tooltip: { trigger: "axis" as const },
      legend: { data: ["10th percentile", "Median", "90th percentile"], textStyle: { color: "#809b93" } },
      grid: { left: 65, right: 20, top: 45, bottom: 45 },
      xAxis: { type: "category" as const, data: windows.map(w => w.window_start.slice(0, 10)), name: "UTC" },
      yAxis: { type: "value" as const, name: windows[0]?.unit || "", scale: true },
      series: (["q10", "q50", "q90"] as const).map((key, i) => ({
        name: ["10th percentile", "Median", "90th percentile"][i], type: "line" as const,
        data: windows.map(w => w[key]), symbolSize: 8,
        lineStyle: { width: i === 1 ? 3 : 1, type: (i === 1 ? "solid" : "dashed") as "solid" | "dashed" },
        itemStyle: { color: i === 1 ? "#10947c" : "#8db8aa" },
      })),
    };
  }, [prediction]);
  return (
    <section className="forecast-panel ml-forecast" aria-labelledby="ml-heading">
      <span className="forecast-kicker">IRIS HISTORICAL ML · iris.ml-forecast.v2</span>
      <h2 id="ml-heading">Local predictions from verified history.</h2>
      <p className="forecast-small">
        Generate local forecasts from historical Meteomatics and NASA Earthdata records.
        Each model is evaluated against persistence and seasonal climatology before publication.
      </p>
      <label className="ml-target">
        Forecast target
        <select
          aria-label="ML forecast target"
          value={target}
          onChange={(e) => {
            setTarget(e.target.value);
            const params = new URLSearchParams(search.toString());
            params.set("target", e.target.value); params.delete("run");
            router.replace(`${pathname}?${params.toString()}`);
          }}
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
          <strong>{caps ? ((isEarthdata ? caps.earthdata_credentials?.configured : caps.credentials.configured) ? "Configured" : "Missing") : "…"}</strong>
          <p className="forecast-small">
            {(isEarthdata ? caps?.earthdata_credentials?.configured : caps?.credentials.configured)
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
            {targetModels.length
              ? `${active.length} active / ${targetModels.length} trained`
              : "None"}
          </strong>
          <p className="forecast-small">
            {targetModels.length
              ? targetModels
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
          {typeof job.checkpoint.message === "string" && ` · ${job.checkpoint.message}`}
          {job.error && ` · ${job.error}`}
          {running && <button disabled={!!busy || adminLocked} onClick={() => void jobAction("cancel")}>Cancel local job</button>}
          {["failed", "cancelled"].includes(job.status) && <button disabled={!!busy || adminLocked} onClick={() => void jobAction("retry")}>Retry job</button>}
        </p>
      )}
      <div className="ml-actions">
        <button className="ml-generate" disabled={!!busy || adminLocked || running || !caps ||
          (isEarthdata ? caps.earthdata_credentials?.configured === false : !caps.credentials.configured)}
          onClick={() => void act("generate", { variable: target })}>
          {running ? "Preparing dataset forecast…" : "Generate forecast from datasets"}
        </button>
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
          onClick={() => void act("datasets", { source_id: targetSource, variable: target })}
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
          onClick={() => void act("trends", { family_id: target === "precip_24h" ? "annual_total" : "annual_mean", variable: target, source_id: targetSource })}
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
      {targetModels.length > 0 && <details className="ml-datasets">
        <summary>Model evaluation ({targetModels.length})</summary>
        <div className="forecast-table"><table>
          <thead><tr><th>Model / horizon</th><th>State</th><th>Model MAE</th><th>Best baseline MAE</th><th>Interval coverage</th><th>Evidence</th></tr></thead>
          <tbody>{targetModels.map(model => <tr key={model.model_id}>
            <td>{model.model_id} / {model.horizon_index + 1}</td><td>{model.state}
              {model.state === "eligible" && <button disabled={!!busy || adminLocked} onClick={() => void activateModel(model.model_id)}>Activate model</button>}
            </td><td>{number(model.metrics.model_mae)}</td><td>{number(model.metrics.baseline_mae)}</td>
            <td>{model.metrics.coverage_80 == null ? "—" : `${number(model.metrics.coverage_80 * 100, 0)}%`}</td>
            <td>{model.eligibility_reasons.join(" ") || `${model.metrics.n_eval || 0} held-out cases`}</td>
          </tr>)}</tbody>
        </table></div>
      </details>}
      {prediction &&
        (prediction.state === "unavailable" ? (
          <p className="forecast-small" role="status">
            Prediction unavailable: {prediction.reason}
            {prediction.horizons?.length
              ? ` (${prediction.horizons.map((h) => `h${h.horizon}: ${h.reason}`).join("; ")})`
              : ""}
          </p>
        ) : (
          <>
          <p className="forecast-small">
            Experimental local ML forecast{prediction.stale ? " · snapshot expired; generate a fresh forecast" : ""}.
            {prediction.latest_input_at && ` Latest input: ${prediction.latest_input_at.slice(0, 10)}`}
            {prediction.input_age_hours != null && ` · ${number(prediction.input_age_hours / 24, 1)} days old`}
            {" "}Intervals show measured model uncertainty; source publication times are estimated.
          </p>
          <div className="ml-forecast-chart"><ChartCanvas option={forecastChart} label={`${targetInfo?.label || target} local forecast with median and 10th–90th percentile limits`} /></div>
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
                  <th>Unit</th>
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
                    <td>{w.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={() => {
            const url = URL.createObjectURL(new Blob([JSON.stringify({ location_id: id, target, forecast: prediction, models: targetModels, datasets }, null, 2)], { type: "application/json" }));
            const link = document.createElement("a"); link.href = url;
            link.download = `iris-${id}-${target}-${prediction.run_id}.json`; link.click();
            URL.revokeObjectURL(url);
          }}>Export forecast and evidence</button>
          </>
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
