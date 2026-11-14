// Curated studio arrangements. Layouts are plain serialized-dockview trees so
// they can be persisted, validated, and restored without a live DockviewApi.
export type PanelId = 'timeseries' | 'seasonal' | 'relationship' | 'table' | 'source' | 'comparison' | 'outlook';
export interface PanelDef {
    id: PanelId;
    title: string;
}
export const PANEL_DEFS: PanelDef[] = [
    { id: 'timeseries', title: 'Time series' },
    { id: 'seasonal', title: 'Seasonal cycles' },
    { id: 'relationship', title: 'Relationship' },
    { id: 'table', title: 'Observations' },
    { id: 'source', title: 'Source & selection' },
    { id: 'comparison', title: 'Compare' },
    { id: 'outlook', title: 'Outlook' },
];
export const PANEL_IDS = PANEL_DEFS.map(p => p.id);

type Node = { type: 'leaf'; size: number; views: PanelId[] } | { type: 'split'; size?: number; direction: 'row' | 'column'; children: Node[] };
const leaf = (size: number, ...views: PanelId[]): Node => ({ type: 'leaf', size, views });
const row = (...children: Node[]): Node => ({ type: 'split', direction: 'row', children });
const col = (...children: Node[]): Node => ({ type: 'split', direction: 'column', children });

export interface Preset {
    id: string;
    label: string;
    hint: string;
    root: Node;
}
export const PRESETS: Preset[] = [
    { id: 'explore', label: 'Explore', hint: 'Time series with a supporting seasonal heatmap and a compact source inspector.', root: row(leaf(68, 'timeseries'), col(leaf(58, 'seasonal'), leaf(42, 'source'))) },
    { id: 'compare', label: 'Compare', hint: 'Coordinated series, an aligned-pair relationship view, and a comparison summary.', root: row(col(leaf(62, 'timeseries'), leaf(38, 'comparison')), col(leaf(60, 'relationship'), leaf(40, 'source'))) },
    { id: 'seasonal', label: 'Seasonal', hint: 'Year-by-month heatmap with the seasonal profile and the full record alongside.', root: row(leaf(62, 'seasonal'), col(leaf(55, 'timeseries'), leaf(45, 'source'))) },
    { id: 'outlook', label: 'Outlook', hint: 'Historical observations next to the submitted scientific outlook.', root: row(leaf(58, 'timeseries'), col(leaf(58, 'outlook'), leaf(42, 'source'))) },
];
export const DEFAULT_PRESET = PRESETS[0].id;

// Serialize a preset tree into a dockview SerializedDockview-like object. We
// build it structurally rather than importing the serialized types so the file
// stays usable in plain node unit tests.
export function presetLayout(preset: Preset, panelsInOrder: PanelId[] = PANEL_IDS): unknown {
    const panels: Record<string, { id: string; contentComponent: string; title: string }> = {};
    let group = 0;
    const used = new Set<PanelId>();
    const node = (n: Node): Record<string, unknown> => {
        if (n.type === 'leaf') {
            const views = n.views.filter(v => panelsInOrder.includes(v));
            views.forEach(v => used.add(v));
            const id = `g${++group}`;
            views.forEach(v => { const def = PANEL_DEFS.find(d => d.id === v)!; panels[v] = { id: v, contentComponent: v, title: def.title }; });
            return { type: 'leaf', size: n.size * 10, data: { views, activeView: views[0], id } };
        }
        return { type: 'branch', data: n.children.map(node) };
    };
    const root = node(preset.root);
    // Panels not placed by the preset are appended as tabs on the first group.
    const missing = panelsInOrder.filter(id => !used.has(id));
    const data = (root.data as Record<string, unknown>[]);
    const firstLeaf = findLeaf(data[0]);
    if (firstLeaf && missing.length) {
        const views = (firstLeaf.data as { views: string[] }).views;
        missing.forEach(v => { const def = PANEL_DEFS.find(d => d.id === v)!; panels[v] = { id: v, contentComponent: v, title: def.title }; views.push(v); });
    }
    return { grid: { root, width: 1200, height: 700, orientation: 'HORIZONTAL' }, panels, activeGroup: 'g1', floatingGroups: [] };
}
function findLeaf(n: Record<string, unknown>): Record<string, unknown> | null {
    if (n.type === 'leaf') return n;
    for (const child of (n.data as Record<string, unknown>[]) ?? []) { const found = findLeaf(child); if (found) return found; }
    return null;
}
