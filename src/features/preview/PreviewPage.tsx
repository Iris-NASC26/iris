'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Icon } from '../../components/ui/Icon';
import { isConnected } from '../../data/series';
import { findPlannedVariable } from '../catalog/plannedCatalog';
import { SeriesView } from './SeriesView';

export function PreviewPage() {
  const params = useSearchParams();
  const selected = findPlannedVariable(params.get('variable') ?? 'V01');
  return <><div className="page-heading"><p className="eyebrow">02 / DATA PREVIEW</p><h2>Inspect before you interpret.</h2>
    <p>Source identity, units, missing observations and regional coverage belong beside every series.</p></div>
    {params.has('variable') && !selected ? <div className="empty-panel"><h2>Unknown variable</h2><p>Select a variable from the approved list.</p>
      <Link className="primary-button" href="/workspace/data-selection">Browse variables</Link></div> : <>
      {selected && <div className="preview-source"><span className="icon-tile"><Icon name="layers" size={25} /></span>
        <div><p className="eyebrow">{isConnected(selected.id) ? 'CONNECTED SOURCE' : 'PLANNED SOURCE'} / {selected.id}</p><h2>{selected.name}</h2><p>{selected.product} · Display units: {selected.units}</p></div>
        <span className="availability-badge">{isConnected(selected.id) ? 'Connected · NASA POWER' : 'Not installed'}</span></div>}
      {selected && isConnected(selected.id) ? <SeriesView key={selected.id} variable={selected} /> : <>
      <div className="preview-checklist" aria-label="Data inspection checklist">{['Source & provenance', 'Units & timestamps', 'Coverage & QA'].map(text =>
        <div key={text}><Icon name="info" size={18} /><strong>{text}</strong><span>Awaiting validated series</span></div>)}</div>
      <section className="empty-panel"><span className="large-icon"><Icon name="layers" size={43} /></span><h2>No observations loaded</h2>
        <p>This source has not been connected to the workspace yet. A preview will appear when an authentic series and its provenance are available.</p>
        <Link className="primary-button" href={selected ? `/workspace/data-selection?variable=${selected.id}` : '/workspace/data-selection'}>Back to data selection <Icon name="arrow" size={16} /></Link>
      </section></>}
    </>}
  </>;
}
