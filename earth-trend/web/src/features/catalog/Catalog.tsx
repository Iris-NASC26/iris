'use client';

/** Variable cards and selection flow adapted from Navida's data-selection workbench. */
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { isConnected } from '../../data/series';
import { Icon } from '../../components/ui/Icon';
import { usePreferences } from '../../state/preferences';
import { findPlannedVariable, plannedCatalog } from './plannedCatalog';

export function Catalog() {
  const { level } = usePreferences();
  const params = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [theme, setTheme] = useState('All themes');
  const selected = findPlannedVariable(params.get('variable'));
  const needle = query.trim().toLowerCase();
  const filtered = plannedCatalog.filter(item => (theme === 'All themes' || item.theme === theme) &&
    `${item.name} ${item.id} ${item.product} ${item.field}`.toLowerCase().includes(needle));
  return <>
    <div className="page-heading"><p className="eyebrow">01 / DATA SELECTION</p><h1>What are you curious about?</h1>
      <p>Browse the approved variable list. Variables marked Preview available can show a real NASA POWER series; none is ready for analysis yet.</p></div>
    <div className="catalog-toolbar"><label className="search-field"><Icon name="search" size={18} /><span className="sr-only">Search variables</span>
      <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search a variable, product or field…" /></label>
      <label className="filter-field">Theme<select value={theme} onChange={event => setTheme(event.target.value)}>
        <option>All themes</option>{[...new Set(plannedCatalog.map(item => item.theme))].map(item => <option key={item}>{item}</option>)}
      </select></label></div>
    <div className="catalog-layout"><section aria-label="Planned variables"><p className="small-label">{filtered.length} variables · Planned sources</p>
      {filtered.length === 0 && <div className="empty-panel"><h2>No matching variables</h2><p>Try another theme or search term.</p>
        <button className="secondary-button" onClick={() => { setQuery(''); setTheme('All themes'); }}>Clear filters</button></div>}
      <div className="variable-grid">{filtered.map(item => <button className={`variable-card${selected?.id === item.id ? ' selected' : ''}`}
        key={item.id} aria-pressed={selected?.id === item.id} onClick={() => router.replace(`/workspace/data-selection?variable=${item.id}`, { scroll: false })}>
        <span className="card-top"><span className="variable-id">{item.id} / {item.theme}</span><Icon name="arrow" size={17} /></span>
        <strong>{item.name}</strong><span className="variable-summary">{level === 'explorer' ? item.summary : item.definition}</span>
        <span className="variable-meta">{item.units} <span>· {item.regionalOnly ? 'Regional only' : 'Global cube planned'}</span></span>
      </button>)}</div>
    </section><aside className="selection-panel" aria-label="Selected variable">
      {selected ? <><p className="eyebrow">VARIABLE FLASHCARD / {selected.id}</p><h2>{selected.name}</h2>
        <span className="availability-badge">{isConnected(selected.id) ? 'Preview available' : 'Not installed'}</span><p>{level === 'explorer' ? selected.summary : selected.definition}</p>
        <dl><dt>Intended NASA source</dt><dd>{selected.product}</dd><dt>Display units</dt><dd>{selected.units}</dd>
          <dt>Scope</dt><dd>{selected.regionalOnly ? 'Regional presets; no globe layer' : 'Global cube and regional analysis'}</dd>
          {level === 'scientist' && <><dt>Target field</dt><dd><code>{selected.field}</code></dd></>}</dl>
        {level !== 'explorer' && <div className="caution-note"><Icon name="info" size={17} /><p>{selected.caution}</p></div>}
        <Link className="primary-button" href={`/workspace/data-preview?variable=${selected.id}`}>Open data preview <Icon name="arrow" size={16} /></Link>
        <p className="small-label">Opening preview makes no provider request.</p>
      </> : <><span className="large-icon"><Icon name="layers" size={35} /></span><h2>{params.has('variable') ? 'Unknown variable' : 'Pick a clue to inspect'}</h2>
        <p>{params.has('variable') ? 'The requested variable is outside the approved list. Choose a listed variable.' : 'Select a variable to inspect its intended source, units and scope.'}</p></>}
    </aside></div>
  </>;
}
