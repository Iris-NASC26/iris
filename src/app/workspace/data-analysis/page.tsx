"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { forecastHref } from "@/features/forecasts/model";
import Link from 'next/link';
import { Icon } from "@/components/ui/Icon";
import { useDashboard } from "@/context/DashboardContext";
import { useVisualizations } from '@/features/visualization/store';
import { sourceKey } from '@/features/visualization/adapters/analysisBinding';
import type { SignalMode } from "@/lib/dashboardData";
import type {
  CaseFileAnalysisResponse,
  CaseFileObservation,
} from "@/lib/dataRetrievalEngine";

type AnalysisState = "empty" | "loading" | "complete" | "error";
type SeasonalAdjustment = "auto" | "calendar_climatology" | "stl" | "none";
type AnalysisMethod =
  | "ols"
  | "hamed_rao_mk"
  | "seasonal_kendall"
  | "sen_slope"
  | "pettitt"
  | "anomalies"
  | "seasonal_fingerprint"
  | "case_file_diagnostics";

const ANALYSIS_METHODS: Array<{ id: AnalysisMethod; label: string; detail: string }> = [
  { id: "ols", label: "Linear trend · OLS t-test", detail: "Slope, p-value, and 95% interval" },
  { id: "hamed_rao_mk", label: "Mann–Kendall trend test", detail: "Hamed–Rao autocorrelation correction" },
  { id: "seasonal_kendall", label: "Seasonal Kendall", detail: "Compares matching calendar months" },
  { id: "sen_slope", label: "Sen’s slope", detail: "Robust slope and rank-based 95% interval" },
  { id: "pettitt", label: "Change-point screen", detail: "Pettitt single-breakpoint diagnostic" },
  { id: "anomalies", label: "Anomaly review", detail: "Seasonally adjusted z-scores; |z| ≥ 2 cue" },
  { id: "seasonal_fingerprint", label: "Seasonal fingerprint", detail: "Year-by-month anomaly heatmap" },
  { id: "case_file_diagnostics", label: "Full Case File diagnostics", detail: "Evidence, caveats, robustness, and provenance" },
];

function HistoricalAnalysis() {
  const { publishAnalysis, invalidateAnalysis } = useVisualizations();
  const {
    autoRunCase,
    dataset,
    endYear,
    extractedPreview,
    extractionConfig,
    location,
    setAutoRunCase,
    setEndYear,
    setSignalMode,
    setStartYear,
    signalMode,
    startYear,
  } = useDashboard();
  const [analysis, setAnalysis] = useState<AnalysisState>("empty");
  const [caseFileData, setCaseFileData] = useState<CaseFileAnalysisResponse | null>(null);
  const [analysisError, setAnalysisError] = useState("");
  const [toast, setToast] = useState("");
  const [seasonalAdjustment, setSeasonalAdjustment] = useState<SeasonalAdjustment>("auto");
  const [selectedMethods, setSelectedMethods] = useState<AnalysisMethod[]>([]);
  const requestController = useRef<AbortController | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      requestController.current?.abort();
      window.clearTimeout(toastTimer.current);
    },
    [],
  );

  const runAnalysis = useCallback(async () => {
    if (selectedMethods.length === 0) return;
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    setCaseFileData(null);
    setAnalysisError("");
    setAnalysis("loading");
    if (extractedPreview) invalidateAnalysis(extractedPreview);

    try {
      if (
        !extractedPreview &&
        extractionConfig.source_api.toLowerCase() !== "nasa power"
      ) {
        throw new Error(
          "This provider must be extracted first. Data Analysis only requests live NASA POWER data when no extraction job is attached.",
        );
      }
      const activeLocation =
        extractedPreview?.extraction_config.region_name || extractionConfig.region_name || location;
      const activeStartYear = extractedPreview
        ? Number(extractedPreview.extraction_config.start_date.slice(0, 4))
        : startYear;
      const activeEndYear = extractedPreview
        ? Number(extractedPreview.extraction_config.end_date.slice(0, 4))
        : endYear;
      const response = await fetch("/api/v1/analyze/case-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          job_id: extractedPreview?.job_id ?? null,
          dataset_id: extractedPreview?.extraction_config.variable_id || dataset.id,
          dataset_name: extractedPreview?.product.variable_name || dataset.name,
          parameter_code: extractedPreview?.extraction_config.variable_id || extractionConfig.variable_id || dataset.code,
          unit: extractedPreview?.summary_stats.unit || dataset.unit,
          location: activeLocation,
          latitude: extractedPreview?.extraction_config.point_lat ?? extractionConfig.point_lat,
          longitude: extractedPreview?.extraction_config.point_lon ?? extractionConfig.point_lon,
          start_year: activeStartYear,
          end_year: activeEndYear,
          seasonal_adjustment: seasonalAdjustment,
          analysis_methods: selectedMethods,
        }),
      });
      const responseBody = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok) {
        throw new Error(
          responseBody.detail || responseBody.error || `Analysis failed (${response.status}).`,
        );
      }
      if (!responseBody.result_id || !Array.isArray(responseBody.analysis_series)) {
        throw new Error("The analysis service returned an incomplete Case File.");
      }
      if (extractedPreview) publishAnalysis(extractedPreview, { seasonal: seasonalAdjustment, methods: selectedMethods }, responseBody);
      setCaseFileData(responseBody as CaseFileAnalysisResponse);
      setAnalysis("complete");
    } catch (error) {
      if (controller.signal.aborted) return;
      setAnalysisError(error instanceof Error ? error.message : String(error));
      setAnalysis("error");
    }
  }, [
    publishAnalysis,
    invalidateAnalysis,
    dataset.code,
    dataset.id,
    dataset.name,
    dataset.unit,
    endYear,
    extractedPreview,
    extractionConfig.point_lat,
    extractionConfig.point_lon,
    extractionConfig.region_name,
    extractionConfig.variable_id,
    location,
    seasonalAdjustment,
    selectedMethods,
    startYear,
  ]);

  useEffect(() => {
    if (autoRunCase) setAutoRunCase(false);
  }, [autoRunCase, setAutoRunCase]);

  const resetResults = () => {
    requestController.current?.abort();
    if (extractedPreview) invalidateAnalysis(extractedPreview);
    setCaseFileData(null);
    setAnalysisError("");
    setAnalysis("empty");
    setSignalMode("raw");
  };
  const toggleMethod = (method: AnalysisMethod) => {
    setSelectedMethods((current) =>
      current.includes(method)
        ? current.filter((item) => item !== method)
        : [...current, method],
    );
    resetResults();
  };
  const updateSeasonalAdjustment = (value: SeasonalAdjustment) => {
    setSeasonalAdjustment(value);
    resetResults();
  };

  const notify = (message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2400);
  };
  const canAnalyze =
    Boolean(extractedPreview) || extractionConfig.source_api.toLowerCase() === "nasa power";
  const analysisInputKey = extractedPreview ? sourceKey(extractedPreview) : [
    'live', extractionConfig.variable_id,
    extractionConfig.region_name || location, startYear, endYear,
  ].join("|");

  useEffect(() => {
    requestController.current?.abort();
    setCaseFileData(null);
    setAnalysisError("");
    setAnalysis("empty");
    setSignalMode("raw");
  }, [analysisInputKey, setSignalMode]);

  return (
    <div className="visualize-page">
      <main className="workspace">
        <aside className="control-panel">
          <div className="panel-scroll">
            <section className="wizard-section">
              <div className="section-kicker">Data Analysis</div>
              <h1>Scientific Case File</h1>
              <p className="section-copy">
                Choose how to prepare the observations and which analysis methods to run. Results
                update only when you submit your selections.
              </p>

              <div className="field-label">Region</div>
              <p>{extractedPreview?.extraction_config.region_name || extractionConfig.region_name || location}</p>

              <div className="range-heading">
                <div className="field-label">Observation period</div>
                <span className="year-readout">
                  {extractedPreview
                    ? `${extractedPreview.extraction_config.start_date.slice(0, 4)} — ${extractedPreview.extraction_config.end_date.slice(0, 4)}`
                    : `${startYear} — ${endYear}`}
                </span>
              </div>
              {!extractedPreview && (
                <>
                  <div className="range-track" aria-hidden="true">
                    <span
                      style={{
                        left: `${Math.max(0, ((startYear - 2000) / 25) * 100)}%`,
                        right: `${Math.max(0, 100 - ((endYear - 2000) / 25) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="range-inputs">
                    <input
                      aria-label="Start year"
                      min="2000"
                      max={endYear - 1}
                      type="range"
                      value={startYear}
                      onChange={(event) => {
                        setStartYear(Number(event.target.value));
                        resetResults();
                      }}
                    />
                    <input
                      aria-label="End year"
                      min={startYear + 1}
                      max="2025"
                      type="range"
                      value={endYear}
                      onChange={(event) => {
                        setEndYear(Number(event.target.value));
                        resetResults();
                      }}
                    />
                  </div>
                  <div className="range-labels">
                    <span>2000</span>
                    <span>2025</span>
                  </div>
                </>
              )}

              <section className="analysis-options" aria-labelledby="analysis-options-title">
                <div className="field-label" id="analysis-options-title">
                  Data manipulation
                </div>
                <label className="analysis-select-label" htmlFor="seasonal-adjustment">
                  Seasonal treatment
                </label>
                <select
                  id="seasonal-adjustment"
                  value={seasonalAdjustment}
                  onChange={(event) =>
                    updateSeasonalAdjustment(event.target.value as SeasonalAdjustment)
                  }
                >
                  <option value="auto">Automatic (STL when supported, otherwise climatology)</option>
                  <option value="calendar_climatology">Calendar-month climatology</option>
                  <option value="stl">Robust STL decomposition</option>
                  <option value="none">No seasonal adjustment</option>
                </select>
                <p className="analysis-option-note">
                  Missing and QA-flagged values are never filled or included in inference.
                </p>

                <div className="field-label analysis-method-heading">Analysis methods</div>
                <div className="analysis-method-list">
                  {ANALYSIS_METHODS.map((method) => (
                    <label className="analysis-method-option" key={method.id}>
                      <input
                        checked={selectedMethods.includes(method.id)}
                        onChange={() => toggleMethod(method.id)}
                        type="checkbox"
                      />
                      <span>
                        <strong>{method.label}</strong>
                        <small>{method.detail}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </section>

              <button
                className="run-button"
                onClick={() => void runAnalysis()}
                disabled={analysis === "loading" || !canAnalyze || selectedMethods.length === 0}
                type="button"
              >
                {analysis === "loading" ? (
                  <span className="button-spinner" />
                ) : (
                  <Icon name="activity" size={18} />
                )}
                {analysis === "loading" ? "Running selected methods…" : "Run selected analysis"}
                {analysis !== "loading" && <span className="shortcut">↵</span>}
              </button>
              {!canAnalyze && (
                <p className="section-copy">
                  Complete an extraction for this provider before running statistical analysis.
                </p>
              )}
              {canAnalyze && selectedMethods.length === 0 && (
                <p className="section-copy">Select at least one analysis method to continue.</p>
              )}
            </section>

            <section className="variable-card">
              <div className="variable-top">
                <div className="variable-icon">
                  <Icon name="thermometer" size={18} />
                </div>
                <div>
                  <div className="eyebrow">Selected variable</div>
                  <h2>{dataset.name}</h2>
                </div>
                <button
                  className="icon-button"
                  aria-label="Variable information"
                  title={`${dataset.source} variable ${dataset.code}`}
                  type="button"
                >
                  <Icon name="info" size={17} />
                </button>
              </div>
              <p>{dataset.description}</p>
              <div className="metadata">
                <span>
                  <small>Units</small>
                  <strong>{dataset.unit}</strong>
                </span>
                <span>
                  <small>Source</small>
                  <strong>{extractedPreview?.product.source_api || dataset.source}</strong>
                </span>
              </div>
            </section>
          </div>
        </aside>

        <section className="analysis-panel" aria-live="polite">
          {analysis === 'complete' && extractedPreview && <Link className="btn btn-primary" href={`/workspace/visualize?jobId=${encodeURIComponent(extractedPreview.job_id)}`}>Explore in Visualization Studio →</Link>}
          {analysis === "empty" &&
            (canAnalyze ? (
              <SelectionPrompt selectedCount={selectedMethods.length} />
            ) : (
              <EmptyState />
            ))}
          {analysis === "loading" && <LoadingState />}
          {analysis === "error" && (
            <AnalysisErrorState message={analysisError} onRetry={() => void runAnalysis()} />
          )}
          {analysis === "complete" && caseFileData && (
            <Results
              caseFile={caseFileData}
              selectedMethods={selectedMethods}
              signalMode={signalMode}
              setSignalMode={setSignalMode}
              onNotify={notify}
            />
          )}
        </section>
      </main>
      {toast && (
        <div className="toast" role="status">
          <Icon name="check" size={17} />
          {toast}
        </div>
      )}
    </div>
  );
}

function SelectionPrompt({ selectedCount }: { selectedCount: number }) {
  return (
    <div className="empty-state">
      <div className="empty-kicker">
        <span /> Ready for your analysis
      </div>
      <h2>Select methods to explore this series</h2>
      <p>
        Choose a seasonal treatment and one or more analyses in the left pane, then run them to
        calculate and display results. No analysis is run automatically.
      </p>
      <div className="empty-features">
        <span>
          <Icon name="activity" size={15} /> {selectedCount} methods selected
        </span>
        <span>
          <Icon name="layers" size={15} /> Seasonal treatment configurable
        </span>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-visual">
        <div className="scan-ring ring-one" />
        <div className="scan-ring ring-two" />
        <Icon name="globe" size={72} />
        <div className="lens">
          <Icon name="search" size={34} />
        </div>
        <span className="scan-dot dot-one" />
        <span className="scan-dot dot-two" />
        <span className="scan-dot dot-three" />
      </div>
      <div className="empty-kicker">
        <span /> Awaiting observations
      </div>
      <h2>No extracted series is loaded</h2>
      <p>
        Choose a dataset, complete an extraction, and open Plot &amp; Visualize from its verified
        preview. This page does not substitute demo or generated values for observations.
      </p>
      <a className="run-button" href="/workspace/intelligence">
        Find real data <Icon name="arrow" size={16} />
      </a>
      <div className="empty-features">
        <span>
          <Icon name="activity" size={15} /> Trend detection
        </span>
        <span>
          <Icon name="layers" size={15} /> Seasonal fingerprint
        </span>
        <span>
          <Icon name="file" size={15} /> CSV &amp; JSON exports
        </span>
      </div>
    </div>
  );
}

function AnalysisErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="empty-state" role="alert">
      <div className="empty-kicker">Analysis unavailable</div>
      <h2>No statistical result was produced</h2>
      <p>{message}</p>
      <button onClick={onRetry} type="button">
        Retry analysis <Icon name="arrow" size={16} />
      </button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="results results-loading">
      <div className="loading-status">
        <span className="radar">
          <i />
        </span>
        <div>
          <strong>Analyzing the observed series</strong>
          <p>Applying seasonal adjustment, trend tests, and confidence intervals…</p>
        </div>
      </div>
      <div className="skeleton verdict-skeleton" />
      <div className="metrics-grid">
        {[1, 2, 3, 4].map((item) => (
          <div className="metric skeleton-card" key={item}>
            <i />
            <b />
          </div>
        ))}
      </div>
      <div className="chart-card skeleton-chart">
        <div className="skeleton-line short" />
        <div className="skeleton-line" />
        <div className="chart-pulse">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      </div>
    </div>
  );
}

function Results({
  caseFile,
  selectedMethods,
  signalMode,
  setSignalMode,
  onNotify,
}: {
  caseFile: CaseFileAnalysisResponse;
  selectedMethods: AnalysisMethod[];
  signalMode: SignalMode;
  setSignalMode: (value: SignalMode) => void;
  onNotify: (message: string) => void;
}) {
  const router = useRouter();
  const exportCsv = () => {
    const header =
      "timestamp,value,seasonal_component,deseasonalized_value,anomaly_z,ols_trend,sen_trend,qa_flag\n";
    const rows = caseFile.analysis_series
      .map((row) =>
        [
          row.timestamp,
          row.value ?? "",
          row.seasonal_component ?? "",
          row.deseasonalized_value ?? "",
          row.anomaly_z ?? "",
          row.ols_trend ?? "",
          row.sen_trend ?? "",
          row.qa_flag,
        ].join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([header + rows], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `iris-${caseFile.result_id}-observations.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onNotify("Observed series and derived columns exported");
  };
  const isSignificant = caseFile.hamed_rao_mk_p < 0.05;
  const trendDirection = caseFile.hamed_rao_mk_z >= 0 ? "increasing" : "decreasing";
  const anomalyCount = caseFile.analysis_series.filter(
    (row) => row.anomaly_z !== null && Math.abs(row.anomaly_z) >= 2,
  ).length;
  const includes = (method: AnalysisMethod) => selectedMethods.includes(method);
  const hasTrendResult = selectedMethods.some((method) =>
    ["ols", "hamed_rao_mk", "seasonal_kendall", "sen_slope", "pettitt"].includes(method),
  );

  return (
    <div className="results">
      <div className="result-header">
        <div>
          <div className="section-kicker">
            <span>{caseFile.result_id}</span> Analysis complete
          </div>
          <h1>{caseFile.dataset_name} analysis</h1>
          <p>
            {caseFile.location} · {caseFile.start_year}–{caseFile.end_year} ·{" "}
            {caseFile.source_agency}
          </p>
        </div>
      </div>
      {includes("hamed_rao_mk") && (
        <section className="verdict">
          <div className="verdict-icon">
            <Icon name="arrow" size={24} />
          </div>
          <div className="verdict-body">
            <div className="verdict-label">Hamed–Rao Mann–Kendall result</div>
            <h2>
              {isSignificant
                ? `Statistically significant ${trendDirection} monotonic trend`
                : `No statistically significant ${trendDirection} trend detected`}
            </h2>
            <p>
              The autocorrelation-adjusted Mann–Kendall p-value is{" "}
              {formatPValue(caseFile.hamed_rao_mk_p)}; this is evidence about trend, not a
              probability that the hypothesis is true.
            </p>
          </div>
          <div className="confidence">
            <small>Valid observations</small>
            <strong>{caseFile.valid_months_count}</strong>
            <span>{caseFile.completeness_pct}% coverage</span>
          </div>
        </section>
      )}

      {selectedMethods.some((method) =>
        ["sen_slope", "hamed_rao_mk", "ols", "pettitt"].includes(method),
      ) && (
        <div className="metrics-grid">
          {includes("sen_slope") && (
            <Metric
              label="Sen’s slope"
              value={formatSigned(caseFile.sens_slope_decadal)}
              unit={`${caseFile.unit} / decade`}
              detail={`95% CI ${formatSigned(caseFile.sens_ci_low)} to ${formatSigned(caseFile.sens_ci_high)}`}
            />
          )}
          {includes("hamed_rao_mk") && (
            <Metric
              label="Hamed–Rao MK p"
              value={formatPValue(caseFile.hamed_rao_mk_p)}
              unit="two-sided"
              detail={`Z = ${caseFile.hamed_rao_mk_z}; τ = ${caseFile.kendall_tau}`}
              tone={isSignificant ? "positive" : undefined}
            />
          )}
          {includes("ols") && (
            <Metric
              label="OLS slope t-test"
              value={formatPValue(caseFile.ols_p_value)}
              unit={`t(${caseFile.ols_t_degrees_freedom}) = ${caseFile.ols_t_statistic}`}
              detail={`95% CI ${formatSigned(caseFile.ols_ci_low_decadal)} to ${formatSigned(caseFile.ols_ci_high_decadal)} ${caseFile.unit}/decade`}
            />
          )}
          {includes("pettitt") && (
            <Metric
              label="Change-point screen"
              value={caseFile.change_point_timestamp?.slice(0, 10) || "Not detected"}
              unit={
                caseFile.change_point_p_value == null
                  ? ""
                  : `Pettitt p ${formatPValue(caseFile.change_point_p_value)}`
              }
              detail="Candidate breakpoint; not causal evidence"
            />
          )}
        </div>
      )}

      <section className="chart-card">
        <div className="chart-header">
          <div>
            <div className="chart-title-row">
              <h2>{caseFile.dataset_name} over time</h2>
              <span className="data-chip">{caseFile.analysis_series.length} timestamps</span>
            </div>
            <p>
              {caseFile.source_agency} · {caseFile.unit} · Source QA flags retained
            </p>
          </div>
          <div className="exports">
            <button onClick={exportCsv} title="Download CSV" type="button">
              <Icon name="download" size={16} />
              <span>CSV</span>
            </button>
          </div>
        </div>
        <div className="chart-controls">
          <div className="segmented" role="group" aria-label="Chart signal type">
            <button
              className={signalMode === "raw" ? "active" : ""}
              onClick={() => setSignalMode("raw")}
              type="button"
            >
              Raw signal
            </button>
            <button
              hidden={caseFile.requested_seasonal_adjustment === "none"}
              className={signalMode === "seasonal" ? "active" : ""}
              onClick={() => setSignalMode("seasonal")}
              type="button"
            >
              Seasonal cycle
            </button>
            {includes("anomalies") && (
              <button
                className={signalMode === "anomaly" ? "active" : ""}
                onClick={() => setSignalMode("anomaly")}
                type="button"
              >
                Deseasonalized anomaly
              </button>
            )}
          </div>
          <div className="legend">
            <span>
              <i className="series-dot" />{" "}
              {signalMode === "raw"
                ? "Monthly observations"
                : signalMode === "seasonal"
                  ? "Extracted seasonal cycle"
                  : "Deseasonalized anomaly"}
            </span>
            {signalMode === "anomaly" && includes("anomalies") && (
              <>
                {includes("sen_slope") && (
                  <span>
                    <i className="trend-line" /> Sen’s slope
                  </span>
                )}
                <span>
                  <i className="anomaly-dot" /> |z| ≥ 2
                </span>
              </>
            )}
          </div>
        </div>
        <TimeSeriesChart
          mode={signalMode}
          series={caseFile.analysis_series}
          unit={caseFile.unit}
          showSenTrend={includes("sen_slope")}
        />
        {includes("anomalies") && (
          <div className="chart-insight">
            <div>
              <Icon name="sparkles" size={17} />
            </div>
            <p>
              <strong>What this means</strong>
              <span>
                {anomalyCount} observed records have |z| ≥ 2 after{" "}
                {caseFile.seasonal_adjustment_method.toLowerCase()}.
                Anomaly flags are review cues and are not removed from the analysis.
              </span>
            </p>
            <button
              onClick={() => {
                onNotify("Opening Evidence & Methods");
                router.push("/methodology");
              }}
              type="button"
            >
              View methodology <Icon name="arrow" size={14} />
            </button>
          </div>
        )}
      </section>
      {hasTrendResult && <TrendTests caseFile={caseFile} selectedMethods={selectedMethods} />}
      {includes("seasonal_fingerprint") && (
        <SeasonalFingerprintHeatmap
          series={caseFile.analysis_series}
          unit={caseFile.unit}
          method={caseFile.seasonal_adjustment_method}
        />
      )}
      {includes("anomalies") && <AnomalyStrip series={caseFile.analysis_series} />}
      {includes("case_file_diagnostics") && (
        <CaseFileDiagnosticsSection caseFile={caseFile} onNotify={onNotify} />
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  unit,
  detail,
  tone,
}: {
  label: string;
  value: string;
  unit: string;
  detail: string;
  tone?: string;
}) {
  return (
    <div className="metric">
      <div className="metric-label">
        {label}
        <Icon name="info" size={13} />
      </div>
      <div>
        <strong>{value}</strong>
        <span>{unit}</span>
      </div>
      <p className={tone}>{detail}</p>
    </div>
  );
}

function formatSigned(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(3)}`;
}

function formatPValue(value: number): string {
  return value < 0.0001 ? "<0.0001" : value.toFixed(4);
}

function TrendTests({
  caseFile,
  selectedMethods,
}: {
  caseFile: CaseFileAnalysisResponse;
  selectedMethods: AnalysisMethod[];
}) {
  const includes = (method: AnalysisMethod) => selectedMethods.includes(method);
  return (
    <section className="chart-card" style={{ marginTop: 16, padding: 16 }}>
      <div className="srs-sub-head">
        <strong>Trend significance tests</strong>
        <small>
          {caseFile.seasonal_adjustment_method} is applied before adjusted OLS and Hamed–Rao tests;
          no gaps are interpolated.
        </small>
      </div>
      <div className="srs-triangle-grid">
        {includes("ols") && <article className="srs-triangle-cell">
          <strong>OLS slope t-test</strong>
          <span>
            β = {formatSigned(caseFile.ols_slope_decadal)} {caseFile.unit}/decade
          </span>
          <span>
            t({caseFile.ols_t_degrees_freedom}) = {caseFile.ols_t_statistic}; p ={" "}
            {formatPValue(caseFile.ols_p_value)}
          </span>
          <span>
            95% CI [{formatSigned(caseFile.ols_ci_low_decadal)},{" "}
            {formatSigned(caseFile.ols_ci_high_decadal)}] {caseFile.unit}/decade
          </span>
        </article>}
        {includes("hamed_rao_mk") && <article className="srs-triangle-cell">
          <strong>Hamed–Rao Mann–Kendall</strong>
          <span>
            Z = {caseFile.hamed_rao_mk_z}; τ = {caseFile.kendall_tau}; p ={" "}
            {formatPValue(caseFile.hamed_rao_mk_p)}
          </span>
          <span>
            n effective = {caseFile.effective_sample_size_n_eff}; lag-1 rank correlation ={" "}
            {caseFile.lag1_autocorrelation}
          </span>
          <span>BH q = {formatPValue(caseFile.fdr_q_value)}</span>
        </article>}
        {includes("seasonal_kendall") && <article className="srs-triangle-cell">
          <strong>Seasonal Kendall</strong>
          <span>
            {caseFile.seasonal_kendall_p === null ||
            caseFile.seasonal_kendall_p === undefined
              ? "Insufficient repeated observations by calendar month"
              : `Z = ${caseFile.seasonal_kendall_z}; p = ${formatPValue(caseFile.seasonal_kendall_p)}`}
          </span>
          <span>Like calendar months are compared across years.</span>
        </article>}
        {includes("pettitt") && <article className="srs-triangle-cell">
          <strong>Pettitt change-point screen</strong>
          <span>
            {caseFile.change_point_timestamp
              ? `${caseFile.change_point_timestamp.slice(0, 10)} · p = ${
                  caseFile.change_point_p_value == null
                    ? "unavailable"
                    : formatPValue(caseFile.change_point_p_value)
                }`
              : "No candidate reported for this record"}
          </span>
          <span>A single-breakpoint diagnostic; inspect data and caveats before interpretation.</span>
        </article>}
      </div>
    </section>
  );
}

function SeasonalFingerprintHeatmap({
  series,
  unit,
  method,
}: {
  series: CaseFileObservation[];
  unit: string;
  method: string;
}) {
  const rows = useMemo(() => {
    const observed = new Map<string, CaseFileObservation>();
    for (const point of series) {
      const date = new Date(point.timestamp);
      observed.set(`${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`, point);
    }
    const firstYear = new Date(series[0]?.timestamp || "").getUTCFullYear();
    const lastYear = new Date(series[series.length - 1]?.timestamp || "").getUTCFullYear();
    return Array.from({ length: Math.max(0, lastYear - firstYear + 1) }, (_, index) => {
      const year = firstYear + index;
      return {
        year,
        cells: Array.from({ length: 12 }, (_, monthIndex) => ({
          month: monthIndex + 1,
          point: observed.get(`${year}-${monthIndex + 1}`),
        })),
      };
    });
  }, [series]);
  const monthLabels = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

  return (
    <section className="chart-card" style={{ marginTop: 16, padding: 16 }}>
      <div className="srs-sub-head">
        <strong>Seasonal fingerprint · year by month</strong>
        <small>
          {method} anomaly z-scores. Empty cells indicate missing or QA-excluded observations;
          scale is centered at zero.
        </small>
      </div>
      <div style={{ overflowX: "auto", marginTop: 12 }}>
        <div style={{ minWidth: 560 }}>
          <div
            aria-hidden="true"
            style={{
              display: "grid",
              gridTemplateColumns: "48px repeat(12, minmax(28px, 1fr))",
              gap: 3,
              marginBottom: 4,
            }}
          >
            <span />
            {monthLabels.map((month, index) => (
              <span key={index} style={{ textAlign: "center", fontSize: 10 }}>
                {month}
              </span>
            ))}
          </div>
          {rows.map((row) => (
            <div
              key={row.year}
              style={{
                display: "grid",
                gridTemplateColumns: "48px repeat(12, minmax(28px, 1fr))",
                gap: 3,
                marginBottom: 3,
              }}
            >
              <span style={{ fontSize: 10, alignSelf: "center" }}>{row.year}</span>
              {row.cells.map(({ month, point }) => {
                const z = point?.qa_flag === "Valid" ? point.anomaly_z : null;
                const color =
                  z === null || z === undefined
                    ? "var(--card-soft)"
                    : z < 0
                      ? `rgb(${Math.round(247 + (33 - 247) * Math.min(1, Math.abs(z) / 2.5))}, ${Math.round(247 + (102 - 247) * Math.min(1, Math.abs(z) / 2.5))}, ${Math.round(247 + (172 - 247) * Math.min(1, Math.abs(z) / 2.5))})`
                      : `rgb(${Math.round(247 + (178 - 247) * Math.min(1, z / 2.5))}, ${Math.round(247 + (24 - 247) * Math.min(1, z / 2.5))}, ${Math.round(247 + (43 - 247) * Math.min(1, z / 2.5))})`;
                return (
                  <span
                    aria-label={
                      point
                        ? `${row.year}-${String(month).padStart(2, "0")}: ${point.value ?? "missing"} ${unit}; anomaly z ${z?.toFixed(2) ?? "unavailable"}`
                        : `${row.year}-${String(month).padStart(2, "0")}: no observation`
                    }
                    key={month}
                    title={
                      point
                        ? `${row.year}-${String(month).padStart(2, "0")}: ${point.value ?? "missing"} ${unit}; anomaly z ${z?.toFixed(2) ?? "unavailable"}`
                        : `${row.year}-${String(month).padStart(2, "0")}: no observation`
                    }
                    style={{
                      height: 16,
                      borderRadius: 2,
                      background: color,
                      border: "1px solid var(--border)",
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 0 }}>
        Blue indicates cooler/drier/lower-than-usual values; red indicates higher-than-usual values.
        The sign describes this variable&apos;s anomaly, not a universal environmental impact.
      </p>
    </section>
  );
}

function AnomalyStrip({ series }: { series: CaseFileObservation[] }) {
  const firstTimestamp = Date.parse(series[0]?.timestamp || "");
  const lastTimestamp = Date.parse(series[series.length - 1]?.timestamp || "");
  const barWidth = Math.max(0.6, (780 / Math.max(1, series.length)) * 0.8);

  return (
    <section className="chart-card" style={{ marginTop: 16, padding: 16 }}>
      <div className="srs-sub-head">
        <strong>Anomaly strip</strong>
        <small>Observed deseasonalized z-score by timestamp; |z| ≥ 2 is flagged for review.</small>
      </div>
      <svg
        viewBox="0 0 840 64"
        role="img"
        aria-label="Anomaly barcode for the observed series, with missing and QA-excluded observations shown separately"
        style={{ width: "100%", height: 64, marginTop: 8 }}
      >
        {series.map((point) => {
          const timestamp = Date.parse(point.timestamp);
          const fraction =
            (timestamp - firstTimestamp) / Math.max(1, lastTimestamp - firstTimestamp);
          const z = point.anomaly_z;
          const magnitude = z === null ? 0 : Math.min(1, Math.abs(z) / 2.5);
          const color =
            point.qa_flag !== "Valid" || z === null
              ? "#cbd5e1"
              : z < 0
                ? `rgb(${Math.round(247 + (33 - 247) * magnitude)}, ${Math.round(247 + (102 - 247) * magnitude)}, ${Math.round(247 + (172 - 247) * magnitude)})`
                : `rgb(${Math.round(247 + (178 - 247) * magnitude)}, ${Math.round(247 + (24 - 247) * magnitude)}, ${Math.round(247 + (43 - 247) * magnitude)})`;
          return (
            <rect
              key={point.timestamp}
              x={30 + fraction * 780}
              y="6"
              width={barWidth}
              height="38"
              fill={color}
            >
              <title>
                {point.timestamp}: {point.value ?? "missing"} {point.qa_flag}, z ={" "}
                {z?.toFixed(2) ?? "unavailable"}
              </title>
            </rect>
          );
        })}
        <text x="30" y="60">
          {Number.isFinite(firstTimestamp) ? new Date(firstTimestamp).getUTCFullYear() : ""}
        </text>
        <text x="810" y="60" textAnchor="end">
          {Number.isFinite(lastTimestamp) ? new Date(lastTimestamp).getUTCFullYear() : ""}
        </text>
      </svg>
      <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 0 }}>
        Gray marks missing or QA-excluded records; blue and red show negative and positive
        departures. No observations are removed by this display.
      </p>
    </section>
  );
}

function TimeSeriesChart({
  mode,
  series,
  unit,
  showSenTrend,
}: {
  mode: SignalMode;
  series: CaseFileObservation[];
  unit: string;
  showSenTrend: boolean;
}) {
  const chart = useMemo(() => {
    const xMin = Date.parse(series[0]?.timestamp || "");
    const xMax = Date.parse(series[series.length - 1]?.timestamp || "");
    const yValue = (row: CaseFileObservation) =>
      mode === "raw"
        ? row.value
        : mode === "seasonal"
          ? row.seasonal_component
          : row.deseasonalized_value;
    const timestamps = series.map((row) => Date.parse(row.timestamp)).filter(Number.isFinite);
    const intervals = timestamps
      .slice(1)
      .map((timestamp, index) => timestamp - timestamps[index])
      .filter((interval) => interval > 0)
      .sort((a, b) => a - b);
    const typicalInterval = intervals.length
      ? intervals[Math.floor(intervals.length / 2)]
      : Number.POSITIVE_INFINITY;
    const validValues = series
      .filter((row) => row.qa_flag === "Valid")
      .map(yValue)
      .filter((value): value is number => value !== null && Number.isFinite(value));

    if (!validValues.length || !Number.isFinite(xMin) || !Number.isFinite(xMax)) {
      return null;
    }

    let yMin = Math.min(...validValues);
    let yMax = Math.max(...validValues);
    if (mode === "anomaly" && showSenTrend) {
      yMin = Math.min(yMin, 0);
      yMax = Math.max(yMax, 0);
    }
    const padding = (yMax - yMin) * 0.08 || Math.max(0.1, Math.abs(yMax) * 0.05);
    yMin -= padding;
    yMax += padding;
    const x = (timestamp: number) => 62 + ((timestamp - xMin) / Math.max(1, xMax - xMin)) * 730;
    const y = (value: number) => 210 - ((value - yMin) / (yMax - yMin)) * 170;

    const segments: string[] = [];
    let segment: string[] = [];
    let previousTimestamp: number | null = null;
    for (const row of series) {
      const timestamp = Date.parse(row.timestamp);
      const value = yValue(row);
      const valid = row.qa_flag === "Valid" && value !== null && Number.isFinite(value);
      const isGap =
        previousTimestamp !== null &&
        Number.isFinite(typicalInterval) &&
        timestamp - previousTimestamp > typicalInterval * 1.5;
      if (!valid || isGap) {
        if (segment.length > 1) segments.push(segment.join(" "));
        segment = [];
      }
      if (valid) segment.push(`${x(timestamp)},${y(value)}`);
      previousTimestamp = timestamp;
    }
    if (segment.length > 1) segments.push(segment.join(" "));

    const trendPoints: string[] = [];
    if (mode === "anomaly") {
      for (const row of series) {
        if (row.qa_flag === "Valid" && row.sen_trend !== null) {
          trendPoints.push(`${x(Date.parse(row.timestamp))},${y(row.sen_trend)}`);
        }
      }
    }
    const grid = Array.from({ length: 5 }, (_, index) => {
      const value = yMax - ((yMax - yMin) * index) / 4;
      return { value, y: y(value) };
    });

    return {
      segments,
      trend: trendPoints.join(" "),
      grid,
      x,
      xMin,
      xMax,
      y,
      yMin,
      yMax,
    };
  }, [mode, series, showSenTrend]);

  if (!chart) {
    return <p className="chart-wrap">No valid observations are available to plot.</p>;
  }

  const yearAt = (fraction: number) =>
    new Date(chart.xMin + (chart.xMax - chart.xMin) * fraction).getUTCFullYear();
  return (
    <div className="chart-wrap">
      <svg
        viewBox="0 0 840 260"
        role="img"
        aria-label={`${mode} time series in ${unit} from ${yearAt(0)} to ${yearAt(1)}; gaps are not interpolated`}
      >
        {chart.grid.map((tick) => (
          <g key={tick.value}>
            <line x1="58" x2="805" y1={tick.y} y2={tick.y} className="grid-line" />
            <text x="8" y={tick.y + 3}>
              {tick.value.toPrecision(3)}
            </text>
          </g>
        ))}
        {chart.segments.map((points, index) => (
          <polyline className="data-line" key={index} points={points} />
        ))}
        {chart.trend && <polyline className="slope-line" points={chart.trend} />}
        {mode === "anomaly" &&
          series.map((row) => {
            const anomalyValue = row.deseasonalized_value;
            if (
              row.qa_flag !== "Valid" ||
              row.anomaly_z === null ||
              Math.abs(row.anomaly_z) < 2 ||
              anomalyValue === null
            ) {
              return null;
            }
            return (
              <circle
                className="anomaly"
                key={row.timestamp}
                cx={chart.x(Date.parse(row.timestamp))}
                cy={chart.y(anomalyValue)}
                r="4"
              >
                <title>
                  {row.timestamp}: z = {row.anomaly_z?.toFixed(2)}, {row.value} {unit}
                </title>
              </circle>
            );
          })}
        <g className="axis-labels">
          <text x="48" y="240">
            {yearAt(0)}
          </text>
          <text x="777" y="240" textAnchor="end">
            {yearAt(1)}
          </text>
        </g>
      </svg>
    </div>
  );
}

function CaseFileDiagnosticsSection({
  caseFile,
  onNotify,
}: {
  caseFile: CaseFileAnalysisResponse;
  onNotify: (msg: string) => void;
}) {
  const [explainLevel, setExplainLevel] = useState<"explorer" | "student" | "scientist">(
    "student",
  );
  const [activeTab, setActiveTab] = useState<
    "fingerprint" | "robustness" | "caveats" | "outlook"
  >("fingerprint");

  const downloadCaseFileJson = () => {
    const blob = new Blob([JSON.stringify(caseFile, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `iris-case-file-${caseFile.result_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify("Full SRS Case File JSON exported with provenance");
  };

  return (
    <section className="srs-case-file-panel chart-card" style={{ marginTop: "20px" }}>
      {/* 1. RESULT IDENTITY, PROVENANCE & DETERMINISTIC EVIDENCE GRADE */}
      <div className="srs-cf-top">
        <div>
          <div className="dp-badges-row">
            <span className="dp-api-badge">
              <Icon name="file" size={12} /> Dynamic Case File · {caseFile.result_id}
            </span>
            <span className="dp-freq-badge">
              {caseFile.provenance_mode === "live_extracted_result"
                ? `Handoff from Extraction Job (${caseFile.source_job_id})`
                : caseFile.provenance_mode === "live_nasa_power"
                  ? "Live NASA POWER Series"
                  : "Pinned Real Snapshot"}
            </span>
            <code>SHA-256: {caseFile.sha256_hash.slice(0, 14)}…</code>
          </div>
          <h2 style={{ marginTop: "6px", fontSize: "17px" }}>{caseFile.evidence_grade_title}</h2>
          <p style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
            Method: <code>{caseFile.method_version}</code> · Effective Sample Size{" "}
            <b>n_eff = {caseFile.effective_sample_size_n_eff}</b> (lag-1 r₁ ={" "}
            {caseFile.lag1_autocorrelation}) · BH-FDR <b>q = {formatPValue(caseFile.fdr_q_value)}</b> · Seasonal
            Kendall <b>p = {caseFile.seasonal_kendall_p == null ? "unavailable" : formatPValue(caseFile.seasonal_kendall_p)}</b>
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span className={`srs-grade-badge grade-${caseFile.evidence_grade}`}>
            Evidence Grade {caseFile.evidence_grade}
          </span>
          <button className="dp-export-btn" onClick={downloadCaseFileJson} type="button">
            <Icon name="download" size={14} /> Case File JSON
          </button>
        </div>
      </div>

      {/* Deterministic Grade Reasons List */}
      <div className="srs-grade-reasons-strip">
        {caseFile.evidence_grade_reasons.map((reason) => (
          <div className="srs-grade-reason-item" key={reason}>
            <Icon name="check" size={13} />
            <span>{reason}</span>
          </div>
        ))}
      </div>

      {/* 2. THREE-LEVEL AUDIENCE EXPLANATION SWITCHER (EXPLORER / STUDENT / SCIENTIST) */}
      <div className="srs-explain-card">
        <div className="srs-explain-head">
          <div>
            <small>Deterministic Multi-Level Interpretation (Zero LLM-Invented Numbers)</small>
            <strong>Select Audience Depth</strong>
          </div>
          <div className="segmented" role="group" aria-label="Explanation level">
            {(["explorer", "student", "scientist"] as const).map((lvl) => (
              <button
                className={explainLevel === lvl ? "active" : ""}
                key={lvl}
                onClick={() => setExplainLevel(lvl)}
                type="button"
              >
                {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <p className="srs-explain-body">{caseFile.explanations[explainLevel]}</p>
      </div>

      {/* 3. DIAGNOSTIC VIEWS TABS (SEASONAL FINGERPRINT / TREND TRIANGLE / CAVEATS / OUTLOOK) */}
      <div className="srs-cf-tabs-bar">
        <div className="segmented" role="tablist" aria-label="Case File Diagnostic Views">
          <button
            className={activeTab === "fingerprint" ? "active" : ""}
            onClick={() => setActiveTab("fingerprint")}
            role="tab"
            type="button"
          >
            Stripes & 12-Month Fingerprint
          </button>
          <button
            className={activeTab === "robustness" ? "active" : ""}
            onClick={() => setActiveTab("robustness")}
            role="tab"
            type="button"
          >
            Robustness & Trend Triangle
          </button>
          <button
            className={activeTab === "caveats" ? "active" : ""}
            onClick={() => setActiveTab("caveats")}
            role="tab"
            type="button"
          >
            Caveats & Provenance ({caseFile.caveats.length})
          </button>
          <button
            className={activeTab === "outlook" ? "active" : ""}
            onClick={() => setActiveTab("outlook")}
            role="tab"
            type="button"
          >
            Outlook & Skill-Gated Forecast
          </button>
        </div>
      </div>

      {/* TAB 1: ANNUAL WARMING STRIPES & 12-MONTH SEASONAL FINGERPRINT */}
      {activeTab === "fingerprint" && (
        <div className="srs-cf-tab-content">
          <div className="srs-stripes-block">
            <div className="srs-sub-head">
              <strong>
                Annual Anomaly Stripes ({caseFile.start_year}–{caseFile.end_year})
              </strong>
              <small>Rule: Requires ≥10 valid months per calendar year</small>
            </div>
            <div className="srs-stripes-bar" role="img" aria-label="Annual anomaly trend stripes">
              {caseFile.annual_stripes.map((item) => {
                const z = item.z;
                const bg =
                  z === null
                    ? "#cbd5e1"
                    : z > 1.2
                    ? "#b91c1c"
                    : z > 0.4
                      ? "#ea580c"
                      : z > -0.4
                        ? "#cbd5e1"
                        : z > -1.2
                          ? "#38bdf8"
                          : "#0369a1";
                return (
                  <div
                    className="srs-stripe-col"
                    key={String(item.year)}
                    style={{ background: bg }}
                    title={`${item.year}: mean ${item.mean} ${caseFile.unit} (anomaly ${Number(item.anomaly) >= 0 ? "+" : ""}${item.anomaly}, Z=${z ?? "unavailable"})`}
                  />
                );
              })}
            </div>
          </div>

          <div className="srs-fingerprint-block" style={{ marginTop: "16px" }}>
            <div className="srs-sub-head">
              <strong>12-Month Seasonal Fingerprint (Month-by-Month Sen&apos;s Slope)</strong>
              <small>
                Seasonal Kendall p ={" "}
                {caseFile.seasonal_kendall_p == null
                  ? "unavailable"
                  : formatPValue(caseFile.seasonal_kendall_p)}
              </small>
            </div>
            <div className="srs-month-grid">
              {caseFile.monthly_fingerprint.map((m) => (
                <div
                  className={`srs-month-cell ${m.significant ? "sig" : ""}`}
                  key={m.month_name}
                >
                  <small>{m.month_name}</small>
                  <strong className={(m.decadal_slope ?? 0) >= 0 ? "pos" : "neg"}>
                    {m.decadal_slope == null ? "—" : formatSigned(m.decadal_slope)}
                  </strong>
                  <span>p={m.mk_p_value == null ? "—" : formatPValue(m.mk_p_value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MULTI-WINDOW ROBUSTNESS & TREND TRIANGLE */}
      {activeTab === "robustness" && (
        <div className="srs-cf-tab-content">
          <div className="srs-sub-head">
            <strong>Multi-Window Trend Triangle (Start/End Year Sensitivity Matrix)</strong>
            <small>
              Tests whether the trend holds across sub-windows or depends on isolated endpoint years
            </small>
          </div>
          <div className="srs-triangle-grid">
            {caseFile.trend_triangle.map((cell) => (
              <div
                className={`srs-triangle-cell ${cell.significant ? "sig" : "insig"}`}
                key={`${cell.start_year}-${cell.end_year}`}
              >
                <div className="srs-tri-window">
                  {cell.start_year}–{cell.end_year} <small>({cell.span_years} yr)</small>
                </div>
                <strong className={cell.decadal_slope >= 0 ? "pos" : "neg"}>
                  {cell.decadal_slope >= 0 ? "+" : ""}
                  {cell.decadal_slope} {caseFile.unit}/dec
                </strong>
                <span>
                  Hamed–Rao p = {cell.mk_p_value.toFixed(4)}{" "}
                  {cell.significant ? "· Significant" : "· Marginal"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: CAVEAT TIMELINE & SOURCE PROVENANCE */}
      {activeTab === "caveats" && (
        <div className="srs-cf-tab-content">
          <div className="srs-sub-head">
            <strong>Registered Dataset & Method Caveat Timeline</strong>
            <small>Source Archive: {caseFile.source_agency}</small>
          </div>
          <div className="srs-caveat-timeline">
            {caseFile.caveats.map((cav) => (
              <article className={`srs-caveat-item ${cav.severity}`} key={cav.title}>
                <div className="srs-caveat-meta">
                  <code>{cav.date_or_period}</code>
                  <span className="dp-freq-badge">{cav.category}</span>
                </div>
                <h4>{cav.title}</h4>
                <p>{cav.description}</p>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: OUTLOOK & SKILL-GATED FORECAST */}
      {activeTab === "outlook" && (
        <div className="srs-cf-tab-content">
          <div className="srs-not-prediction-banner" role="alert">
            <Icon name="alert" size={16} />
            <strong>{caseFile.outlook.not_a_prediction_label}</strong>
          </div>

          <div className="srs-outlook-grid">
            <article className="srs-outlook-card">
              <small>1. Trend-Continuation Horizon (to {caseFile.outlook.horizon_year})</small>
              <h4>Conditional Sen&apos;s Slope Continuation Corridor</h4>
              <div className="srs-continuation-table">
                {caseFile.outlook.continuation_points.map((pt) => (
                  <div className="srs-cont-row" key={pt.year}>
                    <code>{pt.year}</code>
                    <strong>
                      {pt.central_value} {caseFile.unit}
                    </strong>
                    <span>
                      95% Corridor: [{pt.ci_low}, {pt.ci_high}]
                    </span>
                  </div>
                ))}
              </div>
            </article>

            <article className="srs-outlook-card">
              <small>2. Skill-Gated Short-Term Statistical Hindcast Check</small>
              <h4>
                {caseFile.outlook.skill_gate_passed
                  ? "Skill Gate Passed — 3-Year Hindcast Verified"
                  : "Skill Gate Suppressed — Noise Exceeds Short-Term Predictability"}
              </h4>
              <p style={{ fontSize: "12px", color: "var(--muted)", margin: "6px 0 10px" }}>
                {caseFile.outlook.skill_gate_reason}
              </p>
              <div className="srs-skill-metrics">
                <span>
                  <small>Skill Score (PSS)</small>
                  <b>{caseFile.outlook.skill_score_pss ?? "Not evaluated"}</b>
                </span>
                <span>
                  <small>Backtest RMSE</small>
                  <b>
                    {caseFile.outlook.backtest_rmse ?? "Not evaluated"}{" "}
                    {caseFile.outlook.backtest_rmse === null ? "" : caseFile.unit}
                  </b>
                </span>
                <span>
                  <small>Climatology RMSE</small>
                  <b>
                    {caseFile.outlook.climatology_baseline_rmse ?? "Not evaluated"}{" "}
                    {caseFile.outlook.climatology_baseline_rmse === null
                      ? ""
                      : caseFile.unit}
                  </b>
                </span>
              </div>
              <p className="srs-cmip6-note">{caseFile.outlook.cmip6_Reference_note}</p>
            </article>
          </div>
        </div>
      )}
    </section>
  );
}

function AnalysisRoute() {
  const params = useSearchParams();
  const id = params.get('forecastId');
  if (id) redirect(forecastHref(id, params.get("run")));
  return <HistoricalAnalysis/>;
}
export default function DashboardAnalysis() {
  return <Suspense fallback={<div className="dashboard-page-inner">Loading workspace...</div>}><AnalysisRoute/></Suspense>;
}
