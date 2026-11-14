"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useDashboard } from "@/context/DashboardContext";
import { caseStudies } from "@/lib/dashboardData";
import {
  GLOSSARY_TERMS,
  GUIDED_INVESTIGATIONS,
  type GuidedInvestigation,
} from "@/lib/srsCubeAndScienceEngine";

export default function DashboardCasesPage() {
  const router = useRouter();
  const { loadCase } = useDashboard();
  const [filter, setFilter] = useState("All");
  const [activeInvId, setActiveInvId] = useState(GUIDED_INVESTIGATIONS[0].id);
  const [explainDepth, setExplainDepth] = useState<"explorer" | "student" | "scientist">("student");
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const filters = ["All", ...new Set(caseStudies.map((item) => item.phenomenon))];
  const visible = caseStudies.filter((item) => filter === "All" || item.phenomenon === filter);
  const activeInv: GuidedInvestigation =
    GUIDED_INVESTIGATIONS.find((g) => g.id === activeInvId) ?? GUIDED_INVESTIGATIONS[0];

  return (
    <div className="dashboard-cases-page dashboard-page-inner">
      <section className="case-library-hero">
        <div>
          <div className="dashboard-kicker">
            <Icon name="book" size={14} /> Curated solved case files
          </div>
          <h2>Start with a story that already has evidence.</h2>
          <p>
            Each case bundles a representative request, source, and analysis state for an instant
            frontend demonstration.
          </p>
        </div>
        <span>
          <strong>{caseStudies.length}</strong>
          bundled investigations
        </span>
      </section>
      <div className="dashboard-filter-tabs" role="group" aria-label="Filter case studies">
        {filters.map((item) => (
          <button
            className={item === filter ? "active" : ""}
            key={item}
            onClick={() => setFilter(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>
      <section className="dashboard-case-grid">
        {visible.map((item, index) => (
          <article className="dashboard-case-card dashboard-card" key={item.id}>
            <div className={`dashboard-case-art case-tone-${index % 4}`}>
              <span>{item.id}</span>
              <Icon
                name={
                  item.datasetId === "temperature"
                    ? "thermometer"
                    : item.datasetId === "snow"
                      ? "globe"
                      : "layers"
                }
                size={27}
              />
              <i />
              <i />
            </div>
            <div className="dashboard-case-body">
              <span>{item.location}</span>
              <h3>{item.title}</h3>
              <dl>
                <div>
                  <dt>Finding</dt>
                  <dd>{item.finding}</dd>
                </div>
                <div>
                  <dt>Confidence</dt>
                  <dd>{item.confidence}</dd>
                </div>
              </dl>
              <p>
                {item.source} · {item.startYear}–{item.endYear}
              </p>
              <button
                onClick={() => {
                  loadCase(item, true);
                  router.push("/workspace/data-analysis");
                }}
                type="button"
              >
                Load case <Icon name="arrow" size={15} />
              </button>
            </div>
          </article>
        ))}
      </section>

      {/* SRS v1.0 SEQUENCED GUIDED INVESTIGATIONS & CHECKPOINT WORKBENCH */}
      <section className="dashboard-card srs-guided-section" style={{ marginTop: "20px", padding: "24px" }}>
        <div className="dp-header-top">
          <div>
            <span className="section-kicker">
              <span>02</span> SRS Sequenced Guided Investigations (Pinned Real NASA Snapshots)
            </span>
            <h2 style={{ marginTop: "6px" }}>
              Step-by-Step Forensic Walkthroughs with Interactive Checkpoints
            </h2>
            <p className="dp-dataset-subtitle">
              Each guided investigation uses a pinned real NASA dataset snapshot with verifiable
              SHA-256 provenance, three audience explanation levels, and interactive methodological
              checkpoints.
            </p>
          </div>
          <div className="segmented" role="group" aria-label="Explanation depth">
            {(["explorer", "student", "scientist"] as const).map((lvl) => (
              <button
                className={explainDepth === lvl ? "active" : ""}
                key={lvl}
                onClick={() => setExplainDepth(lvl)}
                type="button"
              >
                {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="dashboard-filter-tabs" style={{ marginTop: "14px" }}>
          {GUIDED_INVESTIGATIONS.map((inv) => (
            <button
              className={inv.id === activeInv.id ? "active" : ""}
              key={inv.id}
              onClick={() => setActiveInvId(inv.id)}
              type="button"
            >
              {inv.caseId} · {inv.regionName} ({inv.variableId})
            </button>
          ))}
        </div>

        <div className="srs-guided-body" style={{ marginTop: "16px" }}>
          <div className="srs-guided-meta-card">
            <div className="dp-badges-row">
              <span className="dp-api-badge">
                <Icon name="check" size={12} /> Pinned Real Snapshot
              </span>
              <span className={`srs-grade-badge grade-${activeInv.evidenceGrade}`}>
                Evidence Grade {activeInv.evidenceGrade}
              </span>
              <code>SHA-256: {activeInv.snapshotSha256.slice(0, 16)}…</code>
            </div>
            <h3 style={{ marginTop: "8px" }}>{activeInv.title}</h3>
            <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "4px" }}>
              {activeInv.subtitle} · <strong>{activeInv.sourceArchive}</strong> ({activeInv.window})
            </p>
            <div className="srs-explain-card" style={{ marginTop: "12px" }}>
              <small style={{ textTransform: "uppercase", fontWeight: 700, fontSize: "10px" }}>
                {explainDepth} Narrative Summary
              </small>
              <p style={{ marginTop: "4px", fontSize: "13.5px", lineHeight: 1.55 }}>
                {activeInv.explanations[explainDepth]}
              </p>
            </div>

            <div className="srs-guided-steps" style={{ marginTop: "16px" }}>
              {activeInv.steps.map((st) => {
                const key = `${activeInv.id}-${st.stepNumber}`;
                const chosen = selectedAnswers[key];
                const isCorrect = chosen === st.correctIndex;
                return (
                  <article className="srs-checkpoint-card" key={key}>
                    <div className="srs-checkpoint-head">
                      <span className="dp-freq-badge">Checkpoint {st.stepNumber}</span>
                      <strong>{st.title}</strong>
                    </div>
                    <p className="srs-checkpoint-q">{st.checkpointQuestion}</p>
                    <div className="srs-checkpoint-options">
                      {st.checkpointOptions.map((opt, idx) => (
                        <button
                          className={`srs-opt-btn ${
                            chosen === idx ? (idx === st.correctIndex ? "correct" : "wrong") : ""
                          }`}
                          key={opt}
                          onClick={() =>
                            setSelectedAnswers((prev) => ({ ...prev, [key]: idx }))
                          }
                          type="button"
                        >
                          <span>{String.fromCharCode(65 + idx)}.</span> {opt}
                        </button>
                      ))}
                    </div>
                    {chosen !== undefined && (
                      <div className={`srs-checkpoint-feedback ${isCorrect ? "good" : "warn"}`}>
                        <strong>
                          {isCorrect ? "Verified Methodological Insight:" : "Review Methodological Rule:"}
                        </strong>{" "}
                        {st.checkpointExplanation}
                        <div style={{ marginTop: "4px", fontWeight: 600 }}>
                          Key Finding: {st.keyFinding}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "16px" }}>
              <button
                className="dp-proceed-btn"
                onClick={() => {
                  const matched =
                    caseStudies.find((c) => c.id === activeInv.caseId) ?? caseStudies[0];
                  loadCase(matched, true);
                  router.push("/workspace/data-analysis");
                }}
                type="button"
              >
                Try It Yourself in Dynamic Case File <Icon name="arrow" size={14} />
              </button>
              <a
                className="dp-doi-link"
                href={activeInv.citationDoi}
                rel="noreferrer"
                style={{ alignSelf: "center" }}
                target="_blank"
              >
                Official NASA Archive DOI <Icon name="external" size={12} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* SRS v1.0 SCIENTIFIC & STATISTICAL GLOSSARY */}
      <section className="dashboard-card srs-glossary-section" style={{ marginTop: "20px", padding: "24px" }}>
        <span className="section-kicker">
          <span>03</span> Scientific & Statistical Glossary
        </span>
        <h3 style={{ marginTop: "6px", marginBottom: "14px" }}>
          Core Definitions Used Across Globe & Case File
        </h3>
        <div className="srs-glossary-grid">
          {GLOSSARY_TERMS.map((item) => (
            <article className="srs-glossary-card" key={item.term}>
              <div className="srs-glossary-top">
                <strong>{item.term}</strong>
                <span className="dp-freq-badge">{item.category}</span>
              </div>
              <p>{item.definition}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
