"use client";

import React, { useState } from "react";

export function ScientificVerdict() {
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const questions = [
    {
      id: 1,
      q: "Which of these five datasets resolves the September 25–26 change?",
      options: [
        "Monthly precipitation (NLDAS-2)",
        "Daily soil moisture (GLDAS CLSM)",
        "Regional wind speed (MERRA-2)",
        "Coastal SST (MODIS-Aqua)",
      ],
      correct: "Daily soil moisture (GLDAS CLSM)",
      explanation:
        "Only the GLDAS daily land-surface moisture dataset provides day-to-day temporal resolution (showing +1.02 kg/m²). The other four products summarize monthly intervals.",
    },
    {
      id: 2,
      q: "Can September's monthly rainfall be treated as Helene's exact rainfall total?",
      options: ["Yes", "No"],
      correct: "No",
      explanation:
        "September's 212.52 kg/m² represents all precipitation accumulated across the entire calendar month and study bounding box, including pre-existing rainfall and unassociated frontal systems.",
    },
    {
      id: 3,
      q: "Is 4.79 m/s the hurricane's peak wind?",
      options: ["Yes", "No"],
      correct: "No",
      explanation:
        "4.79 m/s is an area-averaged monthly mean wind speed across thousands of square kilometers. It necessarily dampens short-lived eyewall gusts which exceeded 60 m/s at landfall.",
    },
  ];

  return (
    <section className="helene-section" id="scientific-verdict">
      <div className="helene-container">
        <div className="helene-verdict-grid">
          {/* Left Column: Heading and Context */}
          <div>
            <div className="helene-eyebrow">SCIENTIFIC SYNTHESIS</div>
            <h2 className="helene-chapter-heading helene-serif">
              What can we actually conclude?
            </h2>
            <p className="helene-body-text">
              Rigorous scientific investigation demands separating what the observations
              demonstrate from what our assumptions extrapolate.
            </p>
            <p className="helene-body-text" style={{ fontSize: "15px", color: "var(--case-text-muted)" }}>
              Satellite and land-surface reanalyses offer macro-scale physical constraints
              rather than localized forensic claims.
            </p>
          </div>

          {/* Right Column: Three Evidence Conclusions */}
          <div>
            <div className="helene-verdict-card" style={{ borderLeft: "3px solid var(--rain-color)" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--rain-color)", marginBottom: "4px" }}>
                CONCLUSION 01
              </div>
              <h3 style={{ fontSize: "19px", fontWeight: 600, color: "var(--case-text)", marginBottom: "8px" }}>
                A striking September precipitation measurement.
              </h3>
              <p style={{ fontSize: "14.5px", color: "var(--case-text-secondary)", lineHeight: 1.6, margin: 0 }}>
                The available NLDAS observations show a substantially larger monthly
                precipitation value in September than in August or October 2024.
              </p>
            </div>

            <div className="helene-verdict-card" style={{ borderLeft: "3px solid var(--soil-color)" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--soil-color)", marginBottom: "4px" }}>
                CONCLUSION 02
              </div>
              <h3 style={{ fontSize: "19px", fontWeight: 600, color: "var(--case-text)", marginBottom: "8px" }}>
                A rapid measured change in daily soil moisture.
              </h3>
              <p style={{ fontSize: "14.5px", color: "var(--case-text-secondary)", lineHeight: 1.6, margin: 0 }}>
                The modeled regional surface-soil moisture estimate increased by
                approximately 1.02 kg/m² between September 25 and 26.
              </p>
            </div>

            <div className="helene-verdict-card" style={{ borderLeft: "3px solid var(--case-highlight)" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--case-highlight)", marginBottom: "4px" }}>
                CONCLUSION 03
              </div>
              <h3 style={{ fontSize: "19px", fontWeight: 600, color: "var(--case-text)", marginBottom: "8px" }}>
                Different observation scales tell different stories.
              </h3>
              <p style={{ fontSize: "14.5px", color: "var(--case-text-secondary)", lineHeight: 1.6, margin: 0 }}>
                Monthly and daily datasets reveal different aspects of the Earth system.
                Combining them improves interpretation, but does not by itself establish
                local disaster causation.
              </p>
            </div>
          </div>
        </div>

        {/* Interactive Knowledge Check (3 Questions) */}
        <div className="helene-quiz-card">
          <div style={{ marginBottom: "20px" }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: "var(--case-accent)",
              }}
            >
              METHODOLOGICAL CHECKPOINT
            </span>
            <h3 style={{ fontSize: "20px", fontWeight: 600, marginTop: "4px" }}>
              Test your understanding of observational constraints
            </h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {questions.map((q) => {
              const selected = answers[q.id];
              const isAnswered = selected !== undefined;
              const isCorrect = selected === q.correct;

              return (
                <div
                  key={q.id}
                  style={{
                    padding: "18px 20px",
                    background: "var(--case-surface-raised)",
                    borderRadius: "10px",
                    border: "1px solid var(--case-border)",
                  }}
                >
                  <div style={{ fontSize: "14.5px", fontWeight: 600, marginBottom: "14px", color: "var(--case-text)" }}>
                    {q.id}. {q.q}
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: isAnswered ? "14px" : "0" }}>
                    {q.options.map((opt) => {
                      const isOptionSelected = selected === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                          style={{
                            background: isOptionSelected ? "var(--case-surface)" : "transparent",
                            color: isOptionSelected ? "var(--case-accent)" : "var(--case-text-secondary)",
                            border: isOptionSelected
                              ? "1.5px solid var(--case-accent)"
                              : "1px solid var(--case-border)",
                            borderRadius: "6px",
                            padding: "8px 16px",
                            fontSize: "13px",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                          }}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {/* Calm feedback without arcade score */}
                  {isAnswered && (
                    <div
                      style={{
                        padding: "12px 14px",
                        borderRadius: "6px",
                        background: isCorrect ? "rgba(108, 190, 197, 0.08)" : "rgba(209, 123, 96, 0.08)",
                        borderLeft: `3px solid ${isCorrect ? "var(--ocean-color)" : "var(--case-highlight)"}`,
                        fontSize: "13px",
                        lineHeight: 1.5,
                        color: "var(--case-text-secondary)",
                      }}
                    >
                      <strong style={{ color: isCorrect ? "var(--ocean-color)" : "var(--case-highlight)" }}>
                        {isCorrect ? "Accurate." : "Methodological nuance:"}
                      </strong>{" "}
                      {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
