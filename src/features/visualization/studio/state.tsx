"use client";
// Shared investigation state consumed by studio panels. Loaded result identity
// (series/previews) stays in the visualization store; this context carries
// display configuration and committed (non-hover) selections only, so chart
// hover never re-renders unrelated panels.
import { createContext, useContext } from "react";
import type { Datum, SpatialField, VisualSeries } from "../model";
import type { CellInspection, MapPoint } from "../Globe";
import type { ExtentBox } from "../extents";
import type { FieldStyle } from "../styles";
import type { LayerId } from "../layers";
import type { UseScientificAnalysis } from "../hooks/useScientificAnalysis";

// A committed, semantic selection: which series and which exact timestamp.
export interface StudioSelection {
    seriesId: string;
    time: number; // epoch ms, matching Datum.time
    timestamp: string; // source label for display
}

// Spatial field bundle — the map panel consumes the same state the dedicated
// globe workspace uses, so loaded layers survive preset switches.
export interface MapState {
    field: SpatialField | null;
    applied: { variable: string; month: string; box: ExtentBox } | null;
    busy: boolean;
    error: string;
    variable: 'V01' | 'V12';
    setVariable: (v: 'V01' | 'V12') => void;
    month: string;
    setMonth: (m: string) => void;
    box: string[];
    setBox: (b: string[]) => void;
    extentId: string;
    setExtentId: (id: string) => void;
    load: (month?: string) => void;
    clear: () => void;
    shiftMonth: (delta: number) => void;
    playing: boolean;
    setPlaying: (v: boolean) => void;
    syncLinked: boolean;
    setSyncLinked: (v: boolean) => void;
    style: FieldStyle;
    setStyle: (s: FieldStyle | ((f: FieldStyle) => FieldStyle)) => void;
    customRange: [string, string];
    setCustomRange: (r: [string, string]) => void;
    basemapAlpha: number;
    setBasemapAlpha: (v: number) => void;
    fieldAlpha: number;
    setFieldAlpha: (v: number) => void;
    layerVisible: Record<LayerId, boolean>;
    setLayerVisible: (v: Record<LayerId, boolean> | ((c: Record<LayerId, boolean>) => Record<LayerId, boolean>)) => void;
    layerOrder: LayerId[];
    setLayerOrder: (v: LayerId[] | ((c: LayerId[]) => LayerId[])) => void;
    inspection: CellInspection | null;
    setInspection: (i: CellInspection | null) => void;
    cellClearSignal: number;
    clearCell: () => void;
    drawMode: boolean;
    setDrawMode: (v: boolean) => void;
    frameSignal: number;
    frame: () => void;
    engineBasemap: string;
    setEngineBasemap: (s: string) => void;
    points: MapPoint[];
    onPick: (lat: number, lon: number) => void;
    onDrawBox: (box: number[]) => void;
    onEngineNotice: (msg: string) => void;
    requestExtentAround: () => void;
}

export interface StudioState {
    series: VisualSeries[];
    entries: VisualSeries[]; // visible series
    primary: VisualSeries | undefined;
    primaryRows: Datum[];
    data: Map<string, Datum[]>;
    times: number[];
    loading: boolean;
    hidden: string[];
    toggleHidden: (id: string, show: boolean) => void;
    removeSeries: (id: string) => void;
    primaryId: string;
    setPrimaryId: (id: string) => void;
    filterStart: string;
    setFilterStart: (v: string) => void;
    filterEnd: string;
    setFilterEnd: (v: string) => void;
    includeFlagged: boolean;
    setIncludeFlagged: (v: boolean) => void;
    normalized: boolean;
    setNormalized: (v: boolean) => void;
    selection: StudioSelection | null;
    select: (sel: StudioSelection | null) => void;
    timeIndex: number;
    setTimeIndex: (i: number) => void;
    playing: boolean;
    setPlaying: (v: boolean) => void;
    tablePage: number;
    setTablePage: (v: number | ((p: number) => number)) => void;
    focus: boolean;
    setFocus: (v: boolean) => void;
    map: MapState;
    analysis: UseScientificAnalysis;
    exportData: (type: 'csv' | 'json') => void;
    openAnalysis: () => void;
}

export const StudioContext = createContext<StudioState | null>(null);
export function useStudio() {
    const value = useContext(StudioContext);
    if (!value) throw new Error("StudioContext required");
    return value;
}
