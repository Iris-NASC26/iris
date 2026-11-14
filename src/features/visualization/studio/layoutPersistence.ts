// Versioned studio preference record. Stores presentation state only — never
// observations, analysis payloads, or renderer instances.
import { DEFAULT_PRESET, PANEL_IDS, PRESETS, type PanelId } from './presets';

export const STORAGE_KEY = 'iris.studio.layout.v3';
const LEGACY_STORAGE_KEY = 'iris.studio.layout.v2';
export const LAYOUT_VERSION = 3;

export interface StudioPrefs {
    version: number;
    preset: string;
    layout: unknown | null; // serialized dockview grid
    hidden: PanelId[]; // user-closed panels to reopen on demand
    focus: boolean;
    savedAt: string;
}

export const defaultPrefs = (): StudioPrefs => ({ version: LAYOUT_VERSION, preset: DEFAULT_PRESET, layout: null, hidden: [], focus: false, savedAt: '' });

const validPanel = (v: unknown): v is PanelId => typeof v === 'string' && (PANEL_IDS as string[]).includes(v);

export function parsePrefs(raw: string | null): { prefs: StudioPrefs; recovered: 'empty' | 'ok' | 'corrupt' | 'version' } {
    if (!raw) return { prefs: defaultPrefs(), recovered: 'empty' };
    try {
        const value = JSON.parse(raw) as Partial<StudioPrefs>;
        if (!value || typeof value !== 'object') return { prefs: defaultPrefs(), recovered: 'corrupt' };
        if (value.version !== LAYOUT_VERSION) return { prefs: defaultPrefs(), recovered: 'version' };
        const candidate = value.layout as { grid?: unknown; panels?: Record<string, { id?: unknown; contentComponent?: unknown }> } | null;
        const knownLayout = candidate && typeof candidate === 'object' && candidate.grid && candidate.panels
            && Object.entries(candidate.panels).every(([id, panel]) => validPanel(id) && panel?.id === id && panel.contentComponent === id);
        return {
            prefs: {
                version: LAYOUT_VERSION,
                preset: typeof value.preset === 'string' && PRESETS.some(p => p.id === value.preset) ? value.preset : DEFAULT_PRESET,
                layout: knownLayout ? value.layout : null,
                hidden: Array.isArray(value.hidden) ? value.hidden.filter(validPanel) : [],
                focus: value.focus === true,
                savedAt: typeof value.savedAt === 'string' ? value.savedAt : '',
            },
            recovered: 'ok',
        };
    } catch {
        return { prefs: defaultPrefs(), recovered: 'corrupt' };
    }
}

export function loadPrefs(storage?: Pick<Storage, 'getItem'>): { prefs: StudioPrefs; recovered: string; denied: boolean } {
    try {
        if (!storage && typeof window === 'undefined') return { prefs: defaultPrefs(), recovered: 'empty', denied: false };
        const target = storage ?? window.localStorage;
        const result = parsePrefs(target.getItem(STORAGE_KEY) ?? target.getItem(LEGACY_STORAGE_KEY) ?? target.getItem('iris.studio.layout.v1'));
        return { ...result, denied: false };
    } catch {
        return { prefs: defaultPrefs(), recovered: 'denied', denied: true };
    }
}

export function savePrefs(prefs: StudioPrefs, storage?: Pick<Storage, 'setItem'>): boolean {
    try {
        if (!storage && typeof window === 'undefined') return false;
        (storage ?? window.localStorage).setItem(STORAGE_KEY, JSON.stringify({ ...prefs, savedAt: new Date().toISOString() }));
        return true;
    } catch {
        return false;
    }
}

export function clearPrefs(storage?: Pick<Storage, 'removeItem'>): void {
    try {
        if (!storage && typeof window === 'undefined') return;
        const target = storage ?? window.localStorage;
        target.removeItem(STORAGE_KEY); target.removeItem(LEGACY_STORAGE_KEY); target.removeItem('iris.studio.layout.v1');
    } catch { /* storage denied */ }
}

// Panels present in a restored layout — used to drop references to removed ids.
export function layoutPanels(layout: unknown): PanelId[] {
    const panels = (layout as { panels?: Record<string, { id?: string }> } | null)?.panels;
    if (!panels || typeof panels !== 'object') return [];
    return Object.values(panels).map(p => p?.id).filter(validPanel);
}
