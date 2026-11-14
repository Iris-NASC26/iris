"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PageShell } from "@/components/layout/PageShell";

const publicCaseStudies = [
  {
    id: "IR–042",
    title: "Two decades of urban warming",
    location: "Los Angeles County, USA",
    phenomenon: "Extreme heat",
    finding: "+0.42 °C / decade",
    confidence: "99.86%",
    years: "2005–2025",
    icon: "thermometer" as IconName,
    tone: "heat",
    description:
      "Separating long-term warming from seasonal variability across one of North America’s largest urban regions.",
  },
  {
    id: "IR–038",
    title: "The signature of a historic drought",
    location: "Central Valley, USA",
    phenomenon: "Drought",
    finding: "−18.7 mm / decade",
    confidence: "98.2%",
    years: "2001–2024",
    icon: "activity" as IconName,
    tone: "drought",
    description:
      "Tracing soil moisture decline through the 2012–2016 drought and testing whether conditions recovered.",
  },
  {
    id: "IR–031",
    title: "Forest resilience under pressure",
    location: "Amazon Basin, Brazil",
    phenomenon: "Vegetation",
    finding: "−0.08 NDVI / decade",
    confidence: "95.4%",
    years: "2003–2024",
    icon: "layers" as IconName,
    tone: "forest",
    description:
      "Examining persistent vegetation stress and the growing duration of dry-season anomalies.",
  },
  {
    id: "IR–027",
    title: "Arctic amplification in focus",
    location: "Svalbard, Norway",
    phenomenon: "Extreme heat",
    finding: "+1.12 °C / decade",
    confidence: "99.97%",
    years: "2000–2024",
    icon: "globe" as IconName,
    tone: "ice",
    description:
      "Measuring a rapid high-latitude warming signal and its relationship to sea-ice season length.",
  },
  {
    id: "IR–019",
    title: "A greening Sahel",
    location: "Sahel Region, Africa",
    phenomenon: "Vegetation",
    finding: "+0.05 NDVI / decade",
    confidence: "94.8%",
    years: "2002–2023",
    icon: "sparkles" as IconName,
    tone: "sahel",
    description:
      "Mapping where vegetation recovery is persistent and where rainfall variability still dominates.",
  },
  {
    id: "IR–014",
    title: "Monsoon variability",
    location: "Western Ghats, India",
    phenomenon: "Drought",
    finding: "Inconclusive",
    confidence: "72.1%",
    years: "2000–2024",
    icon: "alert" as IconName,
    tone: "monsoon",
    description:
      "Testing whether recent rainfall extremes represent a trend or remain within natural variability.",
  },
];

export default function CaseStudiesPage() {
  const [filter, setFilter] = useState("All investigations");
  const filters = ["All investigations", "Extreme heat", "Drought", "Vegetation"];
  const visible = publicCaseStudies.filter(
    (item) => filter === "All investigations" || item.phenomenon === filter,
  );

  return (
    <PageShell
      action={
        <Link className="primary-page-button" href="/workspace">
          Start an investigation <Icon name="arrow" size={16} />
        </Link>
      }
      description="Explore completed investigations that turn decades of satellite and climate data into clear, statistically defensible findings."
      section="Case library"
      title="Evidence from a changing planet"
    >
      <section className="featured-case">
        <div className="featured-map">
          <div className="map-grid" />
          <span className="map-land land-one" />
          <span className="map-land land-two" />
          <span className="map-land land-three" />
          <span className="map-pulse pulse-la" />
          <span className="map-pulse pulse-arctic" />
          <span className="map-pulse pulse-amazon" />
          <div className="featured-map-label">
            <span>Featured investigation</span>
            <strong>Los Angeles County</strong>
          </div>
        </div>
        <div className="featured-copy">
          <div className="case-meta">
            <span>IR–042</span>
            <i />
            <span>21 years of evidence</span>
          </div>
          <h2>Is Los Angeles getting meaningfully hotter?</h2>
          <p>
            The signal is clear: near-surface temperatures rose beyond the range of normal
            year-to-year variation, with the strongest acceleration after 2016.
          </p>
          <div className="featured-stats">
            <div>
              <small>Detected trend</small>
              <strong>+0.42 °C</strong>
              <span>per decade</span>
            </div>
            <div>
              <small>Confidence</small>
              <strong>99.86%</strong>
              <span>p = 0.0014</span>
            </div>
          </div>
          <Link className="text-link" href="/workspace">
            Open full investigation <Icon name="arrow" size={15} />
          </Link>
        </div>
      </section>

      <section className="library-section">
        <div className="library-heading">
          <div>
            <div className="section-kicker">
              <span>{visible.length}</span> Published cases
            </div>
            <h2>Investigation library</h2>
          </div>
          <div className="filter-tabs" role="group" aria-label="Filter cases">
            {filters.map((item) => (
              <button
                className={filter === item ? "active" : ""}
                key={item}
                onClick={() => setFilter(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="case-grid">
          {visible.map((item) => (
            <article className="case-card" key={item.id}>
              <div className={`case-visual ${item.tone}`}>
                <div className="case-contours" />
                <div className="case-icon">
                  <Icon name={item.icon} size={23} />
                </div>
                <span>{item.years}</span>
              </div>
              <div className="case-card-body">
                <div className="case-card-meta">
                  <span>{item.id}</span>
                  <span>{item.phenomenon}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <div className="case-location">
                  <Icon name="globe" size={13} /> {item.location}
                </div>
                <div className="case-result">
                  <div>
                    <small>Finding</small>
                    <strong>{item.finding}</strong>
                  </div>
                  <div>
                    <small>Confidence</small>
                    <strong>{item.confidence}</strong>
                  </div>
                  <Link aria-label={`Open ${item.title}`} href="/workspace">
                    <Icon name="arrow" size={16} />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
