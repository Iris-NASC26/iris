"use client";
// Reusable submitted-analysis controller, extracted from ScientificCaseFile so
// the studio can display the same backend result without duplicating logic.
// Analysis stays explicitly user-triggered: nothing runs until run() is called
// with a chosen seasonal treatment and method list.
import { useCallback, useEffect, useRef, useState } from "react";
import type { CaseFileAnalysisResponse, PreviewResponse } from "@/lib/dataRetrievalEngine";
import { isCaseFileAnalysis } from "../adapters/analysisResult";

export type SeasonalAdjustment = "auto" | "calendar_climatology" | "stl" | "none";
export type AnalysisMethod = "ols" | "hamed_rao_mk" | "seasonal_kendall" | "sen_slope" | "pettitt" | "anomalies" | "seasonal_fingerprint" | "case_file_diagnostics";
export const ANALYSIS_METHODS: { id: AnalysisMethod; label: string }[] = [
    { id: "sen_slope", label: "Sen’s slope" },
    { id: "ols", label: "OLS linear trend" },
    { id: "hamed_rao_mk", label: "Mann–Kendall (Hamed–Rao)" },
    { id: "seasonal_kendall", label: "Seasonal Kendall" },
    { id: "pettitt", label: "Change-point (Pettitt)" },
    { id: "anomalies", label: "Anomaly review" },
    { id: "seasonal_fingerprint", label: "Seasonal fingerprint" },
    { id: "case_file_diagnostics", label: "Full diagnostics" },
];

export interface AnalysisSubmission { seasonal: SeasonalAdjustment; methods: AnalysisMethod[]; }
export type AnalysisStatus = "empty" | "loading" | "error" | "complete";

// The identity of a submitted result: the source job plus the submitted
// inputs. Results from a different job/config never bind to a panel.
export interface AnalysisBinding { inputKey: string; submission: AnalysisSubmission; result: CaseFileAnalysisResponse; }

export interface UseScientificAnalysis {
    status: AnalysisStatus;
    error: string;
    binding: AnalysisBinding | null; // null unless a completed result matches inputKey
    inputKey: string; // identity of the CURRENT source/config (no result implied)
    run: (submission: AnalysisSubmission) => void;
    reset: () => void;
    invalidate: () => void;
}

export function previewInputKey(preview: PreviewResponse | null | undefined): string {
    if (!preview) return "";
    const c = preview.extraction_config;
    return [preview.job_id || "live", c.variable_id, c.region_name, c.start_date, c.end_date].join("|");
}

export function useScientificAnalysis(preview: PreviewResponse | null | undefined): UseScientificAnalysis {
    const [status, setStatus] = useState<AnalysisStatus>("empty");
    const [error, setError] = useState("");
    const [binding, setBinding] = useState<AnalysisBinding | null>(null);
    const request = useRef<AbortController | null>(null);
    const inputKey = previewInputKey(preview);
    const lastKey = useRef(inputKey);

    const reset = useCallback(() => { request.current?.abort(); setBinding(null); setError(""); setStatus("empty"); }, []);
    const invalidate = reset;

    const run = useCallback((submission: AnalysisSubmission) => {
        if (!preview || !submission.methods.length) return;
        request.current?.abort();
        const controller = new AbortController();
        request.current = controller;
        const key = previewInputKey(preview);
        const c = preview.extraction_config;
        setBinding(null);
        setError("");
        setStatus("loading");
        void fetch("/api/v1/analyze/case-file", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
                job_id: preview.job_id ?? null,
                dataset_id: c.variable_id,
                dataset_name: preview.product.variable_name,
                parameter_code: c.variable_id,
                unit: preview.summary_stats.unit,
                location: c.region_name,
                latitude: c.point_lat,
                longitude: c.point_lon,
                start_year: Number(c.start_date.slice(0, 4)),
                end_year: Number(c.end_date.slice(0, 4)),
                seasonal_adjustment: submission.seasonal,
                analysis_methods: submission.methods,
            }),
        }).then(async response => {
            const body = await response.json().catch(() => null);
            if (controller.signal.aborted) return;
            if (!response.ok) throw new Error(typeof body?.detail === 'string' ? body.detail : typeof body?.error === 'string' ? body.error : `Analysis failed (${response.status}).`);
            if (!isCaseFileAnalysis(body)) throw new Error("The analysis service returned an incomplete Case File; nothing was displayed.");
            setBinding({ inputKey: key, submission, result: body });
            setStatus("complete");
        }).catch(e => {
            if (controller.signal.aborted) return;
            setError(e instanceof Error ? e.message : "Analysis could not be completed.");
            setStatus("error");
        });
    }, [preview]);

    // Changing the source series invalidates any result bound to the old key.
    useEffect(() => {
        if (lastKey.current === inputKey) return;
        lastKey.current = inputKey;
        request.current?.abort();
        setBinding(null);
        setError("");
        setStatus("empty");
    }, [inputKey]);
    useEffect(() => () => request.current?.abort(), []);

    // Never expose a result whose stored key no longer matches the source.
    const bound = binding && binding.inputKey === inputKey ? binding : null;
    return { status: bound || status === "loading" ? status : "empty", error, binding: bound, inputKey, run, reset, invalidate };
}
