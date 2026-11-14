"use client";
import Link from 'next/link';
import { PageShell } from '@/components/layout/PageShell';
import { plannedCatalog } from '@/features/catalog/plannedCatalog';
export default function DataPage() {
 return <PageShell section="Data" title="Our planned NASA sources" description="Source descriptions are not certificates of data admission. Raw previews are currently connected for V01 and V12 only.">
 <section className="earth-data-feature principles-grid" aria-label="Planned NASA sources">{plannedCatalog.map(item=><article className="principle-card" key={item.id}><h2>{item.id}: {item.name}</h2><p>{item.product}</p><p>Intended display units: {item.units}</p><p>{item.caution}</p><Link href={`/workspace/data-selection?variable=${item.id}`}>Inspect {item.id}</Link></article>)}</section></PageShell>;
}
