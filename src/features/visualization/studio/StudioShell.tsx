"use client";
// Studio shell: compact toolbar + dockview desktop layout + deliberate mobile
// tabbed fallback. Layout preferences persist under a versioned key and recover
// safely from corrupt/unsupported/removed-panel state.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DockviewReact, type DockviewReadyEvent, type DockviewApi, type IDockviewPanelProps } from "dockview-react";
import "dockview-react/dist/styles/dockview.css";
import { Icon } from "@/components/ui/Icon";
import { useTheme } from "@/context/ThemeContext";
import { DEFAULT_PRESET, PANEL_DEFS, PRESETS, presetLayout, type PanelId } from "./presets";
import { clearPrefs, layoutPanels, loadPrefs, savePrefs, type StudioPrefs } from "./layoutPersistence";
import { ComparisonPanel, MapPanel, ObservationTablePanel, OutlookPanel, RelationshipPanel, SeasonalPanel, SourceInspectorPanel, TimeSeriesPanel } from "./panels";
import { useStudio } from "./state";

export const PANEL_COMPONENTS: Record<PanelId, React.FC<IDockviewPanelProps>> = {
    timeseries: TimeSeriesPanel,
    seasonal: SeasonalPanel,
    relationship: RelationshipPanel,
    table: ObservationTablePanel,
    source: SourceInspectorPanel,
    map: MapPanel,
    comparison: ComparisonPanel,
    outlook: OutlookPanel,
};

const MOBILE_ORDER: PanelId[] = ['timeseries', 'map', 'seasonal', 'relationship', 'table', 'comparison', 'source', 'outlook'];
const narrow = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches;

export function StudioShell({ children }: { children?: React.ReactNode }) {
    const studio = useStudio();
    const { dark } = useTheme();
    const api = useRef<DockviewApi | null>(null);
    const saveTimer = useRef<number | undefined>(undefined);
    const applying = useRef(false);
    const [prefs, setPrefs] = useState<StudioPrefs>(() => loadPrefs().prefs);
    const [mobile, setMobile] = useState(false);
    const [mobilePanel, setMobilePanel] = useState<PanelId>('timeseries');
    const [closed, setClosed] = useState<PanelId[]>(prefs.hidden);
    const [reopenId, setReopenId] = useState('');
    const [layoutNote, setLayoutNote] = useState('');
    const focus = studio.focus, setFocus = studio.setFocus;
    useEffect(() => { if (prefs.focus) setFocus(true); // restore persisted focus once
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const mq = window.matchMedia('(max-width: 900px)');
        const update = () => setMobile(mq.matches);
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, []);

    const scheduleSave = useCallback(() => {
        window.clearTimeout(saveTimer.current);
        saveTimer.current = window.setTimeout(() => {
            if (!api.current) return;
            savePrefs({ ...prefs, layout: api.current.toJSON(), hidden: closed, focus });
        }, 600);
    }, [prefs, closed, focus]);
    useEffect(() => () => window.clearTimeout(saveTimer.current), []);

    const applyPreset = useCallback((id: string) => {
        const preset = PRESETS.find(p => p.id === id) ?? PRESETS[0];
        if (!api.current) return;
        applying.current = true;
        try {
            api.current.clear();
            api.current.fromJSON(presetLayout(preset) as Parameters<DockviewApi['fromJSON']>[0]);
            setClosed([]);
            setPrefs(p => ({ ...p, preset: preset.id, layout: null }));
            setLayoutNote('');
        } catch {
            // Serialized layout invalid — fall back to the default preset.
            try { api.current.clear(); api.current.fromJSON(presetLayout(PRESETS[0]) as Parameters<DockviewApi['fromJSON']>[0]); } catch { /* dock unavailable */ }
            setLayoutNote('The stored arrangement could not be applied; the default preset was restored.');
        } finally { applying.current = false; }
    }, []);

    const onReady = useCallback((event: DockviewReadyEvent) => {
        api.current = event.api;
        applying.current = true;
        try {
            const stored = loadPrefs();
            let applied = false;
            if (stored.recovered === 'corrupt') setLayoutNote('Saved layout preferences were unreadable; defaults restored.');
            else if (stored.recovered === 'version') setLayoutNote('Saved layout version is no longer supported; defaults restored.');
            if (stored.prefs.layout) {
                const ids = layoutPanels(stored.prefs.layout);
                if (ids.length && ids.every(id => (PANEL_DEFS.some(d => d.id === id)))) {
                    try { event.api.fromJSON(stored.prefs.layout as Parameters<DockviewApi['fromJSON']>[0]); applied = true; setClosed(stored.prefs.hidden); }
                    catch { applied = false; }
                }
                if (!applied) setLayoutNote('A saved layout referenced removed panels; the preset was restored.');
            }
            if (!applied) event.api.fromJSON(presetLayout(PRESETS.find(p => p.id === stored.prefs.preset) ?? PRESETS[0]) as Parameters<DockviewApi['fromJSON']>[0]);
        } finally { applying.current = false; }
        event.api.onDidLayoutChange(() => { if (!applying.current) scheduleSave(); });
        event.api.onDidRemovePanel(panel => { const id = panel.id as PanelId; setClosed(c => c.includes(id) ? c : [...c, id]); });
        event.api.onDidAddPanel(panel => { const id = panel.id as PanelId; setClosed(c => c.filter(x => x !== id)); });
    }, [scheduleSave]);

    const reopen = (id: PanelId) => {
        if (!api.current || !PANEL_DEFS.some(d => d.id === id)) return;
        const def = PANEL_DEFS.find(d => d.id === id)!;
        api.current.addPanel({ id, component: id, title: def.title });
    };
    const resetWorkspace = () => { clearPrefs(); applyPreset(DEFAULT_PRESET); setFocus(false); setPrefs({ version: 1, preset: DEFAULT_PRESET, layout: null, hidden: [], focus: false, savedAt: '' }); };
    const maximize = () => { const panel = api.current?.activePanel; if (panel) panel.api.maximize(); };

    const ActiveMobile = PANEL_COMPONENTS[mobilePanel];

    return <div className="viz-studio">
        <div className="viz-studio-toolbar" role="toolbar" aria-label="Studio controls">
            {children}
            <span className="viz-studio-group">
                <label className="viz-studio-field">Preset
                    <select value={prefs.preset} onChange={e => applyPreset(e.target.value)} disabled={mobile}>
                        {PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                </label>
                <button className="viz-button" onClick={maximize} disabled={mobile} title="Maximize the active panel (drag its tab to restore)">Maximize</button>
                <button className="viz-button" aria-pressed={focus} onClick={() => setFocus(!focus)}>{focus ? 'Exit focus' : 'Focus'}</button>
                <button className="viz-button" onClick={resetWorkspace}>Reset workspace</button>
            </span>
            <span className="viz-studio-group">
                <label className="viz-studio-field">Open panel
                    <select value={reopenId} onChange={e => setReopenId(e.target.value)} disabled={mobile || !closed.length}>
                        <option value="">{closed.length ? 'Choose…' : 'All panels open'}</option>
                        {closed.map(id => <option key={id} value={id}>{PANEL_DEFS.find(d => d.id === id)?.title}</option>)}
                    </select>
                </label>
                <button className="viz-button" disabled={!reopenId || mobile} onClick={() => { reopen(reopenId as PanelId); setReopenId(''); }}>Reopen</button>
            </span>
            {layoutNote && <span className="viz-notice" role="status">{layoutNote}</span>}
        </div>
        {mobile
            ? <div className="viz-studio-mobile">
                <label className="viz-studio-field">Panel
                    <select value={mobilePanel} onChange={e => setMobilePanel(e.target.value as PanelId)}>
                        {MOBILE_ORDER.map(id => <option key={id} value={id}>{PANEL_DEFS.find(d => d.id === id)?.title}</option>)}
                    </select>
                </label>
                <p className="viz-muted">Tabbed studio — dock layout returns on wider screens.</p>
                <div className="viz-studio-mobile-stage"><ActiveMobile api={undefined as never} containerApi={undefined as never} params={{}} /></div>
            </div>
            : <div className={`viz-studio-dock ${dark ? 'dockview-theme-dark' : 'dockview-theme-light'}`}>
                <DockviewReact components={PANEL_COMPONENTS} onReady={onReady} disableFloatingGroups popoutUrl="/about:blank" className="viz-dockview"/>
            </div>}
    </div>;
}
