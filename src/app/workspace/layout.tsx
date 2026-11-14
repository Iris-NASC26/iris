"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/Icon";
import { DashboardProvider, useDashboard } from "@/context/DashboardContext";
import { useTheme } from "@/context/ThemeContext";
import { OnboardingTour } from "@/components/dashboard/OnboardingTour";
import { DOCS_URL } from "@/lib/docs";

const navigation: Array<{
  label?: string;
  items: Array<{ to: string; text: string; icon: IconName }>;
}> = [
  {
    label: "Investigate",
    items: [
      { to: "/workspace/intelligence", text: "System Intelligence", icon: "sparkles" },
      { to: "/workspace/data-selection", text: "Data Selection", icon: "box" },
      { to: "/workspace/data-preview", text: "Data Preview", icon: "layers" },
      { to: "/workspace/visualize", text: "Plot & Visualize", icon: "activity" },
    ],
  },
  {
    label: "Global Evidence Cube",
    items: [
      { to: "/workspace/globe", text: "Living Globe", icon: "globe" },
      { to: "/workspace/case-board", text: "Regional Case Board", icon: "layers" },
    ],
  },
  {
    label: "Explore",
    items: [
      { to: "/workspace/case-studies", text: "Case Studies", icon: "book" },
      { to: "/workspace/research", text: "Existing Research", icon: "file" },
    ],
  },
  {
    label: "Advanced",
    items: [{ to: "/workspace/advanced", text: "Custom Code", icon: "box" }],
  },
];

const pageTitles: Record<string, [string, string]> = {
  "/workspace/intelligence": ["System Intelligence", "Identify domain keywords & discover live time-series datasets"],
  "/workspace/data-selection": ["Data Selection", "Select time-series products & configure date range, region, and frequency"],
  "/workspace/data-preview": ["Data Preview", "Inspect retrieved time-series observations & quality metrics before analysis"],
  "/workspace/visualize": ["Plot & Visualize · Case File", "Find the long-term signal & inspect full SRS Case File diagnostics"],
  "/workspace/globe": ["Living Globe", "Explore versioned Global Trend Cube layers, BH-FDR significance & teleconnection dipoles"],
  "/workspace/case-board": ["Regional Case Board", "Scan all Global Trend Cube variables for a region & compare two regions side-by-side"],
  "/workspace/case-studies": ["Case Studies & Guided Investigations", "Load a solved investigation or step through checkpointed NASA case files"],
  "/workspace/research": ["Existing Research", "Connect the active dataset to published work"],
  "/workspace/advanced": ["Advanced Code", "Prototype a custom transformation"],
};

function DashboardFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { dataset, region, extractedPreview } = useDashboard();
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

  const title = (pathname && pageTitles[pathname]) ?? [
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
          <button
            aria-label={`Switch to ${dark ? "light" : "dark"} mode`}
            onClick={toggleTheme}
            title={collapsed ? "Toggle theme" : undefined}
            type="button"
          >
            <Icon name={dark ? "sun" : "moon"} size={17} />
            <span>{dark ? "Light mode" : "Dark mode"}</span>
          </button>
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
            <span>{title[1]}</span>
            <h1>{title[0]}</h1>
          </div>
          <div className="dashboard-context-chip">
            <span>
              <i />
              {dataset.code}
            </span>
            <strong>{region}</strong>
            {extractedPreview?.job_id && (
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
        </header>
        <main className="dashboard-page">{children}</main>
      </div>
      <OnboardingTour onClose={closeTour} open={tourOpen} />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardProvider>
      <DashboardFrame>{children}</DashboardFrame>
    </DashboardProvider>
  );
}
