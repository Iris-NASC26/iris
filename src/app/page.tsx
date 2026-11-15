"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { useTheme } from "@/context/ThemeContext";
import { forecastHref } from "@/features/forecasts/model";

const CobeGlobe = dynamic(
  () => import("@/features/landing/CobeGlobe").then((m) => m.CobeGlobe),
  {
    ssr: false,
    loading: () => (
      <div className="landing-cobe landing-cobe-loading" aria-hidden="true" />
    ),
  }
);

/* ─── Offerings Data (3 Interactive Product Modes) ───────────────────────── */

interface WorkflowStep {
  num: string;
  title: string;
  text: string;
}

interface ProductOffering {
  id: string;
  tabLabel: string;
  badge: string;
  title: string;
  description: string;
  ctaText: string;
  ctaHref: string;
  steps: WorkflowStep[];
}

const OFFERINGS: ProductOffering[] = [
  {
    id: "track-a",
    tabLabel: "Live Ad-Hoc Investigation",
    badge: "Track A · Live Ad-Hoc Investigation",
    title: "User-Directed Discovery from Any Question",
    description:
      "Start with any plain-language inquiry or custom Earth observation product. Iris scopes parameters, verifies spatial-temporal coverage, and executes the full statistical pipeline on the fly.",
    ctaText: "Start an ad-hoc investigation",
    ctaHref: "/workspace/intelligence",
    steps: [
      {
        num: "01",
        title: "Frame with Super Intelligence",
        text: "Describe an inquiry in natural language; AI parses domain, region, and temporal horizons.",
      },
      {
        num: "02",
        title: "Gap-Preserving QC",
        text: "Inspect observational completeness; missing satellite values are excluded, never fabricated.",
      },
      {
        num: "03",
        title: "Deterministic Case File",
        text: "Execute Hamed–Rao Mann–Kendall and Theil–Sen slope tests to assign cryptographic Evidence Grades.",
      },
    ],
  },
  {
    id: "track-b",
    tabLabel: "Global Trend Cube (3D)",
    badge: "Track B · Global Trend Cube",
    title: "Instant Planetary Exploration Across 44 Years",
    description:
      "Explore pre-computed, verified multi-decadal trends across 11 physical variables streamed directly from NASA POWER AWS S3 Zarr stores into an interactive 3D virtual globe.",
    ctaText: "Explore the Living Globe",
    ctaHref: "/workspace/globe",
    steps: [
      {
        num: "01",
        title: "Select Environmental Layer",
        text: "Choose from 11 physical variables including surface temperature, precipitation, and soil moisture.",
      },
      {
        num: "02",
        title: "3D/2D Planetary Inspection",
        text: "Inspect multi-resolution raster tiles in 3D CesiumJS with smooth fallback to MapLibre 2D.",
      },
      {
        num: "03",
        title: "Benchmark Drilldown",
        text: "Access 20 curated global climate benchmark nodes and peer-reviewed literature citations.",
      },
    ],
  },
  {
    id: "mode-forecasts",
    tabLabel: "Dataset ML Forecasts",
    badge: "Forecasting · iris.ml-forecast.v2",
    title: "History-Only Empirical ML Predictions",
    description:
      "Forward environmental outlooks powered by gradient-boosted quantile models trained exclusively on past observations—no future provider inputs, no relabeled forecasts.",
    ctaText: "Explore dataset forecasts",
    ctaHref: "/workspace/forecasts",
    steps: [
      {
        num: "01",
        title: "Target Formulation",
        text: "Select from 12 Earthdata variables (rainfall, SMAP soil moisture, MERRA-2 temperature, MODIS NDVI).",
      },
      {
        num: "02",
        title: "Chronological 4-Fold Split",
        text: "Partition past records strictly by calendar time with zero future data leakage.",
      },
      {
        num: "03",
        title: "Calibrated Quantile Outlook",
        text: "Produce direct 3-horizon predictions with 10th–90th percentile uncertainty corridors.",
      },
    ],
  },
];

/* ─── Key Capabilities (4-Item Compact) ─────────────────────────────────── */

const KEY_CAPABILITIES: Array<{
  icon: IconName;
  title: string;
  text: string;
  stat: string;
  label: string;
}> = [
  {
    icon: "activity",
    title: "Non-Parametric Significance",
    text: "Mann–Kendall rank tests avoid fragile Gaussian normality assumptions and handle non-linear environmental shifts without distortion.",
    stat: "p < 0.05",
    label: "Hypothesis rejection threshold",
  },
  {
    icon: "search",
    title: "Autocorrelation Defense",
    text: "Hamed–Rao (1998) variance inflation across lags 1–24 prevents false trend detections caused by persistent weather spells.",
    stat: "n_eff",
    label: "Effective sample size correction",
  },
  {
    icon: "thermometer",
    title: "Outlier-Resistant Rates",
    text: "Theil–Sen estimator computes median pairwise slopes resistant to up to 29% extreme anomalies, cloud dropouts, or sensor spikes.",
    stat: "95% CI",
    label: "Rank-based confidence bounds",
  },
  {
    icon: "check",
    title: "Cryptographic Evidence Grades",
    text: "Objective A–D rubric evaluating completeness (≥90%), test concordance, and audit trails. 0% synthetic data in production.",
    stat: "Grade A–D",
    label: "Deterministic audit grading",
  },
];

/* ─── Process Pipeline Steps (4-Item Compact) ──────────────────────────── */

const PIPELINE_STEPS = [
  {
    num: "01",
    title: "Data Ingestion & Provider Routing",
    text: "Stream raw observation records directly from NASA POWER, CMR, AppEEARS, and ECMWF catalogs without alterations.",
  },
  {
    num: "02",
    title: "Signal Preparation & Gap Preservation",
    text: "Apply robust STL seasonal decomposition while isolating missing intervals—never fabricating synthetic fillers.",
  },
  {
    num: "03",
    title: "Autocorrelation-Adjusted Testing",
    text: "Compute serial correlation coefficients across 24 lags and adjust variance to eliminate false trend claims.",
  },
  {
    num: "04",
    title: "Evidence Synthesis & Case File",
    text: "Calculate Theil–Sen decadal slopes, evaluate sensor caveats, and compile an immutable SHA-256 evidence package.",
  },
];

/* ─── Significant Benchmark Cases (3 Items) ────────────────────────────── */

interface SignificantCase {
  id: string;
  icon: IconName;
  place: string;
  title: string;
  value: string;
  meta: string;
  tone: string;
  summary: string;
}

const SIGNIFICANT_CASES: SignificantCase[] = [
  {
    id: "la-warming",
    icon: "thermometer",
    place: "Los Angeles County, USA",
    title: "Urban Heat Island & Warming Trajectory",
    value: "+0.42°C",
    meta: "per decade · p = 0.0014 (Hamed–Rao)",
    tone: "warm",
    summary:
      "MERRA-2 near-surface temperature analysis reveals sustained multi-decadal warming with robust statistical significance across all 24 autocorrelation lags.",
  },
  {
    id: "cv-drought",
    icon: "activity",
    place: "Central Valley, USA",
    title: "Decadal Agricultural Precipitation Deficit",
    value: "−18.7mm",
    meta: "per decade · n_eff = 114 (Corrected)",
    tone: "dry",
    summary:
      "GPM IMERG and GLDAS soil moisture records uncover severe long-term precipitation declines with effective sample size correction removing seasonality artifacts.",
  },
  {
    id: "amazon-canopy",
    icon: "layers",
    place: "Amazon Basin, Brazil",
    title: "Tropical Forest Canopy Stress & Resilience",
    value: "−0.08",
    meta: "NDVI per decade · Grade A Evidence",
    tone: "forest",
    summary:
      "MODIS vegetation index tracking demonstrates canopy moisture loss in deforested corridors, corroborated by optical sensor quality flags and high completeness.",
  },
];

/* ─── Team Members (6 Members) ─────────────────────────────────────────── */

interface TeamMember {
  id: string;
  num: string;
  name: string;
  role: string;
  focus: string;
  image?: string;
}

const TEAM_MEMBERS: TeamMember[] = [
  {
    id: "member-01",
    num: "01",
    name: "Navida Jayaweera",
    role: "Backend Development, Team Lead, Research",
    focus: "FastAPI microservices and data pipelines, backend architecture leadership, and Earth observation research.",
    image: "/navida.jpg",
  },
  {
    id: "member-02",
    num: "02",
    name: "Oshadha Shiro",
    role: "Frontend Dev, Forecasting, Documentation",
    focus: "Next.js 15 user interface, interactive predictive forecasting interfaces, and end-to-end platform documentation.",
    image: "/oshadha.jpeg",
  },
  {
    id: "member-03",
    num: "03",
    name: "Vimukthi Prashan",
    role: "ML Dev, Forecasting, Data Visualization",
    focus: "Empirical machine learning forecasting models (iris.ml-forecast.v2), quantile regressors, and 3D visual landscapes.",
    image: "/vimukthi.jpeg",
  },
  {
    id: "member-04",
    num: "04",
    name: "Dinodh Dassanayake",
    role: "Data Analyzing, Research, Documentation",
    focus: "Multi-decadal satellite data analysis, Earth observation literature research, and scientific methodology documentation.",
    image: "/dinodh.jpeg",
  },
  {
    id: "member-05",
    num: "05",
    name: "Shenon Kaushika",
    role: "Data Analyzing, Research, Documentation",
    focus: "Observational time-series data analysis, environmental anomaly synthesis, and benchmark case documentation.",
    image: "/shenon.jpeg",
  },
  {
    id: "member-06",
    num: "06",
    name: "Nadula Nisith",
    role: "Slept, Rage Bating",
    focus: "High-friction stress testing, unconventional peer review through debate, and spontaneous morale disruption.",
    image: "/nadula.jpeg",
  },
];

/* ─── Frequently Asked Questions (4 Items) ─────────────────────────────── */

const FAQS = [
  {
    q: "Why use Mann–Kendall instead of ordinary linear regression?",
    a: "Environmental and satellite time series frequently violate the core assumptions of Ordinary Least Squares (OLS) regression: residuals are rarely normally distributed, sensor noise creates extreme outliers, and weather anomalies introduce spikes. The Mann–Kendall test evaluates relative ranks rather than raw values, making it strictly monotonic, outlier-resistant, and free of Gaussian distribution assumptions.",
  },
  {
    q: "How does Iris eliminate false alarms caused by serial autocorrelation?",
    a: "Environmental signals exhibit persistence: a hot month is frequently followed by another hot month. Standard statistical tests mistake this serial correlation for a genuine long-term trend, artificially inflating confidence. Iris applies the Hamed & Rao (1998) variance inflation factor across up to 24 lags to calculate the true effective sample size (n_eff), ensuring reported trends reflect sustained decadal direction.",
  },
  {
    q: "What do the Evidence Grades (Grade A through Grade D) mean?",
    a: "Evidence Grades provide a transparent, objective measure of scientific reliability. Grade A indicates ≥90% observational completeness, strong parametric and non-parametric convergence, and no significant sensor caveats. Grade B indicates minor gaps or known optical caveats (such as monsoon cloud obscuration in MODIS). Grade C reflects tentative findings requiring caution, and Grade D indicates insufficient record length or severe data discontinuities.",
  },
  {
    q: "How does the Super Intelligence AI assistant work without hallucinating?",
    a: "Iris implements a hard architectural firewall between language processing and statistical computation. The AI model (Gemini Flash-Lite) parses research questions into structured queries (domain, region coordinates, dates) and formats explanations across three audience registers. It has zero access to numerical computation: all p-values, slopes, and Case Files are computed deterministically by SciPy and Statsmodels.",
  },
];

/* ─── Main Landing Page Component ──────────────────────────────────────── */

export default function LandingPage() {
  const { dark, toggleTheme } = useTheme();
  const [activeOffering, setActiveOffering] = useState<number>(0);
  const [activeSignalMode, setActiveSignalMode] = useState<"all" | "slope" | "anomalies">("all");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaq((prev) => (prev === index ? null : index));
  };

  const currentOffering = OFFERINGS[activeOffering];

  return (
    <div className={dark ? "dark app-shell landing-site" : "app-shell landing-site"}>
      <PublicNavbar dark={dark} onToggleTheme={toggleTheme} />

      <main id="top">
        {/* ─── 1. HERO SECTION ─────────────────────────────────────────── */}
        <section className="landing-hero">
          <div className="hero-glow glow-one" />
          <div className="hero-glow glow-two" />
          <div className="landing-eyebrow">
            <span>
              <Icon name="sparkles" size={13} />
            </span>
            Open Earth intelligence for everyone
          </div>
          <h1>
            Detect environmental trends
            <em> before they become headlines.</em>
          </h1>
          <p>
            Turn 40+ years of NASA, NOAA, and ECMWF Earth observations into transparent,
            statistically defensible case files—without hiding the science.
          </p>
          <div className="landing-hero-actions">
            <Link className="landing-primary-cta" href="/workspace">
              Start investigating <Icon name="arrow" size={16} />
            </Link>
            <a className="landing-secondary-cta" href="#offerings">
              Explore workflows <Icon name="arrow" size={15} />
            </a>
          </div>

          {/* Animated Downward Chevron */}
          <a href="#offerings" className="hero-scroll-down" aria-label="Scroll to explore workflows">
            <svg
              className="big-down-arrow"
              viewBox="0 0 24 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="4 5 12 13 20 5" />
            </svg>
          </a>

          {/* Scaled-Up Interactive Globe Band */}
          <div className="landing-globe-band">
            <CobeGlobe dark={dark} />
            <div className="landing-globe-copy">
              <div className="landing-kicker">Explore upcoming conditions</div>
              <h2>See what the historical record can tell us next.</h2>
              <p>
                Explore local machine-learning forecasts, prediction ranges, and model
                evaluations built from historical weather and Earth observation records at
                six configured benchmark points worldwide. Each forecast includes its full
                source data and measured baseline skill.
              </p>
              <Link href={forecastHref("colombo")}>
                Explore a forecast <Icon name="arrow" size={15} />
              </Link>
            </div>
          </div>

          <ProductPreview />
        </section>

        {/* ─── MARQUEE BAND ────────────────────────────────────────────── */}
        <section className="signal-marquee" aria-label="Available environmental signals">
          <div>
            {[
              "Air temperature (MERRA-2)",
              "Soil moisture (SMAP / GLDAS)",
              "Vegetation index (MODIS NDVI)",
              "Precipitation (GPM IMERG)",
              "Land surface temp (MODIS LST)",
              "Snow cover fraction",
              "Solar radiation (CERES)",
              "Air temperature (MERRA-2)",
              "Soil moisture (SMAP / GLDAS)",
            ].map((item, index) => (
              <span key={`${item}-${index}`}>
                <i />
                {item}
              </span>
            ))}
          </div>
        </section>

        {/* ─── 2. INTERACTIVE OFFERINGS (3 PRODUCT MODES) ──────────────── */}
        <section className="landing-offerings-section" id="offerings">
          <div className="landing-section-heading centered">
            <div className="landing-kicker">Three investigative pathways</div>
            <h2>
              Choose the workflow that matches
              <br />
              <em>your scientific question.</em>
            </h2>
            <p>
              Whether you need live ad-hoc data discovery, planetary gridded trends, or
              history-only machine learning outlooks, Iris provides an auditable path.
            </p>
          </div>

          {/* Interactive Mode Nav Switcher */}
          <div className="offerings-nav" role="tablist" aria-label="Product modes">
            {OFFERINGS.map((offering, idx) => (
              <button
                key={offering.id}
                type="button"
                role="tab"
                aria-selected={activeOffering === idx}
                className={`offering-nav-btn${activeOffering === idx ? " active" : ""}`}
                onClick={() => setActiveOffering(idx)}
              >
                <Icon name="box" size={13} />
                <span>{offering.tabLabel}</span>
              </button>
            ))}
          </div>

          {/* Active Mode Display */}
          <article className="offering-block" key={currentOffering.id}>
            <div className="offering-header">
              <div className="offering-header-copy">
                <span className="offering-badge">
                  <Icon name="box" size={12} /> {currentOffering.badge}
                </span>
                <h3>{currentOffering.title}</h3>
                <p>{currentOffering.description}</p>
              </div>
              <div className="offering-header-action">
                <Link className="landing-primary-cta" href={currentOffering.ctaHref}>
                  {currentOffering.ctaText} <Icon name="arrow" size={14} />
                </Link>
              </div>
            </div>

            <div className="offering-workflow-grid">
              {currentOffering.steps.map((step) => (
                <div className="offering-step-card" key={step.num}>
                  <span className="offering-step-num">{step.num}</span>
                  <h4>{step.title}</h4>
                  <p>{step.text}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        {/* ─── 3. KEY CAPABILITIES (4 STANDALONE BENEFIT CARDS) ────────── */}
        <section className="landing-section platform-section" id="features">
          <div className="landing-section-heading centered">
            <div className="landing-kicker">Defensible methodology</div>
            <h2>
              Every clue you need.
              <br />
              <em>One evidence trail.</em>
            </h2>
            <p>
              Iris brings data discovery, robust statistics, visual analysis, and multi-level
              interpretation into one connected, auditable scientific workflow.
            </p>
          </div>

          <div className="capabilities-four-grid">
            {KEY_CAPABILITIES.map((item, index) => (
              <article className="capability-card" key={item.title}>
                <div className="capability-card-top">
                  <span>0{index + 1}</span>
                  <div>
                    <Icon name={item.icon} size={20} />
                  </div>
                </div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <div className="capability-stat">
                  <strong>{item.stat}</strong>
                  <span>{item.label}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ─── 4. HOW IT WORKS (4 STEPS + INTERACTIVE DEMO) ────────────── */}
        <section className="landing-section how-it-works-section" id="how-it-works">
          <div className="landing-section-heading centered">
            <div className="landing-kicker">Transparent by design</div>
            <h2>
              From raw environmental signal
              <br />
              <em>to irrefutable evidence.</em>
            </h2>
            <p>
              Iris never generates a mysterious confidence score. Every conclusion exposes its
              data provenance, transformation choices, and mathematical assumptions.
            </p>
          </div>

          <div className="how-it-works-grid">
            {/* Left: 4 Pipeline Steps */}
            <div className="how-process-steps">
              {PIPELINE_STEPS.map((step) => (
                <div className="process-step-item" key={step.num}>
                  <div className="process-step-badge">{step.num}</div>
                  <div className="process-step-body">
                    <h4>{step.title}</h4>
                    <p>{step.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Right: Interactive Signal Inspection Demo */}
            <div className="how-proof-column">
              <div className="signal-demo">
                <div className="signal-demo-head">
                  <span>Near-surface temperature (MERRA-2)</span>
                  <strong>+0.42°C / decade · p = 0.0014</strong>
                </div>

                <div className="signal-layer-controls">
                  <button
                    type="button"
                    onClick={() => setActiveSignalMode("all")}
                    className={`signal-layer-btn${activeSignalMode === "all" ? " active" : ""}`}
                  >
                    All layers
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSignalMode("slope")}
                    className={`signal-layer-btn${activeSignalMode === "slope" ? " active" : ""}`}
                  >
                    Theil–Sen slope
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSignalMode("anomalies")}
                    className={`signal-layer-btn${activeSignalMode === "anomalies" ? " active" : ""}`}
                  >
                    Flagged anomalies
                  </button>
                </div>

                <svg
                  viewBox="0 0 600 300"
                  aria-label="Temperature observations showing an upward trend"
                >
                  <defs>
                    <linearGradient id="landingChart" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0" stopColor="#34d399" stopOpacity=".32" />
                      <stop offset="1" stopColor="#34d399" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {[55, 105, 155, 205, 255].map((y) => (
                    <line key={y} x1="30" x2="570" y1={y} y2={y} />
                  ))}
                  <path
                    d="M30 245 C85 220 95 235 140 198 S210 188 255 165 S320 153 365 125 S425 135 470 84 S530 92 570 51 L570 270 L30 270Z"
                    fill="url(#landingChart)"
                    stroke="none"
                  />
                  {(activeSignalMode === "all" || activeSignalMode === "slope") && (
                    <path
                      className="demo-signal-line"
                      d="M30 245 C85 220 95 235 140 198 S210 188 255 165 S320 153 365 125 S425 135 470 84 S530 92 570 51"
                    />
                  )}
                  {(activeSignalMode === "all" || activeSignalMode === "slope") && (
                    <path className="demo-trend-line" d="M30 244 L570 63" />
                  )}
                  {(activeSignalMode === "all" || activeSignalMode === "anomalies") && (
                    <>
                      <circle cx="470" cy="84" r="7" style={{ fill: "#fbbf24", stroke: "var(--panel)", strokeWidth: 2 }} />
                      <circle cx="532" cy="87" r="7" style={{ fill: "#fbbf24", stroke: "var(--panel)", strokeWidth: 2 }} />
                    </>
                  )}
                  <text x="30" y="290">
                    2005
                  </text>
                  <text x="278" y="290">
                    2015
                  </text>
                  <text x="535" y="290">
                    2025
                  </text>
                </svg>
                <div className="signal-demo-foot">
                  <span>
                    <i className="raw" /> Observed signal
                  </span>
                  <span>
                    <i className="slope" /> Theil–Sen slope
                  </span>
                  <span>
                    <i className="outlier" /> Flagged anomaly (|z| ≥ 2)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 6. SIGNIFICANT BENCHMARK USE CASES ───────────────────────── */}
        <section className="cases-section-compact" id="cases">
          <div className="landing-section-heading centered">
            <div className="landing-kicker">Validated case files</div>
            <h2>
              Significant investigations
              <br />
              <em>grounded in real data.</em>
            </h2>
            <p>
              Explore three hallmark environmental case files built with multi-decadal
              observational records and strict non-parametric verification.
            </p>
          </div>

          <div className="cases-compact-grid">
            {SIGNIFICANT_CASES.map((item) => (
              <article className={`landing-case-card ${item.tone}`} key={item.id}>
                <div className="landing-case-art">
                  <span>
                    <Icon name={item.icon} size={22} />
                  </span>
                  <i />
                  <i />
                  <i />
                </div>
                <div className="landing-case-body">
                  <small>{item.place}</small>
                  <h3>{item.title}</h3>
                  <p style={{ margin: "6px 0 12px", fontSize: "10.5px", color: "var(--muted)", lineHeight: 1.55 }}>
                    {item.summary}
                  </p>
                  <div>
                    <strong>{item.value}</strong>
                    <span>{item.meta}</span>
                  </div>
                  <Link href="/workspace" aria-label={`Open ${item.title}`}>
                    <Icon name="arrow" size={16} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ─── 7. TEAM (6 MEMBERS WITH PLACEHOLDERS) ────────────────────── */}
        <section className="team-section" id="team">
          <div className="landing-section-heading centered">
            <div className="landing-kicker">Contributors &amp; Architecture</div>
            <h2>
              Team
              <br />
              <em>and research contributors.</em>
            </h2>
            <p>
              The multidisciplinary team behind Iris combining climate science, non-parametric
              statistics, geospatial engineering, and machine learning.
            </p>
          </div>

          <div className="team-grid-six">
            {TEAM_MEMBERS.map((member) => (
              <div className="team-card" key={member.id}>
                <div className="team-avatar">
                  {member.image ? (
                    <img
                      src={member.image}
                      alt={member.name}
                      className="team-avatar-img"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    member.num
                  )}
                </div>
                <div className="team-info">
                  <h4>{member.name}</h4>
                  <strong>{member.role}</strong>
                  <p>{member.focus}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── 8. FREQUENTLY ASKED QUESTIONS (ACCORDION - 4 ITEMS) ──────── */}
        <section className="faq-section" id="faq">
          <div className="landing-section-heading centered">
            <div className="landing-kicker">Frequently asked questions</div>
            <h2>
              Got questions?
              <br />
              <em>We have answers.</em>
            </h2>
            <p>
              Everything you need to know about Iris’s statistical methodology, data providers,
              and AI governance.
            </p>
          </div>

          <div className="faq-accordion" role="region" aria-label="Frequently Asked Questions">
            {FAQS.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div className={`faq-item${isOpen ? " is-open" : ""}`} key={faq.q}>
                  <button
                    className="faq-question"
                    type="button"
                    onClick={() => toggleFaq(index)}
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    <Icon name="chevron" size={16} />
                  </button>
                  {isOpen && (
                    <div className="faq-answer">
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── CALL TO ACTION BANNER ───────────────────────────────────── */}
        <section className="landing-cta">
          <div className="cta-grid" />
          <div className="landing-kicker light">Your next investigation starts here</div>
          <h2>
            Follow the signal.
            <br />
            Find the story in the data.
          </h2>
          <p>
            Select any region, choose an environmental variable, and build a defensible evidence
            trail in minutes.
          </p>
          <Link href="/workspace">
            Open Iris <Icon name="arrow" size={17} />
          </Link>
        </section>
      </main>

      {/* ─── 9. GROUPED FOOTER ─────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="landing-footer-container">
          <div className="landing-footer-grid">
            <div className="landing-footer-brand">
              <div className="brand-mark" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="globe" size={20} />
                <strong style={{ fontSize: "16px", letterSpacing: "-0.03em" }}>Iris</strong>
              </div>
              <p>
                Open Earth intelligence platform bridging multi-decadal observations and
                transparent, non-parametric statistical evidence.
              </p>
            </div>

            <div className="landing-footer-col">
              <h4>Platform</h4>
              <ul>
                <li>
                  <Link href="/workspace">Investigative Workspace</Link>
                </li>
                <li>
                  <Link href="/workspace/globe">Living Globe (3D)</Link>
                </li>
                <li>
                  <Link href="/workspace/forecasts">Dataset Forecasts</Link>
                </li>
                <li>
                  <Link href="/case-studies">Case Studies Library</Link>
                </li>
              </ul>
            </div>

            <div className="landing-footer-col">
              <h4>Science &amp; Data</h4>
              <ul>
                <li>
                  <Link href="/methodology">Scientific Methodology</Link>
                </li>
                <li>
                  <Link href="/data">Earth Observation Catalog</Link>
                </li>
                <li>
                  <Link href="/platform">Platform Architecture</Link>
                </li>
                <li>
                  <Link href="/about">Mission &amp; Values</Link>
                </li>
              </ul>
            </div>

            <div className="landing-footer-col">
              <h4>Documentation</h4>
              <ul>
                <li>
                  <a href="/documentation#getting-started" target="_blank" rel="noreferrer">
                    Platform Introduction ↗
                  </a>
                </li>
                <li>
                  <a href="/documentation#quick-start" target="_blank" rel="noreferrer">
                    Quick Start Guide ↗
                  </a>
                </li>
                <li>
                  <a href="/documentation#data-analysis" target="_blank" rel="noreferrer">
                    Analysis Workbench ↗
                  </a>
                </li>
                <li>
                  <a href="/documentation#glossary" target="_blank" rel="noreferrer">
                    Scientific Glossary ↗
                  </a>
                </li>
              </ul>
            </div>

            <div className="landing-footer-col">
              <h4>Resources</h4>
              <ul>
                <li>
                  <a
                    href="https://github.com/search?q=Iris&type=repositories"
                    target="_blank"
                    rel="noreferrer"
                  >
                    GitHub Repository ↗
                  </a>
                </li>
                <li>
                  <a href="mailto:info@iris.earth">Contact Team</a>
                </li>
                <li>
                  <span style={{ color: "var(--faint)", fontSize: "9px" }}>
                    Status: Operational
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="landing-footer-bottom">
            <span>Built with publicly funded NASA, NOAA, and ECMWF Earth observation data.</span>
            <span>© {new Date().getFullYear()} Iris Earth Intelligence. Open Science.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}


/* ─── PRODUCT PREVIEW COMPONENT ────────────────────────────────────────── */

function ProductPreview() {
  return (
    <div className="product-stage">
      <div className="stage-orb orb-left" />
      <div className="stage-orb orb-right" />
      <div className="product-window">
        <div className="window-bar">
          <div>
            <span />
            <span />
            <span />
          </div>
          <div className="window-address">
            <Icon name="globe" size={11} /> app.iris.earth
          </div>
          <span>IR</span>
        </div>
        <div className="preview-app">
          <aside>
            <div className="preview-logo">
              <Icon name="globe" size={15} />
              Iris
            </div>
            <div className="preview-step">Investigation setup</div>
            <label>Location</label>
            <div className="preview-input">
              <Icon name="search" size={12} />
              Los Angeles County, CA
            </div>
            <label>Phenomenon</label>
            <div className="preview-pills">
              <span>Heat</span>
              <i>Drought</i>
              <i>Vegetation</i>
            </div>
            <label>Investigation period</label>
            <div className="preview-range">
              <i />
            </div>
            <button type="button">Run forensic analysis</button>
            <div className="preview-variable">
              <Icon name="thermometer" size={15} />
              <span>
                <small>Selected variable</small>Near-surface temperature (T2M)
              </span>
            </div>
          </aside>
          <section>
            <div className="preview-header">
              <div>
                <small>Case IR–042</small>
                <strong>Temperature trend investigation</strong>
              </div>
              <span>Analysis complete</span>
            </div>
            <div className="preview-verdict">
              <Icon name="arrow" size={17} />
              <div>
                <small>Detective verdict</small>
                <strong>Significant warming trend detected</strong>
                <p>Surface temperature has risen by +0.42°C per decade.</p>
              </div>
              <b>p = 0.0014</b>
            </div>
            <div className="preview-metrics">
              <span>
                <small>Decadal rate</small>
                <b>+0.42°C</b>
              </span>
              <span>
                <small>Hamed–Rao n_eff</small>
                <b>184</b>
              </span>
              <span>
                <small>MK p-value</small>
                <b>0.0014</b>
              </span>
              <span>
                <small>95% CI</small>
                <b>0.31–0.53</b>
              </span>
            </div>
            <div className="preview-chart">
              <div>
                <strong>Temperature over time</strong>
                <span>Deseasonalized (STL period 12)</span>
              </div>
              <svg viewBox="0 0 500 160">
                {[30, 65, 100, 135].map((y) => (
                  <line key={y} x1="10" x2="490" y1={y} y2={y} />
                ))}
                <path d="M10 130 C55 118 70 130 110 105 S180 112 220 90 S275 80 320 71 S380 57 420 50 S465 31 490 24" />
                <path className="preview-slope" d="M10 137 L490 28" />
              </svg>
            </div>
          </section>
        </div>
      </div>
      <div className="floating-insight insight-left">
        <span>
          <Icon name="sparkles" size={14} />
        </span>
        <div>
          <small>Next clue</small>
          <strong>Investigate soil moisture</strong>
        </div>
      </div>
      <div className="floating-insight insight-right">
        <span>
          <Icon name="check" size={14} />
        </span>
        <div>
          <small>Confidence</small>
          <strong>Statistically significant (Grade A)</strong>
        </div>
      </div>
    </div>
  );
}
