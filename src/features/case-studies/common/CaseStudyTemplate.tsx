"use client";

import React from "react";
import Link from "next/link";
import "./caseStudyStyles.css";
import type { CaseStudyDefinition } from "./types";
import { CaseStudyChart } from "./CaseStudyChart";
import { CaseStudyMap } from "./CaseStudyMap";

interface CaseStudyTemplateProps {
  study: CaseStudyDefinition;
  backHref?: string;
}

export function CaseStudyTemplate({
  study,
  backHref = "/case-studies",
}: CaseStudyTemplateProps) {
  const isSaudi = study.slug === "saudi-arabia-heat-2024";
  const isDitwah = study.slug === "cyclone-ditwah-2025";
  const isLibyaPakistan = study.slug === "libya-pakistan-floods";

  return (
    <article className="case-study-root" aria-label={study.title}>
      {/* Sticky Top Bar */}
      <header className="case-study-topbar">
        <div className="case-topbar-left">
          <Link href={backHref} className="case-back-link">
            ← Back to Case Studies
          </Link>
          <span className="case-topbar-badge">{study.tag}</span>
        </div>
        <div style={{ fontSize: "12px", color: "#8fa5af" }}>
          <span>{study.location}</span> · <strong>{study.year}</strong>
        </div>
      </header>

      {/* Section A: Introduction */}
      <header className="case-study-hero">
        <div className="case-hero-meta">
          <span>IRIS SCIENTIFIC CASE FILE</span>
          <span>·</span>
          <span>{study.event}</span>
        </div>
        <h1 className="case-hero-title">{study.title}</h1>
        <p className="case-hero-subtitle">{study.subtitle}</p>

        <div className="case-intro-card">
          <div className="case-intro-grid">
            <div className="case-intro-block">
              <h4>Scientific Background</h4>
              <p>{study.intro.background}</p>
            </div>
            <div className="case-intro-block">
              <h4>Investigation Question</h4>
              <p>{study.intro.question}</p>
            </div>
          </div>
          {study.intro.contextBullets && study.intro.contextBullets.length > 0 && (
            <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid rgba(218, 232, 229, 0.1)" }}>
              <ul style={{ margin: 0, paddingLeft: "18px", color: "#b4c5cc", fontSize: "13px", lineHeight: "1.6" }}>
                {study.intro.contextBullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Sections B through F */}
      <main className="case-study-content">
        {/* Section B: Study Region */}
        <section className="case-section" id="study-region">
          <div className="case-section-head">
            <span className="case-section-kicker">SECTION 01 / GEOGRAPHIC CONTEXT</span>
            <h2 className="case-section-title">Study Region & Bounding Box</h2>
            <p className="case-section-desc">
              Defining the spatial extent, geographic coordinates, and satellite observation envelope.
            </p>
          </div>

          <div className="case-region-layout">
            <div className="case-region-info">
              <div>
                <h3 style={{ fontSize: "16px", margin: "0 0 8px", color: "#f5f3ec" }}>
                  {study.location}
                </h3>
                <p style={{ fontSize: "13.5px", color: "#a5b9c2", margin: "0 0 16px", lineHeight: "1.6" }}>
                  {study.region.locationDescription}
                </p>
                <div style={{ fontSize: "12.5px", color: "#8fa5af", background: "#11222b", padding: "12px", borderRadius: "8px", border: "1px solid rgba(218, 232, 229, 0.08)" }}>
                  <strong style={{ color: "#159d7e", display: "block", marginBottom: "4px" }}>
                    Telemetry Footprint:
                  </strong>
                  {study.region.datasetCoverageNote}
                </div>
              </div>

              <div className="case-coord-cards">
                <div className="case-coord-card">
                  <small>Bounding Longitude</small>
                  <strong>{study.region.coordinates.west}°E – {study.region.coordinates.east}°E</strong>
                </div>
                <div className="case-coord-card">
                  <small>Bounding Latitude</small>
                  <strong>{study.region.coordinates.south}°N – {study.region.coordinates.north}°N</strong>
                </div>
              </div>
            </div>

            <div className="case-region-map-box">
              <CaseStudyMap
                locationName={study.location}
                coords={study.region.coordinates}
                center={study.region.center}
              />
            </div>
          </div>
        </section>

        {/* Section C: Environmental Indicators */}
        <section className="case-section" id="indicators">
          <div className="case-section-head">
            <span className="case-section-kicker">SECTION 02 / SATELLITE TELEMETRY AUDIT</span>
            <h2 className="case-section-title">Environmental Indicators & Verified Values</h2>
            <p className="case-section-desc">
              Verified variables, satellite instruments, native units, and target observations evaluated in this study.
            </p>
          </div>

          <div className="case-indicators-table-wrap">
            <table className="case-indicators-table">
              <thead>
                <tr>
                  <th>Variable Name</th>
                  <th>NASA Product Identifier</th>
                  <th>Units</th>
                  <th>Resolution</th>
                  <th>Status</th>
                  <th>Key Verified Observation</th>
                </tr>
              </thead>
              <tbody>
                {study.indicators.map((ind, idx) => (
                  <tr key={idx}>
                    <td>
                      <strong>{ind.variableName}</strong>
                      {ind.note && (
                        <span style={{ display: "block", fontSize: "11px", color: "#7e949d", marginTop: "2px" }}>
                          {ind.note}
                        </span>
                      )}
                    </td>
                    <td>
                      <code>{ind.product}</code>
                    </td>
                    <td>{ind.units}</td>
                    <td>{ind.temporalResolution}</td>
                    <td>
                      <span className={`case-status-badge ${ind.status}`}>
                        {ind.status === "verified"
                          ? "Verified CSV"
                          : ind.status === "partial"
                          ? "Partial Horizon"
                          : "Report Context"}
                      </span>
                    </td>
                    <td style={{ color: "#f5f3ec" }}>{ind.verifiedObservation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section D: Interactive Data Explorer */}
        <section className="case-section" id="data-explorer">
          <div className="case-section-head">
            <span className="case-section-kicker">SECTION 03 / INTERACTIVE DATA EXPLORER</span>
            <h2 className="case-section-title">Time-Series Observation Telemetry</h2>
            <p className="case-section-desc">
              Explore actual historical observations from NASA Giovanni CSV records. Hover to inspect individual data points, select variables, filter date ranges, and zoom into event windows.
            </p>
          </div>

          {/* Missing data warning banner for Nepal */}
          {study.slug === "nepal-2026" && (
            <div className="case-warning-banner">
              <strong>Source Temporal Coverage Note:</strong>
              <p>
                The supplied Nepal GPM monthly precipitation CSV ends in September 2025, and GLDAS soil moisture covers 2013–2014. These series are displayed below as verified historical baselines. In accordance with strict scientific integrity rules, Iris does not fabricate synthetic 2026 points. Reported MERRA-2 and Cryospheric findings are summarized in Section 04.
              </p>
            </div>
          )}

          {/* Chart Component */}
          {study.datasets.length > 0 ? (
            <CaseStudyChart
              seriesList={study.datasets}
              eventAnnotation={study.eventAnnotation}
              allowMonthCompare={isSaudi}
              isSaudiCase={isSaudi}
              isDitwahCase={isDitwah}
            />
          ) : (
            <p style={{ color: "#e05252" }}>No numerical series provided.</p>
          )}
        </section>

        {/* Section E: Scientific Findings */}
        <section className="case-section" id="scientific-findings">
          <div className="case-section-head">
            <span className="case-section-kicker">SECTION 04 / SCIENTIFIC FINDINGS</span>
            <h2 className="case-section-title">Observations, Anomalies & Hypotheses</h2>
            <p className="case-section-desc">
              Synthesizing satellite telemetry, reported thermodynamic mechanisms, and physical limitations.
            </p>
          </div>

          <div className="case-findings-grid">
            <div className="case-findings-card">
              <h4>Key Empirical Observations</h4>
              <ul>
                {study.scientificFindings.mainObservations.map((obs, idx) => (
                  <li key={idx}>{obs}</li>
                ))}
              </ul>
            </div>

            <div className="case-findings-card">
              <h4>Detected Anomalies & Trends</h4>
              <ul>
                {study.scientificFindings.anomaliesAndTrends.map((anom, idx) => (
                  <li key={idx}>{anom}</li>
                ))}
              </ul>
            </div>

            <div className="case-findings-card" style={{ gridColumn: "span 2" }}>
              <h4>Research Explanations & Physical Mechanisms</h4>
              <ul>
                {study.scientificFindings.reportExplanations.map((exp, idx) => (
                  <li key={idx}>{exp}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Scientific Limitations & Uncertainty */}
          <div className="case-limitations-box">
            <h4>Scientific Limitations, Caveats & Measurement Boundaries</h4>
            <ul>
              {study.scientificFindings.limitations.map((lim, idx) => (
                <li key={idx}>{lim}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* Section F: Sources & Methods */}
        <section className="case-section" id="sources-and-methods">
          <div className="case-section-head">
            <span className="case-section-kicker">SECTION 05 / SOURCES & METHODOLOGY</span>
            <h2 className="case-section-title">Data Provenance, Products & Attribution</h2>
            <p className="case-section-desc">
              Complete metadata, NASA product specifications, and research documentation citations.
            </p>
          </div>

          <div className="case-sources-grid">
            {study.sourcesAndMethods.originalDatasets.map((ds, idx) => (
              <div key={idx} className="case-source-item">
                <strong>{ds.name}</strong>
                <code>Product: {ds.productId}</code>
                <p>
                  <strong>Provider:</strong> {ds.provider}<br />
                  <strong>Native Unit:</strong> {ds.nativeUnit}<br />
                  <strong>Spatial Resolution:</strong> {ds.spatialResolution}<br />
                  <strong>Temporal Coverage:</strong> {ds.coverage}
                </p>
                {ds.link && (
                  <a href={ds.link} target="_blank" rel="noopener noreferrer">
                    GES DISC Giovanni Catalog Link →
                  </a>
                )}
              </div>
            ))}
          </div>

          <div style={{ background: "#11222b", padding: "18px", borderRadius: "8px", border: "1px solid rgba(218, 232, 229, 0.08)", marginBottom: "16px" }}>
            <h4 style={{ fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#159d7e", margin: "0 0 6px" }}>
              Original Research Publication Citation
            </h4>
            <p style={{ fontSize: "13.5px", color: "#f5f3ec", margin: "0 0 4px", fontWeight: 500 }}>
              {study.sourcesAndMethods.originalReport.title}
            </p>
            <p style={{ fontSize: "12px", color: "#8fa5af", margin: 0 }}>
              {study.sourcesAndMethods.originalReport.keyCitation}
            </p>
          </div>

          <div style={{ fontSize: "12px", color: "#8fa5af", lineHeight: "1.6" }}>
            <strong style={{ color: "#d1dde2" }}>Methodology & QA Rules:</strong>
            <ul style={{ margin: "6px 0 0", paddingLeft: "18px" }}>
              {study.sourcesAndMethods.methodologyNotes.map((note, idx) => (
                <li key={idx}>{note}</li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </article>
  );
}
