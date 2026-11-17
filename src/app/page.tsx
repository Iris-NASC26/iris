"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { useTheme } from "@/context/ThemeContext";
import { forecastHref } from "@/features/forecasts/model";
import { MANUAL_CASE_STUDIES_PURPOSE } from "@/lib/manualCaseStudies";

const CobeGlobe = dynamic(
  () => import("@/features/landing/CobeGlobe").then((m) => m.CobeGlobe),
  {
    ssr: false,
    loading: () => (
      <div className="landing-cobe landing-cobe-loading" aria-hidden="true" />
    ),
  }
);

/* ─── Offerings Data (4 Clear Investigation Pathways) ──────────────────── */

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
    tabLabel: "Custom Investigation",
    badge: "Pathway 1 · Live Discovery & Case File",
    title: "Turn Any Plain-English Question into a Verified Case File",
    description:
      "Start with any question about environmental change. Iris helps you find matching satellite or weather station data across 10 public agencies, previews the data quality, and runs step-by-step statistical tests.",
    ctaText: "Start an investigation",
    ctaHref: "/workspace/intelligence",
    steps: [
      {
        num: "01",
        title: "Ask in Plain English",
        text: "Describe your question in Iris Intelligence, review the suggested search keywords, and search across 10 public space and weather catalogs at once.",
      },
      {
        num: "02",
        title: "Select Region & Preview Quality",
        text: "Pick a point or draw a region on the map, choose your date range, and inspect the raw observations with missing periods clearly highlighted.",
      },
      {
        num: "03",
        title: "Run Statistical Tests & Visualize",
        text: "Run up to 8 statistical methods, explore 2D and 3D seasonal charts, and connect your findings to published research papers.",
      },
    ],
  },
  {
    id: "track-b",
    tabLabel: "3D Living Globe",
    badge: "Pathway 2 · Global Spatial Maps",
    title: "Explore 11 Monthly Environmental Layers Across the Planet",
    description:
      "Inspect real monthly global maps from NASA—covering air temperature, rainfall, soil wetness, snow depth, wind, pressure, and sunlight—on an interactive 3D globe or 2D world map.",
    ctaText: "Open the 3D Globe",
    ctaHref: "/workspace/globe",
    steps: [
      {
        num: "01",
        title: "Choose an Environmental Layer",
        text: "Select from 11 monthly variables including surface temperature, precipitation rate, topsoil wetness, snow depth, and solar radiation.",
      },
      {
        num: "02",
        title: "Explore Global or Regional Views",
        text: "Load the entire planet or focus on a specific region, step through historical months, and switch smoothly between 3D globe and 2D map views.",
      },
      {
        num: "03",
        title: "Inspect Grid Cells & Benchmarks",
        text: "Click any grid cell on Earth to read its measured value and date, or explore 20 global climate benchmark locations.",
      },
    ],
  },
  {
    id: "mode-forecasts",
    tabLabel: "Environmental Forecasts",
    badge: "Pathway 3 · Historical Machine Learning",
    title: "Short-Term Outlooks for Any Point or Region on Earth",
    description:
      "Select one of six benchmark locations or pick any custom point or region on the map. Iris trains local machine learning models strictly on historical observations to estimate upcoming conditions with clear uncertainty ranges.",
    ctaText: "Explore forecasts",
    ctaHref: "/workspace/forecasts",
    steps: [
      {
        num: "01",
        title: "Pick Any Location & Variable",
        text: "Choose a point or draw a region anywhere on Earth and select from 13+ variables including rainfall, temperature, soil moisture, and vegetation.",
      },
      {
        num: "02",
        title: "Train on Historical Records",
        text: "Models learn exclusively from past observations and generate predictions with a 10th-to-90th percentile uncertainty range.",
      },
      {
        num: "03",
        title: "Honest Baseline Comparisons",
        text: "Every forecast is tested against simple historical averages—and clearly labeled as an Experimental Preview if it does not beat the baseline.",
      },
    ],
  },
  {
    id: "track-d",
    tabLabel: "Case Studies & Research",
    badge: "Pathway 4 · Guided Stories & Literature",
    title: "Learn from Real Disasters, Solved Cases & Scientific Papers",
    description:
      "Step through guided multi-decade climate investigations, examine major flood and cyclone events using what was known before landfall, and find peer-reviewed scientific studies.",
    ctaText: "Browse case studies",
    ctaHref: "/workspace/case-studies",
    steps: [
      {
        num: "01",
        title: "Disaster Event Timelines",
        text: "Examine the September 2024 Nepal Floods and November 2025 Cyclone Ditwah in Sri Lanka by comparing pre-event warnings with daily rainfall records.",
      },
      {
        num: "02",
        title: "Guided Benchmark Cases",
        text: "Explore solved investigations with interactive learning checkpoints and toggle between Explorer, Student, and Scientist explanations.",
      },
      {
        num: "03",
        title: "Connected Research Library",
        text: "Automatically find peer-reviewed scientific articles and published datasets matching your active region and environmental variable.",
      },
    ],
  },
];

/* ─── Key Capabilities (4 Clear Benefits) ──────────────────────────────── */

const KEY_CAPABILITIES: Array<{
  icon: IconName;
  title: string;
  text: string;
  stat: string;
  label: string;
}> = [
  {
    icon: "layers",
    title: "10 Public Data Catalogs",
    text: "Search across NASA, NOAA, and European Copernicus archives from a single plain-English query after confirming your search keywords.",
    stat: "10 Sources",
    label: "Space & weather agency archives",
  },
  {
    icon: "activity",
    title: "8 Statistical Analysis Methods",
    text: "Combine standard linear regression with outlier-resistant Mann–Kendall and Sen's slope tests that account for seasonality and weather persistence.",
    stat: "8 Methods",
    label: "Step-by-step statistical workbench",
  },
  {
    icon: "check",
    title: "100% Real Observations",
    text: "Iris never invents or fills in fake data across missing satellite months. Gaps stay clearly visible in every chart, table, and 3D view.",
    stat: "0% Synthetic",
    label: "Authentic public observations only",
  },
  {
    icon: "globe",
    title: "Built for Every Audience",
    text: "Every investigation assigns a clear Evidence Grade (A–D) and lets you switch between Explorer, Student, and Scientist explanation modes.",
    stat: "Grade A–D",
    label: "Clear reliability grading",
  },
];

/* ─── 6-Step User Investigation Pipeline ───────────────────────────────── */

const PIPELINE_STEPS = [
  {
    num: "01",
    title: "Ask a Question in Iris Intelligence",
    text: "Type what you want to study in plain English. Review the suggested search keywords and search across 10 public space and weather catalogs.",
  },
  {
    num: "02",
    title: "Choose Your Region & Dates in Data Selection",
    text: "Select a dataset, pick your date range and time step (Daily, Monthly, or Yearly), and click a point or draw a region on the interactive map.",
  },
  {
    num: "03",
    title: "Check Data Quality in Data Preview",
    text: "Review completeness statistics, inspect the time-series chart with missing periods clearly marked, and verify your study area on the map.",
  },
  {
    num: "04",
    title: "Run Statistical Tests in Data Analysis",
    text: "Remove the repeating seasonal cycle and run up to 8 statistical tests step by step to measure the trend rate, significance, and Evidence Grade.",
  },
  {
    num: "05",
    title: "Explore 2D/3D Charts & the Living Globe",
    text: "Compare multi-panel 2D and 3D seasonal charts in Data Visualization, or explore 11 global monthly environmental layers on the 3D Living Globe.",
  },
  {
    num: "06",
    title: "View Forecasts, Case Studies & Research",
    text: "Generate short-term machine learning forecasts for any location, explore solved disaster case studies, and cite peer-reviewed research papers.",
  },
];

/* ─── Real Platform Overview Tabs (Simple & Clear) ─────────────────────── */

const WORKBENCH_METHODS_PREVIEW = [
  {
    name: "1. Linear Trend (OLS t-Test)",
    summary: "Fits a straight trend line over time and tests whether the slope is statistically significant.",
    scope: "All time steps",
  },
  {
    name: "2. Mann–Kendall Trend Test",
    summary: "Tests whether values consistently rise or fall over time while correcting for weather persistence.",
    scope: "All time steps",
  },
  {
    name: "3. Seasonal Kendall Test",
    summary: "Compares matching calendar months (Jan vs. Jan, Feb vs. Feb) across years.",
    scope: "Monthly data",
  },
  {
    name: "4. Sen’s Slope Rate of Change",
    summary: "Calculates the median rate of change per decade so extreme outlier years cannot skew the result.",
    scope: "All time steps",
  },
  {
    name: "5. Pettitt Change-Point Detection",
    summary: "Finds the exact date when a sudden step-change or shift occurred in the record.",
    scope: "All time steps",
  },
  {
    name: "6. Anomaly Review",
    summary: "Flags unusual highs and lows (such as heatwaves or droughts) beyond normal seasonal variation.",
    scope: "All time steps",
  },
  {
    name: "7. Seasonal Fingerprint Heatmap",
    summary: "Displays a Year × Month heatmap and monthly slopes to show which seasons are changing fastest.",
    scope: "Monthly data",
  },
  {
    name: "8. Full Case File Diagnostics",
    summary: "Assigns an Evidence Grade (A–D), builds warming stripes, and checks trend stability across time windows.",
    scope: "All time steps",
  },
];

const LIVE_PROVIDERS_PREVIEW = [
  { name: "NASA POWER", agency: "Surface meteorology, rainfall, soil wetness & solar radiation", state: "Direct retrieval" },
  { name: "NASA GES DISC", agency: "GLDAS land hydrology & MERRA-2 climate records", state: "Direct retrieval" },
  { name: "NOAA Climate Data Online", agency: "Global weather station daily & monthly summaries", state: "Direct retrieval" },
  { name: "NOAA OneStop", agency: "Enterprise climate, ocean & atmospheric archives", state: "Direct retrieval" },
  { name: "NASA OPeNDAP Cloud", agency: "Cloud grid slicing for global reanalysis series", state: "Direct retrieval" },
  { name: "EODAG Federated Search", agency: "International satellite & climate data gateway", state: "Direct retrieval" },
  { name: "Copernicus Climate Data Store", agency: "ECMWF ERA5 & ERA5-Land global reanalysis", state: "Direct retrieval" },
  { name: "NASA AppEEARS", agency: "MODIS & VIIRS vegetation (NDVI) & land surface temp", state: "Catalog & sign-in" },
  { name: "NASA Harmony", agency: "Earthdata Cloud regional subsetting service", state: "Catalog & sign-in" },
  { name: "NASA Earthdata Catalog (CMR)", agency: "Master directory of NASA satellite missions", state: "Catalog search" },
];

const ZARR_GLOBE_LAYERS_PREVIEW = [
  { label: "Air Temperature at 2 m", unit: "°C", group: "Temperature" },
  { label: "Earth Skin Surface Temperature", unit: "°C", group: "Temperature" },
  { label: "Dew / Frost Point at 2 m", unit: "°C", group: "Temperature" },
  { label: "Corrected Precipitation Rate", unit: "mm / day", group: "Water & Snow" },
  { label: "Snow Depth", unit: "cm", group: "Water & Snow" },
  { label: "Surface Topsoil Wetness (0–5 cm)", unit: "0–1 index", group: "Land" },
  { label: "Root-Zone Soil Wetness (0–100 cm)", unit: "0–1 index", group: "Land" },
  { label: "Relative Humidity at 2 m", unit: "%", group: "Atmosphere" },
  { label: "Wind Speed at 10 m", unit: "m / s", group: "Atmosphere" },
  { label: "Surface Atmospheric Pressure", unit: "hPa", group: "Atmosphere" },
  { label: "Surface Sunlight (Shortwave Irradiance)", unit: "W / m²", group: "Radiation" },
];

/* ─── Team Members (6 Contributors) ────────────────────────────────────── */

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
    focus: "Backend services and data pipelines, system architecture leadership, and Earth observation research.",
    image: "/navida.jpg",
  },
  {
    id: "member-02",
    num: "02",
    name: "Oshadha Shiro",
    role: "Frontend Dev, Forecasting, Documentation",
    focus: "Web application interface, interactive forecasting workflows, and platform documentation.",
    image: "/oshadha.jpeg",
  },
  {
    id: "member-03",
    num: "03",
    name: "Vimukthi Prashan",
    role: "ML Dev, Forecasting, Data Visualization",
    focus: "Historical machine learning forecasting models, uncertainty intervals, and 3D visual landscapes.",
    image: "/vimukthi.jpeg",
  },
  {
    id: "member-04",
    num: "04",
    name: "Dinodh Dassanayake",
    role: "Data Analyzing, Research, Documentation",
    focus: "Multi-decadal satellite data analysis, Earth observation literature research, and methodology documentation.",
    image: "/dinodh.jpeg",
  },
  {
    id: "member-05",
    num: "05",
    name: "Shenon Kaushika",
    role: "Data Analyzing, Research, Documentation",
    focus: "Observational time-series data analysis, environmental anomaly review, and benchmark case documentation.",
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

/* ─── Frequently Asked Questions ───────────────────────────────────────── */

const FAQS = [
  {
    q: "How do I run an investigation on Iris from start to finish?",
    a: "Start in Iris Intelligence by typing your question in plain English and confirming the suggested search keywords to search 10 public data catalogs. Next, choose your dataset, region, and dates in Data Selection. Check the data completeness and preview chart in Data Preview. Then run statistical trend tests in Data Analysis, explore 2D and 3D seasonal charts in Data Visualization or the 3D Living Globe, and find matching scientific papers in Existing Research.",
  },
  {
    q: "Why does Iris use Mann–Kendall and Sen's slope alongside linear regression?",
    a: "Environmental records often have strong seasonal swings and occasional extreme weather years (such as a major El Niño) that can tilt a standard straight regression line. Mann–Kendall tests whether values consistently rise or fall over time, while Sen's slope calculates the median rate of change so single extreme years cannot distort the result. Running both gives a much more trustworthy answer.",
  },
  {
    q: "What do the Evidence Grades (Grade A through Grade D) mean?",
    a: "Every Case File receives an Evidence Grade from A to D so you can see how strong the finding is at a glance. Grade A means a long, nearly complete record (90%+ valid data) where multiple statistical tests agree on a significant trend. Grade B indicates a clear trend with minor data gaps or seasonal sensor notes (such as monsoon clouds). Grade C means an emerging signal that needs a longer record, and Grade D means the data is too short or noisy to draw a firm conclusion.",
  },
  {
    q: "Does the AI assistant ever calculate statistics or invent numbers?",
    a: "Never. The AI assistant only helps translate your plain-English question into search keywords and explains completed results in clear language. All trend rates, p-values, charts, and forecasts are calculated strictly by standard mathematical formulas using real observations.",
  },
];

/* ─── Main Landing Page Component ──────────────────────────────────────── */

export default function LandingPage() {
  const { dark, toggleTheme } = useTheme();
  const [activeOffering, setActiveOffering] = useState<number>(0);
  const [activeSignalMode, setActiveSignalMode] = useState<"methods" | "providers" | "zarr">(
    "methods"
  );
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
            <em>before they become headlines.</em>
          </h1>
          <p>
            Search 10 public space and weather catalogs in plain English, explore 3D global
            satellite maps, run clear statistical trend tests, and view short-term environmental
            forecasts—all grounded in 100% real observations.
          </p>
          <div className="landing-hero-actions">
            <Link className="landing-primary-cta" href="/workspace">
              Start investigating <Icon name="arrow" size={16} />
            </Link>
            <Link className="landing-secondary-cta" href="/methodology">
              How it works <Icon name="arrow" size={15} />
            </Link>
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
                Explore short-term environmental forecasts, uncertainty ranges, and accuracy checks
                built from historical weather and satellite records at six benchmark locations
                worldwide—or pick any point or region on Earth inside the Forecasts workspace.
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
              "Near-Surface Air Temperature (NASA POWER)",
              "Precipitation Rate (NASA MERRA-2 & GPM)",
              "Surface & Root-Zone Soil Wetness (NASA & GLDAS)",
              "Vegetation Greenness NDVI (NASA MODIS & VIIRS)",
              "Snow Depth & Snow Cover (NASA MODIS)",
              "Surface Sunlight & Solar Radiation (NASA CERES)",
              "Soil Moisture (NASA SMAP)",
              "Global Climate Reanalysis (Copernicus ERA5)",
              "Ground Weather Stations (NOAA Climate Data)",
              "Near-Surface Air Temperature (NASA POWER)",
              "Precipitation Rate (NASA MERRA-2 & GPM)",
            ].map((item, index) => (
              <span key={`${item}-${index}`}>
                <i />
                {item}
              </span>
            ))}
          </div>
        </section>

        {/* ─── 2. INTERACTIVE OFFERINGS (4 PATHWAYS) ───────────────────── */}
        <section className="landing-offerings-section" id="offerings">
          <div className="landing-section-heading centered">
            <div className="landing-kicker">Four ways to explore</div>
            <h2>
              Choose the pathway that matches
              <br />
              <em>your question.</em>
            </h2>
            <p>
              Whether you want to investigate a local question, explore a 3D global map, check
              upcoming conditions, or learn from solved case studies, Iris guides you step by step.
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

        {/* ─── 3. KEY CAPABILITIES (4 CORE BENEFITS) ───────────────────── */}
        <section className="landing-section platform-section" id="features">
          <div className="landing-section-heading centered">
            <div className="landing-kicker">What makes Iris unique</div>
            <h2>
              Rigorous science.
              <br />
              <em>Clear enough for everyone.</em>
            </h2>
            <p>
              Iris combines trusted satellite archives, outlier-resistant statistics, and plain
              language so anyone can investigate environmental change with confidence.
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

        {/* ─── 4. HOW IT WORKS (6-STEP GUIDE + PLATFORM EXPLORER) ──────── */}
        <section className="landing-section how-it-works-section" id="how-it-works">
          <div className="landing-section-heading centered">
            <div className="landing-kicker">Step-by-step workflow</div>
            <h2>
              How to investigate a signal
              <br />
              <em>from start to finish.</em>
            </h2>
            <p>
              Follow six simple steps across the workspace—and explore the real statistical tests,
              public data providers, and global map layers included in Iris.
            </p>
          </div>

          <div className="how-it-works-grid" style={{ alignItems: "start" }}>
            {/* Left: 6 User Steps */}
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
              <div style={{ marginTop: "8px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <Link className="landing-primary-cta" href="/methodology">
                  Full methodology guide <Icon name="arrow" size={14} />
                </Link>
                <Link className="landing-secondary-cta" href="/data">
                  Browse our data <Icon name="arrow" size={14} />
                </Link>
              </div>
            </div>

            {/* Right: Clean Interactive Overview of What's Inside Iris */}
            <div className="how-proof-column">
              <div
                className="offering-block"
                style={{ padding: "24px", borderRadius: "14px" }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                    flexWrap: "wrap",
                    marginBottom: "14px",
                  }}
                >
                  <div>
                    <span className="offering-badge" style={{ marginBottom: "4px" }}>
                      <Icon name="activity" size={11} /> Inside the Workbench
                    </span>
                    <h3 style={{ fontSize: "16px", margin: "4px 0 0" }}>
                      {activeSignalMode === "methods"
                        ? "8 Statistical Analysis Methods"
                        : activeSignalMode === "providers"
                        ? "10 Connected Public Data Catalogs"
                        : "11 Global 3D Map Layers"}
                    </h3>
                  </div>
                </div>

                <div
                  className="signal-layer-controls"
                  style={{ justifyContent: "flex-start", flexWrap: "wrap", marginBottom: "16px" }}
                >
                  <button
                    type="button"
                    onClick={() => setActiveSignalMode("methods")}
                    className={`signal-layer-btn${activeSignalMode === "methods" ? " active" : ""}`}
                  >
                    8 Analysis Methods
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSignalMode("providers")}
                    className={`signal-layer-btn${activeSignalMode === "providers" ? " active" : ""}`}
                  >
                    10 Data Providers
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSignalMode("zarr")}
                    className={`signal-layer-btn${activeSignalMode === "zarr" ? " active" : ""}`}
                  >
                    11 Globe Layers
                  </button>
                </div>

                {activeSignalMode === "methods" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {WORKBENCH_METHODS_PREVIEW.map((m) => (
                      <div
                        key={m.name}
                        style={{
                          padding: "10px 12px",
                          borderRadius: "8px",
                          border: "1px solid var(--border)",
                          background: "var(--panel)",
                          display: "grid",
                          gap: "3px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "8px",
                            flexWrap: "wrap",
                          }}
                        >
                          <strong style={{ fontSize: "11.5px", color: "var(--text)" }}>
                            {m.name}
                          </strong>
                          <span
                            style={{
                              fontSize: "9.5px",
                              color: "var(--green)",
                              fontWeight: 600,
                            }}
                          >
                            {m.scope}
                          </span>
                        </div>
                        <div style={{ fontSize: "10.5px", color: "var(--muted)", lineHeight: 1.45 }}>
                          {m.summary}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeSignalMode === "providers" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {LIVE_PROVIDERS_PREVIEW.map((p) => (
                      <div
                        key={p.name}
                        style={{
                          padding: "9px 12px",
                          borderRadius: "8px",
                          border: "1px solid var(--border)",
                          background: "var(--panel)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "10px",
                          flexWrap: "wrap",
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: "11.5px", display: "block" }}>{p.name}</strong>
                          <span style={{ fontSize: "10px", color: "var(--muted)" }}>
                            {p.agency}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: "9.5px",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            background: "var(--green-soft)",
                            color: "var(--green)",
                            fontWeight: 600,
                          }}
                        >
                          {p.state}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {activeSignalMode === "zarr" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                    {ZARR_GLOBE_LAYERS_PREVIEW.map((z) => (
                      <div
                        key={z.label}
                        style={{
                          padding: "8px 12px",
                          borderRadius: "8px",
                          border: "1px solid var(--border)",
                          background: "var(--panel)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "10px",
                          flexWrap: "wrap",
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: "11px" }}>{z.label}</strong>
                          <span
                            style={{
                              marginLeft: "8px",
                              fontSize: "10px",
                              color: "var(--green)",
                              fontWeight: 600,
                            }}
                          >
                            ({z.unit})
                          </span>
                        </div>
                        <span style={{ fontSize: "10px", color: "var(--muted)" }}>{z.group}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div
                  style={{
                    marginTop: "14px",
                    paddingTop: "12px",
                    borderTop: "1px solid var(--border)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "8px",
                    fontSize: "10.5px",
                    color: "var(--muted)",
                  }}
                >
                  <span>100% real observations · Clear Explorer, Student &amp; Scientist modes</span>
                  <Link
                    href="/workspace/data-analysis"
                    style={{
                      color: "var(--green)",
                      fontWeight: 650,
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    Open Data Analysis <Icon name="arrow" size={12} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 5. CASE STUDIES PURPOSE & EFFICIENCY BENCHMARK ──────────── */}
        <section className="landing-manual-cases-section" id="cases">
          <div className="landing-section-heading centered">
            <div className="landing-kicker">Manual Analysis vs. Iris Platform Benchmark</div>
            <h2>
              Why We Built Manual Case Studies
              <br />
              <em>and what they do.</em>
            </h2>
            <p>
              {MANUAL_CASE_STUDIES_PURPOSE.summary}
            </p>
          </div>

          {/* Why & What Overview Cards */}
          <div className="landing-manual-compare-grid">
            {MANUAL_CASE_STUDIES_PURPOSE.comparisonMetrics.map((metric) => (
              <article className="landing-manual-compare-card" key={metric.label}>
                <div className="landing-manual-compare-head">
                  <strong>{metric.label}</strong>
                  <span>{metric.speedup}</span>
                </div>
                <div className="landing-manual-compare-row manual">
                  <small>Manual Research Team Analysis</small>
                  <p>{metric.manual}</p>
                </div>
                <div className="landing-manual-compare-row iris">
                  <small>What the Iris Case Studies Do</small>
                  <p>{metric.iris}</p>
                </div>
              </article>
            ))}
          </div>

          <div
            className="offering-block"
            style={{
              padding: "28px",
              borderRadius: "14px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "24px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ maxWidth: "680px" }}>
              <span className="offering-badge" style={{ marginBottom: "8px" }}>
                <Icon name="book" size={12} /> What the Case Studies Do in the Workspace
              </span>
              <h3 style={{ margin: "6px 0 8px", fontSize: "20px" }}>
                One-Click Dataset Loading Across Data Preview, Analysis &amp; Visualization
              </h3>
              <p style={{ margin: 0, fontSize: "12px", lineHeight: 1.65, color: "var(--muted)" }}>
                Our research team compiled 5 manual NASA Giovanni disaster investigations so you can
                compare traditional manual Earth trend analysis directly against our platform. When
                you open any case study in the dashboard, Iris automatically queries and loads its
                authentic satellite datasets straight into Data Preview, runs the statistical trend
                tests in Data Analysis, and plots the multi-sensor series in the Visualization
                Studio.
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <Link className="landing-primary-cta" href="/case-studies">
                Explore Case Studies <Icon name="arrow" size={14} />
              </Link>
              <Link className="landing-secondary-cta" href="/workspace/case-studies">
                Open in Dashboard <Icon name="arrow" size={14} />
              </Link>
            </div>
          </div>
        </section>

        {/* ─── 6. TEAM (6 CONTRIBUTORS) ────────────────────────────────── */}
        <section className="team-section" id="team">
          <div className="landing-section-heading centered">
            <div className="landing-kicker">Contributors &amp; Architecture</div>
            <h2>
              Team
              <br />
              <em>and research contributors.</em>
            </h2>
            <p>
              The multidisciplinary team behind Project Iris combining climate science, statistical
              analysis, geospatial engineering, and machine learning.
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

        {/* ─── 7. FREQUENTLY ASKED QUESTIONS (ACCORDION) ───────────────── */}
        <section className="faq-section" id="faq">
          <div className="landing-section-heading centered">
            <div className="landing-kicker">Frequently asked questions</div>
            <h2>
              Got questions?
              <br />
              <em>We have answers.</em>
            </h2>
            <p>
              Everything you need to know about how Iris works, our statistical methods, and our
              data sources.
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
            Select any region, choose an environmental variable, and build a clear, trustworthy
            evidence trail in minutes.
          </p>
          <Link href="/workspace">
            Open Iris <Icon name="arrow" size={17} />
          </Link>
        </section>
      </main>

      {/* ─── 8. GROUPED FOOTER ─────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="landing-footer-container">
          <div className="landing-footer-grid">
            <div className="landing-footer-brand">
              <div className="brand-mark" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="globe" size={20} />
                <strong style={{ fontSize: "16px", letterSpacing: "-0.03em" }}>Iris</strong>
              </div>
              <p>
                Open Earth intelligence platform turning decades of public satellite and weather
                observations into clear, trustworthy evidence.
              </p>
            </div>

            <div className="landing-footer-col">
              <h4>Workspace</h4>
              <ul>
                <li>
                  <Link href="/workspace/intelligence">Iris Intelligence</Link>
                </li>
                <li>
                  <Link href="/workspace/data-analysis">Data Analysis</Link>
                </li>
                <li>
                  <Link href="/workspace/globe">3D Living Globe</Link>
                </li>
                <li>
                  <Link href="/workspace/forecasts">Forecasts</Link>
                </li>
              </ul>
            </div>

            <div className="landing-footer-col">
              <h4>Science &amp; Data</h4>
              <ul>
                <li>
                  <Link href="/methodology">Methodology</Link>
                </li>
                <li>
                  <Link href="/data">Our Data</Link>
                </li>
                <li>
                  <Link href="/case-studies">Case Studies</Link>
                </li>
                <li>
                  <Link href="/about">About &amp; Team</Link>
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
              <h4>Resources &amp; Contact</h4>
              <ul>
                <li>
                  <a
                    href="https://github.com/Iris-NASC26/iris"
                    target="_blank"
                    rel="noreferrer"
                  >
                    GitHub Repository ↗
                  </a>
                </li>
                <li>
                  <a href="mailto:info@projectiris.earth">info@projectiris.earth</a>
                </li>
                <li>
                  <Link href="/about#contact">Contact Us</Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="landing-footer-bottom">
            <span>Built with publicly funded NASA, NOAA, and European Earth observation data.</span>
            <span>© {new Date().getFullYear()} Project Iris Earth Intelligence. Open Science.</span>
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
            <Icon name="globe" size={11} /> Iris Visualization Studio
          </div>
          <span>IR</span>
        </div>
        <img
          src="/hero-section.jpeg"
          alt="Iris Earth Intelligence Platform - 3D Seasonal Orbit & Time Series Analysis"
          className="product-window-img"
          loading="eager"
        />
      </div>
      <div className="floating-insight insight-left">
        <span>
          <Icon name="layers" size={14} />
        </span>
        <div>
          <small>Connected catalogs</small>
          <strong>10 Public Space &amp; Weather Sources</strong>
        </div>
      </div>
      <div className="floating-insight insight-right">
        <span>
          <Icon name="check" size={14} />
        </span>
        <div>
          <small>Evidence quality</small>
          <strong>100% Real Data · Grade A–D</strong>
        </div>
      </div>
    </div>
  );
}
