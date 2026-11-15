"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { useTheme } from "@/context/ThemeContext";

const CobeGlobe = dynamic(
  () => import("@/features/landing/CobeGlobe").then(m => m.CobeGlobe),
  { ssr: false, loading: () => <div className="landing-cobe landing-cobe-loading" aria-hidden="true" /> }
);

const satelliteImage =
  "https://images.unsplash.com/photo-1574786199452-c7a5f69fb6e9?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1600";

const capabilities: Array<{
  icon: IconName;
  title: string;
  text: string;
  stat: string;
  label: string;
}> = [
  {
    icon: "activity",
    title: "Separate the signal from the noise",
    text: "Remove recurring seasons, identify anomalies, and reveal the long-term direction hidden inside messy environmental records.",
    stat: "40+",
    label: "years of observations",
  },
  {
    icon: "search",
    title: "Test whether change is meaningful",
    text: "Use robust non-parametric statistics to distinguish a credible trend from ordinary year-to-year variability.",
    stat: "95%",
    label: "confidence threshold",
  },
  {
    icon: "sparkles",
    title: "Follow the next clue",
    text: "Connect related Earth-system variables to investigate plausible physical relationships, not just correlations.",
    stat: "18",
    label: "analysis-ready variables",
  },
];

const methods = [
  ["01", "Frame the question", "Choose a region, signal, and timeframe."],
  ["02", "Prepare the evidence", "Quality-check and deseasonalize observations."],
  ["03", "Test the trend", "Apply Mann–Kendall significance testing."],
  ["04", "Measure the change", "Estimate a robust rate with Sen’s slope."],
];

export default function LandingPage() {
  const { dark, toggleTheme } = useTheme();

  return (
    <div className={dark ? "dark app-shell landing-site" : "app-shell landing-site"}>
      <PublicNavbar dark={dark} onToggleTheme={toggleTheme} />

      <main id="top">
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
            Turn decades of satellite and climate observations into clear, statistically defensible
            evidence—without hiding the science.
          </p>
          <div className="landing-hero-actions">
            <Link className="landing-primary-cta" href="/workspace">
              Start investigating <Icon name="arrow" size={16} />
            </Link>
            <a className="landing-secondary-cta" href="#platform">
              See how it works <Icon name="arrow" size={15} />
            </a>
          </div>
          <div className="hero-proof">
            <div className="proof-avatars">
              <span>NO</span>
              <span>AM</span>
              <span>US</span>
              <span>EU</span>
            </div>
            <div>
              <strong>Global evidence, local answers</strong>
              <span>Built on NASA and MODIS observations</span>
            </div>
          </div>

          <div className="landing-globe-band">
            <CobeGlobe dark={dark} />
            <div className="landing-globe-copy">
              <div className="landing-kicker">Explore upcoming conditions</div>
              <h2>See what the next 72 hours may bring.</h2>
              <p>
                Open a rainfall forecast to explore 51 model members, expected accumulations and
                the range of predicted outcomes. These are forecasts at six configured points;
                the globe is a navigation view, not a global warning map.
              </p>
              <Link href="/workspace/data-analysis?forecastId=colombo">
                Explore a forecast <Icon name="arrow" size={15} />
              </Link>
            </div>
          </div>

          <ProductPreview />
        </section>

        <section className="signal-marquee" aria-label="Available environmental signals">
          <div>
            {[
              "Air temperature",
              "Soil moisture",
              "Vegetation",
              "Precipitation",
              "Solar radiation",
              "Humidity",
              "Air temperature",
              "Soil moisture",
            ].map((item, index) => (
              <span key={`${item}-${index}`}>
                <i />
                {item}
              </span>
            ))}
          </div>
        </section>

        <section className="landing-section platform-section" id="platform">
          <div className="landing-section-heading centered">
            <div className="landing-kicker">The analytical workbench</div>
            <h2>
              Every clue you need.
              <br />
              <em>One evidence trail.</em>
            </h2>
            <p>
              Iris brings data discovery, robust statistics, visual analysis, and plain-language
              interpretation into one connected workflow.
            </p>
          </div>
          <div className="capability-grid">
            {capabilities.map((item, index) => (
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

        <section className="landing-feature landing-feature-dark">
          <div className="feature-copy">
            <div className="landing-kicker light">See the whole signal</div>
            <h2>Trends are rarely a straight line.</h2>
            <p>
              Environmental data is seasonal, noisy, and full of extremes. Compare raw observations
              with the underlying signal while anomalies remain visible—not edited away.
            </p>
            <ul>
              <li>
                <Icon name="check" size={16} /> Raw and deseasonalized views
              </li>
              <li>
                <Icon name="check" size={16} /> Sen’s slope with confidence intervals
              </li>
              <li>
                <Icon name="check" size={16} /> Automatic anomaly detection
              </li>
            </ul>
            <Link href="/workspace">
              Explore the workbench <Icon name="arrow" size={15} />
            </Link>
          </div>
          <div className="signal-demo">
            <div className="signal-demo-head">
              <span>Near-surface temperature</span>
              <strong>+0.42°C / decade</strong>
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
              <path
                className="demo-signal-line"
                d="M30 245 C85 220 95 235 140 198 S210 188 255 165 S320 153 365 125 S425 135 470 84 S530 92 570 51"
              />
              <path className="demo-trend-line" d="M30 244 L570 63" />
              <circle cx="470" cy="84" r="6" />
              <circle cx="532" cy="87" r="6" />
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
                <i className="raw" /> Environmental signal
              </span>
              <span>
                <i className="slope" /> Sen’s slope
              </span>
              <span>
                <i className="outlier" /> Anomaly
              </span>
            </div>
          </div>
        </section>

        <section className="landing-section method-landing" id="method">
          <div className="method-landing-copy">
            <div className="landing-kicker">Transparent by design</div>
            <h2>A verdict you can trace back to the evidence.</h2>
            <p>
              Iris never hands you a mysterious score. Every conclusion includes its source,
              assumptions, effect size, uncertainty, and the full path from observation to verdict.
            </p>
            <Link href="/methodology">
              Read the full methodology <Icon name="arrow" size={15} />
            </Link>
          </div>
          <div className="method-steps">
            {methods.map(([number, title, text], index) => (
              <article key={number}>
                <span>{number}</span>
                <div>
                  <strong>{title}</strong>
                  <p>{text}</p>
                </div>
                <i style={{ "--progress": `${(index + 1) * 24}%` } as CSSProperties} />
              </article>
            ))}
          </div>
        </section>

        <section className="data-world" id="data">
          <div className="data-world-image">
            <img src={satelliteImage} alt="Satellite image showing natural land patterns" />
            <span>Earth imagery by USGS on Unsplash</span>
            <div className="data-marker marker-one">
              <i />
              <b>Temperature</b>
              <small>40 years</small>
            </div>
            <div className="data-marker marker-two">
              <i />
              <b>Vegetation</b>
              <small>25 years</small>
            </div>
          </div>
          <div className="data-world-copy">
            <div className="landing-kicker light">Our data source: the living planet</div>
            <h2>
              Trusted observations.
              <br />
              Global coverage.
            </h2>
            <p>
              Analyze harmonized variables from NASA POWER, MERRA-2, MODIS, GPM, and CERES—each
              linked to its original scientific source.
            </p>
            <div className="data-stats">
              <div>
                <strong>18</strong>
                <span>analysis-ready variables</span>
              </div>
              <div>
                <strong>40+</strong>
                <span>years of observations</span>
              </div>
              <div>
                <strong>Global</strong>
                <span>land and ocean coverage</span>
              </div>
            </div>
            <Link href="/data">
              Browse the data catalog <Icon name="arrow" size={15} />
            </Link>
          </div>
        </section>

        <section className="landing-section cases-landing" id="cases">
          <div className="landing-section-heading case-heading">
            <div>
              <div className="landing-kicker">Evidence from a changing planet</div>
              <h2>Follow an investigation.</h2>
            </div>
            <Link href="/case-studies">
              Explore all cases <Icon name="arrow" size={15} />
            </Link>
          </div>
          <div className="landing-case-grid">
            <CaseCard
              icon="thermometer"
              place="Los Angeles, USA"
              title="Two decades of urban warming"
              value="+0.42°C"
              meta="per decade · 99.86% confidence"
              tone="warm"
            />
            <CaseCard
              icon="activity"
              place="Central Valley, USA"
              title="The signature of a historic drought"
              value="−18.7mm"
              meta="per decade · 98.2% confidence"
              tone="dry"
            />
            <CaseCard
              icon="layers"
              place="Amazon Basin, Brazil"
              title="Forest resilience under pressure"
              value="−0.08"
              meta="NDVI per decade · 95.4% confidence"
              tone="forest"
            />
          </div>
        </section>

        <section className="about-landing" id="about">
          <div className="about-orbit">
            <span className="orbit orbit-1" />
            <span className="orbit orbit-2" />
            <div>
              <Icon name="globe" size={76} />
            </div>
            <i className="about-dot dot-a" />
            <i className="about-dot dot-b" />
            <i className="about-dot dot-c" />
          </div>
          <div className="about-landing-copy">
            <div className="landing-kicker">Why Iris</div>
            <h2>
              Earth data is abundant.
              <br />
              <em>Clear answers are not.</em>
            </h2>
            <p>
              We believe publicly funded observations should become public understanding. Iris makes
              rigorous trend analysis approachable without flattening nuance or overstating
              certainty.
            </p>
            <div className="about-principles">
              <span>
                <Icon name="search" size={16} /> Show the evidence
              </span>
              <span>
                <Icon name="book" size={16} /> Explain, don’t obscure
              </span>
              <span>
                <Icon name="check" size={16} /> Respect uncertainty
              </span>
            </div>
          </div>
        </section>

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

      <footer className="landing-footer">
        <div className="footer-brand">
          <div className="brand-mark">
            <Icon name="globe" size={19} />
          </div>
          <div>
            <strong>Iris</strong>
            <span>Open tools for a changing planet.</span>
          </div>
        </div>
        <div className="landing-footer-links">
          <Link href="/platform">Platform</Link>
          <Link href="/methodology">Methodology</Link>
          <Link href="/data">Data</Link>
          <Link href="/about">About</Link>
        </div>
        <span>Built with public Earth observation data</span>
      </footer>
    </div>
  );
}

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
              Los Angeles County
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
                <small>Selected variable</small>Near-surface temperature
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
                <p>Temperature has risen by +0.42°C per decade.</p>
              </div>
              <b>99.86%</b>
            </div>
            <div className="preview-metrics">
              <span>
                <small>Decadal rate</small>
                <b>+0.42°C</b>
              </span>
              <span>
                <small>Total change</small>
                <b>+0.84°C</b>
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
                <span>Deseasonalized</span>
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
          <strong>Statistically significant</strong>
        </div>
      </div>
    </div>
  );
}

function CaseCard({
  icon,
  place,
  title,
  value,
  meta,
  tone,
}: {
  icon: IconName;
  place: string;
  title: string;
  value: string;
  meta: string;
  tone: string;
}) {
  return (
    <article className={`landing-case-card ${tone}`}>
      <div className="landing-case-art">
        <span>
          <Icon name={icon} size={22} />
        </span>
        <i />
        <i />
        <i />
      </div>
      <div className="landing-case-body">
        <small>{place}</small>
        <h3>{title}</h3>
        <div>
          <strong>{value}</strong>
          <span>{meta}</span>
        </div>
        <Link href="/workspace" aria-label={`Open ${title}`}>
          <Icon name="arrow" size={16} />
        </Link>
      </div>
    </article>
  );
}
