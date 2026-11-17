"use client";

import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PageShell } from "@/components/layout/PageShell";

const workflow = [
  {
    icon: "sparkles" as IconName,
    title: "Ask in Iris Intelligence",
    text: "Describe your question in plain English. Confirm the suggested search keywords to search across 10 public space and weather catalogs at once.",
    detail: "Plain-English Search · 10 Catalogs",
  },
  {
    icon: "box" as IconName,
    title: "Configure in Data Selection",
    text: "Pick your dataset, choose a date range and time step (Daily, Monthly, or Yearly), and click a point or draw a study region on the interactive map.",
    detail: "Region · Timeframe · Frequency",
  },
  {
    icon: "layers" as IconName,
    title: "Inspect in Data Preview",
    text: "Review completeness statistics, check the preview chart with missing periods clearly marked, and download clean CSV or JSON tables.",
    detail: "Quality Check · Gap-Aware Chart",
  },
  {
    icon: "activity" as IconName,
    title: "Test in Data Analysis",
    text: "Remove the repeating seasonal cycle and run up to 8 statistical tests step by step across Explorer, Student, and Scientist explanation modes.",
    detail: "8 Statistical Methods · Grade A–D",
  },
  {
    icon: "globe" as IconName,
    title: "Explore in 2D/3D & Living Globe",
    text: "Compare linked 2D and 3D seasonal charts in the Visualization Studio, or explore 11 global monthly environmental layers on the 3D Living Globe.",
    detail: "3D Seasonal Views · Global Maps",
  },
  {
    icon: "book" as IconName,
    title: "Forecasts, Case Studies & Research",
    text: "Generate short-term forecasts trained on historical data, explore solved disaster case studies, and find related scientific papers.",
    detail: "Historical ML · Research Citations",
  },
];

export default function PlatformPage() {
  return (
    <PageShell
      action={
        <Link className="primary-page-button" href="/workspace">
          Open the workbench <Icon name="arrow" size={16} />
        </Link>
      }
      description="A connected, easy-to-use analytical environment for turning public Earth observations into clear, traceable, and statistically sound findings."
      section="The Platform"
      title="One workspace for the entire investigation"
    >
      <section className="platform-showcase">
        <div className="platform-browser">
          <div className="platform-browser-bar">
            <span />
            <span />
            <span />
            <div>Iris Workspace · Data Analysis Case File</div>
          </div>
          <div className="platform-browser-body">
            <aside>
              <div className="platform-mini-brand">
                <Icon name="globe" size={16} /> Iris
              </div>
              <small>Investigation setup</small>
              <label>Location &amp; Variable</label>
              <div>
                <Icon name="search" size={12} /> Los Angeles County · Air Temp
              </div>
              <label>Seasonal Adjustment</label>
              <div className="platform-mini-tabs">
                <b>Auto</b>
                <span>Monthly</span>
                <span>None</span>
              </div>
              <label>Period: 2005–2025 (Monthly)</label>
              <i className="platform-mini-range" />
              <button type="button">Run statistical analysis</button>
            </aside>
            <div className="platform-browser-analysis">
              <div className="platform-mini-verdict">
                <Icon name="arrow" size={18} />
                <div>
                  <small>Case File Verdict</small>
                  <strong>Statistically significant warming trend detected</strong>
                </div>
                <b>Grade A</b>
              </div>
              <div className="platform-mini-metrics">
                <span>
                  <small>Sen&apos;s slope</small>
                  <b>+0.42 °C / dec</b>
                </span>
                <span>
                  <small>Significance</small>
                  <b>p = 0.0014</b>
                </span>
                <span>
                  <small>Data coverage</small>
                  <b>100% valid</b>
                </span>
              </div>
              <div
                className="platform-mini-chart"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "8px",
                }}
              >
                <strong>Completed Analysis Steps (Case IR–042)</strong>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                    fontSize: "10px",
                  }}
                >
                  <div
                    style={{
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid var(--border)",
                      background: "var(--card-soft)",
                    }}
                  >
                    <b>1. Linear Trend (OLS)</b>
                    <div style={{ color: "var(--muted)", marginTop: "2px" }}>
                      +0.42 °C per decade · Significant
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid var(--border)",
                      background: "var(--card-soft)",
                    }}
                  >
                    <b>2. Mann–Kendall Trend Test</b>
                    <div style={{ color: "var(--muted)", marginTop: "2px" }}>
                      p = 0.0014 · Persistence-corrected
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid var(--border)",
                      background: "var(--card-soft)",
                    }}
                  >
                    <b>3. Sen&apos;s Slope Rate of Change</b>
                    <div style={{ color: "var(--muted)", marginTop: "2px" }}>
                      +0.42 °C/dec (95% range: +0.31 to +0.53)
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid var(--border)",
                      background: "var(--card-soft)",
                    }}
                  >
                    <b>4. Full Case File Summary</b>
                    <div style={{ color: "var(--muted)", marginTop: "2px" }}>
                      Evidence Grade A · Explorer / Student / Scientist
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="platform-float float-verdict">
          <Icon name="check" size={15} />
          <span>
            <small>100% Real Data</small>
            <strong>Verified NASA Record</strong>
          </span>
        </div>
        <div className="platform-float float-clue">
          <Icon name="sparkles" size={15} />
          <span>
            <small>Clear Explanations</small>
            <strong>Explorer, Student &amp; Scientist</strong>
          </span>
        </div>
      </section>

      <section className="platform-workflow">
        <div className="platform-workflow-heading">
          <div className="section-kicker">
            <span>End to end</span> Investigation workflow
          </div>
          <h2>From a plain-English question to a complete Case File</h2>
          <p>
            The platform keeps your search, quality checks, statistical tests, 3D visualizations,
            and research citations connected at every step.
          </p>
        </div>
        <div
          className="platform-workflow-grid"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}
        >
          {workflow.map((item, index) => (
            <article key={item.title}>
              <div>
                <span>0{index + 1}</span>
                <Icon name={item.icon} size={20} />
              </div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              <code>{item.detail}</code>
            </article>
          ))}
        </div>
      </section>

      <section className="platform-capabilities">
        <div>
          <div className="section-kicker">
            <span>Designed for inquiry</span> Platform capabilities
          </div>
          <h2>Powerful enough for evidence. Clear enough for conversation.</h2>
        </div>
        <div className="platform-capability-list">
          <article>
            <Icon name="globe" size={20} />
            <div>
              <strong>3D Living Globe &amp; Global Layers</strong>
              <p>
                Explore 11 monthly global variables on an interactive 3D globe or draw a custom
                study area on the 2D map.
              </p>
            </div>
          </article>
          <article>
            <Icon name="activity" size={20} />
            <div>
              <strong>8-Method Statistical Workbench</strong>
              <p>
                Run linear regression, Mann–Kendall, Seasonal Kendall, Sen&apos;s slope, change-point
                detection, and anomaly reviews step by step.
              </p>
            </div>
          </article>
          <article>
            <Icon name="layers" size={20} />
            <div>
              <strong>Historical Machine Learning Forecasts</strong>
              <p>
                Select any location on Earth to view short-term predictions with uncertainty ranges
                and honest baseline comparisons.
              </p>
            </div>
          </article>
          <article>
            <Icon name="file" size={20} />
            <div>
              <strong>Connected Literature &amp; Exports</strong>
              <p>
                Find peer-reviewed scientific papers related to your dataset and download clean CSV,
                JSON, and PNG reports.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className="platform-page-cta">
        <div>
          <span>Ready to follow a signal?</span>
          <h2>Start with any region on Earth.</h2>
        </div>
        <Link href="/workspace">
          Open the workspace <Icon name="arrow" size={16} />
        </Link>
      </section>
    </PageShell>
  );
}
