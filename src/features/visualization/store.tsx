"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { COLORS, MAX_SERIES, parsePreview, type VisualSeries } from "./model";
import type { PreviewResponse } from "@/lib/dataRetrievalEngine";
interface Store {
    series: VisualSeries[];
    add: (preview: PreviewResponse) => void;
    remove: (id: string) => void;
}
const Context = createContext<Store | null>(null);
export function VisualizationProvider({ children }: {
    children: ReactNode;
}) {
    const [series, setSeries] = useState<VisualSeries[]>([]);
    const add = (value: PreviewResponse) => {
        const preview = parsePreview(value);
        const id = preview.result_id || preview.job_id;
        if (series.length >= MAX_SERIES && !series.some(item => item.id === id))
            throw new Error(`Keep at most ${MAX_SERIES} series. Remove a loaded result before opening another job.`);
        setSeries(current => {
            if (current.some(item => item.id === id))
                return current;
            if (current.length >= MAX_SERIES)
                return current;
            const used = new Set(current.map(s => s.color));
            return [...current, { id, preview, color: COLORS.find(c => !used.has(c)) ?? COLORS[0], label: `${preview.product.variable_name} / ${preview.extraction_config.region_name}` }];
        });
    };
    return <Context.Provider value={{ series, add, remove: id => setSeries(current => current.filter(s => s.id !== id)) }}>{children}</Context.Provider>;
}
export function useVisualizations() { const value = useContext(Context); if (!value)
    throw new Error("VisualizationProvider required"); return value; }
