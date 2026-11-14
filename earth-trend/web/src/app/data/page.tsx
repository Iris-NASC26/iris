import Link from 'next/link';
import { PageShell } from '../../components/layout/PageShell';
import { plannedCatalog } from '../../features/catalog/plannedCatalog';

export default function DataSourcesPage() {
  return <PageShell section="Our data" title="Start with a known source."
    description="These are the approved NASA variable targets. A catalog entry identifies a planned source, not an installed or analysis-ready dataset."
    action={<Link className="primary-button" href="/workspace/data-selection">Browse in the workspace</Link>}>
    <section className="variable-grid public-variable-grid" aria-label="Planned NASA sources">{plannedCatalog.map(item =>
      <article className="variable-card" key={item.id}><span className="variable-id">{item.id} / {item.theme}</span><h2>{item.name}</h2>
        <p className="variable-summary">{item.definition}</p><p className="small-label">{item.product} · {item.units}</p>
        <Link className="text-button" href={`/workspace/data-selection?variable=${item.id}`}>Inspect planned source →</Link></article>)}</section>
  </PageShell>;
}
