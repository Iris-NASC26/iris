// Runtime validation for the scientific-analysis boundary. Type assertions
// alone are insufficient — panels must only render fields that actually exist.
import type { CaseFileAnalysisResponse, OutlookSectionData } from "@/lib/dataRetrievalEngine";

const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function isOutlook(value: unknown): value is OutlookSectionData {
    const o = value as OutlookSectionData | null;
    if (!o || typeof o !== "object") return false;
    const point = (p: unknown) => !!p && typeof p === "object" && num((p as { year?: unknown }).year) && num((p as { central_value?: unknown }).central_value);
    return typeof o.not_a_prediction_label === "string"
        && Array.isArray(o.continuation_points) && o.continuation_points.every(point)
        && typeof o.skill_gate_passed === "boolean"
        && typeof o.skill_gate_reason === "string"
        && Array.isArray(o.short_term_forecast_points) && o.short_term_forecast_points.every(point);
}

// Checks the fields studio panels actually consume — not the whole contract.
export function isCaseFileAnalysis(value: unknown): value is CaseFileAnalysisResponse {
    const r = value as CaseFileAnalysisResponse | null;
    return !!r && typeof r === "object"
        && typeof r.result_id === "string"
        && Array.isArray(r.analysis_series)
        && typeof r.unit === "string"
        && typeof r.dataset_name === "string"
        && Array.isArray(r.requested_analysis_methods)
        && isOutlook(r.outlook);
}

// Honest summary of what the outlook contract can and cannot support.
export function outlookCapabilities(outlook: OutlookSectionData) {
    return {
        continuation: outlook.continuation_points.length > 0,
        shortTerm: outlook.skill_gate_passed && outlook.short_term_forecast_points.length > 0,
        gateReason: outlook.skill_gate_reason,
        // ci_low/ci_high are returned bounds of the trend-continuation envelope;
        // they are NOT calibrated prediction intervals, so no fan bands or
        // coverage percentages may be drawn from them.
        calibratedIntervals: false,
    };
}
