"use client";

import { Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/Icon";
import { DashboardProvider, useDashboard } from "@/context/DashboardContext";
import { useTheme } from "@/context/ThemeContext";
import { OnboardingTour } from "@/components/dashboard/OnboardingTour";
import { VisualizationProvider, useVisualizations } from "@/features/visualization/store";
import { IrisAssistant } from "@/components/dashboard/IrisAssistant";
import { DOCS_URL } from "@/lib/docs";
import { investigation } from '@/features/hazards/model';

const navigation: Array<{
  label?: string;
  tag?: string;
  items: Array<{ to: string; text: string; icon: IconName }>;
}> = [
    {
      label: "Investigate",
      items: [
        { to: "/workspace/intelligence", text: "Iris Intelligence", icon: "sparkles" },
        { to: "/workspace/data-selection", text: "Data Selection", icon: "box" },
        { to: "/workspace/data-preview", text: "Data Preview", icon: "layers" },
        { to: "/workspace/data-analysis", text: "Data Analysis", icon: "activity" },
        { to: "/workspace/visualize", text: "Data Visualization", icon: "chart" },
      ],
    },
    {
      label: "Global Data",
      tag: "In Development",
      items: [
        {
          to: "/workspace/globe",
          text: "Geometric Visualization",
          icon: "globe",
        },
      ],
    },
    {
      label: "Predictions",
      tag: "In Development",
      items: [
        { to: "/workspace/forecasts", text: "Forecasts", icon: "activity" },
      ],
    },
    {
      label: "Explore",
      items: [
        { to: "/workspace/case-studies", text: "Case Studies", icon: "book" },
        { to: "/workspace/research", text: "Existing Research", icon: "file" },
      ],
    },
  ];

const pageTitles: Record<string, [string, string]> = {
  "/workspace/intelligence": ["Iris Intelligence", "Identify domain keywords and discover live Earth observation time-series datasets"],
  "/workspace/data-selection": ["Data Selection", "Select time-series products and configure date range, region, and frequency"],
  "/workspace/data-preview": ["Data Preview", "Inspect retrieved time-series observations and quality metrics before analysis"],
  "/workspace/data-analysis": ["Data Analysis · Case File", "Analyze extracted series using scientific Case File methods"],
  "/workspace/visualize": ["Data Visualization · Case File", "Explore retrieved data, compare locations, and inspect temporal patterns"],
  "/workspace/globe": ["Geometric Visualization", "Inspect multi-dimensional Earth observation grids and coordinate bounds across the 3D globe"],
  "/workspace/forecasts": ["Forecasts", "Explore historical data, local predictions, and forecast evidence"],
  "/workspace/case-studies": ["Case Studies & Guided Investigations", "Load a solved investigation or step through checkpointed NASA case files"],
  "/workspace/research": ["Existing Research", "Connect the active dataset to published literature and citations"],
};

function DashboardFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const forecastPage = pathname === '/workspace/forecasts';
  const activeInvestigation = pathname?.startsWith('/workspace/case-studies/') ? investigation(pathname.split('/').pop() ?? '') : undefined;
  const {
    dataset,
    region,
    extractedPreview,
    caseStudyPreviews,
    activeManualCaseId,
    loadManualCaseStudy,
  } = useDashboard();
  const vizStore = useVisualizations();
  const lastSyncedCaseRef = useRef<string>("");
  const isEmptyDataPreview = extractedPreview === null;
  const { dark, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [highlightedTourRoute, setHighlightedTourRoute] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Auto-load case study datasets when arriving with ?caseStudy=<id> or ?case=<id>&autoload=1
  useEffect(() => {
    const requestedCase =
      searchParams.get("caseStudy") ||
      (searchParams.get("autoload") === "1" ? searchParams.get("case") : null);
    const preferredVar = searchParams.get("variable") || undefined;
    if (!requestedCase) return;
    const syncKey = `${requestedCase}|${preferredVar || ""}`;
    if (lastSyncedCaseRef.current === syncKey && activeManualCaseId === requestedCase) return;
    lastSyncedCaseRef.current = syncKey;
    void loadManualCaseStudy(requestedCase, preferredVar);
  }, [activeManualCaseId, loadManualCaseStudy, searchParams]);

  // Whenever caseStudyPreviews are loaded, ingest all series into Data Visualization Studio
  useEffect(() => {
    if (!caseStudyPreviews.length) return;
    for (const preview of caseStudyPreviews) {
      try {
        vizStore.add(preview);
      } catch {
        // Ignore if MAX_SERIES reached
      }
    }
    // Also pre-bind statistical analysis for the active preview so Visualization Studio has Evidence & Rates ready
    const primaryMonthly =
      caseStudyPreviews.find((p) => p.extraction_config.target_frequency === "Monthly") ??
      caseStudyPreviews[0];
    if (primaryMonthly) {
      const sYr = Number(primaryMonthly.extraction_config.start_date.slice(0, 4)) || 2020;
      const eYr = Number(primaryMonthly.extraction_config.end_date.slice(0, 4)) || 2026;
      const methods = [
        "ols",
        "hamed_rao_mk",
        "seasonal_kendall",
        "sen_slope",
        "pettitt",
        "anomalies",
        "seasonal_fingerprint",
        "case_file_diagnostics",
      ];
      void fetch("/api/v1/analyze/case-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: primaryMonthly.job_id,
          dataset_id: primaryMonthly.product.variable_id,
          dataset_name: primaryMonthly.product.variable_name,
          parameter_code: primaryMonthly.product.variable_id,
          unit: primaryMonthly.summary_stats.unit,
          location: primaryMonthly.extraction_config.region_name,
          latitude: primaryMonthly.extraction_config.point_lat ?? 0,
          longitude: primaryMonthly.extraction_config.point_lon ?? 0,
          start_year: sYr,
          end_year: eYr,
          seasonal_adjustment: "auto",
          analysis_methods: methods,
          cadence: primaryMonthly.extraction_config.target_frequency,
        }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((res) => {
          if (res && primaryMonthly.extraction_config.target_frequency === "Monthly") {
            try {
              vizStore.publishAnalysis(
                primaryMonthly,
                {
                  seasonal: "auto",
                  methods: methods as never,
                },
                res,
              );
            } catch {
              // ignore
            }
          }
        })
        .catch(() => {});
    }
  }, [caseStudyPreviews]);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem("iris-dashboard-sidebar-collapsed") === "true");
      setTourOpen(window.localStorage.getItem("iris-onboarding-complete") !== "true");
    } catch {
      // Ignore storage access errors
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem("iris-dashboard-sidebar-collapsed", String(collapsed));
    } catch {
      // Ignore storage access errors
    }
  }, [collapsed, hydrated]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Scroll the highlighted tour link into view inside the sidebar
  useEffect(() => {
    if (!tourOpen || !highlightedTourRoute) return;
    const targetEl = document.querySelector(`[data-tour-target="${highlightedTourRoute}"]`);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [tourOpen, highlightedTourRoute]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  const closeTour = useCallback(() => {
    try {
      window.localStorage.setItem("iris-onboarding-complete", "true");
    } catch {
      // Ignore storage access errors
    }
    setTourOpen(false);
  }, []);

  const title = activeInvestigation ? ['Disaster evidence & point outlook', activeInvestigation.title] : (pathname && pageTitles[pathname]) ?? [
    "Iris workspace",
    "Earth system intelligence",
  ];
  const isSidebarEffectiveCollapsed = collapsed && !tourOpen;

  return (
    <div
      className={`${dark ? "dark " : ""}app-shell dashboard-shell${
        isSidebarEffectiveCollapsed ? " sidebar-collapsed" : ""
      }${tourOpen ? " tour-mode" : ""}`}
    >
      {drawerOpen && (
        <button
          aria-label="Close dashboard navigation"
          className="dashboard-drawer-backdrop"
          onClick={() => setDrawerOpen(false)}
          type="button"
        />
      )}
      <aside className={`dashboard-sidebar${drawerOpen ? " drawer-open" : ""}${tourOpen ? " tour-sidebar-active" : ""}`}>
        <div className="dashboard-brand-row">
          <Link className="dashboard-brand" href="/">
            <span className="brand-mark">
              <img
                src="/favicon.svg"
                alt="Iris logo"
                width={22}
                height={22}
                style={{
                  width: 22,
                  height: 22,
                  objectFit: "contain",
                  filter: "brightness(0) invert(1)",
                }}
              />
            </span>
            <span className="dashboard-brand-copy">
              <strong>Iris</strong>
              <small>Earth intelligence</small>
            </span>
          </Link>
          <button
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="sidebar-collapse"
            onClick={() => setCollapsed((value) => !value)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            type="button"
          >
            <Icon
              className={collapsed ? "collapse-icon reversed" : "collapse-icon"}
              name="chevron"
              size={17}
            />
          </button>
          <button
            aria-label="Close dashboard navigation"
            className="sidebar-mobile-close"
            onClick={() => setDrawerOpen(false)}
            type="button"
          >
            ×
          </button>
        </div>

        <nav className="dashboard-nav" aria-label="Dashboard navigation">
          {navigation.map((group) => (
            <div className="dashboard-nav-group" key={group.label}>
              <div className="dashboard-nav-label-row">
                <span className="dashboard-nav-label">{group.label}</span>
                {group.tag && !isSidebarEffectiveCollapsed ? (
                  <span className="dashboard-nav-dev-tag">{group.tag}</span>
                ) : null}
              </div>
              {group.items.map((item) => {
                const isActive = pathname === item.to || pathname?.startsWith(`${item.to}/`);
                const isTourFocus = tourOpen && highlightedTourRoute === item.to;
                return (
                  <Link
                    className={`${isActive ? "active" : ""}${isTourFocus ? " tour-nav-highlighted" : ""}`}
                    aria-current={isActive ? "page" : undefined}
                    key={item.to}
                    title={isSidebarEffectiveCollapsed ? item.text : undefined}
                    href={item.to}
                    data-tour-target={item.to}
                    onClick={() => {
                      if (tourOpen) {
                        setHighlightedTourRoute(item.to);
                      }
                    }}
                  >
                    <Icon name={item.icon} size={18} />
                    <span>{item.text}</span>
                    {isTourFocus && (
                      <span className="tour-highlight-beacon" title="Current Tour Focus">
                        <span className="tour-beacon-ping" />
                        <span className="tour-beacon-dot" />
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="dashboard-sidebar-footer">
          <button
            onClick={() => {
              setTourOpen(true);
              setHighlightedTourRoute("/workspace/intelligence");
            }}
            title={isSidebarEffectiveCollapsed ? "Replay tour" : undefined}
            type="button"
          >
            <Icon name="info" size={17} />
            <span>Replay tour</span>
          </button>
          <a
            href={DOCS_URL}
            target="_blank"
            rel="noreferrer"
            title={isSidebarEffectiveCollapsed ? "Documentation" : undefined}
          >
            <Icon name="book" size={17} />
            <span>Documentation</span>
          </a>
          <a
            href="https://github.com/Iris-NASC26/iris"
            target="_blank"
            rel="noreferrer"
            title={isSidebarEffectiveCollapsed ? "GitHub repository" : undefined}
          >
            <Icon name="github" size={17} />
            <span>GitHub repository</span>
          </a>
        </div>
      </aside>

      <div className="dashboard-content">
        <header className="dashboard-topbar">
          <button
            aria-expanded={drawerOpen}
            aria-label="Open dashboard navigation"
            className="dashboard-menu-trigger"
            onClick={() => setDrawerOpen(true)}
            type="button"
          >
            <span />
            <span />
            <span />
          </button>
          <div>
            <h1>{title[1]}</h1>
          </div>
          <div className="dashboard-context-chip">
            {forecastPage ? <><span><i />Iris local models</span><strong>Dataset forecasts</strong></> : activeInvestigation ? <><span><i />Point precipitation</span><strong>{activeInvestigation.point_name}</strong></> : isEmptyDataPreview ? (
              <>
                <span>
                  <i />
                  No dataset selected
                </span>
                <strong>No data retrieved</strong>
              </>
            ) : (
              <>
                <span>
                  <i />
                  {extractedPreview?.product.variable_id || dataset.code}
                </span>
                <strong>{extractedPreview?.extraction_config.region_name || region}</strong>
              </>
            )}
            {!forecastPage && !activeInvestigation && pathname !== "/workspace/visualize" && extractedPreview?.job_id && (
              <code
                style={{
                  fontSize: "10px",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  background: "var(--green-soft)",
                  color: "var(--green)",
                }}
                title="Active immutable extraction result ID"
              >
                {extractedPreview.result_id || extractedPreview.job_id}
              </code>
            )}
          </div>
          <button
            aria-label={`Switch to ${dark ? "light" : "dark"} mode`}
            className="theme-toggle dashboard-theme-toggle"
            onClick={toggleTheme}
            type="button"
          >
            <Icon name={dark ? "sun" : "moon"} size={17} />
          </button>
        </header>
        <main className="dashboard-page">{children}</main>
      </div>
      <OnboardingTour
        activeRoute={highlightedTourRoute}
        onClose={closeTour}
        onHighlightRoute={setHighlightedTourRoute}
        open={tourOpen}
      />
      <IrisAssistant pageTitle={title[0]} tourOpen={tourOpen} />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardProvider>
      <VisualizationProvider>
        <Suspense fallback={<div className="dashboard-page-inner">Loading workspace...</div>}><DashboardFrame>{children}</DashboardFrame></Suspense>
      </VisualizationProvider>
    </DashboardProvider>
  );
}
