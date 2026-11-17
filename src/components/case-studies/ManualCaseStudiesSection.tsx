"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import {
  MANUAL_CASE_STUDIES,
  MANUAL_CASE_STUDIES_PURPOSE,
  type ManualCaseStudy,
} from "@/lib/manualCaseStudies";

interface ManualCaseStudiesSectionProps {
  mode: "public" | "dashboard";
  initialCaseId?: string;
  onOpenCaseInWorkspace?: (
    caseId: string,
    destination: "preview" | "analysis" | "visualize" | "selection",
    preferredVariableId?: string,
  ) => Promise<void> | void;
}

export function ManualCaseStudiesSection({
  mode,
  initialCaseId,
  onOpenCaseInWorkspace,
}: ManualCaseStudiesSectionProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>(
    initialCaseId && MANUAL_CASE_STUDIES.some((c) => c.id === initialCaseId)
      ? initialCaseId
      : MANUAL_CASE_STUDIES[0].id
  );
  const [activeTab, setActiveTab] = useState<"analysis" | "outcome" | "datasets" | "charts">(
    "analysis"
  );
  const [loadingTarget, setLoadingTarget] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("case") || params.get("caseStudy");
    if (fromQuery && MANUAL_CASE_STUDIES.some((c) => c.id === fromQuery)) {
      setSelectedId(fromQuery);
    }
  }, [initialCaseId]);

  const activeCase: ManualCaseStudy =
    MANUAL_CASE_STUDIES.find((c) => c.id === selectedId) ?? MANUAL_CASE_STUDIES[0];

  const handleSelectCase = (id: string) => {
    setSelectedId(id);
    const el = document.getElementById("manual-case-deep-dive");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  const triggerWorkspaceLoad = async (
    caseId: string,
    destination: "preview" | "analysis" | "visualize" | "selection",
    preferredVariableId?: string,
  ) => {
    const routeMap = {
      preview: "/workspace/data-preview",
      analysis: "/workspace/data-analysis",
      visualize: "/workspace/visualize",
      selection: "/workspace/data-selection",
    };
    const query = new URLSearchParams({ caseStudy: caseId });
    if (preferredVariableId) query.set("variable", preferredVariableId);

    if (mode === "dashboard" && onOpenCaseInWorkspace) {
      setLoadingTarget(`${caseId}-${destination}-${preferredVariableId || "all"}`);
      try {
        await onOpenCaseInWorkspace(caseId, destination, preferredVariableId);
      } finally {
        setLoadingTarget("");
      }
      return;
    }

    router.push(`${routeMap[destination]}?${query.toString()}`);
  };

  return (
    <div className="manual-cases-wrapper">
      {/* ─── 1. TOP PURPOSE & PLATFORM EFFICIENCY BENCHMARK BANNER ─────── */}
      <section
        className="manual-purpose-banner"
        aria-label="Purpose of manual research case studies"
      >
        <div className="manual-purpose-header">
          <div className="manual-purpose-copy">
            <span className="manual-purpose-kicker">
              <Icon name="sparkles" size={13} /> {MANUAL_CASE_STUDIES_PURPOSE.kicker}
            </span>
            <h2>{MANUAL_CASE_STUDIES_PURPOSE.title}</h2>
            <p>{MANUAL_CASE_STUDIES_PURPOSE.summary}</p>
          </div>
          <div className="manual-purpose-badge-box">
            <div className="manual-purpose-stat">
              <small>Research Ground Truth</small>
              <strong>5 Manual Studies</strong>
              <span>15 NASA Giovanni satellite series audited</span>
            </div>
            <div className="manual-purpose-stat accent">
              <small>Platform Speedup</small>
              <strong>Hours → Minutes</strong>
              <span>Manual CSV scripts vs. automated Iris workbench</span>
            </div>
          </div>
        </div>

        <div className="manual-efficiency-grid">
          {MANUAL_CASE_STUDIES_PURPOSE.comparisonMetrics.map((metric) => (
            <article className="manual-efficiency-card" key={metric.label}>
              <div className="manual-efficiency-top">
                <strong>{metric.label}</strong>
                <span className="manual-speedup-pill">{metric.speedup}</span>
              </div>
              <div className="manual-vs-rows">
                <div className="manual-vs-row is-manual">
                  <small>Manual Research Team Analysis</small>
                  <p>{metric.manual}</p>
                </div>
                <div className="manual-vs-row is-iris">
                  <small>Automated on Iris Website</small>
                  <p>{metric.iris}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ─── 2. ALL 5 MANUAL CASE STUDIES OVERVIEW GRID ────────────────── */}
      <section className="manual-cases-grid-section" id="manual-case-studies">
        <div className="manual-section-head">
          <div>
            <span className="section-kicker">
              <span>05</span> Research Team Manual Benchmark Case Studies
            </span>
            <h2>Select any of the 5 manual investigations to inspect the analysis &amp; outcome</h2>
          </div>
          <p className="manual-section-sub">
            Click a case card below to view how our research team analyzed the raw NASA satellite
            telemetry, what the statistical &amp; physical outcome is, or click{" "}
            <strong>Open in Dashboard</strong> to automatically load its datasets into Data Preview,
            Data Analysis, and Data Visualization.
          </p>
        </div>

        <div className="manual-five-grid" role="tablist" aria-label="Five manual case studies">
          {MANUAL_CASE_STUDIES.map((study) => {
            const isSelected = study.id === activeCase.id;
            return (
              <article
                key={study.id}
                role="tab"
                aria-selected={isSelected}
                tabIndex={0}
                onClick={() => handleSelectCase(study.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelectCase(study.id);
                  }
                }}
                className={`manual-study-card tone-${study.tone}${isSelected ? " is-active" : ""}`}
              >
                <div className="manual-study-card-top">
                  <span className="manual-case-num">{study.caseNumber}</span>
                  <span className="manual-phenom-tag">{study.phenomenon}</span>
                </div>

                <div className="manual-study-icon-row">
                  <div className="manual-study-icon">
                    <Icon name={study.icon} size={18} />
                  </div>
                  <small>{study.eventDate}</small>
                </div>

                <h3>{study.shortTitle}</h3>
                <p className="manual-study-loc">
                  <Icon name="globe" size={12} /> {study.location}
                </p>

                <div className="manual-study-finding-box">
                  <div>
                    <small>Primary Outcome</small>
                    <strong>{study.primaryFinding}</strong>
                  </div>
                  <div>
                    <small>Statistical Evidence</small>
                    <span>{study.statisticalConfidence}</span>
                  </div>
                </div>

                <div className="manual-study-card-footer">
                  <span className="manual-dataset-count">
                    {study.datasets.length} NASA {study.datasets.length === 1 ? "Dataset" : "Datasets"}
                  </span>
                  <button
                    type="button"
                    className="manual-card-open-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      void triggerWorkspaceLoad(study.id, "preview");
                    }}
                  >
                    Open in Dashboard <Icon name="arrow" size={12} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* ─── 3. ACTIVE MANUAL CASE STUDY DEEP-DIVE WORKSPACE ───────────── */}
      <section
        className="manual-deep-dive-card"
        id="manual-case-deep-dive"
        aria-live="polite"
      >
        {/* Header Bar */}
        <div className="manual-deep-header">
          <div className="manual-deep-title-col">
            <div className="manual-deep-badges">
              <span className="manual-badge-primary">{activeCase.caseNumber}</span>
              <span className="manual-badge-secondary">{activeCase.phenomenon}</span>
              <span className="manual-badge-window">
                Window: {activeCase.observationWindow}
              </span>
              <code className="manual-badge-bbox">BBox: {activeCase.regionBox}</code>
            </div>
            <h2>{activeCase.title}</h2>
            <p className="manual-deep-subtitle">{activeCase.subtitle}</p>
          </div>

          <div className="manual-deep-actions">
            <div className="manual-time-comparison-pill">
              <div>
                <small>Manual Team Effort</small>
                <strong>{activeCase.manualTimeSpent}</strong>
              </div>
              <div className="iris-side">
                <small>On Iris Platform</small>
                <strong>{activeCase.irisTimeEquivalent}</strong>
              </div>
            </div>

            <div className="manual-workspace-btn-group">
              <button
                type="button"
                className="manual-action-btn"
                disabled={!!loadingTarget}
                onClick={() => void triggerWorkspaceLoad(activeCase.id, "preview")}
              >
                {loadingTarget.startsWith(`${activeCase.id}-preview`)
                  ? "Loading Datasets…"
                  : "Open in Dashboard · Data Preview"}{" "}
                <Icon name="arrow" size={14} />
              </button>
              <div className="manual-secondary-btn-row">
                <button
                  type="button"
                  className="manual-sub-action-btn"
                  disabled={!!loadingTarget}
                  onClick={() => void triggerWorkspaceLoad(activeCase.id, "analysis")}
                >
                  Auto-Run in Data Analysis <Icon name="activity" size={13} />
                </button>
                <button
                  type="button"
                  className="manual-sub-action-btn"
                  disabled={!!loadingTarget}
                  onClick={() => void triggerWorkspaceLoad(activeCase.id, "visualize")}
                >
                  Open in Visualization Studio <Icon name="chart" size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Executive Overview Callout */}
        <div className="manual-exec-summary">
          <div>
            <small>Executive Overview</small>
            <p>{activeCase.executiveSummary}</p>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="manual-detail-tabs" role="tablist" aria-label="Case study sections">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "analysis"}
            className={activeTab === "analysis" ? "active" : ""}
            onClick={() => setActiveTab("analysis")}
          >
            1. How the Data Was Analysed &amp; Outcome Overview
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "outcome"}
            className={activeTab === "outcome" ? "active" : ""}
            onClick={() => setActiveTab("outcome")}
          >
            2. Physical Causal Chain &amp; Detailed Outcome ({activeCase.whatTheOutcomeIs.physicalStages.length} Stages)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "datasets"}
            className={activeTab === "datasets" ? "active" : ""}
            onClick={() => setActiveTab("datasets")}
          >
            3. NASA Datasets &amp; Giovanni Links ({activeCase.datasets.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "charts"}
            className={activeTab === "charts" ? "active" : ""}
            onClick={() => setActiveTab("charts")}
          >
            4. Manual Analysis Time-Series Charts ({activeCase.figures.length})
          </button>
        </div>

        {/* ─── TAB 1: HOW THE DATA WAS ANALYSED + KEY OUTCOME SUMMARY ──── */}
        {activeTab === "analysis" && (
          <div className="manual-tab-panel">
            <div className="manual-two-col">
              {/* Left: How the Data Was Analysed */}
              <div className="manual-col-card">
                <div className="manual-col-kicker">
                  <Icon name="activity" size={14} /> How the Data Was Analysed
                </div>
                <h3>Research Methodology &amp; Statistical Pipeline</h3>
                <p className="manual-body-text">{activeCase.howDataWasAnalysed.overview}</p>

                <div className="manual-methods-box">
                  <h4>Statistical &amp; Analytical Methods Applied</h4>
                  <ul>
                    {activeCase.howDataWasAnalysed.statisticalMethodsUsed.map((m) => (
                      <li key={m}>
                        <Icon name="check" size={13} />
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="manual-scale-note">
                  <strong>Spatial &amp; Temporal Resolution Considerations:</strong>
                  <p>{activeCase.howDataWasAnalysed.spatialTemporalNotes}</p>
                </div>
              </div>

              {/* Right: What the Outcome Is (Summary + Key Metrics) */}
              <div className="manual-col-card outcome-highlight">
                <div className="manual-col-kicker">
                  <Icon name="check" size={14} /> What the Outcome Is
                </div>
                <h3>Verified Scientific Verdict &amp; Impact</h3>
                <div className="manual-verdict-banner">
                  <strong>{activeCase.whatTheOutcomeIs.headlineVerdict}</strong>
                </div>
                <p className="manual-body-text">{activeCase.whatTheOutcomeIs.summary}</p>

                <div className="manual-metrics-quad">
                  {activeCase.whatTheOutcomeIs.keyMetrics.map((km) => (
                    <div className="manual-metric-tile" key={km.label}>
                      <small>{km.label}</small>
                      <strong>{km.value}</strong>
                      <span>{km.context}</span>
                    </div>
                  ))}
                </div>

                <div className="manual-impact-footer">
                  <small>Documented Real-World Disaster Outcome</small>
                  <p>{activeCase.whatTheOutcomeIs.realWorldImpact}</p>
                </div>
              </div>
            </div>

            {/* Step-by-Step Manual Analysis vs. Iris Automated Execution */}
            <div className="manual-steps-comparison">
              <div className="manual-steps-head">
                <h4>Step-by-Step Analysis Pipeline: Manual Research Workflow vs. Iris Website</h4>
                <p>
                  How each analytical step was performed manually by our research team compared to
                  how the Iris platform automates it:
                </p>
              </div>
              <div className="manual-steps-grid">
                {activeCase.howDataWasAnalysed.steps.map((st) => (
                  <article className="manual-step-card" key={st.step}>
                    <div className="manual-step-top">
                      <span className="manual-step-num">Step {st.step}</span>
                      <strong>{st.title}</strong>
                    </div>
                    <p>{st.detail}</p>
                    <div className="manual-step-compare">
                      <div className="step-tag manual">
                        <small>Manual Analysis</small>
                        <span>{st.manualEffort}</span>
                      </div>
                      <div className="step-tag iris">
                        <small>Iris Platform</small>
                        <span>{st.irisEquivalent}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: PHYSICAL CAUSAL CHAIN & DETAILED OUTCOME ─────────── */}
        {activeTab === "outcome" && (
          <div className="manual-tab-panel">
            <div className="manual-verdict-banner" style={{ marginBottom: "18px" }}>
              <small style={{ display: "block", fontSize: "10px", textTransform: "uppercase", marginBottom: "4px", opacity: 0.85 }}>
                Causal Discovery &amp; Outcome Synthesis
              </small>
              <strong>{activeCase.whatTheOutcomeIs.headlineVerdict}</strong>
            </div>

            <div className="manual-cascade-grid">
              {activeCase.whatTheOutcomeIs.physicalStages.map((stage) => (
                <article className="manual-cascade-card" key={stage.stage + stage.title}>
                  <div className="manual-cascade-head">
                    <span className="manual-stage-pill">{stage.stage}</span>
                    <time>{stage.timeframe}</time>
                  </div>
                  <h4>{stage.title}</h4>
                  <p>{stage.mechanism}</p>
                  <div className="manual-cascade-proof">
                    <small>Satellite Telemetry Proof</small>
                    <strong>{stage.quantitativeProof}</strong>
                  </div>
                </article>
              ))}
            </div>

            <div className="manual-impact-footer" style={{ marginTop: "18px" }}>
              <small>Final Disaster Outcome &amp; Infrastructure / Human Impact</small>
              <p>{activeCase.whatTheOutcomeIs.realWorldImpact}</p>
            </div>
          </div>
        )}

        {/* ─── TAB 3: NASA DATASETS & DIRECT GIOVANNI LINKS ────────────── */}
        {activeTab === "datasets" && (
          <div className="manual-tab-panel">
            <div className="manual-datasets-intro">
              <div>
                <h4>Audited NASA GES DISC Giovanni Satellite Datasets &amp; Reproduction Links</h4>
                <p>
                  Every dataset below was analyzed in the manual research study over{" "}
                  <code>{activeCase.regionBox}</code>. Click <strong>Load in Dashboard</strong> to
                  open that specific series directly in Data Preview, Analysis &amp; Visualization,
                  or click <strong>Reproduce in NASA Giovanni ↗</strong> to open the interactive
                  NASA portal.
                </p>
              </div>
            </div>

            <div className="manual-dataset-list">
              {activeCase.datasets.map((ds) => (
                <article className="manual-dataset-card" key={ds.code}>
                  <div className="manual-dataset-head">
                    <div>
                      <span className="manual-ds-agency">{ds.agency}</span>
                      <h4>{ds.name}</h4>
                      <code>{ds.code}</code>
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="manual-action-btn"
                        style={{ padding: "8px 13px", fontSize: "11px" }}
                        onClick={() =>
                          void triggerWorkspaceLoad(activeCase.id, "preview", ds.code)
                        }
                      >
                        Load Dataset in Dashboard <Icon name="arrow" size={12} />
                      </button>
                      {ds.giovanniUrl && (
                        <a
                          href={ds.giovanniUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="manual-giovanni-link"
                        >
                          Reproduce in NASA Giovanni <Icon name="external" size={12} />
                        </a>
                      )}
                    </div>
                  </div>

                  <p className="manual-ds-desc">{ds.whatDataShows}</p>

                  <dl className="manual-ds-meta-grid">
                    <div>
                      <dt>Resolution &amp; Cadence</dt>
                      <dd>{ds.resolution}</dd>
                    </div>
                    <div>
                      <dt>Coverage &amp; Units</dt>
                      <dd>
                        {ds.coverage} ({ds.units})
                      </dd>
                    </div>
                    <div>
                      <dt>Historical Baseline</dt>
                      <dd>{ds.baselineMetric}</dd>
                    </div>
                    <div>
                      <dt>Event Peak / Trend</dt>
                      <dd className="highlight">{ds.eventPeakOrTrend}</dd>
                    </div>
                    <div className="full-span">
                      <dt>Statistical Significance &amp; Finding</dt>
                      <dd>{ds.statisticalFinding}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB 4: MANUAL ANALYSIS TIME-SERIES CHARTS ───────────────── */}
        {activeTab === "charts" && (
          <div className="manual-tab-panel">
            <div className="manual-datasets-intro">
              <div>
                <h4>NASA Giovanni Area-Averaged Time-Series Plots from the Manual Analysis</h4>
                <p>
                  Original time-series visualizations generated by our research team during the
                  manual investigation of <strong>{activeCase.shortTitle}</strong>.
                </p>
              </div>
            </div>

            <div className="manual-figures-grid">
              {activeCase.figures.map((fig) => (
                <figure className="manual-figure-card" key={fig.title}>
                  <div className="manual-figure-top">
                    <div>
                      <strong>{fig.title}</strong>
                      <code>{fig.datasetCode}</code>
                    </div>
                    {fig.giovanniUrl && (
                      <a
                        href={fig.giovanniUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="manual-giovanni-link compact"
                      >
                        NASA Giovanni Link <Icon name="external" size={11} />
                      </a>
                    )}
                  </div>
                  <div className="manual-figure-img-wrap">
                    <img
                      src={fig.imageSrc}
                      alt={fig.title}
                      loading="lazy"
                      className="manual-figure-img"
                    />
                  </div>
                  <figcaption>{fig.caption}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
