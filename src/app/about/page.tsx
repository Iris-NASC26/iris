"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { PageShell } from "@/components/layout/PageShell";
import { InfoCard } from "@/components/layout/InfoCard";

interface TeamMember {
  id: string;
  num: string;
  name: string;
  role: string;
  focus: string;
  image: string;
}

const TEAM_MEMBERS: TeamMember[] = [
  {
    id: "member-01",
    num: "01",
    name: "Navida Jayaweera",
    role: "Backend Development, Team Lead, Research",
    focus:
      "Backend services and data pipelines, system architecture leadership, and Earth observation research.",
    image: "/navida.jpg",
  },
  {
    id: "member-02",
    num: "02",
    name: "Oshadha Shiro",
    role: "Frontend Dev, Forecasting, Documentation",
    focus:
      "Web application interface, interactive forecasting workflows, and platform documentation.",
    image: "/oshadha.jpeg",
  },
  {
    id: "member-03",
    num: "03",
    name: "Vimukthi Prashan",
    role: "ML Dev, Forecasting, Data Visualization",
    focus:
      "Historical machine learning forecasting models, uncertainty intervals, and 3D visual landscapes.",
    image: "/vimukthi.jpeg",
  },
  {
    id: "member-04",
    num: "04",
    name: "Dinodh Dassanayake",
    role: "Data Analyzing, Research, Documentation",
    focus:
      "Multi-decadal satellite data analysis, Earth observation literature research, and methodology documentation.",
    image: "/dinodh.jpeg",
  },
  {
    id: "member-05",
    num: "05",
    name: "Shenon Kaushika",
    role: "Data Analyzing, Research, Documentation",
    focus:
      "Observational time-series data analysis, environmental anomaly review, and benchmark case documentation.",
    image: "/shenon.jpeg",
  },
  {
    id: "member-06",
    num: "06",
    name: "Nadula Nisith",
    role: "Slept, Rage Bating",
    focus:
      "High-friction stress testing, unconventional peer review through debate, and spontaneous morale disruption.",
    image: "/nadula.jpeg",
  },
];

export default function AboutPage() {
  return (
    <PageShell
      action={
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <a className="secondary-page-button" href="mailto:info@projectiris.earth">
            Contact us <Icon name="external" size={15} />
          </a>
          <Link className="primary-page-button" href="/workspace">
            Open workspace <Icon name="arrow" size={16} />
          </Link>
        </div>
      }
      description="Built for the NASA International Space Apps Challenge 2026 ('Be An Earth System Trend Detective!'), Project Iris makes Earth system trend analysis, 3D global mapping, and environmental forecasting clear, understandable, and accessible for everyone."
      section="Our Mission, Team & Contact"
      title="Better climate conversations start with better evidence"
    >
      {/* ─── 1. MISSION MANIFESTO ────────────────────────────────────── */}
      <section className="about-manifesto">
        <div className="manifesto-art">
          <div className="planet-orbit orbit-a" />
          <div className="planet-orbit orbit-b" />
          <div className="planet-core">
            <Icon name="globe" size={72} />
          </div>
          <span className="planet-signal signal-a" />
          <span className="planet-signal signal-b" />
          <span className="planet-signal signal-c" />
        </div>
        <div className="manifesto-copy">
          <div className="section-kicker">
            <span>Why Project Iris</span> Signal over noise
          </div>
          <h2>Earth data is abundant. Clear answers are not.</h2>
          <p>
            Public satellites and weather stations collect decades of information about our changing
            planet—yet turning those raw records into a trustworthy answer normally requires coding
            skills and specialized statistical software.
          </p>
          <p>
            Project Iris bridges that gap. By combining plain-English search across{" "}
            <strong>10 public space and weather catalogs</strong>, an easy-to-follow{" "}
            <strong>8-method statistical workbench</strong>,{" "}
            <strong>11 global 3D map layers</strong>, and{" "}
            <strong>historical machine learning forecasts</strong>, Iris helps anyone investigate
            environmental change without hiding the science.
          </p>
        </div>
      </section>

      {/* ─── 2. GOVERNING PRINCIPLES ─────────────────────────────────── */}
      <section className="values-section">
        <div className="values-heading">
          <div>
            <div className="section-kicker">
              <span>Principles</span> How we work
            </div>
            <h2>Clarity without oversimplification</h2>
          </div>
        </div>
        <div
          className="values-grid"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}
        >
          <InfoCard
            icon="search"
            number="01"
            title="Show the real evidence"
            text="Every result comes from authentic public observations and clearly shows its source agency, date range, and data completeness."
          />
          <InfoCard
            icon="sparkles"
            number="02"
            title="AI guides; math decides"
            text="Our AI assistant helps you find datasets and explains findings in plain English, while all statistics are calculated by verified mathematical formulas."
          />
          <InfoCard
            icon="check"
            number="03"
            title="Respect uncertainty"
            text="When a record is too short or noisy to prove a trend, Iris says so honestly rather than forcing a dramatic conclusion."
          />
          <InfoCard
            icon="book"
            number="04"
            title="Explain at every level"
            text="Switch smoothly between Explorer, Student, and Scientist explanations and connect every investigation to published research papers."
          />
        </div>
      </section>

      {/* ─── 3. TEAM & RESEARCH CONTRIBUTORS (6 MEMBERS) ─────────────── */}
      <section className="method-process" id="team" style={{ marginTop: "80px" }}>
        <div className="method-section-heading" style={{ maxWidth: "760px" }}>
          <div className="section-kicker">
            <span>The Team</span> Contributors &amp; Architecture
          </div>
          <h2>Meet the team behind Project Iris</h2>
          <p>
            A multidisciplinary team combining climate data research, statistical analysis,
            geospatial web engineering, and machine learning.
          </p>
        </div>

        <div className="team-grid-six" style={{ marginTop: "24px" }}>
          {TEAM_MEMBERS.map((member) => (
            <article className="team-card" key={member.id}>
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
            </article>
          ))}
        </div>
      </section>

      {/* ─── 4. WHO IT SERVES ────────────────────────────────────────── */}
      <section className="audience-section">
        <div className="audience-copy">
          <div className="section-kicker">
            <span>Built for inquiry</span> Who it serves
          </div>
          <h2>One workbench, many investigators</h2>
          <p>
            Iris supports early exploration, education, and communication across three tailored
            explanation modes: <strong>Explorer</strong>, <strong>Student</strong>, and{" "}
            <strong>Scientist</strong>.
          </p>
        </div>
        <div className="audience-list">
          <div>
            <span>01</span>
            <strong>Researchers &amp; students</strong>
            <p>
              Discover datasets, run trend and change-point tests, and link directly to published
              scientific literature.
            </p>
          </div>
          <div>
            <span>02</span>
            <strong>Journalists &amp; communicators</strong>
            <p>
              Ground local climate stories and extreme weather timelines in verified satellite and
              weather station records.
            </p>
          </div>
          <div>
            <span>03</span>
            <strong>Planners &amp; communities</strong>
            <p>
              Understand how local temperature, rainfall, soil moisture, and vegetation are changing
              over time.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 5. CONTACT US SECTION (mailto:info@projectiris.earth) ───── */}
      <section
        className="srs-rubric-card"
        id="contact"
        style={{
          marginTop: "40px",
          marginBottom: "48px",
          padding: "28px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "24px",
          flexWrap: "wrap",
          borderLeft: "4px solid var(--accent, var(--green))",
        }}
      >
        <div style={{ maxWidth: "680px" }}>
          <div className="section-kicker" style={{ marginBottom: "6px" }}>
            <span>Get in touch</span> Contact Us
          </div>
          <h2 style={{ fontSize: "22px", margin: "4px 0 8px", letterSpacing: "-0.03em" }}>
            Have questions, feedback, or collaboration ideas?
          </h2>
          <p style={{ margin: 0, fontSize: "12.5px", color: "var(--muted)", lineHeight: 1.65 }}>
            Reach out to our team anytime at{" "}
            <a
              href="mailto:info@projectiris.earth"
              style={{ color: "var(--accent, var(--green))", fontWeight: 600 }}
            >
              info@projectiris.earth
            </a>{" "}
            for questions about the platform, data sources, or research collaborations.
          </p>
        </div>
        <div>
          <a className="primary-page-button" href="mailto:info@projectiris.earth">
            Contact Us · info@projectiris.earth <Icon name="arrow" size={15} />
          </a>
        </div>
      </section>

      {/* ─── 6. BOTTOM CTA BANNER ────────────────────────────────────── */}
      <section className="about-cta">
        <div>
          <span>Ready to investigate?</span>
          <h2>Follow a signal. Test a hypothesis. Share the evidence.</h2>
        </div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", zIndex: 1 }}>
          <a className="light-page-button" href="mailto:info@projectiris.earth">
            Contact us <Icon name="external" size={15} />
          </a>
          <Link className="light-page-button" href="/workspace">
            Open the workbench <Icon name="arrow" size={16} />
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
