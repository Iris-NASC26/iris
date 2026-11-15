"use client";

import { Suspense, useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/Icon";
import { DashboardProvider, useDashboard } from "@/context/DashboardContext";
import { useTheme } from "@/context/ThemeContext";
import { OnboardingTour } from "@/components/dashboard/OnboardingTour";
import { VisualizationProvider } from "@/features/visualization/store";
import { IrisAssistant } from "@/components/dashboard/IrisAssistant";
import { DOCS_URL } from "@/lib/docs";
import { investigation } from '@/features/hazards/model';

const navigation: Array<{
  label?: string;
  items: Array<{ to: string; text: string; icon: IconName }>;
}> = [
  {
    label: "Investigate",
    items: [
      { to: "/workspace/intelligence", text: "Iris Intelligence", icon: "sparkles" },
      { to: "/workspace/data-selection", text: "Data Selection", icon: "box" },
      { to: "/workspace/data-preview", text: "Data Preview", icon: "layers" },
      { to: "/workspace/data-analysis", text: "Data Analysis", icon: "activity" },
      { to: "/workspace/visualize", text: "Plot & Visualize", icon: "activity" },
    ],
  },
  {
    label: "Global Evidence Cube",
    items: [
      { to: "/workspace/globe", text: "Living Globe", icon: "globe" },
    ],
  },
  {
    label: "Explore",
    items: [
      { to: "/workspace/forecasts", text: "Forecasts", icon: "activity" },
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
  "/workspace/visualize": ["Plot & Visualize · Case File", "Explore retrieved data, compare locations, and inspect temporal patterns"],
  "/workspace/globe": ["Living Globe", "Inspect real NASA spatial fields and linked global observations"],
  "/workspace/forecasts": ["Forecasts", "Explore historical data, local predictions, and forecast evidence"],
  "/workspace/case-studies": ["Case Studies & Guided Investigations", "Load a solved investigation or step through checkpointed NASA case files"],
  "/workspace/research": ["Existing Research", "Connect the active dataset to published literature and citations"],
};

function DashboardFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const forecastPage = pathname === '/workspace/forecasts';
  const activeInvestigation = pathname?.startsWith('/workspace/case-studies/') ? investigation(pathname.split('/').pop() ?? '') : undefined;
  const { dataset, region, extractedPreview } = useDashboard();
  const isEmptyDataPreview = extractedPreview === null;
  const { dark, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

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
  return (
    <div
      className={`${dark ? "dark " : ""}app-shell dashboard-shell${
        collapsed ? " sidebar-collapsed" : ""
      }`}
    >
      {drawerOpen && (
        <button
          aria-label="Close dashboard navigation"
          className="dashboard-drawer-backdrop"
          onClick={() => setDrawerOpen(false)}
          type="button"
        />
      )}
      <aside className={`dashboard-sidebar${drawerOpen ? " drawer-open" : ""}`}>
        <div className="dashboard-brand-row">
          <Link className="dashboard-brand" href="/">
            <span className="brand-mark">
              <Icon name="globe" size={21} />
              <i className="orbit-dot" />
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
              <span className="dashboard-nav-label">{group.label}</span>
              {group.items.map((item) => {
                const isActive = pathname === item.to || pathname?.startsWith(`${item.to}/`);
                return (
                  <Link
                    className={isActive ? "active" : ""}
                    aria-current={isActive ? "page" : undefined}
                    key={item.to}
                    title={collapsed ? item.text : undefined}
                    href={item.to}
                  >
                    <Icon name={item.icon} size={18} />
                    <span>{item.text}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="dashboard-sidebar-footer">
          <button
            onClick={() => setTourOpen(true)}
            title={collapsed ? "Replay tour" : undefined}
            type="button"
          >
            <Icon name="info" size={17} />
            <span>Replay tour</span>
          </button>
          <a
            href={DOCS_URL}
            target="_blank"
            rel="noreferrer"
            title={collapsed ? "Documentation" : undefined}
          >
            <Icon name="book" size={17} />
            <span>Documentation</span>
          </a>
          <a
            href="https://github.com/Iris-NASC26/iris"
            target="_blank"
            rel="noreferrer"
            title={collapsed ? "GitHub repository" : undefined}
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
            {forecastPage ? <><span><i/>Iris local models</span><strong>Dataset forecasts</strong></> : activeInvestigation ? <><span><i/>Point precipitation</span><strong>{activeInvestigation.point_name}</strong></> : isEmptyDataPreview ? (
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
            {!forecastPage && !activeInvestigation && extractedPreview?.job_id && (
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
      <OnboardingTour onClose={closeTour} open={tourOpen} />
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
