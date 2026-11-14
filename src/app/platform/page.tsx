"use client";

import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PageShell } from "@/components/layout/PageShell";

const workflow = [
  {
    icon: "search" as IconName,
    title: "Define an investigation",
    text: "Search any region, select an environmental phenomenon, and choose the historical period that matters to your question.",
    detail: "Region · Variable · Timeframe",
  },
  {
    icon: "layers" as IconName,
    title: "Build the evidence trail",
    text: "Iris retrieves, quality-checks, spatially averages, and prepares observations from trusted scientific providers.",
    detail: "Source · Quality · Transform",
  },
  {
    icon: "activity" as IconName,
    title: "Interrogate the signal",
    text: "Compare raw and deseasonalized records, test trend significance, estimate the rate of change, and inspect anomalies.",
    detail: "Trend · Slope · Anomaly",
  },
  {
    icon: "sparkles" as IconName,
    title: "Follow the next clue",
    text: "Use physically related variables to test a plausible explanation and develop a more complete environmental story.",
    detail: "Hypothesis · Overlay · Compare",
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
      description="A connected analytical environment for turning public Earth observations into clear, traceable, and statistically defensible findings."
      section="The platform"
      title="One workspace for the entire investigation"
    >
      <p className="prototype-disclosure">Design illustrations and proposed investigations only. No scientific finding or confidence is computed here.</p>
      <section className="platform-showcase">
        <div className="platform-browser">
          <div className="platform-browser-bar">
            <span />
            <span />
            <span />
            <div>app.iris.earth/workspace</div>
          </div>
          <div className="platform-browser-body">
            <aside>
              <div className="platform-mini-brand">
                <Icon name="globe" size={16} /> Iris
              </div>
              <small>Investigation setup</small>
              <label>Location</label>
              <div>
                <Icon name="search" size={12} /> Los Angeles County
              </div>
              <label>Phenomenon</label>
              <div className="platform-mini-tabs">
                <b>Heat</b>
                <span>Drought</span>
                <span>Vegetation</span>
              </div>
              <label>Investigation period</label>
              <i className="platform-mini-range" />
              <button type="button">Run forensic analysis</button>
            </aside>
            <div className="platform-browser-analysis">
              <div className="platform-mini-verdict">
                <Icon name="arrow" size={18} />
                <div>
                  <small>Detective verdict</small>
                  <strong>Trend analysis awaiting validation</strong>
                </div>
                <b>Not computed</b>
              </div>
              <div className="platform-mini-metrics">
                <span>
                  <small>Decadal rate</small>
                  <b>Not computed</b>
                </span>
                <span>
                  <small>Total change</small>
                  <b>Not computed</b>
                </span>
                <span>
                  <small>MK p-value</small>
                  <b>Not computed</b>
                </span>
              </div>
              <div className="platform-mini-chart">
                <strong>Temperature over time</strong>
                <svg viewBox="0 0 520 180" aria-label="Example warming trend chart">
                  {[38, 78, 118, 158].map((y) => (
                    <line key={y} x1="10" x2="510" y1={y} y2={y} />
                  ))}
                  <path d="M10 150 C55 138 65 145 105 122 S165 129 205 103 S270 105 310 81 S370 75 410 57 S470 46 510 25" />
                  <path className="platform-slope" d="M10 154 L510 30" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        <div className="platform-float float-verdict">
          <Icon name="check" size={15} />
          <span>
            <small>Evidence status</small>
            <strong>High confidence</strong>
          </span>
        </div>
        <div className="platform-float float-clue">
          <Icon name="sparkles" size={15} />
          <span>
            <small>Next clue</small>
            <strong>Overlay soil moisture</strong>
          </span>
        </div>
      </section>

      <section className="platform-workflow">
        <div className="platform-workflow-heading">
          <div className="section-kicker">
            <span>End to end</span> Investigation workflow
          </div>
          <h2>From a question to a defensible answer</h2>
          <p>
            The platform keeps context, computation, and interpretation connected through every
            stage.
          </p>
        </div>
        <div className="platform-workflow-grid">
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

      <section className="platform-feature-row">
        <div className="platform-feature-copy">
          <div className="section-kicker">
            <span>Visual analysis</span> See the whole signal
          </div>
          <h2>Raw observations and underlying change, side by side.</h2>
          <p>
            Move smoothly between seasonal data and the prepared signal. Anomalies remain visible,
            Sen’s slope stays explicit, and every metric keeps its unit and uncertainty.
          </p>
          <ul>
            <li>
              <Icon name="check" size={15} /> Interactive time-series exploration
            </li>
            <li>
              <Icon name="check" size={15} /> Deseasonalized signal comparison
            </li>
            <li>
              <Icon name="check" size={15} /> CSV, PNG, and report exports
            </li>
          </ul>
        </div>
        <div className="platform-chart-card">
          <div>
            <span>Near-surface air temperature</span>
            <b>Deseasonalized</b>
          </div>
          <svg viewBox="0 0 600 280">
            {[45, 95, 145, 195, 245].map((y) => (
              <line key={y} x1="30" x2="570" y1={y} y2={y} />
            ))}
            <path
              className="platform-chart-area"
              d="M30 230 C75 210 95 224 140 190 S200 191 245 160 S305 167 350 124 S410 137 450 91 S520 84 570 55 L570 260 L30 260Z"
            />
            <path
              className="platform-chart-signal"
              d="M30 230 C75 210 95 224 140 190 S200 191 245 160 S305 167 350 124 S410 137 450 91 S520 84 570 55"
            />
            <path className="platform-chart-trend" d="M30 235 L570 62" />
            <circle cx="450" cy="91" r="6" />
            <circle cx="528" cy="79" r="6" />
          </svg>
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
              <strong>Spatial investigation</strong>
              <p>Search regions or draw a precise area of interest directly on the map.</p>
            </div>
          </article>
          <article>
            <Icon name="activity" size={20} />
            <div>
              <strong>Robust statistics</strong>
              <p>Mann–Kendall significance and Sen’s slope effect size are calculated together.</p>
            </div>
          </article>
          <article>
            <Icon name="layers" size={20} />
            <div>
              <strong>Connected variables</strong>
              <p>Overlay related Earth-system signals without losing the original investigation.</p>
            </div>
          </article>
          <article>
            <Icon name="file" size={20} />
            <div>
              <strong>Traceable exports</strong>
              <p>
                Download analysis-ready data and presentation-ready evidence with metadata intact.
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
