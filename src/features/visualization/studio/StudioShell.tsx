"use client";
// One studio arrangement, with resizable/dockable views and a mobile selector.
// Views stay available without workspace-management controls or closable tabs.
import { useCallback, useEffect, useRef, useState } from 'react';
import { DockviewDefaultTab, DockviewReact, themeDark, themeLight, type DockviewReadyEvent, type DockviewApi, type IDockviewPanelHeaderProps, type IDockviewPanelProps } from 'dockview-react';
import 'dockview-react/dist/styles/dockview.css';
import { useStudioTheme } from './display';
import { LandscapePanel, LinkedHeatmapPanel } from './LandscapePanel';
import { EvidencePanel, TrendIntervalsPanel } from './EvidencePanel';
import { PANEL_DEFS, PRESETS, presetLayout, type PanelId } from './presets';
import { defaultPrefs, loadPrefs, savePrefs } from './layoutPersistence';
import { RelationshipPanel, SeasonalPanel, SourceInspectorPanel, TimeSeriesPanel } from './panels';

export const PANEL_COMPONENTS: Record<PanelId, React.FC<IDockviewPanelProps>> = {
    landscape: LandscapePanel,
    heatmap: LinkedHeatmapPanel,
    evidence: EvidencePanel,
    rates: TrendIntervalsPanel,
    timeseries: TimeSeriesPanel,
    seasonal: SeasonalPanel,
    relationship: RelationshipPanel,
    source: SourceInspectorPanel,
};
const MOBILE_ORDER: PanelId[] = ['landscape', 'timeseries', 'heatmap', 'evidence', 'rates', 'seasonal', 'relationship', 'source'];
const keepPanelOpen = () => {};
function StudioTab(props: IDockviewPanelHeaderProps) {
    return <DockviewDefaultTab {...props} hideClose closeActionOverride={keepPanelOpen} onDoubleClick={event => event.stopPropagation()}/>;
}

export function StudioShell({ children }: { children?: React.ReactNode }) {
    const { dark } = useStudioTheme();
    const api = useRef<DockviewApi | null>(null);
    const saveTimer = useRef<number | undefined>(undefined);
    const layoutSubscription = useRef<{ dispose(): void } | null>(null);
    const [mobile, setMobile] = useState(false);
    const [mobilePanel, setMobilePanel] = useState<PanelId>('landscape');
    const [layoutNote, setLayoutNote] = useState('');

    const detachLayout = useCallback(() => {
        layoutSubscription.current?.dispose();
        layoutSubscription.current = null;
        window.clearTimeout(saveTimer.current);
        api.current = null;
    }, []);

    useEffect(() => {
        const mq = window.matchMedia('(max-width: 900px)');
        const update = () => { if (mq.matches) detachLayout(); setMobile(mq.matches); };
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, [detachLayout]);
    useEffect(() => detachLayout, [detachLayout]);

    const onReady = useCallback((event: DockviewReadyEvent) => {
        detachLayout();
        api.current = event.api;
        const stored = loadPrefs();
        const initial = presetLayout(PRESETS[0]) as Parameters<DockviewApi['fromJSON']>[0];
        try {
            event.api.fromJSON((stored.prefs.layout ?? initial) as Parameters<DockviewApi['fromJSON']>[0]);
        } catch {
            event.api.clear();
            event.api.fromJSON(initial);
            setLayoutNote('The saved view could not be restored. The default arrangement is ready.');
        }
        if (stored.recovered === 'corrupt') setLayoutNote('The saved view could not be restored. The default arrangement is ready.');
        layoutSubscription.current = event.api.onDidLayoutChange(() => {
            window.clearTimeout(saveTimer.current);
            saveTimer.current = window.setTimeout(() => {
                if (api.current === event.api) savePrefs({ ...defaultPrefs(), layout: event.api.toJSON() });
            }, 600);
        });
    }, [detachLayout]);
    const ActiveMobile = PANEL_COMPONENTS[mobilePanel];

    return <div className="viz-studio">
        <div className="viz-studio-toolbar" role="toolbar" aria-label="Studio controls">
            {children}
            {layoutNote && <span className="viz-notice" role="status">{layoutNote}</span>}
        </div>
        {mobile ? <div className="viz-studio-mobile">
            <label className="viz-studio-field">View
                <select aria-label="Panel" value={mobilePanel} onChange={event => setMobilePanel(event.target.value as PanelId)}>
                    {MOBILE_ORDER.map(id => <option key={id} value={id}>{PANEL_DEFS.find(panel => panel.id === id)?.title}</option>)}
                </select>
            </label>
            <div className="viz-studio-mobile-stage"><ActiveMobile api={undefined as never} containerApi={undefined as never} params={{}}/></div>
        </div> : <div className={`viz-studio-dock ${dark ? 'dockview-theme-dark' : 'dockview-theme-light'}`}>
            <DockviewReact components={PANEL_COMPONENTS} defaultTabComponent={StudioTab} theme={dark ? themeDark : themeLight} onReady={onReady} disableFloatingGroups getTabContextMenuItems={() => []} getTabGroupChipContextMenuItems={() => []} className="viz-dockview"/>
        </div>}
    </div>;
}
