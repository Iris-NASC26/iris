"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { PageShell } from "@/components/layout/PageShell";
import { InfoCard } from "@/components/layout/InfoCard";

export default function AboutPage() {
  return (
    <PageShell
      action={
        <Link className="primary-page-button" href="/case-studies">
          Explore the evidence <Icon name="arrow" size={16} />
        </Link>
      }
      description="Iris makes rigorous Earth system trend analysis understandable, inspectable, and useful beyond specialist research teams."
      section="Our mission"
      title="Better climate conversations start with better evidence"
    >
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
            <span>Why Iris</span> Signal over noise
          </div>
          <h2>Earth data is abundant. Clear answers are not.</h2>
          <p>
            Thousands of public datasets describe a planet in motion, but converting those
            observations into a defensible answer still demands specialist tools and statistical
            knowledge.
          </p>
          <p>
            Iris closes that gap. It combines trusted data, robust statistics, and plain language so
            more people can investigate environmental change without hiding the scientific process.
          </p>
        </div>
      </section>

      <section className="values-section">
        <div className="values-heading">
          <div className="section-kicker">
            <span>Principles</span> How we work
          </div>
          <h2>Clarity without oversimplification</h2>
        </div>
        <div className="values-grid">
          <InfoCard
            icon="search"
            number="01"
            title="Show the evidence"
            text="Every verdict exposes its source data, transformation choices, uncertainty, and limitations."
          />
          <InfoCard
            icon="book"
            number="02"
            title="Explain, don’t obscure"
            text="Plain language can make rigorous science accessible without flattening nuance."
          />
          <InfoCard
            icon="check"
            number="03"
            title="Respect uncertainty"
            text="An inconclusive result is useful. We never force a dramatic story from a weak signal."
          />
          <InfoCard
            icon="globe"
            number="04"
            title="Build in the open"
            text="Public Earth observations should become public understanding and better local decisions."
          />
        </div>
      </section>

      <section className="audience-section">
        <div className="audience-copy">
          <div className="section-kicker">
            <span>Built for inquiry</span> Who it serves
          </div>
          <h2>One workbench, many investigators</h2>
          <p>
            Iris supports early exploration and communication. It complements—not replaces—domain
            expertise and peer-reviewed research.
          </p>
        </div>
        <div className="audience-list">
          <div>
            <span>01</span>
            <strong>Researchers & students</strong>
            <p>Rapidly inspect signals before deeper analysis.</p>
          </div>
          <div>
            <span>02</span>
            <strong>Journalists & communicators</strong>
            <p>Ground local climate stories in traceable evidence.</p>
          </div>
          <div>
            <span>03</span>
            <strong>Planners & communities</strong>
            <p>Understand how environmental conditions are changing.</p>
          </div>
        </div>
      </section>

      <section className="about-cta">
        <div>
          <span>Ready to investigate?</span>
          <h2>Follow a signal. Test a hypothesis. Share the evidence.</h2>
        </div>
        <Link className="light-page-button" href="/workspace">
          Open the workbench <Icon name="arrow" size={16} />
        </Link>
      </section>
    </PageShell>
  );
}
