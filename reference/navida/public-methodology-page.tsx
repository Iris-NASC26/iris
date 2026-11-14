"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PageShell } from "@/components/layout/PageShell";
import {
  EVIDENCE_METHODS_REGISTRY,
  PROVIDER_CAPABILITY_MATRIX,
} from "@/lib/srsCubeAndScienceEngine";

const methodSteps = [
  [
    "01",
    "Define the question",
    "Select a measurable phenomenon, an area of interest, and a period long enough to distinguish trend from noise.",
    "Region + variable + timeframe",
    "search",
  ],
  [
    "02",
    "Prepare the signal",
    "Aggregate grid cells by area, identify missing observations, and optionally remove the repeating seasonal cycle.",
    "QC + area weighting + STL",
    "layers",
  ],
  [
    "03",
    "Test for a trend",
    "Apply the Mann–Kendall test to determine whether values consistently move in one direction through time.",
    "Non-parametric significance",
    "activity",
  ],
  [
    "04",
    "Measure the change",
    "Use Sen’s slope to estimate the typical rate of change without letting a few extreme observations dominate.",
    "Robust effect size",
    "arrow",
  ],
  [
    "05",
    "Interrogate anomalies",
    "Flag observations beyond ±2 standard deviations and test related variables for a plausible physical explanation.",
    "Z-score + clue engine",
    "sparkles",
  ],
];

export default function MethodologyPage() {
  const [openQuestion, setOpenQuestion] = useState<number | null>(0);
  const faqs = [
    [
      "Why use Mann–Kendall instead of linear regression?",
      "Environmental records are often skewed, seasonal, and affected by outliers. Mann–Kendall does not assume a normal distribution and tests whether values tend to increase or decrease consistently.",
    ],
    [
      "What does statistical significance mean here?",
      "A result with p < 0.05 is unlikely to appear if no monotonic trend exists. It does not prove causation, so Iris reports effect size and confidence alongside it.",
    ],
    [
      "How is seasonality removed?",
      "The workbench estimates each month’s recurring seasonal component and subtracts it from observed values. Raw observations always remain available.",
    ],
    [
      "Can a result be stable or inconclusive?",
      "Yes. When evidence does not exceed the significance threshold, Iris labels the result inconclusive rather than forcing a directional verdict.",
    ],
  ];

  return (
    <PageShell
      action={
        <Link className="primary-page-button" href="/workspace">
          Try the workbench <Icon name="arrow" size={16} />
        </Link>
      }
      description="A transparent, reproducible workflow for separating meaningful environmental change from seasonality, outliers, and ordinary variability."
      section="Scientific method"
      title="From raw observations to a defensible verdict"
    >
      <section className="method-intro">
        <div className="method-quote">
          <Icon name="sparkles" size={22} />
          <blockquote>
            Iris does not predict the future. It asks whether the past contains a statistically
            credible signal—and shows every step used to reach that conclusion.
          </blockquote>
        </div>
        <div className="method-assumptions">
          <span>Designed for</span>
          <strong>Monotonic trends</strong>
          <strong>Monthly time series</strong>
          <strong>Spatially averaged data</strong>
        </div>
      </section>

      <section className="method-process">
        <div className="method-section-heading">
          <div className="section-kicker">
            <span>Five stages</span> Analysis pipeline
          </div>
          <h2>The evidence trail</h2>
          <p>Each stage produces an inspectable output used by the next stage.</p>
        </div>
        <div className="method-timeline">
          {methodSteps.map(([number, title, text, detail, icon]) => (
            <article className="method-step" key={number}>
              <div className="step-number">{number}</div>
              <div className="step-icon">
                <Icon name={icon as IconName} size={20} />
              </div>
              <div className="step-copy">
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
              <code>{detail}</code>
            </article>
          ))}
        </div>
      </section>

      <section className="stat-methods">
        <div className="stat-card primary-stat">
          <div className="stat-card-top">
            <div>
              <span>Trend significance</span>
              <h3>Mann–Kendall test</h3>
            </div>
            <div className="formula">
              S = Σ sgn(x<sub>j</sub> − x<sub>i</sub>)
            </div>
          </div>
          <p>
            Compares every observation with those that came before it. A large positive or negative
            score indicates a consistent pattern unlikely to be random.
          </p>
          <div className="stat-scale">
            <span>Decreasing</span>
            <i />
            <span>No trend</span>
            <i />
            <span>Increasing</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-top">
            <div>
              <span>Rate of change</span>
              <h3>Sen’s slope</h3>
            </div>
            <div className="formula">
              β = median((x<sub>j</sub>−x<sub>i</sub>)/(j−i))
            </div>
          </div>
          <p>
            Takes the median slope between all observation pairs, producing a robust rate that
            resists distortion from extreme values.
          </p>
          <div className="slope-mini-chart">
            <span />
            <i />
            <b>Median slope</b>
          </div>
        </div>
      </section>

      <section className="faq-section">
        <div className="faq-heading">
          <div className="section-kicker">
            <span>FAQ</span> Understanding results
          </div>
          <h2>Questions a careful detective should ask</h2>
        </div>
        <div className="faq-list">
          {faqs.map(([question, answer], index) => (
            <article className={openQuestion === index ? "open" : ""} key={question}>
              <button
                onClick={() => setOpenQuestion(openQuestion === index ? null : index)}
                type="button"
              >
                <span>{question}</span>
                <i>{openQuestion === index ? "−" : "+"}</i>
              </button>
              {openQuestion === index && <p>{answer}</p>}
            </article>
          ))}
        </div>
      </section>

      {/* SRS v1.0 EVIDENCE GRADES, VALIDATION LAB, SI DISCLOSURE & PROVIDER CAPABILITY MATRIX */}
      <section className="method-process" style={{ marginTop: "36px" }}>
        <div className="method-section-heading">
          <div className="section-kicker">
            <span>SRS v1.0</span> Evidence Grades & Validation Lab
          </div>
          <h2>Deterministic Evidence Grades (A–D)</h2>
          <p>
            Every regional scan and Case File is assigned a reproducible Evidence Grade based on
            temporal span, valid monthly coverage, Hamed–Rao significance, and parametric/non-parametric
            concordance.
          </p>
        </div>

        <div className="srs-grade-rubric-grid">
          {EVIDENCE_METHODS_REGISTRY.evidence_grades.map((item) => (
            <article className="srs-rubric-card" key={item.grade}>
              <div className="srs-rubric-head">
                <span className={`srs-grade-badge grade-${item.grade}`}>Grade {item.grade}</span>
                <h3>{item.title}</h3>
              </div>
              <p>{item.criteria}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="method-process" style={{ marginTop: "36px" }}>
        <div className="method-section-heading">
          <div className="section-kicker">
            <span>Verification</span> Statistical Validation Lab Benchmarks
          </div>
          <h2>Reference Reproducibility & Autocorrelation Controls</h2>
          <p>
            Synthetic test fixtures are strictly isolated to this validation harness and blocked
            from production discovery, preview, cube, and Case File endpoints.
          </p>
        </div>

        <div className="srs-validation-grid">
          {EVIDENCE_METHODS_REGISTRY.validation_lab_benchmarks.map((b) => (
            <article className="srs-validation-card" key={b.id}>
              <div className="srs-validation-top">
                <code>{b.id}</code>
                <span className="quality-badge valid">{b.status}</span>
              </div>
              <h3>{b.name}</h3>
              <p>{b.target}</p>
              <dl>
                <div>
                  <dt>Acceptance Gate</dt>
                  <dd>{b.expected}</dd>
                </div>
                <div>
                  <dt>Measured Outcome</dt>
                  <dd>{b.measured}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className="method-process" style={{ marginTop: "36px" }}>
        <div className="method-section-heading">
          <div className="section-kicker">
            <span>Governance</span> System Intelligence (SI) Disclosure & Capability Matrix
          </div>
          <h2>Strict Separation of Conversational SI & Scientific Calculation</h2>
          <p>
            Model: <code>{EVIDENCE_METHODS_REGISTRY.si_disclosure.model}</code>
          </p>
        </div>

        <div className="srs-si-disclosure-cols">
          <article className="srs-rubric-card">
            <h3>Permitted SI Assistant Roles</h3>
            <ul>
              {EVIDENCE_METHODS_REGISTRY.si_disclosure.permitted_roles.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </article>
          <article className="srs-rubric-card">
            <h3>Prohibited SI Roles (Hard Guardrails)</h3>
            <ul>
              {EVIDENCE_METHODS_REGISTRY.si_disclosure.prohibited_roles.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </article>
        </div>

        <div className="dashboard-table-wrap" style={{ marginTop: "20px" }}>
          <table>
            <thead>
              <tr>
                <th>Upstream Provider</th>
                <th>Catalog State</th>
                <th>Extraction State</th>
                <th>Geometries & Cadence</th>
                <th>Authentication & QA Semantics</th>
              </tr>
            </thead>
            <tbody>
              {PROVIDER_CAPABILITY_MATRIX.map((prov) => (
                <tr key={prov.provider_id}>
                  <td>
                    <strong>{prov.provider_name}</strong>
                    <div style={{ fontSize: "11px", color: "var(--muted)" }}>{prov.agency}</div>
                  </td>
                  <td>
                    <span className="quality-badge valid">{prov.catalog_state}</span>
                  </td>
                  <td>
                    <span
                      className={`quality-badge ${
                        prov.extraction_state === "extract_verified" ? "valid" : "flagged"
                      }`}
                    >
                      {prov.extraction_state}
                    </span>
                  </td>
                  <td style={{ fontSize: "11.5px" }}>
                    <div>Geometries: {prov.supported_geometries.join(", ")}</div>
                    <div>Cadences: {prov.native_cadences.join(", ")}</div>
                  </td>
                  <td style={{ fontSize: "11.5px", maxWidth: "320px" }}>
                    <div>
                      <b>Auth:</b> {prov.auth_mechanism}
                    </div>
                    <div>
                      <b>QA:</b> {prov.qa_semantics}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </PageShell>
  );
}
