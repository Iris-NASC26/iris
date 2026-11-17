"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PageShell } from "@/components/layout/PageShell";
import {
  EVIDENCE_METHODS_REGISTRY,
  PROVIDER_CAPABILITY_MATRIX,
} from "@/lib/srsCubeAndScienceEngine";

interface PlatformTrack {
  id: string;
  badge: string;
  title: string;
  route: string;
  routeLabel: string;
  summary: string;
  highlights: string[];
}

const PLATFORM_TRACKS: PlatformTrack[] = [
  {
    id: "track-a",
    badge: "Pathway 1 · Custom Investigation",
    title: "Ask a Question & Build a Scientific Case File",
    route: "/workspace/intelligence",
    routeLabel: "Start an Investigation",
    summary:
      "Start with any plain-English question about the environment. Iris helps you find the right satellite or weather station dataset, checks the data quality, and runs a step-by-step statistical analysis to see if a real trend exists.",
    highlights: [
      "Translates everyday questions into scientific search keywords across 10 public space and weather agencies",
      "Lets you pick a single location or draw a custom region on an interactive map",
      "Previews the raw data and highlights any missing periods before running any math",
      "Runs up to 8 statistical tests, builds interactive 2D and 3D charts, and finds related research papers",
    ],
  },
  {
    id: "track-b",
    badge: "Pathway 2 · 3D Living Globe",
    title: "Explore Global Satellite & Climate Maps in 3D",
    route: "/workspace/globe",
    routeLabel: "Open the 3D Globe",
    summary:
      "Explore 11 monthly global environmental layers—including air temperature, rainfall, soil wetness, snow depth, wind speed, and sunlight—on an interactive 3D globe or 2D world map.",
    highlights: [
      "11 monthly environmental variables covering temperature, water, snow, land wetness, wind, pressure, and sunlight",
      "View the entire planet at once or zoom into a specific region or custom rectangle",
      "Click any grid cell on Earth to see its exact measured value, unit, and date",
      "Step forward and backward through historical months and compare 20 global climate benchmark locations",
    ],
  },
  {
    id: "track-c",
    badge: "Pathway 3 · Environmental Forecasts",
    title: "Short-Term Outlooks Learned from Historical Data",
    route: "/workspace/forecasts",
    routeLabel: "Explore Forecasts",
    summary:
      "Select any point or region on Earth to generate short-term environmental outlooks trained strictly on historical satellite and weather records—complete with uncertainty ranges and honest accuracy checks.",
    highlights: [
      "Works for any point or bounded region on Earth, plus 6 ready-to-explore benchmark locations",
      "Supports 13+ environmental variables including rainfall, temperature, soil moisture, vegetation, and snow cover",
      "Shows a clear 10th-to-90th percentile uncertainty range alongside the median prediction",
      "Tests every forecast model against simple historical baselines and clearly labels experimental results",
    ],
  },
  {
    id: "track-d",
    badge: "Pathway 4 · Case Studies & Research",
    title: "Guided Stories, Disaster Timelines & Scientific Literature",
    route: "/workspace/case-studies",
    routeLabel: "Browse Case Studies",
    summary:
      "Learn from completed environmental investigations, examine major flood and cyclone events using what was known before landfall, and connect your findings to published scientific papers.",
    highlights: [
      "Detailed reconstructions of the September 2024 Nepal Floods and November 2025 Cyclone Ditwah in Sri Lanka",
      "Compares official pre-event weather bulletins with daily satellite rainfall measurements",
      "4 guided multi-decade investigations with Explorer, Student, and Scientist explanation modes",
      "Built-in search connecting your active dataset to peer-reviewed scientific articles and citations",
    ],
  },
];

interface UserWorkflowStep {
  number: string;
  stage: string;
  title: string;
  route: string;
  routeLabel: string;
  icon: IconName;
  summary: string;
  userActions: string[];
  systemGuarantees: string;
}

const USER_WORKFLOW_STEPS: UserWorkflowStep[] = [
  {
    number: "01",
    stage: "Step 1 · Iris Intelligence",
    title: "Ask Your Question & Confirm Search Keywords",
    route: "/workspace/intelligence",
    routeLabel: "Open Iris Intelligence",
    icon: "sparkles",
    summary:
      "You do not need to know satellite mission names or technical variable codes to begin. Describe what you want to investigate in plain English, and Iris will suggest the right search terms and data sources.",
    userActions: [
      "Type a question such as 'Monthly rainfall and soil moisture trends in Sri Lanka' or 'Temperature trends in California'.",
      "Review the suggested research scope: topic, geographic region, date range, and recommended frequency.",
      "Add or remove search keywords and choose which of the 10 public data catalogs you want to search.",
      "Click 'Confirm and search' to see matching datasets and pick one that is ready for retrieval.",
    ],
    systemGuarantees:
      "Nothing is searched until you confirm your keywords · Works offline with a built-in science keyword dictionary",
  },
  {
    number: "02",
    stage: "Step 2 · Data Selection",
    title: "Choose Your Region, Timeframe & Frequency",
    route: "/workspace/data-selection",
    routeLabel: "Open Data Selection",
    icon: "box",
    summary:
      "Once you select a dataset, configure the exact place and time period you want to study. Iris automatically prevents invalid settings that could distort the science.",
    userActions: [
      "Review the dataset's official date range, spatial resolution, measurement unit, and source agency.",
      "Pick a start and end date (or use quick presets like Last 5 Years, Last 10 Years, or Full Record) and choose a time step (Daily, Monthly, Seasonal, or Yearly).",
      "Click a point on the interactive map, draw a region box, or search for a city, river basin, or country by name.",
      "Click 'Extract data' to retrieve the observations from the source archive.",
    ],
    systemGuarantees:
      "Prevents selecting dates outside the real record · Uses physically appropriate math (averages for temperature, totals for rainfall)",
  },
  {
    number: "03",
    stage: "Step 3 · Data Preview",
    title: "Check Data Quality & Missing Periods",
    route: "/workspace/data-preview",
    routeLabel: "Open Data Preview",
    icon: "layers",
    summary:
      "Before running any trend tests, inspect the retrieved observations to make sure the record is complete and reliable for your study area.",
    userActions: [
      "Check the summary cards showing total observations, valid data count, missing count, completeness percentage, average, and min/max values.",
      "Inspect the preview chart: any missing periods are shown clearly as shaded gaps rather than connected with misleading straight lines.",
      "Confirm your study area on the footprint map and browse the sortable table of observations and quality flags.",
      "Download the clean table as CSV or JSON, or click 'Proceed to analysis' to open the statistical workbench.",
    ],
    systemGuarantees:
      "Missing or cloud-blocked satellite readings are never filled with fake numbers · Automatic alert if more than 15% of data is missing",
  },
  {
    number: "04",
    stage: "Step 4 · Data Analysis",
    title: "Run Step-by-Step Statistical Tests & Build a Case File",
    route: "/workspace/data-analysis",
    routeLabel: "Open Data Analysis",
    icon: "activity",
    summary:
      "The Data Analysis workbench checks which statistical methods fit your data, removes repeating seasonal cycles, and lets you run up to eight complementary tests one by one or all at once.",
    userActions: [
      "Check the compatibility banner at the top to see which statistical tests are supported for your data's time step and length.",
      "Choose how to handle seasonality: Automatic seasonal removal, Calendar-Month averages, STL decomposition, or No adjustment.",
      "Select from 8 method cards (such as Mann–Kendall trend test, Sen's slope rate of change, Change-point detection, or Anomaly review), adjust settings if needed, and click Run.",
      "Switch between Explorer, Student, and Scientist explanation modes and download high-resolution chart images or your complete Case File.",
    ],
    systemGuarantees:
      "Corrects for month-to-month weather persistence · Assigns an objective Evidence Grade (A–D) based on data quality and test agreement",
  },
  {
    number: "05",
    stage: "Step 5 · Data Visualization & 3D Globe",
    title: "Explore 2D/3D Seasonal Patterns & Global Maps",
    route: "/workspace/visualize",
    routeLabel: "Open Visualization Studio",
    icon: "globe",
    summary:
      "See how environmental signals evolve across seasons, decades, and geography using linked multi-panel charts and the 3D Living Globe.",
    userActions: [
      "In Data Visualization, explore side-by-side panels: 2D and 3D Time Tracks, 3D Seasonal Landscapes, 3D Seasonal Orbits, and multi-location trend comparisons.",
      "Press Play on the time scrubber to step through observations and see every open chart highlight the same date together.",
      "In the 3D Living Globe, choose from 11 monthly global variables, pick a region or the whole Earth, select a month, and load the map layer.",
      "Click any cell on the globe to inspect its measured value, customize color palettes, or switch to a 2D flat map.",
    ],
    systemGuarantees:
      "3D surfaces and charts leave real gaps where data is missing · Consistent color scales across months for honest visual comparison",
  },
  {
    number: "06",
    stage: "Step 6 · Forecasts, Case Studies & Research",
    title: "Generate Forecasts, Review Case Studies & Cite Literature",
    route: "/workspace/forecasts",
    routeLabel: "Open Forecasts",
    icon: "book",
    summary:
      "Complete your investigation by exploring short-term machine learning outlooks, comparing against benchmark disaster events, and finding peer-reviewed studies.",
    userActions: [
      "In Forecasts, pick a location or register a new point or region on the map, choose a target variable, and view short-term predictions with 10th–90th percentile uncertainty ranges.",
      "In Case Studies, step through guided investigations with interactive checkpoints or inspect the Nepal Floods (2024) and Cyclone Ditwah (2025) timelines.",
      "In Existing Research, automatically find peer-reviewed scientific papers and datasets matching your study variable and region, and copy citations in one click.",
    ],
    systemGuarantees:
      "Forecasts train only on historical records · Models that do not beat simple baselines are transparently labeled as Experimental Previews",
  },
];

interface UniquenessPillar {
  num: string;
  icon: IconName;
  title: string;
  subtitle: string;
  description: string;
}

const UNIQUENESS_PILLARS: UniquenessPillar[] = [
  {
    num: "01",
    icon: "sparkles",
    title: "AI Helps You Search; Math Decides the Answer",
    subtitle: "Zero AI-generated numbers and full offline reliability",
    description:
      "Many AI tools let language models guess trends or summarize raw numbers, which can lead to errors. In Iris, the AI assistant only helps translate your question into search keywords and explains completed results in plain language. Every statistic, slope, and grade is calculated by standard, reproducible mathematical formulas—and a built-in keyword dictionary keeps search working even offline.",
  },
  {
    num: "02",
    icon: "check",
    title: "100% Real Observations—Never Filled with Fake Data",
    subtitle: "Missing periods stay visible in every chart and 3D view",
    description:
      "Satellites and weather stations occasionally miss readings due to cloud cover or maintenance. Instead of hiding those gaps or drawing straight lines across missing months, Iris isolates flagged readings and shows gaps openly in both 2D charts and 3D seasonal surfaces so you only analyze what was actually measured.",
  },
  {
    num: "03",
    icon: "layers",
    title: "One Search Across 10 Public Space & Weather Agencies",
    subtitle: "Clear labels showing which datasets can be extracted immediately",
    description:
      "Instead of visiting separate portals for NASA, NOAA, and European Copernicus data, Iris searches 10 public catalogs at once after you confirm your keywords. Each result clearly states whether it supports instant time-series extraction in the workspace or requires an external agency sign-in.",
  },
  {
    num: "04",
    icon: "activity",
    title: "Multiple Statistical Tests That Check Each Other",
    subtitle: "Built to handle seasonality, extreme weather outliers, and persistence",
    description:
      "Relying on a single trend line can be misleading if one extreme El Niño year skews the average, or if a long dry spell looks like a permanent shift. Iris compares parametric linear regression against outlier-resistant non-parametric tests (Mann–Kendall and Sen's slope) and adjusts for month-to-month weather memory before awarding a high Evidence Grade.",
  },
  {
    num: "05",
    icon: "globe",
    title: "Honest Machine Learning Forecasts & Disaster Cutoffs",
    subtitle: "Trained strictly on past data and tested against simple baselines",
    description:
      "Iris's forecasting workspace trains models using only historical data that was genuinely available at the time. Every model is tested against simple benchmarks (such as assuming tomorrow looks like today or the historical seasonal average). If a model does not beat those baselines, Iris labels it clearly as an Experimental Preview rather than overstating its accuracy.",
  },
  {
    num: "06",
    icon: "file",
    title: "Built for Everyone: Explorer, Student & Scientist Modes",
    subtitle: "Plain-English takeaways alongside full formulas and literature citations",
    description:
      "Whether you are a citizen exploring local warming, a student learning statistics, or a researcher preparing a paper, every Case File lets you toggle between Explorer, Student, and Scientist explanations—and connects your dataset directly to published scientific articles.",
  },
];

interface StatisticalMethodSpec {
  id: string;
  num: string;
  name: string;
  category: string;
  formula: string;
  cadenceRule: string;
  parameters: string;
  description: string;
}

const STATISTICAL_METHODS_SPECS: StatisticalMethodSpec[] = [
  {
    id: "ols",
    num: "01",
    name: "Linear Trend (OLS t-Test)",
    category: "Parametric Trend",
    formula: "Slope β₁ over time · t = Slope / Standard Error",
    cadenceRule: "All time steps (Daily to Yearly) · At least 6 valid points",
    parameters: "Significance threshold (1%, 5%, 10%) · Persistence adjustment",
    description:
      "Fits a standard straight trend line across your observations and tests whether the slope is significantly different from zero, while adjusting for month-to-month persistence.",
  },
  {
    id: "hamed_rao_mk",
    num: "02",
    name: "Mann–Kendall Trend Test (Autocorrelation-Corrected)",
    category: "Non-Parametric Trend",
    formula: "S = Σ sign(later value − earlier value)",
    cadenceRule: "All time steps · At least 6 valid points",
    parameters: "Significance threshold · Persistence correction · Maximum lag window",
    description:
      "Compares every observation with earlier observations to test whether values consistently move upward or downward over time—without assuming a normal bell-curve distribution and while correcting for weather persistence.",
  },
  {
    id: "seasonal_kendall",
    num: "03",
    name: "Seasonal Kendall Test",
    category: "Seasonal Trend",
    formula: "Sums Mann–Kendall scores across all 12 individual months",
    cadenceRule: "Monthly data only · At least 24 valid months",
    parameters: "Significance threshold · Minimum years per month",
    description:
      "Compares January only with January, February only with February, and so on across all 12 months. This prevents strong summer-to-winter swings from masking a long-term trend.",
  },
  {
    id: "sen_slope",
    num: "04",
    name: "Sen’s Slope (Outlier-Resistant Rate of Change)",
    category: "Rate of Change",
    formula: "Median of all pairwise slopes (change ÷ elapsed time)",
    cadenceRule: "All time steps · At least 6 valid points",
    parameters: "Confidence range (80% to 99.9%) · Rate per decade or per year",
    description:
      "Calculates the slope between every pair of points in the record and takes the middle (median) value. Because it uses the median, single extreme weather events or sensor spikes cannot distort the rate of change.",
  },
  {
    id: "pettitt",
    num: "05",
    name: "Pettitt Change-Point Detection",
    category: "Regime Shift Screen",
    formula: "Scans all dates for the largest rank shift between before and after",
    cadenceRule: "All time steps · At least 10 valid points",
    parameters: "Significance threshold · Minimum segment length",
    description:
      "Identifies the exact date when a sudden step-change or shift occurred in the record—helpful for spotting abrupt climate regime shifts, land-use changes, or satellite transitions.",
  },
  {
    id: "anomalies",
    num: "06",
    name: "Anomaly Review (Unusual Highs & Lows)",
    category: "Extreme Event Screen",
    formula: "Standardized departure from the seasonal baseline",
    cadenceRule: "All time steps · At least 6 valid points",
    parameters: "Outlier-resistant (MAD) or standard spread · Threshold (default ±2σ)",
    description:
      "Flags unusual observations that fall far outside normal seasonal variation (such as heatwaves, extreme rainfall, or severe drought months) so you can inspect them in detail.",
  },
  {
    id: "seasonal_fingerprint",
    num: "07",
    name: "Seasonal Fingerprint Heatmap",
    category: "Calendar-Month Pattern",
    formula: "Year × Month anomaly grid + 12 monthly rates of change",
    cadenceRule: "Monthly data only · At least 12 valid months",
    parameters: "Color scale range · Spread calculation method",
    description:
      "Arranges your data into a Year-by-Month grid alongside separate trend rates for each calendar month, revealing whether warming or drying is happening faster in spring, summer, autumn, or winter.",
  },
  {
    id: "case_file_diagnostics",
    num: "08",
    name: "Full Case File Diagnostics & Trend Triangle",
    category: "Overall Reliability & Summary",
    formula: "Evidence Grade (A–D) + Multi-Window Trend Stability Matrix",
    cadenceRule: "All time steps · At least 12 valid points",
    parameters: "Minimum window length · Warming stripes coverage · Outlook horizon",
    description:
      "Combines all checks into a complete Case File: assigns an Evidence Grade (A–D), generates annual anomaly stripes, tests trend stability across every combination of start and end years (the Trend Triangle), and lists any data caveats.",
  },
];

const SEASONAL_PRETREATMENTS = [
  {
    mode: "Automatic (Recommended)",
    requirement: "12 or more observations",
    description:
      "Uses smooth STL seasonal decomposition when you have a complete monthly record of at least two years; otherwise automatically switches to Calendar-Month Averages so no fake values are ever filled into gaps.",
  },
  {
    mode: "STL Seasonal Decomposition",
    requirement: "Complete monthly record (24+ consecutive months)",
    description:
      "Separates a complete monthly series into a long-term trend, a repeating 12-month seasonal cycle, and remaining short-term variation, then removes the seasonal cycle before testing for trends.",
  },
  {
    mode: "Calendar-Month Averages",
    requirement: "Multi-year monthly record (works even with missing months)",
    description:
      "Calculates the historical average for each calendar month (January through December) and subtracts it from each observation, removing the seasonal cycle cleanly without filling gaps.",
  },
  {
    mode: "No Seasonal Adjustment",
    requirement: "Any dataset (best for yearly data)",
    description:
      "Analyzes the raw observations directly without removing a seasonal cycle—ideal when working with annual totals or data that is already deseasonalized.",
  },
];

export default function MethodologyPage() {
  const [openQuestion, setOpenQuestion] = useState<number | null>(0);
  const [activeTrackIndex, setActiveTrackIndex] = useState<number>(0);

  const faqs = [
    [
      "How does the Iris platform work from start to finish?",
      "Iris gives you four connected ways to explore Earth data. You can start in Iris Intelligence by asking a question in plain English, selecting a dataset, previewing its quality, and running statistical tests in Data Analysis. Or you can jump straight to the 3D Living Globe to explore 11 global monthly satellite layers, open the Forecasts workspace to view short-term predictions for any location on Earth, or browse solved Case Studies and related research papers.",
    ],
    [
      "Why use Mann–Kendall and Sen's slope alongside standard linear regression?",
      "Environmental data rarely follows a perfect bell curve, and a single extreme weather year (like a major El Niño) can tilt a standard linear regression line. Mann–Kendall tests whether values consistently rise or fall over time using relative ranks, while Sen's slope takes the median rate of change across all pairs of points so isolated extremes cannot distort the result. Running both gives a much more reliable answer.",
    ],
    [
      "How does Iris avoid false alarms from month-to-month weather persistence?",
      "In nature, a warm or dry month is often followed by another warm or dry month. Standard statistical tests can mistake a multi-month dry spell for a permanent long-term trend. Iris measures this month-to-month memory (autocorrelation) and adjusts the test threshold accordingly so only genuine long-term shifts are marked significant.",
    ],
    [
      "How is the seasonal cycle removed when some months are missing?",
      "Temperature, rainfall, and vegetation naturally rise and fall with the seasons every year. When a monthly record has no gaps, Iris can use STL decomposition to separate the seasonal cycle. When some months are missing, Iris subtracts each calendar month's multi-year average instead—never inventing or interpolating fake numbers across missing periods.",
    ],
    [
      "How do Iris's machine learning forecasts stay honest?",
      "In the Forecasts workspace, models are trained strictly on past observations that were already published at forecast time. Every model is compared against simple benchmarks—such as assuming conditions stay the same as yesterday or follow the historical seasonal average. If a model does not beat those simple baselines on past test periods, Iris clearly labels it as an Experimental Preview and shows the exact error difference.",
    ],
    [
      "Does the AI assistant ever calculate statistics or make up data?",
      "No. The AI assistant is strictly separated from all math and data tables. It only helps turn your plain-language question into search keywords and formats explanations of already-calculated statistics. All numbers, charts, trend rates, and Evidence Grades (A–D) come directly from verified mathematical formulas.",
    ],
  ];

  const activeTrack = PLATFORM_TRACKS[activeTrackIndex];

  return (
    <PageShell
      action={
        <Link className="primary-page-button" href="/workspace/intelligence">
          Try the Workbench <Icon name="arrow" size={16} />
        </Link>
      }
      description="A clear, step-by-step guide to how the Project Iris platform works, the steps to follow for your own investigation, what makes our approach unique, and the statistical methods behind every result."
      section="Platform & Scientific Methodology"
      title="From a plain-English question to clear, trustworthy Earth evidence"
    >
      {/* ─── 1. PLATFORM ARCHITECTURE & PHILOSOPHY INTRO ─────────────── */}
      <section className="method-intro">
        <div className="method-quote">
          <Icon name="sparkles" size={22} />
          <blockquote>
            AI helps you find the data; transparent math tests the evidence. Every chart, trend
            rate, global map, and forecast in Iris comes from real public Earth observations—with
            every step explained clearly.
          </blockquote>
        </div>
        <div className="method-assumptions">
          <span>Platform Highlights</span>
          <strong>4 Investigation Pathways</strong>
          <strong>10 Public Data Catalogs</strong>
          <strong>8 Statistical Analysis Methods</strong>
          <strong>11 Global 3D Map Layers</strong>
          <strong>Historical ML Forecasting</strong>
        </div>
      </section>

      {/* ─── 2. HOW THE ENTIRE WEB PLATFORM WORKS (4 PATHWAYS) ───────── */}
      <section className="method-process" id="platform-architecture">
        <div className="method-section-heading" style={{ maxWidth: "780px" }}>
          <div className="section-kicker">
            <span>How Iris Works</span> Four connected ways to investigate
          </div>
          <h2>One platform for discovery, statistical testing, 3D maps, and forecasts</h2>
          <p>
            Project Iris brings together live dataset search, quality inspection, statistical trend
            testing, 3D visualization, and short-term forecasting in one workspace. Select any
            pathway below to see how it works.
          </p>
        </div>

        <div
          className="filter-tabs"
          role="tablist"
          aria-label="Platform pathways"
          style={{ marginBottom: "18px", flexWrap: "wrap" }}
        >
          {PLATFORM_TRACKS.map((track, idx) => (
            <button
              key={track.id}
              type="button"
              role="tab"
              aria-selected={activeTrackIndex === idx}
              className={activeTrackIndex === idx ? "active" : ""}
              onClick={() => setActiveTrackIndex(idx)}
            >
              {track.badge}
            </button>
          ))}
        </div>

        <article
          className="srs-rubric-card"
          style={{
            padding: "24px",
            borderLeft: "3px solid var(--accent, var(--green))",
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "16px",
              flexWrap: "wrap",
              marginBottom: "12px",
            }}
          >
            <div>
              <span
                className="quality-badge valid"
                style={{ marginBottom: "8px", display: "inline-block" }}
              >
                {activeTrack.badge}
              </span>
              <h3 style={{ fontSize: "18px", margin: "4px 0" }}>{activeTrack.title}</h3>
            </div>
            <Link className="primary-page-button" href={activeTrack.route}>
              {activeTrack.routeLabel} <Icon name="arrow" size={14} />
            </Link>
          </div>
          <p style={{ fontSize: "13px", lineHeight: 1.65, marginBottom: "14px" }}>
            {activeTrack.summary}
          </p>
          <ul style={{ margin: "0 0 0 18px", fontSize: "12.5px", lineHeight: 1.65 }}>
            {activeTrack.highlights.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </article>
      </section>

      {/* ─── 3. STEP-BY-STEP USER GUIDE (6 SIMPLE STAGES) ────────────── */}
      <section className="method-process" id="user-steps" style={{ marginTop: "56px" }}>
        <div className="method-section-heading" style={{ maxWidth: "780px" }}>
          <div className="section-kicker">
            <span>Step-by-Step Guide</span> How to run your own investigation
          </div>
          <h2>Six clear steps from your first question to a finished Case File</h2>
          <p>
            Follow these steps in the workspace sidebar to move from a question in plain English to
            verified charts, statistical conclusions, and research citations.
          </p>
        </div>

        <div className="srs-validation-grid" style={{ gridTemplateColumns: "1fr" }}>
          {USER_WORKFLOW_STEPS.map((step) => (
            <article
              className="srs-validation-card"
              key={step.number}
              style={{ padding: "22px 24px" }}
            >
              <div
                className="srs-validation-top"
                style={{ flexWrap: "wrap", gap: "10px", marginBottom: "10px" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span
                    className="step-icon"
                    style={{ width: "34px", height: "34px", borderRadius: "8px" }}
                  >
                    <Icon name={step.icon} size={18} />
                  </span>
                  <div>
                    <code style={{ fontSize: "11px" }}>{step.stage}</code>
                  </div>
                </div>
                <Link
                  href={step.route}
                  className="secondary-page-button"
                  style={{ padding: "6px 11px", fontSize: "10px" }}
                >
                  {step.routeLabel} <Icon name="arrow" size={13} />
                </Link>
              </div>

              <h3 style={{ fontSize: "16px", margin: "6px 0 8px" }}>{step.title}</h3>
              <p style={{ fontSize: "12.5px", lineHeight: 1.6, marginBottom: "12px" }}>
                {step.summary}
              </p>

              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: "8px",
                  background: "var(--surface, var(--card))",
                  border: "1px solid var(--border)",
                  marginBottom: "10px",
                }}
              >
                <strong
                  style={{
                    display: "block",
                    fontSize: "10px",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--accent, var(--green))",
                    marginBottom: "6px",
                  }}
                >
                  What you do:
                </strong>
                <ol
                  style={{
                    margin: "0 0 0 18px",
                    padding: 0,
                    fontSize: "12px",
                    color: "var(--muted)",
                    lineHeight: 1.65,
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  {step.userActions.map((act) => (
                    <li key={act}>{act}</li>
                  ))}
                </ol>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span className="quality-badge valid">Built-in Safeguard</span>
                <span style={{ fontSize: "11.5px", color: "var(--muted)" }}>
                  {step.systemGuarantees}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ─── 4. UNIQUENESS OF OUR SOLUTION (6 PILLARS) ───────────────── */}
      <section className="method-process" id="uniqueness" style={{ marginTop: "64px" }}>
        <div className="method-section-heading" style={{ maxWidth: "780px" }}>
          <div className="section-kicker">
            <span>What Makes Iris Unique</span> Six core design principles
          </div>
          <h2>Why Project Iris is different from ordinary data dashboards</h2>
          <p>
            Most climate tools either require coding expertise to read raw satellite files or
            oversimplify data using unverified summaries. Iris is designed so anyone can explore
            real observations without sacrificing scientific honesty.
          </p>
        </div>

        <div
          className="srs-grade-rubric-grid"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}
        >
          {UNIQUENESS_PILLARS.map((item) => (
            <article className="srs-rubric-card" key={item.num}>
              <div className="srs-rubric-head">
                <span className="srs-grade-badge grade-A">0{item.num.slice(-1)}</span>
                <Icon name={item.icon} size={18} />
              </div>
              <h3 style={{ fontSize: "15px", margin: "6px 0 4px" }}>{item.title}</h3>
              <strong
                style={{
                  display: "block",
                  fontSize: "11px",
                  color: "var(--accent, var(--green))",
                  marginBottom: "8px",
                }}
              >
                {item.subtitle}
              </strong>
              <p style={{ fontSize: "12px", lineHeight: 1.6 }}>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ─── 5. THE 8 STATISTICAL METHODS & SEASONAL ADJUSTMENTS ─────── */}
      <section className="method-process" id="statistical-methods" style={{ marginTop: "64px" }}>
        <div className="method-section-heading" style={{ maxWidth: "780px" }}>
          <div className="section-kicker">
            <span>Statistical Workbench</span> How we test for trends and anomalies
          </div>
          <h2>Seasonal adjustments and eight complementary statistical tests</h2>
          <p>
            In the Data Analysis workbench, Iris checks your dataset&apos;s frequency and length,
            lets you remove the repeating annual seasonal cycle, and provides eight statistical
            methods that you can run step by step.
          </p>
        </div>

        {/* 4 Seasonal Adjustments */}
        <h3 style={{ fontSize: "15px", marginBottom: "12px" }}>
          Part A — Four Ways to Handle Seasonality
        </h3>
        <div className="srs-grade-rubric-grid" style={{ marginBottom: "32px" }}>
          {SEASONAL_PRETREATMENTS.map((st) => (
            <article className="srs-rubric-card" key={st.mode}>
              <div className="srs-rubric-head">
                <strong>{st.mode}</strong>
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--accent, var(--green))",
                  marginBottom: "6px",
                }}
              >
                Best for: {st.requirement}
              </div>
              <p>{st.description}</p>
            </article>
          ))}
        </div>

        {/* 8 Statistical Methods */}
        <h3 style={{ fontSize: "15px", marginBottom: "12px" }}>
          Part B — Eight Statistical &amp; Visual Diagnostic Methods
        </h3>
        <div
          className="srs-validation-grid"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))" }}
        >
          {STATISTICAL_METHODS_SPECS.map((m) => (
            <article className="srs-validation-card" key={m.id}>
              <div className="srs-validation-top">
                <code>Method {m.num}</code>
                <span className="quality-badge valid">{m.category}</span>
              </div>
              <h3 style={{ fontSize: "14.5px", margin: "6px 0" }}>{m.name}</h3>
              <div
                className="formula"
                style={{
                  margin: "8px 0",
                  padding: "8px 10px",
                  fontSize: "11px",
                  overflowX: "auto",
                }}
              >
                {m.formula}
              </div>
              <p style={{ fontSize: "12px", lineHeight: 1.55 }}>{m.description}</p>
              <dl>
                <div>
                  <dt>When It Can Be Used</dt>
                  <dd>{m.cadenceRule}</dd>
                </div>
                <div>
                  <dt>Adjustable Settings</dt>
                  <dd>{m.parameters}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      {/* ─── 6. EVIDENCE GRADES (A-D) & BENCHMARK CHECKS ─────────────── */}
      <section className="method-process" style={{ marginTop: "64px" }}>
        <div className="method-section-heading" style={{ maxWidth: "780px" }}>
          <div className="section-kicker">
            <span>Quality Grading</span> Evidence Grades (A–D)
          </div>
          <h2>How Iris grades the strength of a finding</h2>
          <p>
            Every completed Case File receives an Evidence Grade from A to D based on how many years
            of data are available, how complete the record is, whether the trend passes statistical
            significance, and whether different tests agree.
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

      <section className="method-process" style={{ marginTop: "44px" }}>
        <div className="method-section-heading" style={{ maxWidth: "780px" }}>
          <div className="section-kicker">
            <span>Verification</span> Accuracy &amp; Reliability Checks
          </div>
          <h2>Tested against real-world climate records</h2>
          <p>
            Iris&apos;s statistical calculations and ensemble forecast rules are verified against
            established climate benchmarks to ensure accurate, trustworthy results.
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
                  <dt>What We Check</dt>
                  <dd>{b.expected}</dd>
                </div>
                <div>
                  <dt>Verified Result</dt>
                  <dd>{b.measured}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      {/* ─── 7. AI GOVERNANCE & 10 DATA PROVIDERS ────────────────────── */}
      <section className="method-process" style={{ marginTop: "56px" }}>
        <div className="method-section-heading" style={{ maxWidth: "780px" }}>
          <div className="section-kicker">
            <span>Transparency</span> AI Boundaries &amp; Connected Data Sources
          </div>
          <h2>Clear rules for AI assistance and our 10 connected data providers</h2>
          <p>{EVIDENCE_METHODS_REGISTRY.si_disclosure.model}</p>
        </div>

        <div className="srs-si-disclosure-cols">
          <article className="srs-rubric-card">
            <h3>What the AI Assistant Does</h3>
            <ul>
              {EVIDENCE_METHODS_REGISTRY.si_disclosure.permitted_roles.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </article>
          <article className="srs-rubric-card">
            <h3>What the AI Assistant Never Does</h3>
            <ul>
              {EVIDENCE_METHODS_REGISTRY.si_disclosure.prohibited_roles.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </article>
        </div>

        <div className="dashboard-table-wrap" style={{ marginTop: "24px" }}>
          <table>
            <thead>
              <tr>
                <th>Data Provider</th>
                <th>Catalog Search</th>
                <th>Data Retrieval</th>
                <th>Supported Areas &amp; Time Steps</th>
                <th>Access &amp; Quality Notes</th>
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
                    <span className="quality-badge valid">
                      {prov.catalog_state === "extract_verified"
                        ? "Ready to search & retrieve"
                        : "Catalog searchable"}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`quality-badge ${
                        prov.extraction_state === "extract_verified" ? "valid" : "flagged"
                      }`}
                    >
                      {prov.extraction_state === "extract_verified"
                        ? "Direct retrieval"
                        : prov.extraction_state === "credential_required"
                        ? "Requires agency sign-in"
                        : "Catalog discovery"}
                    </span>
                  </td>
                  <td style={{ fontSize: "11.5px" }}>
                    <div>Areas: {prov.supported_geometries.join(", ")}</div>
                    <div>Time steps: {prov.native_cadences.join(", ")}</div>
                  </td>
                  <td style={{ fontSize: "11.5px", maxWidth: "360px" }}>
                    <div>
                      <b>Access:</b> {prov.auth_mechanism}
                    </div>
                    <div>
                      <b>Quality:</b> {prov.qa_semantics}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── 8. FREQUENTLY ASKED QUESTIONS ───────────────────────────── */}
      <section className="faq-section" style={{ marginTop: "64px" }}>
        <div className="faq-heading">
          <div className="section-kicker">
            <span>FAQ</span> Common questions
          </div>
          <h2>Questions a careful Earth system detective should ask</h2>
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
    </PageShell>
  );
}
