'use client';

import { Icon } from '../../components/ui/Icon';
import { usePreferences } from '../../state/preferences';

const copy = {
  explorer: ['A trend describes a pattern of change over time.', 'Missing observations are gaps in the evidence, not zero measurements.', 'A significant trend does not tell us what caused the change.'],
  student: ['Slope measures a rate of change. A p-value describes evidence under a test’s null hypothesis, not the chance that a hypothesis is true.', 'Uncertainty intervals and seasonal structure matter. Testing many variables requires a multiple-testing correction.', 'No forecast is shown without a skill check against appropriate baselines.'],
  scientist: ['The approved pipeline separates raw reference OLS, Hamed–Rao Mann–Kendall and effective-sample-size OLS inference.', 'Gap-aware autocorrelation, corrected Sen intervals, complete-family FDR and empirical calibration remain scientific release gates.', 'Source hashes, product versions, transforms, masks, QA policies and method versions must reconstruct every numeric result.'],
};

export function EvidencePage() {
  const { level } = usePreferences();
  return <><div className="page-heading"><p className="eyebrow">EVIDENCE & METHODS</p><h1>Keep the evidence attached.</h1>
    <p>Every result should explain where it came from, how it was calculated and where its limits lie.</p></div>
    <div className="principles-grid">{copy[level].map((text, index) => <article className="principle-card" key={text}>
      <div><Icon name={index === 0 ? 'activity' : index === 1 ? 'layers' : 'info'} size={22} /><span>0{index + 1}</span></div>
      <h2>{['Read the signal', 'Inspect the uncertainty', 'Respect the limits'][index]}</h2><p>{text}</p></article>)}</div>
    <section className="evidence-details"><h2>Current scientific availability</h2><p>No scientific analysis or forecast is available in this workspace. Provider-access probes establish access to small source samples; they do not certify trends, complete coverage or a production data release.</p>
      <h2>Sources and interpretation</h2><p>NASA products are observations or model outputs with specific versions, units and sampling conventions. A region’s trend must be calculated from its area-weighted series, not by averaging cell trends or p-values.</p>
      <h2>AI disclosure</h2><p>AI coding assistance was used in development. Product SI is off. Browsing a planned variable and the rule-based Ask the Detective flow send no query to an AI service, and it suggests only from the approved list. Statistical computation remains a separately validated backend responsibility.</p>
      <h2>Contribution credit</h2><p>Workspace navigation, icon components, onboarding, theme and data-inspection patterns were adapted from Navida Jayaweera’s Project Iris contribution. Scientific data and method claims from that prototype have not been adopted.</p>
      <h2>Browser-compatibility data credit</h2><p>Next.js includes unmodified <a href="https://github.com/browserslist/caniuse-lite">caniuse-lite browser-compatibility data</a> (package author Ben Briggs; upstream <a href="https://caniuse.com/">Can I Use</a> contributors), licensed under <a href="https://creativecommons.org/licenses/by/4.0/">CC-BY-4.0</a>. The team approved this named ancillary-data exception; software libraries still require OSI-approved licences. A full licence copy is retained in the repository inventory.</p>
    </section>
  </>;
}
