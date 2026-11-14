import Link from 'next/link';
import { PageShell } from '../../components/layout/PageShell';
import { InfoCard } from '../../components/layout/InfoCard';

/** Navida's platform workflow/card composition, with current and planned scope explicit. */
export default function PlatformPage() {
  return <PageShell section="The platform" title="One workspace for the investigation"
    description="Follow a question through its source, observations, analysis and interpretation. Scientific analysis is still being connected."
    action={<Link className="primary-button" href="/workspace">Open the workbench</Link>}>
    <section className="public-section"><p className="eyebrow">THE WORKFLOW</p><h2>From a question to a defensible answer</h2>
      <div className="values-grid"><InfoCard icon="search" number="01" title="Define an investigation" text="Available now: browse the planned variable list, inspect source details and choose your explanation level." />
        <InfoCard icon="layers" number="02" title="Build the evidence trail" text="Planned: validated NASA series with product versions, units, QA, spatial weights and source provenance." />
        <InfoCard icon="activity" number="03" title="Interrogate the signal" text="Planned: reviewed trend estimates, significance tests, uncertainty and seasonal views. No results are generated here." />
        <InfoCard icon="book" number="04" title="Understand the limits" text="Available now: explanations of evidence and uncertainty. Scientific release and validation reports will be linked when accepted." /></div>
    </section>
    <section className="evidence-strip"><div><h2>Every number needs an evidence trail.</h2><p>Global layers, regional analyses and forecasts stay unavailable until their data and methods pass review.</p></div>
      <Link className="secondary-button" href="/methodology">Read the approach</Link></section>
  </PageShell>;
}
