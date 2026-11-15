"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { ForecastResult, targetLabel } from "./ForecastResult";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  parseCompatibility,
  parseMlCapabilities,
  parseMlDatasets,
  parseMlHistory,
  parseMlModels,
  parseMlPrediction,
  parseMlTrends,
  type ForecastLocation,
  type MlCapabilities,
  type MlCompatibility,
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
export function MlForecastSection({ id, artifactId, location }: { id: string; artifactId?: string; location?: ForecastLocation }) {
  const search = useSearchParams(), router = useRouter(), pathname = usePathname();
  const [caps, setCaps] = useState<MlCapabilities | null>(null);
  const [target, setTarget] = useState(search.get("target") || "precip_24h");
  const [compat, setCompat] = useState<MlCompatibility | null>(null);
  const [history, setHistory] = useState<MlHistory | null>(null);
  const [datasets, setDatasets] = useState<MlDataset[]>([]);
  const [models, setModels] = useState<MlModelCard[]>([]);
  const [reports, setReports] = useState<MlTrendReport[]>([]);
  const [prediction, setPrediction] = useState<MlPrediction | null>(null);
  const [published, setPublished] = useState<MlPrediction[]>([]);
  const [job, setJob] = useState<MlJob | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const pendingLoad = useRef<AbortController | null>(null);
  const hasTarget = search.has("target");
  const datasetParam = search.get("dataset");

  const load = useCallback(async () => {
    pendingLoad.current?.abort();
    const controller = new AbortController();
    pendingLoad.current = controller;
    const options = { cache: "no-store" as const, signal: controller.signal };
    try {
      const [cr, pr] = await Promise.all([
        fetch("/api/v1/forecasts/v2/capabilities", options),
        fetch(`/api/v1/forecasts/v2/${id}/published`, options),
      ]);
      const c = cr.ok ? parseMlCapabilities(await cr.json()) : null;
      const publishedDoc = pr.ok ? await pr.json() : {};
      const ready: MlPrediction[] = Array.isArray(publishedDoc.forecasts) ? publishedDoc.forecasts.map(parseMlPrediction) : [];
      if (controller.signal.aborted) return;
      setPublished(ready);
      const recommended = ready.find(run => !run.stale && run.quality_status !== "experimental_preview") || ready.find(run => !run.stale) || ready[0];
      if (!hasTarget && !artifactId && recommended?.target) {
        router.replace(`${pathname}?forecastId=${encodeURIComponent(id)}&target=${encodeURIComponent(recommended.target)}`, { scroll: false });
        return;
      }
      const source = c?.targets?.[target]?.sources[0] || "era5";
      const compatUrl = `/api/v1/forecasts/v2/compatibility?location_id=${encodeURIComponent(id)}&target=${encodeURIComponent(target)}${datasetParam ? `&dataset_id=${encodeURIComponent(datasetParam)}` : ""}`;
      const [h, d, m, t, prediction, latestJob, compatResponse] = await Promise.all([
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
        fetch(compatUrl, options).then(r => r.ok ? r.json() : null),
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
      setCompat(compatResponse ? parseCompatibility(compatResponse) : null);
    } catch {
      if (controller.signal.aborted) return;
      setError("Iris ML status is unavailable; values shown may be incomplete.");
    }
  }, [id, target, artifactId, hasTarget, datasetParam, router, pathname]);

  useEffect(() => {
    setHistory(null); setDatasets([]); setModels([]); setReports([]); setPrediction(null); setJob(null); setCompat(null);
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
      if (!r.ok) throw new Error(v.detail || v.error || "Request refused.");
      if (kind === "predict" || Array.isArray(v.predictions)) {
        setPrediction(parseMlPrediction(v));
      } else {
        setJob(v as MlJob);
      }
      if (kind === "generate" || kind === "predict") {
        if (artifactId) {
          const params = new URLSearchParams(search.toString());
          params.set("target", target); params.delete("run");
          router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        } else if (Array.isArray(v.predictions)) {
          await load();
        }
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
  const readyForecast = prediction?.state !== "unavailable" && !!prediction?.predictions?.length;
  const selectedDataset = (datasetParam && datasets.some(d => d.dataset_id === datasetParam))
    ? datasetParam
    : (compat?.suggested_dataset_id && datasets.some(d => d.dataset_id === compat.suggested_dataset_id)
      ? compat.suggested_dataset_id
      : datasets[datasets.length - 1]?.dataset_id);
  const selectDataset = (ds: string) => {
    const params = new URLSearchParams(search.toString());
    if (ds) params.set("dataset", ds); else params.delete("dataset");
    params.delete("run");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };
  const blocked = compat && ["outside_spatial_support", "unsupported_target", "unsupported_spatial_mode"].includes(compat.state);
  const savedHref = (run: MlPrediction) => `${pathname}?forecastId=${encodeURIComponent(id)}&target=${encodeURIComponent(run.target || target)}&run=${encodeURIComponent(run.run_id || "")}${selectedDataset ? `&dataset=${encodeURIComponent(selectedDataset)}` : ""}#forecast-result`;
  return (
    <section className="forecast-panel ml-forecast" aria-labelledby="ml-heading">
      <h2 id="ml-heading" className="ml-visually-hidden">Local predictions from verified history.</h2>
      <div className="ml-intro">
        <p>Choose a place and historical records. Iris learns patterns in those observations to estimate upcoming conditions and a likely range. Check the data age and model error before using a result.</p>
        <ol className="ml-steps" aria-label="Workflow">
          <li>Choose data</li><li aria-hidden="true">→</li><li>Generate</li><li aria-hidden="true">→</li><li>View estimate and range</li>
        </ol>
      </div>
      <div className="ml-control-bar">
        <label className="ml-target">Forecast target
          <select aria-label="ML forecast target" value={target} onChange={e => {
            setTarget(e.target.value);
            const params = new URLSearchParams(search.toString());
            params.set("target", e.target.value); params.delete("run"); params.delete("dataset");
            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
          }}>
            {caps?.targets ? Object.entries(caps.targets).map(([k, t]) =>
              <option value={k} key={k}>{targetLabel(k, t.label)}</option>) : <option value="precip_24h">Rainfall</option>}
          </select>
        </label>
        {datasets.length > 0 && (
          <label className="ml-target">Dataset revision
            <select aria-label="Historical dataset revision" value={selectedDataset || ""} onChange={e => selectDataset(e.target.value)}>
              {datasets.map(d => (
                <option key={d.dataset_id} value={d.dataset_id}>
                  {d.dataset_id} · {number(d.precip_complete_days, 0)} days{d.spatial_support && d.spatial_support !== "unknown" ? ` · ${d.spatial_support}` : ""}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="ml-actions">
          <button className="ml-generate" disabled={!!busy || adminLocked || running || !caps || !!blocked ||
            (!datasets.length && !active.length && (isEarthdata ? caps.earthdata_credentials?.configured === false : !caps.credentials.configured))}
            title={blocked ? compat?.message : undefined}
            onClick={() => void act("generate", datasetParam ? { variable: target, dataset_id: datasetParam } : { variable: target })}>
            <Icon name="sparkles" size={16} /> {running || busy === "generate" ? "Preparing dataset forecast…" : "Generate forecast from datasets"}
          </button>
        </div>
      </div>
      {compat && compat.state !== "ready" && !running && (
        <p className={`ml-readiness ${blocked ? "quality-warning" : ""}`} role="status">{compat.message}</p>
      )}
      {published.length > 0 && <nav className="ml-saved-links" aria-label="Saved forecasts">
        <span>Saved forecasts</span>
        {published.map(run => <Link key={run.run_id} href={savedHref(run)}
          className={run.quality_status === "experimental_preview" ? "is-preview" : ""}
          aria-label={`${caps?.targets?.[run.target || ""]?.label || run.target} — View saved forecast`}>
          {targetLabel(run.target || "", caps?.targets?.[run.target || ""]?.label)}
          {run.quality_status === "experimental_preview" && <small>Preview</small>}<Icon name="arrow" size={13} />
        </Link>)}
      </nav>}
      {error && <div role="alert" className="forecast-notice">{error}</div>}
      {adminLocked && <p className="forecast-small">Generation requires administrator access.</p>}
      {running && <div className="ml-job-progress" role="status">
        <div><strong>{job?.checkpoint.phase === "ingest" ? "Getting historical records" : "Preparing your forecast"}</strong>
          <button disabled={!!busy || adminLocked} onClick={() => void jobAction("cancel")}>Cancel</button></div>
        <progress value={job?.progress || .05} max={1} />
        <p>{typeof job?.checkpoint.message === "string" ? job.checkpoint.message : "Your job continues if you leave this page."}</p>
      </div>}
      {job && ["failed", "cancelled"].includes(job.status) && <div className="forecast-notice" role="status">
        <span>{job.error || "Generation cancelled."}</span> <button disabled={!!busy || adminLocked} onClick={() => void jobAction("retry")}>Retry job</button>
      </div>}
      {readyForecast && prediction ? <ForecastResult prediction={prediction} label={targetInfo?.label || target} target={target}
        savedHref={savedHref(prediction)} archived={!!artifactId} onExport={() => {
          const url = URL.createObjectURL(new Blob([JSON.stringify({ location_id: id, location: location ? { name: location.name, latitude: location.latitude, longitude: location.longitude, spatial_mode: location.spatial_mode } : undefined, target, dataset_id: selectedDataset, forecast: prediction, models: targetModels, datasets }, null, 2)], { type: "application/json" }));
          const link = document.createElement("a"); link.href = url;
          link.download = `iris-${id}-${target}-${prediction.run_id}.json`; link.click();
          URL.revokeObjectURL(url);
        }} /> : !running && <div className="ml-empty-state" role="status">
          <Icon name="activity" size={34} />
          <h3>{targetModels.some(m => m.state === "rejected") ? "Explore an experimental preview" : "Your next forecast starts here"}</h3>
          <p>{targetModels.some(m => m.state === "rejected") ? "Generate to view this model with its measured error." : "Choose a target and generate from historical data."}</p>
          {prediction?.state === "unavailable" && <details><summary>Why is there no forecast?</summary><p>Prediction unavailable: {prediction.reason}</p>
            <ul>{prediction.horizons?.map(h => <li key={h.horizon}>Window {h.horizon + 1}: {h.reason}</li>)}</ul></details>}
        </div>}
      <div className="ml-technical-details">
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
      <details className="ml-datasets"><summary>Source data &amp; pipeline status</summary>
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
        <p className="forecast-small">{targetInfo?.label} ? source {targetSource} ? native step {targetInfo?.composite_days || 1} day(s){(targetInfo?.composite_days || 1) > 1 ? " composite" : ""}.</p>
        <p className="forecast-small">{caps?.earthdata_products?.[targetSource]?.note}</p>
        {job && <p className="forecast-small">Job {job.job_id}: {job.status}</p>}
      </details>
      <details className="ml-datasets">
        <summary>Advanced pipeline controls</summary>
        <p className="forecast-small">Generate runs the complete workflow. These controls run individual steps for inspecting datasets and models.</p>
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
          onClick={() => void act("datasets", { source_id: targetSource, variable: target })}
        >
          {busy === "datasets" ? "Queueing…" : "Build dataset revision"}
        </button>
        <button
          disabled={!!busy || adminLocked || !selectedDataset}
          title={
            selectedDataset
              ? `Train horizons 0–2 on ${selectedDataset}`
              : "Build a dataset first"
          }
          onClick={() =>
            void act("train", {
              dataset_id: selectedDataset,
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
      </details>
      <details className="ml-datasets"><summary>How it works</summary>
        <p className="forecast-small">Historical records → local model → measured evaluation → forecast. Models that miss quality checks remain visible as experimental previews with their error comparison. New NASA extractions can take hours or longer.</p>
      </details>
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
      </div>
    </section>
  );
}
