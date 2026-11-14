"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useTheme } from '@/context/ThemeContext';
import type { Quantity } from '../landscape/model';

export interface DisplayPrefs {
    dark: boolean; representation: 'surface' | 'columns' | 'heatmap'; quantity: Quantity;
    palette: 'earth' | 'ocean' | 'ember'; projection: 'perspective' | 'orthographic';
    height: number; wireframe: boolean;
}
export const DISPLAY_KEY = 'iris.studio.display.v1';
export const DEFAULT_DISPLAY: DisplayPrefs = { dark: true, representation: 'surface', quantity: 'observed', palette: 'earth', projection: 'perspective', height: 45, wireframe: false };
export const PALETTES = {
    earth: ['#4c82c3', '#61b9ba', '#d3ddbf', '#e5ab74', '#cb705e'],
    ocean: ['#203b77', '#3a83b7', '#6cdbcb', '#d8f5ce'],
    ember: ['#442475', '#a25a91', '#eea16a', '#f7e6ac'],
};
export function parseDisplay(value: unknown): DisplayPrefs {
    const p = (value && typeof value === 'object' ? value : {}) as Partial<DisplayPrefs>;
    return {
        dark: typeof p.dark === 'boolean' ? p.dark : true,
        representation: ['surface', 'columns', 'heatmap'].includes(p.representation ?? '') ? p.representation! : 'surface',
        quantity: ['observed', 'departure', 'standardized'].includes(p.quantity ?? '') ? p.quantity! : 'observed',
        palette: ['earth', 'ocean', 'ember'].includes(p.palette ?? '') ? p.palette! : 'earth',
        projection: p.projection === 'orthographic' ? 'orthographic' : 'perspective',
        height: typeof p.height === 'number' && Number.isFinite(p.height) ? Math.max(15, Math.min(100, p.height)) : 45,
        wireframe: p.wireframe === true,
    };
}
const DisplayContext = createContext<{ display: DisplayPrefs; update: (patch: Partial<DisplayPrefs>) => void } | null>(null);
export function StudioDisplayProvider({ children }: { children: ReactNode }) {
    const [display, setDisplay] = useState(DEFAULT_DISPLAY), [ready, setReady] = useState(false);
    useEffect(() => { try { setDisplay(parseDisplay(JSON.parse(localStorage.getItem(DISPLAY_KEY) ?? '{}'))); } catch { /* defaults */ } setReady(true); }, []);
    useEffect(() => { if (ready) try { localStorage.setItem(DISPLAY_KEY, JSON.stringify(display)); } catch { /* in-memory controls still work */ } }, [display, ready]);
    return <DisplayContext.Provider value={{ display, update: patch => setDisplay(p => parseDisplay({ ...p, ...patch })) }}>{children}</DisplayContext.Provider>;
}
export function useDisplay() { const value = useContext(DisplayContext); if (!value) throw new Error('StudioDisplayProvider required'); return value; }
export function useStudioTheme() { const global = useTheme(), local = useContext(DisplayContext); return { dark: local?.display.dark ?? global.dark }; }
