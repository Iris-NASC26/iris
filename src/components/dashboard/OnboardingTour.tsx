"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/Icon";

export interface TourStep {
  id: string;
  route: string | null;
  group: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  description: string;
  keyFeatures: string[];
  inputs?: string;
  outputs?: string;
  icon: IconName;
  badge?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    route: null,
    group: "Overview",
    eyebrow: "Welcome to Iris",
    title: "Earth System Investigation Workspace",
    subtitle: "A connected, traceable workflow from discovery to peer-reviewed evidence",
    description:
      "Iris unites Earth observation discovery, satellite data retrieval, statistical signal decomposition, and interactive visualization in one rigorous environment. This guided interactive tour walks through every tool in the left menu so you know exactly where and how to investigate Earth system phenomena.",
    keyFeatures: [
      "Natural language satellite discovery to structured queries",
      "Immutable data previews with strict quality assurance",
      "STL seasonal decomposition and standardized anomaly testing",
      "Multi-panel Dockview visualization and 3D Living Globe",
    ],
    inputs: "Environmental hypotheses, event headlines, or research queries",
    outputs: "Traceable, reproducible Earth science investigations",
    icon: "globe",
  },
  {
    id: "intelligence",
    route: "/workspace/intelligence",
    group: "Investigate",
    eyebrow: "Step 1 · Natural Language Discovery",
    title: "Iris Intelligence",
    subtitle: "Turn questions into structured Earth observation requests",
    description:
      "Begin your investigation in plain English. Describe any weather event, disaster, regional anomaly, or climate signal. Iris Intelligence extracts domain keywords, resolves geographic bounding boxes, identifies physical parameters (precipitation, soil moisture, surface temperature), and recommends authoritative satellite products from NASA and ECMWF.",
    keyFeatures: [
      "Natural language intent parsing and entity extraction",
      "Automatic satellite sensor and variable mapping",
      "Bounding box detection and named region geocoding",
      "One-click transition into Data Selection",
    ],
    inputs: "Natural language questions (e.g., 'Flooding in Valencia October 2024')",
    outputs: "Extracted keywords, bounding coordinates, and recommended products",
    icon: "sparkles",
  },
  {
    id: "data-selection",
    route: "/workspace/data-selection",
    group: "Investigate",
    eyebrow: "Step 2 · Product & Bounds Configuration",
    title: "Data Selection",
    subtitle: "Select satellite products, bounding coordinates, and time horizons",
    description:
      "Configure the precise spatial and temporal dimensions of your study. Choose from verified datasets across NASA POWER, GES DISC, and ECMWF ERA5, draw custom geographic bounds on the interactive map, and specify extraction dates and temporal cadences (daily, monthly, or seasonal).",
    keyFeatures: [
      "Multi-agency catalog (NASA, ECMWF ERA5, NOAA)",
      "Interactive map with bounding box drawing tool",
      "Customizable temporal range and cadence options",
      "Pre-flight parameter validation before job submission",
    ],
    inputs: "Selected data product, bounding coordinates, date range, frequency",
    outputs: "Queued extraction job with immutable job ID",
    icon: "box",
  },
  {
    id: "data-preview",
    route: "/workspace/data-preview",
    group: "Investigate",
    eyebrow: "Step 3 · Data Integrity & Quality Inspection",
    title: "Data Preview",
    subtitle: "Inspect observations, summary statistics, and data health before modeling",
    description:
      "The scientific gatekeeper of Iris. Before running complex models, inspect retrieved raw observation series, examine distribution statistics (mean, min, max, standard deviation), verify missing data counts and quality flags, and confirm geographic coverage to guarantee clean, traceable inputs.",
    keyFeatures: [
      "Time-series preview chart with rolling baselines",
      "Summary statistics and data completeness diagnostics",
      "Searchable, filterable, and sortable observation table",
      "Immutable extraction result ID tracking for reproducibility",
    ],
    inputs: "Retrieved observation rows from extraction job",
    outputs: "Verified, quality-checked time series ready for scientific analysis",
    icon: "layers",
  },
  {
    id: "data-analysis",
    route: "/workspace/data-analysis",
    group: "Investigate",
    eyebrow: "Step 4 · Scientific Case File Analytics",
    title: "Data Analysis",
    subtitle: "Decompose signals, isolate trends, and compute standardized anomalies",
    description:
      "Apply rigorous statistical methods to uncover the true Earth-system story. Separate seasonal cycles from long-term trends using STL decomposition, calculate standardized anomaly Z-scores, run Pettitt change point detection, and evaluate Sen's slopes with modified Mann-Kendall significance tests.",
    keyFeatures: [
      "STL (Seasonal-Trend Decomposition using LOESS)",
      "Standardized anomaly indices (Z-scores & MAD dispersion)",
      "Hamed-Rao Mann-Kendall trend tests with autocorrelation correction",
      "Pettitt non-parametric change point detection & warming stripes",
    ],
    inputs: "Verified time-series observations from Preview or Case Files",
    outputs: "Decomposed trend/seasonal series, anomaly flags, and diagnostic statistics",
    icon: "activity",
  },
  {
    id: "visualize",
    route: "/workspace/visualize",
    group: "Investigate",
    eyebrow: "Step 5 · Multi-Series Charting Studio",
    title: "Data Visualization",
    subtitle: "Interactive Dockview studio for multi-series comparisons and visual patterns",
    description:
      "Explore your findings through a flexible, multi-panel charting studio. Organize dockable panels, overlay dual-axis time series to compare related variables (e.g. soil moisture vs. precipitation), inspect synchronized crosshairs across panels, and explore distribution histograms.",
    keyFeatures: [
      "Flexible Dockview studio layout (split, tab, dock, float)",
      "Synchronized crosshairs across multiple variable panels",
      "Dual-axis multi-series comparative overlays",
      "Interactive zoom, distribution histograms, and preset views",
    ],
    inputs: "Extracted series, decomposed components, and related environmental variables",
    outputs: "Interactive multi-panel visual workspaces and presentation views",
    icon: "chart",
  },
  {
    id: "globe",
    route: "/workspace/globe",
    group: "Global Evidence Cube",
    badge: "In Development",
    eyebrow: "Step 6 · 3D Planetary Evidence",
    title: "Geometric Visualization",
    subtitle: "Inspect multi-dimensional Earth observation grids and bounds in 3D",
    description:
      "Examine environmental data within its planetary geographic reality. The 3D Living Globe visualizes spatial bounding boxes, coordinate extents, and multi-dimensional satellite rasters draped over dynamic 3D planetary geometry with interactive tilt, pan, and rotation.",
    keyFeatures: [
      "Interactive 3D planetary globe with high-resolution geometry",
      "Multi-dimensional spatial evidence cubes and coordinate bounds",
      "Planetary context for localized weather and climate extremes",
      "Smooth camera navigation and coordinate inspect tools",
    ],
    inputs: "Dataset coordinate bounds, spatial extents, and planetary grids",
    outputs: "3D planetary spatial perspective and geographic validation",
    icon: "globe",
  },
  {
    id: "forecasts",
    route: "/workspace/forecasts",
    group: "Predictions",
    badge: "In Development",
    eyebrow: "Step 7 · Predictive Modeling & Outlooks",
    title: "Forecasts",
    subtitle: "Explore local predictions, hazard outlooks, and ensemble uncertainty",
    description:
      "Look ahead to anticipate extreme environmental hazards. Review local point forecasts for critical locations, evaluate 51-member ensemble prediction spreads, inspect quantile uncertainty envelopes (P10, P50, P90), and benchmark model accuracy against historical records.",
    keyFeatures: [
      "Point hazard outlooks for extreme weather hotspots",
      "51-member ensemble distribution percentiles and spread",
      "Uncertainty envelope tracking (P10, P50, P90)",
      "Historical verification against recorded observational baselines",
    ],
    inputs: "Target hazard coordinates, ensemble model outputs, historical climatology",
    outputs: "Probabilistic forecast trajectories and hazard risk envelopes",
    icon: "activity",
  },
  {
    id: "case-studies",
    route: "/workspace/case-studies",
    group: "Explore",
    eyebrow: "Step 8 · Guided Investigations & Benchmarks",
    title: "Case Studies",
    subtitle: "Explore solved disaster investigations and reproducible NASA case files",
    description:
      "Learn from verified Earth science benchmarks. Load curated disaster case files—including California Atmospheric Rivers, the 2024 Valencia Flash Floods, and Libya Cyclone Daniel—complete with pre-configured requests, observational evidence, and saved analytical states.",
    keyFeatures: [
      "Curated library of peer-reviewed disaster investigations",
      "Instant one-click loading of complete source and analysis states",
      "Educational step-by-step methodology checkpoints and quizzes",
      "Reference baselines for validating newly extracted datasets",
    ],
    inputs: "Curated NASA and disaster case file library",
    outputs: "Pre-loaded end-to-end evidence chains and methodology guides",
    icon: "book",
  },
  {
    id: "research",
    route: "/workspace/research",
    group: "Explore",
    eyebrow: "Step 9 · Literature & Scientific Citations",
    title: "Existing Research",
    subtitle: "Connect live satellite observations to published literature and DOIs",
    description:
      "Ground your investigation in peer-reviewed scientific literature. Iris queries the OpenAlex scholarly database and DataCite DOI registry to automatically discover relevant academic publications, sensor calibration papers, and validation studies directly linked to your active dataset and study region.",
    keyFeatures: [
      "Automatic scholarly literature discovery for active datasets",
      "Federated query across OpenAlex and DataCite DOI registries",
      "Reconstructed abstracts, citation counts, and open-access PDFs",
      "Direct DOI cross-referencing for investigation reports",
    ],
    inputs: "Active dataset variables, sensor keywords, and geographic regions",
    outputs: "Peer-reviewed scientific citations, DOIs, and literature evidence",
    icon: "file",
  },
  {
    id: "assistant-tools",
    route: null,
    group: "Workspace Tools",
    eyebrow: "Step 10 · Copilot & Active Context",
    title: "Iris Assistant & Workspace Tools",
    subtitle: "Context-aware AI assistance, topbar status tracking, and controls",
    description:
      "You're ready to investigate! Iris supports your workflow at every step: use the floating Iris Assistant (bottom-right) for instant in-context guidance, track your active dataset and immutable result ID in the topbar chip, toggle between light and dark themes, and replay this tour anytime from the sidebar footer.",
    keyFeatures: [
      "Context-aware floating Iris AI Assistant available on every page",
      "Topbar dataset context chip displaying active variable & region",
      "Light / Dark mode theme toggle in the top bar",
      "Replay tour button in the sidebar footer anytime",
    ],
    inputs: "Any questions about Earth science data, analysis methods, or workflows",
    outputs: "In-context guidance, suggested queries, and workflow navigation",
    icon: "sparkles",
  },
];

export interface OnboardingTourProps {
  open: boolean;
  onClose: () => void;
  activeRoute?: string | null;
  onHighlightRoute?: (route: string | null) => void;
  initialStepIndex?: number;
}

export function OnboardingTour({
  open,
  onClose,
  activeRoute,
  onHighlightRoute,
  initialStepIndex = 0,
}: OnboardingTourProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [step, setStep] = useState(initialStepIndex);
  const [autoNavigate, setAutoNavigate] = useState(true);
  const [showJumpMenu, setShowJumpMenu] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  // Sync step with external activeRoute if changed externally (e.g. user clicked sidebar item)
  useEffect(() => {
    if (!open || !activeRoute) return;
    const matchIndex = TOUR_STEPS.findIndex((s) => s.route === activeRoute);
    if (matchIndex >= 0 && matchIndex !== step) {
      setStep(matchIndex);
    }
  }, [activeRoute, open, step]);

  // When step changes, notify parent of highlighted route and optionally navigate
  useEffect(() => {
    if (!open) return;
    const current = TOUR_STEPS[step];
    onHighlightRoute?.(current?.route ?? null);

    if (autoNavigate && current?.route && pathname !== current.route) {
      router.push(current.route);
    }
  }, [step, open, onHighlightRoute, autoNavigate, pathname, router]);

  // Reset or focus when opening
  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === "ArrowRight") {
        setStep((prev) => (prev < TOUR_STEPS.length - 1 ? prev + 1 : prev));
        return;
      }

      if (event.key === "ArrowLeft") {
        setStep((prev) => (prev > 0 ? prev - 1 : prev));
        return;
      }

      if (event.key === "Tab") {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const focusable = dialog.querySelectorAll<HTMLElement>(
          "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  const handleGoToPage = useCallback(
    (route: string | null) => {
      if (route) {
        router.push(route);
      }
    },
    [router],
  );

  const handleJumpToStep = (index: number) => {
    setStep(index);
    setShowJumpMenu(false);
  };

  if (!open) return null;

  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;
  const isFirst = step === 0;

  return (
    <div className="tour-backdrop" role="presentation">
      <section
        aria-describedby="iris-tour-description"
        aria-labelledby="iris-tour-title"
        aria-modal="true"
        className="tour-dialog"
        ref={dialogRef}
        role="dialog"
      >
        {/* Top bar with category badge, jump selector, and close */}
        <div className="tour-header-bar">
          <div className="tour-header-pills">
            <span className="tour-group-pill">{current.group}</span>
            {current.badge && (
              <span className="tour-dev-pill">{current.badge}</span>
            )}
            <span className="tour-counter-pill">
              {step + 1} / {TOUR_STEPS.length}
            </span>
          </div>

          <div className="tour-header-actions">
            <div className="tour-jump-wrapper">
              <button
                aria-expanded={showJumpMenu}
                aria-label="Jump to a specific page tutorial"
                className="tour-jump-trigger"
                onClick={() => setShowJumpMenu((v) => !v)}
                type="button"
              >
                <span>Jump to page</span>
                <Icon name="chevron" size={13} />
              </button>

              {showJumpMenu && (
                <div className="tour-jump-menu" role="menu">
                  <div className="tour-jump-menu-header">Select a page tutorial</div>
                  {TOUR_STEPS.map((s, idx) => (
                    <button
                      className={`tour-jump-item${idx === step ? " active" : ""}`}
                      key={s.id}
                      onClick={() => handleJumpToStep(idx)}
                      role="menuitem"
                      type="button"
                    >
                      <span className="tour-jump-num">{idx + 1}</span>
                      <span className="tour-jump-title">{s.title}</span>
                      {s.badge && <small className="tour-jump-badge">{s.badge}</small>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              aria-label="Close tour"
              className="tour-close"
              onClick={onClose}
              ref={closeButton}
              title="Close tour (Esc)"
              type="button"
            >
              ×
            </button>
          </div>
        </div>

        {/* Visual Hero with Orbital Effect */}
        <div className="tour-visual">
          <span className="tour-orbit tour-orbit-one" />
          <span className="tour-orbit tour-orbit-two" />
          <div className="tour-icon-bubble">
            <Icon name={current.icon} size={32} />
          </div>

          {current.route && (
            <div className="tour-menu-pointer-hint">
              <span className="tour-pointer-arrow">←</span>
              <span>Highlighted in left menu: <strong>{current.title}</strong></span>
            </div>
          )}
        </div>

        {/* Copy: Title, Subtitle, Description */}
        <div className="tour-copy">
          <span className="tour-eyebrow">{current.eyebrow}</span>
          <h2 id="iris-tour-title">{current.title}</h2>
          <p className="tour-subtitle">{current.subtitle}</p>
          <p className="tour-description" id="iris-tour-description">
            {current.description}
          </p>
        </div>

        {/* Key Features Chips */}
        {current.keyFeatures && current.keyFeatures.length > 0 && (
          <div className="tour-features-section">
            <div className="tour-features-label">Core Capabilities</div>
            <div className="tour-features-grid">
              {current.keyFeatures.map((feat) => (
                <div className="tour-feature-chip" key={feat}>
                  <i className="tour-chip-bullet" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inputs / Outputs Summary Bar */}
        {(current.inputs || current.outputs) && (
          <div className="tour-io-bar">
            {current.inputs && (
              <div className="tour-io-col">
                <span className="tour-io-tag">Inputs</span>
                <span className="tour-io-val">{current.inputs}</span>
              </div>
            )}
            {current.outputs && (
              <div className="tour-io-col">
                <span className="tour-io-tag">Outputs</span>
                <span className="tour-io-val">{current.outputs}</span>
              </div>
            )}
          </div>
        )}

        {/* Interactive Page Actions & Auto-Navigate Toggle */}
        <div className="tour-interactive-row">
          {current.route ? (
            <button
              className="tour-visit-btn"
              onClick={() => handleGoToPage(current.route)}
              title={`Navigate to ${current.title}`}
              type="button"
            >
              <Icon name="external" size={14} />
              <span>{pathname === current.route ? "Currently on this page" : "Visit this page now"}</span>
            </button>
          ) : (
            <div className="tour-visit-hint">
              <Icon name="info" size={14} />
              <span>Available globally across all workspace pages</span>
            </div>
          )}

          <label className="tour-sync-toggle" title="Automatically navigate the workspace as you step through the tour">
            <input
              checked={autoNavigate}
              onChange={(e) => setAutoNavigate(e.target.checked)}
              type="checkbox"
            />
            <span className="tour-sync-text">Auto-navigate with steps</span>
          </label>
        </div>

        {/* Progress Bar / Pills */}
        <div className="tour-progress" aria-label={`Step ${step + 1} of ${TOUR_STEPS.length}`}>
          {TOUR_STEPS.map((item, index) => (
            <button
              aria-label={`Go to step ${index + 1}: ${item.title}`}
              className={`tour-step-dot${index === step ? " active" : ""}${index < step ? " passed" : ""}`}
              key={item.id}
              onClick={() => setStep(index)}
              title={`${index + 1}. ${item.title}`}
              type="button"
            />
          ))}
        </div>

        {/* Bottom Navigation Buttons */}
        <div className="tour-actions">
          <button className="tour-skip" onClick={onClose} type="button">
            Skip tour
          </button>

          <div className="tour-nav-buttons">
            <button
              className="tour-back"
              disabled={isFirst}
              onClick={() => setStep((value) => value - 1)}
              title="Previous page (Left arrow)"
              type="button"
            >
              <span>Back</span>
              <kbd className="tour-kbd">←</kbd>
            </button>

            <button
              className="tour-next"
              onClick={() => {
                if (isLast) onClose();
                else setStep((value) => value + 1);
              }}
              title={isLast ? "Complete tour" : "Next page (Right arrow)"}
              type="button"
            >
              <span>{isLast ? "Start exploring" : "Next"}</span>
              {!isLast && <kbd className="tour-kbd">→</kbd>}
              <Icon name={isLast ? "check" : "arrow"} size={14} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
