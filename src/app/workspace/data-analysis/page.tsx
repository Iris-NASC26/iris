"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useSearchParams } from "next/navigation";
import { ForecastWorkspace } from "@/features/forecasts/ForecastWorkspace";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { useDashboard } from "@/context/DashboardContext";
import { useVisualizations } from "@/features/visualization/store";
import { sourceKey } from "@/features/visualization/adapters/analysisBinding";
import { getDocPageUrl } from "@/lib/docs";
import type { SignalMode } from "@/lib/dashboardData";
import type {
  CaseFileAnalysisResponse,
  CaseFileObservation,
} from "@/lib/dataRetrievalEngine";

export type AnalysisState = "empty" | "loading" | "complete" | "error";
export type SeasonalAdjustment = "auto" | "calendar_climatology" | "stl" | "none";
export type AnalysisMethod =
  | "ols"
  | "hamed_rao_mk"
  | "seasonal_kendall"
  | "sen_slope"
  | "pettitt"
  | "anomalies"
  | "seasonal_fingerprint"
  | "case_file_diagnostics";

export type DataCadence = "Daily" | "8-Day" | "16-Day" | "Monthly" | "Seasonal" | "Yearly";

export interface AnalysisParameters {
  alpha: number;
  ols_autocorrelation_adjustment: boolean;
  mk_autocorrelation_correction: "hamed_rao" | "none";
  mk_max_lag: number;
  seasonal_kendall_min_years: number;
  sens_confidence_level: number;
  sens_rate_scale: "decade" | "year";
  pettitt_min_segment: number;
  anomaly_z_threshold: number;
  anomaly_dispersion_method: "mad" | "std";
  fingerprint_color_cap: number;
  outlook_horizon_years: number;
  stripes_min_months: number;
  triangle_min_window_years: number;
}

const DEFAULT_PARAMETERS: AnalysisParameters = {
  alpha: 0.05,
  ols_autocorrelation_adjustment: true,
  mk_autocorrelation_correction: "hamed_rao",
  mk_max_lag: 12,
  seasonal_kendall_min_years: 3,
  sens_confidence_level: 0.95,
  sens_rate_scale: "decade",
  pettitt_min_segment: 6,
  anomaly_z_threshold: 2.0,
  anomaly_dispersion_method: "mad",
  fingerprint_color_cap: 2.5,
  outlook_horizon_years: 6,
  stripes_min_months: 10,
  triangle_min_window_years: 5,
};

function formatApiError(responseBody: unknown, status: number): string {
  if (responseBody && typeof responseBody === "object") {
    const record = responseBody as Record<string, unknown>;
    const detail = record.detail ?? record.error ?? record.message;
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
    if (Array.isArray(detail) && detail.length > 0) {
      const messages = detail
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object") {
            const errObj = item as Record<string, unknown>;
            const loc = Array.isArray(errObj.loc)
              ? errObj.loc.filter((part) => part !== "body").join(".")
              : "";
            const msg = typeof errObj.msg === "string" ? errObj.msg : JSON.stringify(errObj);
            return loc ? `${loc}: ${msg}` : msg;
          }
          return String(item);
        })
        .filter(Boolean);
      if (messages.length > 0) {
        return `Invalid analysis request (${messages.join("; ")})`;
      }
    }
    if (detail && typeof detail === "object") {
      return JSON.stringify(detail);
    }
  }
  return `Analysis failed (HTTP ${status}).`;
}

interface MethodCatalogEntry {
  id: AnalysisMethod;
  category: string;
  label: string;
  shortLabel: string;
  detail: string;
  docPageId: string;
  hoverSummary: string;
  formulaHint: string;
  supportedCadences: DataCadence[];
  minObservations: number;
  cadenceRequirementLabel: string;
}

const ANALYSIS_METHODS: MethodCatalogEntry[] = [
  {
    id: "ols",
    category: "Parametric Trend",
    label: "Linear trend · OLS t-test",
    shortLabel: "OLS t-test",
    detail: "Least-squares slope, t-statistic, R², and confidence interval",
    docPageId: "method-ols",
    hoverSummary:
      "Fits an Ordinary Least Squares linear regression y(t) = β₀ + β₁t on deseasonalized observations and tests H₀: β₁ = 0 using a two-sided Student t-test with optional lag-1 autocorrelation degrees-of-freedom adjustment.",
    formulaHint: "t = β̂₁ / SE(β̂₁), df = n_eff − 2",
    supportedCadences: ["Daily", "8-Day", "16-Day", "Monthly", "Seasonal", "Yearly"],
    minObservations: 6,
    cadenceRequirementLabel: "All cadences (≥ 6 obs)",
  },
  {
    id: "hamed_rao_mk",
    category: "Non-Parametric Trend",
    label: "Mann–Kendall trend test",
    shortLabel: "Hamed–Rao MK",
    detail: "Rank concordance τ, Z-score, and Hamed–Rao autocorrelation correction",
    docPageId: "method-hamed-rao-mk",
    hoverSummary:
      "Evaluates monotonic trend across all pairwise observation ranks without assuming normality or linearity. Inflates Var(S) using Hamed & Rao (1998) serial rank autocorrelations r_k to guard against false positives.",
    formulaHint: "Z_HR = (S − sign(S)) / √Var_HR(S)",
    supportedCadences: ["Daily", "8-Day", "16-Day", "Monthly", "Seasonal", "Yearly"],
    minObservations: 6,
    cadenceRequirementLabel: "All cadences (≥ 6 obs)",
  },
  {
    id: "seasonal_kendall",
    category: "Seasonal Non-Parametric",
    label: "Seasonal Kendall",
    shortLabel: "Seasonal Kendall",
    detail: "Compares matching calendar months (Jan vs Jan … Dec vs Dec)",
    docPageId: "method-seasonal-kendall",
    hoverSummary:
      "Hirsch, Slack & Smith (1982) test that restricts pairwise comparisons strictly within matching calendar months (m = 1..12) and sums month-specific Mann–Kendall statistics across the seasonal cycle.",
    formulaHint: "S_SK = Σ S_m, Var(S_SK) = Σ Var(S_m)",
    supportedCadences: ["Monthly"],
    minObservations: 24,
    cadenceRequirementLabel: "Monthly only (≥ 24 months)",
  },
  {
    id: "sen_slope",
    category: "Robust Rate Estimator",
    label: "Sen’s slope",
    shortLabel: "Sen’s Slope",
    detail: "Median pairwise rate of change and rank-based confidence corridor",
    docPageId: "method-sen-slope",
    hoverSummary:
      "Theil–Sen estimator that computes the median of all N = n(n−1)/2 pairwise slopes (y_j − y_i)/(t_j − t_i). Has a ~29% breakdown point against extreme outliers and missing-data gaps.",
    formulaHint: "β_Sen = median((y_j − y_i) / Δt_ij)",
    supportedCadences: ["Daily", "8-Day", "16-Day", "Monthly", "Seasonal", "Yearly"],
    minObservations: 6,
    cadenceRequirementLabel: "All cadences (≥ 6 obs)",
  },
  {
    id: "pettitt",
    category: "Regime Shift Detection",
    label: "Change-point screen",
    shortLabel: "Pettitt Breakpoint",
    detail: "Non-parametric Mann–Whitney U_t scan for a structural regime shift",
    docPageId: "method-pettitt",
    hoverSummary:
      "Pettitt (1979) rank-based change-point test that scans all candidate split points t to find the maximum absolute Mann–Whitney statistic K_T = max|U_{t,T}| and estimates pre/post regime means.",
    formulaHint: "K_T = max |U_{t,T}|, p ≈ 2 exp(−6K_T²/(T³+T²))",
    supportedCadences: ["Daily", "8-Day", "16-Day", "Monthly", "Seasonal", "Yearly"],
    minObservations: 10,
    cadenceRequirementLabel: "All cadences (≥ 10 obs)",
  },
  {
    id: "anomalies",
    category: "Extreme Departure Screening",
    label: "Anomaly review",
    shortLabel: "Anomaly Review",
    detail: "Seasonally adjusted z-scores with robust MAD or SD dispersion",
    docPageId: "method-anomalies",
    hoverSummary:
      "Standardizes deseasonalized residuals into z-scores using either the outlier-resistant Median Absolute Deviation (1.4826 × MAD) or classical sample standard deviation, flagging |z| ≥ τ for review.",
    formulaHint: "z_t = (a_t − center) / σ_robust",
    supportedCadences: ["Daily", "8-Day", "16-Day", "Monthly", "Seasonal", "Yearly"],
    minObservations: 6,
    cadenceRequirementLabel: "All cadences (≥ 6 obs)",
  },
  {
    id: "seasonal_fingerprint",
    category: "2D Calendar Diagnostics",
    label: "Seasonal fingerprint",
    shortLabel: "Seasonal Fingerprint",
    detail: "Year × Calendar Month anomaly matrix and 12-month slope profile",
    docPageId: "method-seasonal-fingerprint",
    hoverSummary:
      "Arranges standardized anomaly z-scores into a Year × Calendar Month (Jan–Dec) matrix alongside month-specific Sen’s slopes to reveal whether trends or extremes cluster in specific seasons.",
    formulaHint: "Matrix Z[year, month], Month slopes β_1..β_12",
    supportedCadences: ["Monthly"],
    minObservations: 12,
    cadenceRequirementLabel: "Monthly only (≥ 12 months)",
  },
  {
    id: "case_file_diagnostics",
    category: "Synthesis & Robustness",
    label: "Full Case File diagnostics",
    shortLabel: "Case File Diagnostics",
    detail: "Evidence grade A–D, warming stripes, trend triangle, caveats & outlook",
    docPageId: "method-case-file-diagnostics",
    hoverSummary:
      "Produces the complete audit-ready scientific dossier: deterministic Evidence Grade (A–D), Explorer/Student/Scientist explanations, Annual Anomaly Stripes, Multi-Window Trend Triangle, Caveats, and Skill-Gated Outlook.",
    formulaHint: "Grade A–D + Sub-window matrix + Skill score PSS",
    supportedCadences: ["Daily", "8-Day", "16-Day", "Monthly", "Seasonal", "Yearly"],
    minObservations: 12,
    cadenceRequirementLabel: "All cadences (≥ 12 obs)",
  },
];

interface MethodCompatibility {
  compatible: boolean;
  badgeText: string;
  reason: string;
}

interface CompletedMethodStep {
  method: AnalysisMethod;
  stepNumber: number;
  ranAt: string;
  seasonalAdjustment: SeasonalAdjustment;
  parameters: AnalysisParameters;
  caseFile: CaseFileAnalysisResponse;
}

function getMethodParameterSignature(
  method: AnalysisMethod,
  seasonal: SeasonalAdjustment,
  params: AnalysisParameters,
): string {
  switch (method) {
    case "ols":
      return `${seasonal}|${params.alpha}|${params.ols_autocorrelation_adjustment}`;
    case "hamed_rao_mk":
      return `${seasonal}|${params.alpha}|${params.mk_autocorrelation_correction}|${params.mk_max_lag}`;
    case "seasonal_kendall":
      return `${seasonal}|${params.alpha}|${params.seasonal_kendall_min_years}`;
    case "sen_slope":
      return `${seasonal}|${params.sens_confidence_level}|${params.sens_rate_scale}`;
    case "pettitt":
      return `${seasonal}|${params.alpha}|${params.pettitt_min_segment}`;
    case "anomalies":
      return `${seasonal}|${params.anomaly_z_threshold}|${params.anomaly_dispersion_method}`;
    case "seasonal_fingerprint":
      return `${seasonal}|${params.fingerprint_color_cap}|${params.anomaly_dispersion_method}`;
    case "case_file_diagnostics":
      return `${seasonal}|${params.alpha}|${params.outlook_horizon_years}|${params.stripes_min_months}|${params.triangle_min_window_years}`;
  }
}

async function downloadSvgElementAsPng(
  svgElement: SVGSVGElement | null,
  filename: string,
  title: string,
  subtitle: string,
  onNotify: (msg: string) => void,
) {
  if (!svgElement) {
    onNotify("Chart element is not ready for export");
    return;
  }

  try {
    const viewBox = svgElement.viewBox?.baseVal;
    const width = viewBox && viewBox.width > 0 ? viewBox.width : svgElement.clientWidth || 840;
    const height = viewBox && viewBox.height > 0 ? viewBox.height : svgElement.clientHeight || 280;

    const rootStyles = window.getComputedStyle(document.documentElement);
    const bodyStyles = window.getComputedStyle(document.body);
    const getVar = (name: string, fallback: string) =>
      bodyStyles.getPropertyValue(name).trim() ||
      rootStyles.getPropertyValue(name).trim() ||
      fallback;

    const bgColor = getVar("--card", "#ffffff");
    const softColor = getVar("--card-soft", "#f5f8f6");
    const textColor = getVar("--text", "#15231d");
    const mutedColor = getVar("--muted", "#586962");
    const faintColor = getVar("--faint", "#7b8d85");
    const borderColor = getVar("--border", "#dce5e0");
    const greenColor = getVar("--green", "#0b6e4f");
    const greenBright = getVar("--green-bright", "#10b981");
    const greenSoft = getVar("--green-soft", "#e6f7f0");

    const clone = svgElement.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", String(width));
    clone.setAttribute("height", String(height));

    const styleEl = document.createElementNS("http://www.w3.org/2000/svg", "style");
    styleEl.textContent = `
      :root, svg {
        --card: ${bgColor};
        --card-soft: ${softColor};
        --text: ${textColor};
        --muted: ${mutedColor};
        --faint: ${faintColor};
        --border: ${borderColor};
        --green: ${greenColor};
        --green-bright: ${greenBright};
        --green-soft: ${greenSoft};
        font-family: "DM Mono", "Inter", system-ui, -apple-system, sans-serif;
      }
      text { fill: ${faintColor}; font: 10px "DM Mono", monospace; }
      .grid-line { stroke: ${borderColor}; stroke-width: 1; }
      .data-line { fill: none; stroke: ${textColor}; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
      .slope-line { fill: none; stroke: ${greenBright}; stroke-width: 2.2; stroke-dasharray: 6 5; }
      .ols-line { fill: none; stroke: #0ea5e9; stroke-width: 2.2; }
      .ci-area { fill: ${greenBright}; fill-opacity: 0.14; stroke: none; }
      .anomaly { fill: #ef4444; stroke: ${bgColor}; stroke-width: 2; }
    `;
    clone.insertBefore(styleEl, clone.firstChild);

    let serialized = new XMLSerializer().serializeToString(clone);
    serialized = serialized
      .replace(/var\(--card\)/g, bgColor)
      .replace(/var\(--card-soft\)/g, softColor)
      .replace(/var\(--text\)/g, textColor)
      .replace(/var\(--muted\)/g, mutedColor)
      .replace(/var\(--faint\)/g, faintColor)
      .replace(/var\(--border\)/g, borderColor)
      .replace(/var\(--green\)/g, greenColor)
      .replace(/var\(--green-bright\)/g, greenBright)
      .replace(/var\(--green-soft\)/g, greenSoft);

    const svgBlob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scale = 2;
        const headerHeight = 56;
        const padding = 20;
        const canvas = document.createElement("canvas");
        canvas.width = (width + padding * 2) * scale;
        canvas.height = (height + headerHeight + padding * 2) * scale;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error("Canvas 2D context unavailable"));
          return;
        }
        ctx.scale(scale, scale);
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width + padding * 2, height + headerHeight + padding * 2);

        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(0.5, 0.5, width + padding * 2 - 1, height + headerHeight + padding * 2 - 1);

        ctx.fillStyle = textColor;
        ctx.font = "600 14px system-ui, -apple-system, sans-serif";
        ctx.fillText(title, padding, padding + 16);

        ctx.fillStyle = mutedColor;
        ctx.font = "400 11px monospace";
        ctx.fillText(subtitle, padding, padding + 34);

        ctx.fillStyle = greenColor;
        ctx.font = "600 10px monospace";
        ctx.textAlign = "right";
        ctx.fillText("IRIS SCIENTIFIC CASE FILE", width + padding, padding + 16);
        ctx.textAlign = "left";

        ctx.beginPath();
        ctx.moveTo(padding, padding + 44);
        ctx.lineTo(width + padding, padding + 44);
        ctx.strokeStyle = borderColor;
        ctx.stroke();

        ctx.drawImage(img, padding, padding + headerHeight, width, height);
        URL.revokeObjectURL(url);

        canvas.toBlob((pngBlob) => {
          if (!pngBlob) {
            reject(new Error("PNG encoding failed"));
            return;
          }
          const pngUrl = URL.createObjectURL(pngBlob);
          const link = document.createElement("a");
          link.href = pngUrl;
          link.download = filename.endsWith(".png") ? filename : `${filename}.png`;
          link.click();
          URL.revokeObjectURL(pngUrl);
          onNotify(`Downloaded ${link.download}`);
          resolve();
        }, "image/png");
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to render SVG image"));
      };
      img.src = url;
    });
  } catch (err) {
    onNotify(err instanceof Error ? err.message : "Unable to export chart image");
  }
}

function HistoricalAnalysis() {
  const { publishAnalysis, invalidateAnalysis } = useVisualizations();
  const {
    autoRunCase,
    dataset,
    endYear,
    extractedPreview,
    extractionConfig,
    location,
    setAutoRunCase,
    setEndYear,
    setSignalMode,
    setStartYear,
    signalMode,
    startYear,
  } = useDashboard();

  const [analysis, setAnalysis] = useState<AnalysisState>("empty");
  const [RunningMethods, setRunningMethods] = useState<AnalysisMethod[]>([]);
  const [analysisError, setAnalysisError] = useState("");
  const [toast, setToast] = useState("");
  const [seasonalAdjustment, setSeasonalAdjustment] = useState<SeasonalAdjustment>("auto");
  const [liveCadence, setLiveCadence] = useState<DataCadence>("Monthly");
  const [selectedMethods, setSelectedMethods] = useState<AnalysisMethod[]>([]);
  const [expandedParamMethods, setExpandedParamMethods] = useState<AnalysisMethod[]>([]);
  const [hoveredInfoMethod, setHoveredInfoMethod] = useState<AnalysisMethod | null>(null);
  const [parameters, setParameters] = useState<AnalysisParameters>(DEFAULT_PARAMETERS);
  const [completedSteps, setCompletedSteps] = useState<CompletedMethodStep[]>([]);

  const requestController = useRef<AbortController | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      requestController.current?.abort();
      window.clearTimeout(toastTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (autoRunCase) setAutoRunCase(false);
  }, [autoRunCase, setAutoRunCase]);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2800);
  }, []);

  // Active dataset profile & cadence detection
  const activeCadence: DataCadence = useMemo(() => {
    if (extractedPreview) {
      const freq = extractedPreview.extraction_config.target_frequency;
      if (
        freq === "Daily" ||
        freq === "8-Day" ||
        freq === "16-Day" ||
        freq === "Monthly" ||
        freq === "Seasonal" ||
        freq === "Yearly"
      ) {
        return freq;
      }
      return "Monthly";
    }
    return liveCadence;
  }, [extractedPreview, liveCadence]);

  const activeStartYear = extractedPreview
    ? Number(extractedPreview.extraction_config.start_date.slice(0, 4))
    : startYear;
  const activeEndYear = extractedPreview
    ? Number(extractedPreview.extraction_config.end_date.slice(0, 4))
    : endYear;
  const spanYears = Math.max(1, activeEndYear - activeStartYear + 1);

  const estimatedValidObservations = useMemo(() => {
    if (extractedPreview) {
      return extractedPreview.summary_stats.valid_count;
    }
    const multiplier =
      activeCadence === "Daily"
        ? 365
        : activeCadence === "8-Day"
          ? 46
          : activeCadence === "16-Day"
            ? 23
            : activeCadence === "Monthly"
              ? 12
              : activeCadence === "Seasonal"
                ? 4
                : 1;
    return spanYears * multiplier;
  }, [extractedPreview, activeCadence, spanYears]);

  // Evaluate compatibility per method for the currently active dataset
  const compatibilityMap = useMemo<Record<AnalysisMethod, MethodCompatibility>>(() => {
    const result = {} as Record<AnalysisMethod, MethodCompatibility>;
    for (const method of ANALYSIS_METHODS) {
      const supportsCadence = method.supportedCadences.includes(activeCadence);
      const requiredObs =
        method.id === "pettitt"
          ? Math.max(method.minObservations, parameters.pettitt_min_segment * 2)
          : method.id === "seasonal_kendall"
            ? Math.max(method.minObservations, parameters.seasonal_kendall_min_years * 12)
            : method.minObservations;

      if (!supportsCadence) {
        result[method.id] = {
          compatible: false,
          badgeText: "Requires Monthly Data",
          reason: `${method.shortLabel} compares calendar months (Jan–Dec) and cannot run on ${activeCadence} data. Switch to a Monthly dataset to unlock this method.`,
        };
      } else if (estimatedValidObservations < requiredObs) {
        result[method.id] = {
          compatible: false,
          badgeText: `Needs ≥ ${requiredObs} obs`,
          reason: `Current selection has ~${estimatedValidObservations} valid observations, but ${method.shortLabel} requires at least ${requiredObs} observations for reliable statistical inference.`,
        };
      } else {
        result[method.id] = {
          compatible: true,
          badgeText: `Compatible · ${activeCadence}`,
          reason:
            activeCadence === "Monthly"
              ? `Fully supported for ${activeCadence} observations (${estimatedValidObservations} pts across ${spanYears} yrs).`
              : `Supported on ${activeCadence} observations (${estimatedValidObservations} pts). Seasonal adjustment adapts automatically for non-monthly cadence.`,
        };
      }
    }
    return result;
  }, [
    activeCadence,
    estimatedValidObservations,
    parameters.pettitt_min_segment,
    parameters.seasonal_kendall_min_years,
    spanYears,
  ]);

  const compatibleMethodsCount = useMemo(
    () => ANALYSIS_METHODS.filter((m) => compatibilityMap[m.id]?.compatible).length,
    [compatibilityMap],
  );

  // Keep selectedMethods filtered to compatible methods when cadence changes
  useEffect(() => {
    setSelectedMethods((prev) => prev.filter((m) => compatibilityMap[m]?.compatible));
  }, [compatibilityMap]);

  const canAnalyze =
    Boolean(extractedPreview) || extractionConfig.source_api.toLowerCase() === "nasa power";

  const analysisInputKey = extractedPreview
    ? sourceKey(extractedPreview)
    : [
        "live",
        extractionConfig.variable_id,
        extractionConfig.region_name || location,
        startYear,
        endYear,
        liveCadence,
      ].join("|");

  // Reset cumulative steps only when the underlying dataset/location/year range changes
  useEffect(() => {
    requestController.current?.abort();
    setCompletedSteps([]);
    setAnalysisError("");
    setAnalysis("empty");
    setSignalMode("raw");
  }, [analysisInputKey, setSignalMode]);

  const clearAllSteps = useCallback(() => {
    requestController.current?.abort();
    if (extractedPreview) invalidateAnalysis(extractedPreview);
    setCompletedSteps([]);
    setAnalysisError("");
    setAnalysis("empty");
    setSignalMode("raw");
    notify("Cleared all completed analysis sections");
  }, [extractedPreview, invalidateAnalysis, notify, setSignalMode]);

  const removeCompletedStep = useCallback(
    (methodId: AnalysisMethod) => {
      setCompletedSteps((prev) => {
        const next = prev
          .filter((item) => item.method !== methodId)
          .map((item, idx) => ({ ...item, stepNumber: idx + 1 }));
        if (next.length === 0) {
          setAnalysis("empty");
        }
        return next;
      });
      notify(`Removed ${ANALYSIS_METHODS.find((m) => m.id === methodId)?.shortLabel || methodId} section`);
    },
    [notify],
  );

  // Execute one or more methods cumulatively (step-by-step)
  const executeMethods = useCallback(
    async (methodsToRun: AnalysisMethod[]) => {
      const validMethods = methodsToRun.filter((m) => compatibilityMap[m]?.compatible);
      if (validMethods.length === 0) return;

      requestController.current?.abort();
      const controller = new AbortController();
      requestController.current = controller;

      setAnalysisError("");
      setRunningMethods(validMethods);
      setAnalysis("loading");

      try {
        if (
          !extractedPreview &&
          extractionConfig.source_api.toLowerCase() !== "nasa power"
        ) {
          throw new Error(
            "This provider must be extracted first. Data Analysis only requests live NASA POWER data when no extraction job is attached.",
          );
        }

        const activeLocation =
          extractedPreview?.extraction_config.region_name ||
          extractionConfig.region_name ||
          location;

        const response = await fetch("/api/v1/analyze/case-file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            job_id: extractedPreview?.job_id ?? null,
            dataset_id: extractedPreview?.extraction_config.variable_id || dataset.id,
            dataset_name: extractedPreview?.product.variable_name || dataset.name,
            parameter_code:
              extractedPreview?.extraction_config.variable_id ||
              extractionConfig.variable_id ||
              dataset.code,
            unit: extractedPreview?.summary_stats.unit || dataset.unit,
            location: activeLocation,
            latitude:
              extractedPreview?.extraction_config.point_lat ??
              extractionConfig.point_lat ??
              34.05,
            longitude:
              extractedPreview?.extraction_config.point_lon ??
              extractionConfig.point_lon ??
              -118.24,
            start_year: activeStartYear,
            end_year: activeEndYear,
            seasonal_adjustment: seasonalAdjustment,
            analysis_methods: validMethods,
            cadence: activeCadence,
            ...parameters,
          }),
        });

        const responseBody = await response.json();
        if (controller.signal.aborted) return;
        if (!response.ok) {
          throw new Error(formatApiError(responseBody, response.status));
        }
        if (
          !responseBody.result_id ||
          !Array.isArray(responseBody.analysis_series)
        ) {
          throw new Error("The analysis service returned an incomplete Case File.");
        }

        const parsedResponse = responseBody as CaseFileAnalysisResponse;

        if (extractedPreview) {
          try {
            publishAnalysis(
              extractedPreview,
              { seasonal: seasonalAdjustment, methods: validMethods },
              parsedResponse,
            );
          } catch {
            // Optional visualization studio binding only applies when strict monthly checks match
          }
        }

        const timestampLabel = new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

        setCompletedSteps((prev) => {
          const next = [...prev];
          for (const methodId of validMethods) {
            const existingIndex = next.findIndex((item) => item.method === methodId);
            const snapshot: CompletedMethodStep = {
              method: methodId,
              stepNumber:
                existingIndex >= 0 ? next[existingIndex].stepNumber : next.length + 1,
              ranAt: timestampLabel,
              seasonalAdjustment,
              parameters: { ...parameters },
              caseFile: parsedResponse,
            };
            if (existingIndex >= 0) {
              next[existingIndex] = snapshot;
            } else {
              next.push(snapshot);
            }
          }
          return next.map((item, idx) => ({ ...item, stepNumber: idx + 1 }));
        });

        setRunningMethods([]);
        setAnalysis("complete");
        notify(
          validMethods.length === 1
            ? `Completed ${ANALYSIS_METHODS.find((m) => m.id === validMethods[0])?.shortLabel}`
            : `Completed ${validMethods.length} analysis methods`,
        );
      } catch (error) {
        if (controller.signal.aborted) return;
        setRunningMethods([]);
        setAnalysisError(error instanceof Error ? error.message : String(error));
        setAnalysis("error");
      }
    },
    [
      compatibilityMap,
      extractedPreview,
      extractionConfig.source_api,
      extractionConfig.region_name,
      extractionConfig.variable_id,
      extractionConfig.point_lat,
      extractionConfig.point_lon,
      location,
      dataset.id,
      dataset.name,
      dataset.code,
      dataset.unit,
      activeStartYear,
      activeEndYear,
      seasonalAdjustment,
      activeCadence,
      parameters,
      publishAnalysis,
      notify,
    ],
  );

  const runSelectedAnalysis = useCallback(() => {
    if (selectedMethods.length === 0) return;
    void executeMethods(selectedMethods);
  }, [executeMethods, selectedMethods]);

  const toggleMethod = (method: AnalysisMethod) => {
    if (!compatibilityMap[method]?.compatible) return;
    setSelectedMethods((current) =>
      current.includes(method)
        ? current.filter((item) => item !== method)
        : [...current, method],
    );
  };

  const toggleParamDrawer = (method: AnalysisMethod) => {
    setExpandedParamMethods((current) =>
      current.includes(method)
        ? current.filter((item) => item !== method)
        : [...current, method],
    );
  };

  const selectAllCompatible = () => {
    const allCompatible = ANALYSIS_METHODS.filter(
      (m) => compatibilityMap[m.id]?.compatible,
    ).map((m) => m.id);
    setSelectedMethods(allCompatible);
  };

  const updateParam = <K extends keyof AnalysisParameters>(
    key: K,
    value: AnalysisParameters[K],
  ) => {
    setParameters((prev) => ({ ...prev, [key]: value }));
  };

  const completedStepByMethod = useMemo(() => {
    const map = new Map<AnalysisMethod, CompletedMethodStep>();
    for (const step of completedSteps) {
      map.set(step.method, step);
    }
    return map;
  }, [completedSteps]);

  const latestCaseFile =
    completedSteps.length > 0
      ? completedSteps[completedSteps.length - 1].caseFile
      : null;

  return (
    <div className="visualize-page">
      <main className="workspace">
        <aside className="control-panel">
          <div className="panel-scroll">
            <section className="wizard-section">
              <div className="section-kicker">Data Analysis Workbench</div>
              <h1>Scientific Case File</h1>
              <p className="section-copy">
                Configure dataset treatment, inspect method compatibility, adjust statistical
                parameters, and execute analyses step-by-step or in batch.
              </p>

              {/* DATASET PROFILE & COMPATIBILITY SUMMARY */}
              <div className="da-dataset-profile" aria-label="Dataset compatibility profile">
                <div className="da-profile-top">
                  <div>
                    <span className="da-profile-kicker">Active Dataset Profile</span>
                    <strong>
                      {extractedPreview?.product.variable_name || dataset.name} ({dataset.unit})
                    </strong>
                  </div>
                  <span className="da-cadence-pill">{activeCadence} Cadence</span>
                </div>

                <div className="da-profile-stats">
                  <div>
                    <small>Region</small>
                    <span>
                      {extractedPreview?.extraction_config.region_name ||
                        extractionConfig.region_name ||
                        location}
                    </span>
                  </div>
                  <div>
                    <small>Window</small>
                    <span>
                      {activeStartYear}–{activeEndYear} ({spanYears} yrs)
                    </span>
                  </div>
                  <div>
                    <small>Valid Obs</small>
                    <span>
                      {estimatedValidObservations} pts
                      {extractedPreview
                        ? ` (${Math.round(
                            (extractedPreview.summary_stats.valid_count /
                              Math.max(1, extractedPreview.total_rows)) *
                              100,
                          )}%)`
                        : ""}
                    </span>
                  </div>
                  <div>
                    <small>Compatible Methods</small>
                    <span className="da-compat-ratio">
                      {compatibleMethodsCount} of {ANALYSIS_METHODS.length} available
                    </span>
                  </div>
                </div>

                {!extractedPreview && (
                  <div className="da-cadence-switcher">
                    <span className="da-cadence-label">
                      Sampling cadence (tests dataset compatibility):
                    </span>
                    <div className="segmented da-cadence-Readout" role="group" aria-label="Dataset cadence">
                      {(["Daily", "Monthly", "Yearly"] as DataCadence[]).map((cad) => (
                        <button
                          key={cad}
                          type="button"
                          className={liveCadence === cad ? "active" : ""}
                          onClick={() => setLiveCadence(cad)}
                        >
                          {cad}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {!extractedPreview && (
                <>
                  <div className="range-heading">
                    <div className="field-label">Observation period</div>
                    <span className="year-readout">
                      {startYear} — {endYear}
                    </span>
                  </div>
                  <div className="range-track" aria-hidden="true">
                    <span
                      style={{
                        left: `${Math.max(0, ((startYear - 2000) / 25) * 100)}%`,
                        right: `${Math.max(0, 100 - ((endYear - 2000) / 25) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="range-inputs">
                    <input
                      aria-label="Start year"
                      min="2000"
                      max={endYear - 1}
                      type="range"
                      value={startYear}
                      onChange={(event) => {
                        setStartYear(Number(event.target.value));
                      }}
                    />
                    <input
                      aria-label="End year"
                      min={startYear + 1}
                      max="2025"
                      type="range"
                      value={endYear}
                      onChange={(event) => {
                        setEndYear(Number(event.target.value));
                      }}
                    />
                  </div>
                  <div className="range-labels">
                    <span>2000</span>
                    <span>2025</span>
                  </div>
                </>
              )}

              <section className="analysis-options" aria-labelledby="analysis-options-title">
                <div className="field-label" id="analysis-options-title">
                  Data manipulation &amp; preprocessing
                </div>
                <label className="analysis-select-label" htmlFor="seasonal-adjustment">
                  Seasonal treatment
                </label>
                <select
                  id="seasonal-adjustment"
                  value={seasonalAdjustment}
                  onChange={(event) =>
                    setSeasonalAdjustment(event.target.value as SeasonalAdjustment)
                  }
                >
                  <option value="auto">
                    Automatic (STL when monthly ≥ 24m, otherwise climatology)
                  </option>
                  <option value="calendar_climatology">Calendar-month climatology</option>
                  <option value="stl" disabled={activeCadence !== "Monthly"}>
                    Robust STL decomposition {activeCadence !== "Monthly" ? "(Monthly only)" : ""}
                  </option>
                  <option value="none">No seasonal adjustment (raw series)</option>
                </select>
                <p className="analysis-option-note">
                  {activeCadence === "Monthly"
                    ? "Missing and QA-flagged values are never interpolated or filled."
                    : `Active dataset is ${activeCadence}: calendar-month STL/climatology applies only to Monthly series; non-monthly runs analyze observed values directly.`}
                </p>

                <div className="da-methods-toolbar">
                  <div className="field-label analysis-method-heading" style={{ margin: 0 }}>
                    Analysis methods ({selectedMethods.length} selected)
                  </div>
                  <div className="da-methods-quick-actions">
                    <button
                      type="button"
                      className="da-link-btn"
                      onClick={selectAllCompatible}
                    >
                      Select compatible ({compatibleMethodsCount})
                    </button>
                    {selectedMethods.length > 0 && (
                      <button
                        type="button"
                        className="da-link-btn"
                        onClick={() => setSelectedMethods([])}
                      >
                        Clear selection
                      </button>
                    )}
                  </div>
                </div>

                {/* INTUITIVE METHOD CARDS WITH (i) HOVER + DOCS LINK + PARAMETERS + STEP RUN */}
                <div className="da-method-cards" role="group" aria-label="Statistical analysis methods">
                  {ANALYSIS_METHODS.map((method) => {
                    const compat = compatibilityMap[method.id];
                    const isSelected = selectedMethods.includes(method.id);
                    const completedStep = completedStepByMethod.get(method.id);
                    const isExpanded = expandedParamMethods.includes(method.id);
                    const isRunningThis =
                      analysis === "loading" && RunningMethods.includes(method.id);
                    const isParamsModified =
                      completedStep !== undefined &&
                      getMethodParameterSignature(
                        method.id,
                        completedStep.seasonalAdjustment,
                        completedStep.parameters,
                      ) !==
                        getMethodParameterSignature(
                          method.id,
                          seasonalAdjustment,
                          parameters,
                        );

                    return (
                      <article
                        key={method.id}
                        className={[
                          "da-method-card",
                          isSelected ? "selected" : "",
                          completedStep ? "completed" : "",
                          !compat.compatible ? "incompatible" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <div className="da-method-card-top">
                          <label className="da-method-select-area">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={!compat.compatible}
                              onChange={() => toggleMethod(method.id)}
                              aria-label={method.label}
                            />
                            <div className="da-method-title-block">
                              <div className="da-method-badges">
                                <span className="da-method-cat">{method.category}</span>
                                <span
                                  className={`da-compat-badge ${
                                    compat.compatible ? "ok" : "blocked"
                                  }`}
                                  title={compat.reason}
                                >
                                  {compat.badgeText}
                                </span>
                                {completedStep && (
                                  <span
                                    className={`da-step-badge ${
                                      isParamsModified ? "modified" : "done"
                                    }`}
                                  >
                                    {isParamsModified
                                      ? `Step ${completedStep.stepNumber} · Params changed`
                                      : `Step ${completedStep.stepNumber} · Done`}
                                  </span>
                                )}
                              </div>
                              <strong className="da-method-name">{method.label}</strong>
                              <small className="da-method-detail">{method.detail}</small>
                            </div>
                          </label>

                          {/* (i) INFO ICON WITH HOVER POPOVER AND NEW-TAB DOCUMENTATION LINK */}
                          <div
                            className="da-info-wrapper"
                            onMouseEnter={() => setHoveredInfoMethod(method.id)}
                            onMouseLeave={() =>
                              setHoveredInfoMethod((prev) =>
                                prev === method.id ? null : prev,
                              )
                            }
                          >
                            <a
                              href={getDocPageUrl(method.docPageId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="da-info-link"
                              aria-label={`More information about ${method.label} (opens documentation in a new tab)`}
                              onFocus={() => setHoveredInfoMethod(method.id)}
                              onBlur={() =>
                                setHoveredInfoMethod((prev) =>
                                  prev === method.id ? null : prev,
                                )
                              }
                            >
                              <span className="da-info-glyph" aria-hidden="true">
                                i
                              </span>
                            </a>
                            {hoveredInfoMethod === method.id && (
                              <div className="da-info-popover" role="tooltip">
                                <div className="da-info-popover-head">
                                  <strong>{method.label}</strong>
                                  <code>{method.formulaHint}</code>
                                </div>
                                <p>{method.hoverSummary}</p>
                                <div className="da-info-popover-meta">
                                  <span>Compatibility: {method.cadenceRequirementLabel}</span>
                                  <span className="da-info-cta">
                                    Click (i) to open full documentation in a new tab ↗
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {!compat.compatible && (
                          <div className="da-incompat-reason">
                            <Icon name="alert" size={13} />
                            <span>{compat.reason}</span>
                          </div>
                        )}

                        {compat.compatible && (
                          <div className="da-method-card-actions">
                            <button
                              type="button"
                              className={`da-param-toggle ${isExpanded ? "open" : ""}`}
                              onClick={() => toggleParamDrawer(method.id)}
                              aria-expanded={isExpanded}
                            >
                              <Icon name="layers" size={12} />
                              <span>
                                {isExpanded ? "Hide parameters" : "Adjust parameters"}
                              </span>
                            </button>

                            <button
                              type="button"
                              className="da-step-run-btn"
                              disabled={!canAnalyze || analysis === "loading"}
                              onClick={() => {
                                if (!selectedMethods.includes(method.id)) {
                                  setSelectedMethods((prev) => [...prev, method.id]);
                                }
                                void executeMethods([method.id]);
                              }}
                              title="Run this analysis method now and append/update its section on the right pane"
                            >
                              <Icon name="activity" size={12} />
                              <span>
                                {isRunningThis
                                  ? "Running…"
                                  : completedStep
                                    ? isParamsModified
                                      ? "Re-run with new params"
                                      : "Re-run step"
                                    : "Run step"}
                              </span>
                            </button>
                          </div>
                        )}

                        {compat.compatible && isExpanded && (
                          <MethodParameterControls
                            method={method.id}
                            parameters={parameters}
                            onUpdate={updateParam}
                          />
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>

              <div className="da-primary-run-stack">
                <button
                  className="run-button"
                  onClick={runSelectedAnalysis}
                  disabled={
                    analysis === "loading" || !canAnalyze || selectedMethods.length === 0
                  }
                  type="button"
                >
                  {analysis === "loading" ? (
                    <span className="button-spinner" />
                  ) : (
                    <Icon name="activity" size={18} />
                  )}
                  {analysis === "loading"
                    ? "Running selected methods…"
                    : completedSteps.length > 0
                      ? `Run selected & merge (${selectedMethods.length})`
                      : "Run selected analysis"}
                  {analysis !== "loading" && <span className="shortcut">↵</span>}
                </button>

                {completedSteps.length > 0 && (
                  <button
                    type="button"
                    className="da-clear-steps-btn"
                    onClick={clearAllSteps}
                  >
                    <Icon name="trash" size={14} />
                    <span>Clear {completedSteps.length} completed steps</span>
                  </button>
                )}
              </div>

              {!canAnalyze && (
                <p className="section-copy">
                  Complete an extraction for this provider before running statistical analysis.
                </p>
              )}
              {canAnalyze && selectedMethods.length === 0 && completedSteps.length === 0 && (
                <p className="section-copy">
                  Select one or more compatible analysis methods above, or click{" "}
                  <strong>Run step</strong> on any method card to execute step-by-step.
                </p>
              )}
            </section>

            <section className="variable-card">
              <div className="variable-top">
                <div className="variable-icon">
                  <Icon name="thermometer" size={18} />
                </div>
                <div>
                  <div className="eyebrow">Selected variable</div>
                  <h2>{dataset.name}</h2>
                </div>
                <button
                  className="icon-button"
                  aria-label="Variable information"
                  title={`${dataset.source} variable ${dataset.code}`}
                  type="button"
                >
                  <Icon name="info" size={17} />
                </button>
              </div>
              <p>{dataset.description}</p>
              <div className="metadata">
                <span>
                  <small>Units</small>
                  <strong>{dataset.unit}</strong>
                </span>
                <span>
                  <small>Source</small>
                  <strong>{extractedPreview?.product.source_api || dataset.source}</strong>
                </span>
              </div>
            </section>
          </div>
        </aside>

        <section className="analysis-panel" aria-live="polite">
          {completedSteps.length > 0 && extractedPreview && (
            <div style={{ padding: "16px 32px 0" }}>
              <Link
                className="btn btn-primary"
                href={`/workspace/visualize?jobId=${encodeURIComponent(
                  extractedPreview.job_id,
                )}`}
              >
                Explore in Visualization Studio →
              </Link>
            </div>
          )}

          {analysis === "loading" && completedSteps.length === 0 && <LoadingState />}

          {analysis === "error" && completedSteps.length === 0 && (
            <AnalysisErrorState
              message={analysisError}
              onRetry={() =>
                void executeMethods(
                  selectedMethods.length > 0 ? selectedMethods : ["ols"],
                )
              }
            />
          )}

          {completedSteps.length === 0 &&
            analysis !== "loading" &&
            analysis !== "error" &&
            (canAnalyze ? (
              <SelectionPrompt
                selectedCount={selectedMethods.length}
                cadence={activeCadence}
                compatibleCount={compatibleMethodsCount}
              />
            ) : (
              <EmptyState />
            ))}

          {completedSteps.length > 0 && latestCaseFile && (
            <CumulativeResultsPane
              latestCaseFile={latestCaseFile}
              completedSteps={completedSteps}
              isRunningMore={analysis === "loading"}
              runningMethods={RunningMethods}
              analysisError={analysisError}
              signalMode={signalMode}
              setSignalMode={setSignalMode}
              currentSeasonal={seasonalAdjustment}
              currentParameters={parameters}
              onReRunMethod={(method) => void executeMethods([method])}
              onRemoveMethod={removeCompletedStep}
              onClearAll={clearAllSteps}
              onNotify={notify}
            />
          )}
        </section>
      </main>
      {toast && (
        <div className="toast" role="status">
          <Icon name="check" size={17} />
          {toast}
        </div>
      )}
    </div>
  );
}

function MethodParameterControls({
  method,
  parameters,
  onUpdate,
}: {
  method: AnalysisMethod;
  parameters: AnalysisParameters;
  onUpdate: <K extends keyof AnalysisParameters>(
    key: K,
    value: AnalysisParameters[K],
  ) => void;
}) {
  return (
    <div className="da-param-drawer" aria-label={`Parameters for ${method}`}>
      {(method === "ols" ||
        method === "hamed_rao_mk" ||
        method === "seasonal_kendall" ||
        method === "pettitt" ||
        method === "case_file_diagnostics") && (
        <div className="da-param-row">
          <label htmlFor={`param-alpha-${method}`}>Significance threshold (α)</label>
          <select
            id={`param-alpha-${method}`}
            value={String(parameters.alpha)}
            onChange={(e) => onUpdate("alpha", Number(e.target.value))}
          >
            <option value="0.01">α = 0.01 (99% confidence)</option>
            <option value="0.05">α = 0.05 (95% confidence · standard)</option>
            <option value="0.1">α = 0.10 (90% confidence · screening)</option>
          </select>
        </div>
      )}

      {method === "ols" && (
        <div className="da-param-row">
          <label htmlFor="param-ols-ac">Serial correlation adjustment</label>
          <select
            id="param-ols-ac"
            value={parameters.ols_autocorrelation_adjustment ? "adjusted" : "unadjusted"}
            onChange={(e) =>
              onUpdate(
                "ols_autocorrelation_adjustment",
                e.target.value === "adjusted",
              )
            }
          >
            <option value="adjusted">Quenouille–Santer n_eff SE adjustment</option>
            <option value="unadjusted">Classical unadjusted OLS (df = n − 2)</option>
          </select>
        </div>
      )}

      {method === "hamed_rao_mk" && (
        <>
          <div className="da-param-row">
            <label htmlFor="param-mk-corr">Variance formulation</label>
            <select
              id="param-mk-corr"
              value={parameters.mk_autocorrelation_correction}
              onChange={(e) =>
                onUpdate(
                  "mk_autocorrelation_correction",
                  e.target.value as "hamed_rao" | "none",
                )
              }
            >
              <option value="hamed_rao">Hamed–Rao (1998) autocorrelation-adjusted</option>
              <option value="none">Classical Mann–Kendall (independent ranks)</option>
            </select>
          </div>
          <div className="da-param-row">
            <label htmlFor="param-mk-lag">Max autocorrelation lag (k)</label>
            <select
              id="param-mk-lag"
              value={String(parameters.mk_max_lag)}
              onChange={(e) => onUpdate("mk_max_lag", Number(e.target.value))}
            >
              <option value="3">Up to 3 lags</option>
              <option value="6">Up to 6 lags</option>
              <option value="12">Up to 12 lags (1 annual cycle)</option>
              <option value="24">Up to 24 lags (2 annual cycles)</option>
            </select>
          </div>
        </>
      )}

      {method === "seasonal_kendall" && (
        <div className="da-param-row">
          <label htmlFor="param-sk-years">Min years per calendar month</label>
          <select
            id="param-sk-years"
            value={String(parameters.seasonal_kendall_min_years)}
            onChange={(e) =>
              onUpdate("seasonal_kendall_min_years", Number(e.target.value))
            }
          >
            <option value="2">≥ 2 years per month</option>
            <option value="3">≥ 3 years per month (recommended)</option>
            <option value="5">≥ 5 years per month (strict)</option>
          </select>
        </div>
      )}

      {method === "sen_slope" && (
        <>
          <div className="da-param-row">
            <label htmlFor="param-sen-ci">Rank confidence interval</label>
            <select
              id="param-sen-ci"
              value={String(parameters.sens_confidence_level)}
              onChange={(e) =>
                onUpdate("sens_confidence_level", Number(e.target.value))
              }
            >
              <option value="0.9">90% confidence corridor</option>
              <option value="0.95">95% confidence corridor (standard)</option>
              <option value="0.99">99% confidence corridor</option>
            </select>
          </div>
          <div className="da-param-row">
            <label htmlFor="param-sen-scale">Display rate unit</label>
            <select
              id="param-sen-scale"
              value={parameters.sens_rate_scale}
              onChange={(e) =>
                onUpdate("sens_rate_scale", e.target.value as "decade" | "year")
              }
            >
              <option value="decade">Per decade (unit / decade)</option>
              <option value="year">Per year (unit / year)</option>
            </select>
          </div>
        </>
      )}

      {method === "pettitt" && (
        <div className="da-param-row">
          <label htmlFor="param-pettitt-seg">Min observations per regime segment</label>
          <select
            id="param-pettitt-seg"
            value={String(parameters.pettitt_min_segment)}
            onChange={(e) =>
              onUpdate("pettitt_min_segment", Number(e.target.value))
            }
          >
            <option value="3">≥ 3 observations per regime</option>
            <option value="6">≥ 6 observations per regime (default)</option>
            <option value="12">≥ 12 observations per regime (1 year monthly)</option>
          </select>
        </div>
      )}

      {method === "anomalies" && (
        <>
          <div className="da-param-row">
            <label htmlFor="param-anom-z">Extreme flagging threshold (|z| ≥ τ)</label>
            <select
              id="param-anom-z"
              value={String(parameters.anomaly_z_threshold)}
              onChange={(e) =>
                onUpdate("anomaly_z_threshold", Number(e.target.value))
              }
            >
              <option value="1.5">|z| ≥ 1.5 (moderate departure cue)</option>
              <option value="2">|z| ≥ 2.0 (standard 2σ review cue)</option>
              <option value="2.5">|z| ≥ 2.5 (severe departure)</option>
              <option value="3">|z| ≥ 3.0 (extreme tail event)</option>
            </select>
          </div>
          <div className="da-param-row">
            <label htmlFor="param-anom-disp">Scale dispersion estimator</label>
            <select
              id="param-anom-disp"
              value={parameters.anomaly_dispersion_method}
              onChange={(e) =>
                onUpdate(
                  "anomaly_dispersion_method",
                  e.target.value as "mad" | "std",
                )
              }
            >
              <option value="mad">Robust MAD (1.4826 × median|a − med|)</option>
              <option value="std">Classical sample standard deviation (SD)</option>
            </select>
          </div>
        </>
      )}

      {method === "seasonal_fingerprint" && (
        <div className="da-param-row">
          <label htmlFor="param-fp-cap">Heatmap color saturation cap (|z|)</label>
          <select
            id="param-fp-cap"
            value={String(parameters.fingerprint_color_cap)}
            onChange={(e) =>
              onUpdate("fingerprint_color_cap", Number(e.target.value))
            }
          >
            <option value="1.5">±1.5 z (high contrast for subtle anomalies)</option>
            <option value="2">±2.0 z</option>
            <option value="2.5">±2.5 z (balanced default)</option>
            <option value="3">±3.0 z (highlight extreme tails)</option>
          </select>
        </div>
      )}

      {method === "case_file_diagnostics" && (
        <>
          <div className="da-param-row">
            <label htmlFor="param-cf-horizon">Outlook continuation horizon</label>
            <select
              id="param-cf-horizon"
              value={String(parameters.outlook_horizon_years)}
              onChange={(e) =>
                onUpdate("outlook_horizon_years", Number(e.target.value))
              }
            >
              <option value="3">+3 years</option>
              <option value="6">+6 years (default)</option>
              <option value="10">+10 years (1 decade)</option>
              <option value="15">+15 years</option>
            </select>
          </div>
          <div className="da-param-row">
            <label htmlFor="param-cf-stripes">Stripes min valid months/year</label>
            <select
              id="param-cf-stripes"
              value={String(parameters.stripes_min_months)}
              onChange={(e) =>
                onUpdate("stripes_min_months", Number(e.target.value))
              }
            >
              <option value="6">≥ 6 valid months/year</option>
              <option value="9">≥ 9 valid months/year</option>
              <option value="10">≥ 10 valid months/year (WMO-style rule)</option>
              <option value="12">12 complete months/year</option>
            </select>
          </div>
          <div className="da-param-row">
            <label htmlFor="param-cf-tri">Trend triangle min sub-window</label>
            <select
              id="param-cf-tri"
              value={String(parameters.triangle_min_window_years)}
              onChange={(e) =>
                onUpdate("triangle_min_window_years", Number(e.target.value))
              }
            >
              <option value="3">≥ 3 years</option>
              <option value="5">≥ 5 years (default)</option>
              <option value="8">≥ 8 years</option>
              <option value="10">≥ 10 years</option>
            </select>
          </div>
        </>
      )}
    </div>
  );
}

function SelectionPrompt({
  selectedCount,
  cadence,
  compatibleCount,
}: {
  selectedCount: number;
  cadence: DataCadence;
  compatibleCount: number;
}) {
  return (
    <div className="empty-state">
      <div className="empty-kicker">
        <span /> Ready for your step-by-step analysis
      </div>
      <h2>Select methods to explore this {cadence.toLowerCase()} series</h2>
      <p>
        Choose a seasonal treatment, adjust method parameters, and run analyses one step at a time
        or together. Each completed analysis method renders in its own dedicated section on this
        pane and is preserved while you add subsequent tests.
      </p>
      <div className="empty-features">
        <span>
          <Icon name="activity" size={15} /> {selectedCount} methods queued
        </span>
        <span>
          <Icon name="check" size={15} /> {compatibleCount} compatible with {cadence} data
        </span>
        <span>
          <Icon name="download" size={15} /> Downloadable PNG charts &amp; CSV/JSON
        </span>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-visual">
        <div className="scan-ring ring-one" />
        <div className="scan-ring ring-two" />
        <Icon name="globe" size={72} />
        <div className="lens">
          <Icon name="search" size={34} />
        </div>
        <span className="scan-dot dot-one" />
        <span className="scan-dot dot-two" />
        <span className="scan-dot dot-three" />
      </div>
      <div className="empty-kicker">
        <span /> Awaiting observations
      </div>
      <h2>No extracted series is loaded</h2>
      <p>
        Choose a dataset, complete an extraction, and open Data Analysis from its verified
        preview. This page does not substitute demo or generated values for observations.
      </p>
      <a className="run-button" href="/workspace/intelligence">
        Find real data <Icon name="arrow" size={16} />
      </a>
      <div className="empty-features">
        <span>
          <Icon name="activity" size={15} /> Step-by-step trend tests
        </span>
        <span>
          <Icon name="layers" size={15} /> Seasonal fingerprint
        </span>
        <span>
          <Icon name="file" size={15} /> PNG, CSV &amp; JSON exports
        </span>
      </div>
    </div>
  );
}

function AnalysisErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="empty-state" role="alert">
      <div className="empty-kicker">Analysis unavailable</div>
      <h2>No statistical result was produced</h2>
      <p>{message}</p>
      <button onClick={onRetry} type="button">
        Retry analysis <Icon name="arrow" size={16} />
      </button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="results results-loading">
      <div className="loading-status">
        <span className="radar">
          <i />
        </span>
        <div>
          <strong>Analyzing the observed series</strong>
          <p>Applying seasonal adjustment, trend tests, and confidence intervals…</p>
        </div>
      </div>
      <div className="skeleton verdict-skeleton" />
      <div className="metrics-grid">
        {[1, 2, 3, 4].map((item) => (
          <div className="metric skeleton-card" key={item}>
            <i />
            <b />
          </div>
        ))}
      </div>
      <div className="chart-card skeleton-chart">
        <div className="skeleton-line short" />
        <div className="skeleton-line" />
        <div className="chart-pulse">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      </div>
    </div>
  );
}

function CumulativeResultsPane({
  latestCaseFile,
  completedSteps,
  isRunningMore,
  runningMethods,
  analysisError,
  signalMode,
  setSignalMode,
  currentSeasonal,
  currentParameters,
  onReRunMethod,
  onRemoveMethod,
  onClearAll,
  onNotify,
}: {
  latestCaseFile: CaseFileAnalysisResponse;
  completedSteps: CompletedMethodStep[];
  isRunningMore: boolean;
  runningMethods: AnalysisMethod[];
  analysisError: string;
  signalMode: SignalMode;
  setSignalMode: (value: SignalMode) => void;
  currentSeasonal: SeasonalAdjustment;
  currentParameters: AnalysisParameters;
  onReRunMethod: (method: AnalysisMethod) => void;
  onRemoveMethod: (method: AnalysisMethod) => void;
  onClearAll: () => void;
  onNotify: (message: string) => void;
}) {
  const overviewChartSvgRef = useRef<SVGSVGElement | null>(null);

  const exportCsv = () => {
    const header =
      "timestamp,value,seasonal_component,deseasonalized_value,anomaly_z,ols_trend,sen_trend,qa_flag\n";
    const rows = latestCaseFile.analysis_series
      .map((row) =>
        [
          row.timestamp,
          row.value ?? "",
          row.seasonal_component ?? "",
          row.deseasonalized_value ?? "",
          row.anomaly_z ?? "",
          row.ols_trend ?? "",
          row.sen_trend ?? "",
          row.qa_flag,
        ].join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([header + rows], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `iris-${latestCaseFile.result_id}-observations.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onNotify("Observed series and derived columns exported as CSV");
  };

  const completedMethodIds = useMemo(
    () => completedSteps.map((s) => s.method),
    [completedSteps],
  );

  const validValues = useMemo(
    () =>
      latestCaseFile.analysis_series
        .filter((r) => r.qa_flag === "Valid" && r.value !== null && Number.isFinite(r.value))
        .map((r) => r.value as number),
    [latestCaseFile.analysis_series],
  );

  const seriesStats = useMemo(() => {
    if (!validValues.length) return { min: 0, max: 0, mean: 0 };
    const min = Math.min(...validValues);
    const max = Math.max(...validValues);
    const mean = validValues.reduce((acc, v) => acc + v, 0) / validValues.length;
    return { min, max, mean };
  }, [validValues]);

  return (
    <div className="results">
      {/* HEADER & CUMULATIVE STEP LOG BAR */}
      <div className="result-header">
        <div>
          <div className="section-kicker">
            <span>{latestCaseFile.result_id}</span> Cumulative Analysis Workbench ·{" "}
            {completedSteps.length}{" "}
            {completedSteps.length === 1 ? "method section" : "method sections"} active
          </div>
          <h1>{latestCaseFile.dataset_name} analysis</h1>
          <p>
            {latestCaseFile.location} · {latestCaseFile.start_year}–{latestCaseFile.end_year} ·{" "}
            {latestCaseFile.source_agency} ·{" "}
            <strong>{latestCaseFile.valid_months_count}</strong> valid observations (
            {latestCaseFile.completeness_pct}% coverage)
          </p>
        </div>
      </div>

      {/* STEP-BY-STEP SECTION JUMP BAR */}
      <nav className="da-step-nav-bar" aria-label="Completed analysis sections">
        <div className="da-step-nav-head">
          <span>
            <Icon name="layers" size={14} /> Step-by-Step Analysis Sections (
            {completedSteps.length})
          </span>
          <small>
            Run additional methods from the left pane at any time—previous sections stay intact.
          </small>
        </div>
        <div className="da-step-pills">
          <a href="#section-overview" className="da-step-pill overview">
            <span>Base</span> Observed Series
          </a>
          {completedSteps.map((step) => {
            const meta = ANALYSIS_METHODS.find((m) => m.id === step.method);
            return (
              <a
                key={step.method}
                href={`#section-${step.method}`}
                className="da-step-pill"
              >
                <span>Step {step.stepNumber}</span>
                <strong>{meta?.shortLabel || step.method}</strong>
                <small>{step.ranAt}</small>
              </a>
            );
          })}
          {completedSteps.length > 1 && (
            <button
              type="button"
              className="da-step-pill-clear"
              onClick={onClearAll}
            >
              Clear all
            </button>
          )}
        </div>
      </nav>

      {isRunningMore && (
        <div className="loading-status" style={{ marginBottom: 16 }}>
          <span className="radar">
            <i />
          </span>
          <div>
            <strong>
              Running{" "}
              {runningMethods
                .map((m) => ANALYSIS_METHODS.find((item) => item.id === m)?.shortLabel || m)
                .join(", ")}
              …
            </strong>
            <p>Existing analysis sections are preserved while new results are computed.</p>
          </div>
        </div>
      )}

      {analysisError && (
        <div className="da-inline-error" role="alert">
          <Icon name="alert" size={16} />
          <span>{analysisError}</span>
        </div>
      )}

      {/* BASE SECTION: OBSERVED TIME SERIES & SIGNAL DECOMPOSITION */}
      <section className="chart-card da-method-section" id="section-overview">
        <div className="chart-header">
          <div>
            <div className="chart-title-row">
              <span className="da-section-step-tag">Base Signal</span>
              <h2>{latestCaseFile.dataset_name} over time</h2>
              <span className="data-chip">
                {latestCaseFile.analysis_series.length} timestamps
              </span>
            </div>
            <p>
              {latestCaseFile.source_agency} · {latestCaseFile.unit} · Min{" "}
              <strong>{seriesStats.min.toFixed(2)}</strong> · Mean{" "}
              <strong>{seriesStats.mean.toFixed(2)}</strong> · Max{" "}
              <strong>{seriesStats.max.toFixed(2)}</strong> {latestCaseFile.unit}
            </p>
          </div>
          <div className="exports">
            <button
              onClick={() =>
                void downloadSvgElementAsPng(
                  overviewChartSvgRef.current,
                  `iris-${latestCaseFile.result_id}-${signalMode}-series.png`,
                  `${latestCaseFile.dataset_name} (${signalMode.toUpperCase()} SIGNAL)`,
                  `${latestCaseFile.location} · ${latestCaseFile.start_year}–${latestCaseFile.end_year} · ${latestCaseFile.unit}`,
                  onNotify,
                )
              }
              title="Download chart as PNG image"
              type="button"
            >
              <Icon name="download" size={15} />
              <span>Download PNG</span>
            </button>
            <button onClick={exportCsv} title="Download CSV" type="button">
              <Icon name="download" size={15} />
              <span>CSV</span>
            </button>
          </div>
        </div>

        <div className="chart-controls">
          <div className="segmented" role="group" aria-label="Chart signal type">
            <button
              className={signalMode === "raw" ? "active" : ""}
              onClick={() => setSignalMode("raw")}
              type="button"
            >
              Raw signal
            </button>
            <button
              hidden={latestCaseFile.requested_seasonal_adjustment === "none"}
              className={signalMode === "seasonal" ? "active" : ""}
              onClick={() => setSignalMode("seasonal")}
              type="button"
            >
              Seasonal cycle
            </button>
            <button
              className={signalMode === "anomaly" ? "active" : ""}
              onClick={() => setSignalMode("anomaly")}
              type="button"
            >
              Deseasonalized anomaly
            </button>
          </div>
          <div className="legend">
            <span>
              <i className="series-dot" />{" "}
              {signalMode === "raw"
                ? "Observed values"
                : signalMode === "seasonal"
                  ? "Extracted seasonal cycle"
                  : "Deseasonalized anomaly"}
            </span>
            {signalMode === "anomaly" && completedMethodIds.includes("sen_slope") && (
              <span>
                <i className="trend-line" /> Sen’s slope
              </span>
            )}
            {signalMode === "anomaly" && completedMethodIds.includes("anomalies") && (
              <span>
                <i className="anomaly-dot" /> Flagged anomalies
              </span>
            )}
          </div>
        </div>

        <TimeSeriesChart
          svgRef={overviewChartSvgRef}
          mode={signalMode}
          series={latestCaseFile.analysis_series}
          unit={latestCaseFile.unit}
          showSenTrend={completedMethodIds.includes("sen_slope")}
          anomalyThreshold={
            latestCaseFile.anomaly_threshold_used ?? currentParameters.anomaly_z_threshold
          }
        />
      </section>

      {/* RENDER EACH COMPLETED ANALYSIS IN ITS OWN DEDICATED SECTION ON THE RIGHT PANE */}
      {completedSteps.map((step) => {
        const meta = ANALYSIS_METHODS.find((m) => m.id === step.method)!;
        const isStale =
          getMethodParameterSignature(
            step.method,
            step.seasonalAdjustment,
            step.parameters,
          ) !==
          getMethodParameterSignature(
            step.method,
            currentSeasonal,
            currentParameters,
          );

        return (
          <MethodResultSectionWrapper
            key={step.method}
            step={step}
            meta={meta}
            isStale={isStale}
            onReRun={() => onReRunMethod(step.method)}
            onRemove={() => onRemoveMethod(step.method)}
            onNotify={onNotify}
          />
        );
      })}
    </div>
  );
}

function MethodResultSectionWrapper({
  step,
  meta,
  isStale,
  onReRun,
  onRemove,
  onNotify,
}: {
  step: CompletedMethodStep;
  meta: MethodCatalogEntry;
  isStale: boolean;
  onReRun: () => void;
  onRemove: () => void;
  onNotify: (msg: string) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { caseFile, parameters } = step;

  return (
    <section
      className="chart-card da-method-section"
      id={`section-${step.method}`}
      aria-label={`${meta.label} analysis section`}
    >
      <div className="da-section-header">
        <div>
          <div className="da-section-badges">
            <span className="da-section-step-tag">Step {step.stepNumber}</span>
            <span className="da-method-cat">{meta.category}</span>
            <span className="da-section-time">Executed at {step.ranAt}</span>
            {isStale && (
              <span className="da-stale-pill">
                Parameters modified in sidebar · Click Re-run to update
              </span>
            )}
          </div>
          <div className="da-section-title-row">
            <h2>{meta.label}</h2>
            <a
              href={getDocPageUrl(meta.docPageId)}
              target="_blank"
              rel="noopener noreferrer"
              className="da-section-doc-link"
              title={`Open ${meta.label} documentation in a new tab`}
            >
              <Icon name="book" size={13} />
              <span>Method Docs ↗</span>
            </a>
          </div>
          <p className="da-section-subtitle">
            Seasonal treatment: <strong>{caseFile.seasonal_adjustment_method}</strong> · Valid
            observations: <strong>{caseFile.valid_months_count}</strong> (
            {caseFile.completeness_pct}% completeness)
          </p>
        </div>

        <div className="exports">
          {step.method !== "case_file_diagnostics" && (
            <button
              type="button"
              onClick={() =>
                void downloadSvgElementAsPng(
                  svgRef.current,
                  `iris-${caseFile.result_id}-${step.method}.png`,
                  `${meta.label} — ${caseFile.dataset_name}`,
                  `${caseFile.location} (${caseFile.start_year}–${caseFile.end_year}) · ${caseFile.seasonal_adjustment_method}`,
                  onNotify,
                )
              }
              title="Download this section's graph as PNG"
            >
              <Icon name="download" size={14} />
              <span>Download PNG</span>
            </button>
          )}
          <button
            type="button"
            onClick={onReRun}
            title="Re-run this analysis method with current sidebar parameters"
          >
            <Icon name="activity" size={14} />
            <span>Re-run</span>
          </button>
          <button
            type="button"
            onClick={onRemove}
            title="Remove this analysis section"
          >
            <Icon name="trash" size={14} />
          </button>
        </div>
      </div>

      {step.method === "ols" && (
        <OlsSectionBody
          caseFile={caseFile}
          parameters={parameters}
          svgRef={svgRef}
        />
      )}
      {step.method === "hamed_rao_mk" && (
        <HamedRaoSectionBody
          caseFile={caseFile}
          parameters={parameters}
          svgRef={svgRef}
        />
      )}
      {step.method === "seasonal_kendall" && (
        <SeasonalKendallSectionBody
          caseFile={caseFile}
          parameters={parameters}
          svgRef={svgRef}
        />
      )}
      {step.method === "sen_slope" && (
        <SenSlopeSectionBody
          caseFile={caseFile}
          parameters={parameters}
          svgRef={svgRef}
        />
      )}
      {step.method === "pettitt" && (
        <PettittSectionBody
          caseFile={caseFile}
          parameters={parameters}
          svgRef={svgRef}
        />
      )}
      {step.method === "anomalies" && (
        <AnomaliesSectionBody
          caseFile={caseFile}
          parameters={parameters}
          svgRef={svgRef}
        />
      )}
      {step.method === "seasonal_fingerprint" && (
        <SeasonalFingerprintSectionBody
          caseFile={caseFile}
          parameters={parameters}
          svgRef={svgRef}
        />
      )}
      {step.method === "case_file_diagnostics" && (
        <CaseFileDiagnosticsSection
          caseFile={caseFile}
          onNotify={onNotify}
        />
      )}
    </section>
  );
}

/* ============================================================================
 * 1. OLS LINEAR TREND SECTION
 * ========================================================================== */
function OlsSectionBody({
  caseFile,
  parameters,
  svgRef,
}: {
  caseFile: CaseFileAnalysisResponse;
  parameters: AnalysisParameters;
  svgRef: RefObject<SVGSVGElement | null>;
}) {
  const alpha = parameters.alpha;
  const isSig = caseFile.ols_p_value < alpha;
  const r2 = caseFile.ols_r_squared ?? 0;
  const se = caseFile.ols_std_error_decadal ?? 0;

  const validRows = useMemo(
    () =>
      caseFile.analysis_series.filter(
        (r) =>
          r.qa_flag === "Valid" &&
          r.deseasonalized_value !== null &&
          r.ols_trend !== null,
      ),
    [caseFile.analysis_series],
  );

  const chart = useMemo(() => {
    if (validRows.length < 2) return null;
    const xMin = Date.parse(validRows[0].timestamp);
    const xMax = Date.parse(validRows[validRows.length - 1].timestamp);
    const values = validRows.map((r) => r.deseasonalized_value as number);
    const trends = validRows.map((r) => r.ols_trend as number);
    const yMinRaw = Math.min(...values, ...trends);
    const yMaxRaw = Math.max(...values, ...trends);
    const pad = (yMaxRaw - yMinRaw) * 0.14 || 0.5;
    const yMin = yMinRaw - pad;
    const yMax = yMaxRaw + pad;

    const x = (ts: number) => 64 + ((ts - xMin) / Math.max(1, xMax - xMin)) * 736;
    const y = (val: number) => 210 - ((val - yMin) / Math.max(1e-6, yMax - yMin)) * 172;

    const midTs = (xMin + xMax) / 2;
    const midTrend = trends[Math.floor(trends.length / 2)];
    const ciUpperPts: string[] = [];
    const ciLowerPts: string[] = [];
    for (const row of validRows) {
      const ts = Date.parse(row.timestamp);
      const dtDecades = (ts - midTs) / (10 * 365.25 * 86400 * 1000);
      const halfBand =
        Math.abs(
          (caseFile.ols_ci_high_decadal - caseFile.ols_ci_low_decadal) / 2,
        ) *
          Math.abs(dtDecades) +
        (yMaxRaw - yMinRaw) * 0.04;
      const tr = row.ols_trend as number;
      ciUpperPts.push(`${x(ts).toFixed(1)},${y(tr + halfBand).toFixed(1)}`);
      ciLowerPts.unshift(`${x(ts).toFixed(1)},${y(tr - halfBand).toFixed(1)}`);
    }

    const obsPolyline = validRows
      .map((r) => `${x(Date.parse(r.timestamp)).toFixed(1)},${y(r.deseasonalized_value as number).toFixed(1)}`)
      .join(" ");
    const olsPolyline = validRows
      .map((r) => `${x(Date.parse(r.timestamp)).toFixed(1)},${y(r.ols_trend as number).toFixed(1)}`)
      .join(" ");

    const ticks = Array.from({ length: 5 }, (_, i) => {
      const v = yMax - ((yMax - yMin) * i) / 4;
      return { value: v, y: y(v) };
    });

    return {
      xMin,
      xMax,
      ticks,
      obsPolyline,
      olsPolyline,
      ciPolygon: [...ciUpperPts, ...ciLowerPts].join(" "),
      startVal: trends[0],
      endVal: trends[trends.length - 1],
      startX: x(xMin),
      startY: y(trends[0]),
      endX: x(xMax),
      endY: y(trends[trends.length - 1]),
      midTrend,
    };
  }, [
    validRows,
    caseFile.ols_ci_high_decadal,
    caseFile.ols_ci_low_decadal,
  ]);

  return (
    <div className="da-section-body">
      <div className="metrics-grid">
        <Metric
          label="OLS Decadal Slope (β₁)"
          value={formatSigned(caseFile.ols_slope_decadal)}
          unit={`${caseFile.unit} / decade`}
          detail={`95% CI [${formatSigned(caseFile.ols_ci_low_decadal)}, ${formatSigned(
            caseFile.ols_ci_high_decadal,
          )}]`}
          tone={isSig ? "positive" : undefined}
        />
        <Metric
          label="Student t-Test"
          value={`p = ${formatPValue(caseFile.ols_p_value)}`}
          unit={`t(${caseFile.ols_t_degrees_freedom}) = ${caseFile.ols_t_statistic}`}
          detail={
            isSig
              ? `Rejects H₀ at α = ${alpha} (significant linear trend)`
              : `Does not reject H₀ at α = ${alpha}`
          }
          tone={isSig ? "positive" : undefined}
        />
        <Metric
          label="Variance Explained (R²)"
          value={`${(r2 * 100).toFixed(1)}%`}
          unit={`R² = ${r2.toFixed(4)}`}
          detail={`Slope SE = ${se.toFixed(4)} ${caseFile.unit}/dec`}
        />
        <Metric
          label="Serial Correlation Rule"
          value={
            parameters.ols_autocorrelation_adjustment
              ? `Adjusted (df=${caseFile.ols_t_degrees_freedom})`
              : `Unadjusted (df=${caseFile.ols_t_degrees_freedom})`
          }
          unit={`r₁ = ${caseFile.lag1_autocorrelation}`}
          detail={`n_eff = ${caseFile.effective_sample_size_n_eff} of ${caseFile.valid_months_count} obs`}
        />
      </div>

      {chart && (
        <div className="chart-wrap">
          <svg
            ref={svgRef}
            viewBox="0 0 840 255"
            role="img"
            aria-label={`OLS linear regression fit on deseasonalized series for ${caseFile.dataset_name}`}
          >
            {chart.ticks.map((t) => (
              <g key={t.value}>
                <line x1="60" x2="804" y1={t.y} y2={t.y} className="grid-line" />
                <text x="8" y={t.y + 3}>
                  {t.value.toFixed(2)}
                </text>
              </g>
            ))}
            <polygon points={chart.ciPolygon} className="ci-area" />
            <polyline points={chart.obsPolyline} className="data-line" />
            <polyline points={chart.olsPolyline} className="ols-line" />
            <circle cx={chart.startX} cy={chart.startY} r="4.5" fill="#0ea5e9" />
            <circle cx={chart.endX} cy={chart.endY} r="4.5" fill="#0ea5e9" />
            <text x={chart.startX + 6} y={chart.startY - 8}>
              Start: {chart.startVal.toFixed(2)} {caseFile.unit}
            </text>
            <text x={chart.endX - 6} y={chart.endY - 8} textAnchor="end">
              End: {chart.endVal.toFixed(2)} {caseFile.unit} (β ={" "}
              {formatSigned(caseFile.ols_slope_decadal)}/dec)
            </text>
            <text x="64" y="242">
              {new Date(chart.xMin).getUTCFullYear()}
            </text>
            <text x="800" y="242" textAnchor="end">
              {new Date(chart.xMax).getUTCFullYear()}
            </text>
          </svg>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * 2. HAMED–RAO MANN–KENDALL SECTION
 * ========================================================================== */
function HamedRaoSectionBody({
  caseFile,
  parameters,
  svgRef,
}: {
  caseFile: CaseFileAnalysisResponse;
  parameters: AnalysisParameters;
  svgRef: RefObject<SVGSVGElement | null>;
}) {
  const alpha = parameters.alpha;
  const isSig = caseFile.hamed_rao_mk_p < alpha;
  const direction = caseFile.hamed_rao_mk_z >= 0 ? "increasing" : "decreasing";
  const lags = caseFile.lag_autocorrelations ?? [];
  const ciBound =
    caseFile.valid_months_count > 0
      ? 1.96 / Math.sqrt(caseFile.valid_months_count)
      : 0.2;

  return (
    <div className="da-section-body">
      <div className="verdict" style={{ marginBottom: 14 }}>
        <div className="verdict-icon">
          <Icon name="arrow" size={22} />
        </div>
        <div className="verdict-body">
          <div className="verdict-label">
            {parameters.mk_autocorrelation_correction === "hamed_rao"
              ? "Hamed–Rao Autocorrelation-Adjusted Mann–Kendall Verdict"
              : "Classical Mann–Kendall Verdict"}
          </div>
          <h2>
            {isSig
              ? `Statistically significant ${direction} monotonic trend (p = ${formatPValue(
                  caseFile.hamed_rao_mk_p,
                )} < α = ${alpha})`
              : `No statistically significant ${direction} monotonic trend at α = ${alpha} (p = ${formatPValue(
                  caseFile.hamed_rao_mk_p,
                )})`}
          </h2>
          <p>
            Kendall’s rank concordance τ = <strong>{caseFile.kendall_tau}</strong> with{" "}
            Z = <strong>{caseFile.hamed_rao_mk_z}</strong> and Benjamini–Hochberg FDR{" "}
            q = <strong>{formatPValue(caseFile.fdr_q_value)}</strong>.
          </p>
        </div>
        <div className="confidence">
          <small>Effective Sample Size</small>
          <strong>{caseFile.effective_sample_size_n_eff}</strong>
          <span>of {caseFile.valid_months_count} valid obs</span>
        </div>
      </div>

      <div className="metrics-grid">
        <Metric
          label="Mann–Kendall p-value"
          value={formatPValue(caseFile.hamed_rao_mk_p)}
          unit={`α = ${alpha}`}
          detail={`Two-sided Z = ${caseFile.hamed_rao_mk_z}`}
          tone={isSig ? "positive" : undefined}
        />
        <Metric
          label="Kendall’s Tau (τ)"
          value={formatSigned(caseFile.kendall_tau)}
          unit="rank concordance"
          detail="Proportion of concordant minus discordant pairs"
        />
        <Metric
          label="Lag-1 Autocorrelation (r₁)"
          value={String(caseFile.lag1_autocorrelation)}
          unit={`max lag k = ${parameters.mk_max_lag}`}
          detail={`95% noise bound ±${ciBound.toFixed(3)}`}
        />
        <Metric
          label="BH-FDR Adjusted q"
          value={formatPValue(caseFile.fdr_q_value)}
          unit="multi-test control"
          detail="Controls false discovery rate across tests"
        />
      </div>

      {/* SERIAL RANK AUTOCORRELATION CORRELOGRAM SVG */}
      <div className="chart-wrap" style={{ height: 220 }}>
        <svg
          ref={svgRef}
          viewBox="0 0 840 210"
          role="img"
          aria-label="Serial rank autocorrelation correlogram r_k across lags with 95% significance bounds"
        >
          {[-0.5, -0.25, 0, 0.25, 0.5, 0.75].map((tick) => {
            const yPos = 115 - tick * 120;
            return (
              <g key={tick}>
                <line x1="62" x2="800" y1={yPos} y2={yPos} className="grid-line" />
                <text x="10" y={yPos + 3}>
                  {tick.toFixed(2)}
                </text>
              </g>
            );
          })}
          {/* +1.96/sqrt(n) and -1.96/sqrt(n) significance threshold lines */}
          <line
            x1="62"
            x2="800"
            y1={115 - ciBound * 120}
            y2={115 - ciBound * 120}
            stroke="#f59e0b"
            strokeWidth="1.4"
            strokeDasharray="5 4"
          />
          <line
            x1="62"
            x2="800"
            y1={115 + ciBound * 120}
            y2={115 + ciBound * 120}
            stroke="#f59e0b"
            strokeWidth="1.4"
            strokeDasharray="5 4"
          />
          <text x="796" y={115 - ciBound * 120 - 5} textAnchor="end" fill="#f59e0b">
            +95% bound (+{ciBound.toFixed(2)})
          </text>

          {lags.map((item, idx) => {
            const spacing = 680 / Math.max(1, lags.length);
            const barX = 86 + idx * spacing;
            const zeroY = 115;
            const valY = 115 - Math.max(-0.7, Math.min(0.85, item.r)) * 120;
            const exceeds = Math.abs(item.r) >= ciBound;
            return (
              <g key={item.lag}>
                <line
                  x1={barX}
                  x2={barX}
                  y1={zeroY}
                  y2={valY}
                  stroke={exceeds ? "var(--green-bright)" : "var(--muted)"}
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <circle
                  cx={barX}
                  cy={valY}
                  r="4.5"
                  fill={exceeds ? "var(--green-bright)" : "var(--text)"}
                >
                  <title>
                    Lag {item.lag}: r = {item.r.toFixed(3)}{" "}
                    {exceeds ? "(exceeds 95% white-noise bound; included in Hamed–Rao variance)" : ""}
                  </title>
                </circle>
                <text
                  x={barX}
                  y={item.r >= 0 ? valY - 8 : valY + 14}
                  textAnchor="middle"
                >
                  {item.r.toFixed(2)}
                </text>
                <text x={barX} y="196" textAnchor="middle">
                  Lag {item.lag}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/* ============================================================================
 * 3. SEASONAL KENDALL SECTION
 * ========================================================================== */
function SeasonalKendallSectionBody({
  caseFile,
  parameters,
  svgRef,
}: {
  caseFile: CaseFileAnalysisResponse;
  parameters: AnalysisParameters;
  svgRef: RefObject<SVGSVGElement | null>;
}) {
  const alpha = parameters.alpha;
  const skP = caseFile.seasonal_kendall_p ?? null;
  const skZ = caseFile.seasonal_kendall_z ?? null;
  const isSig = skP !== null && skP < alpha;
  const months = caseFile.monthly_fingerprint ?? [];

  const maxAbsSlope = useMemo(() => {
    const vals = months
      .map((m) => Math.abs(m.decadal_slope ?? 0))
      .filter((v) => v > 0);
    return vals.length ? Math.max(...vals) * 1.25 : 1;
  }, [months]);

  return (
    <div className="da-section-body">
      <div className="metrics-grid">
        <Metric
          label="Seasonal Kendall Z_SK"
          value={skZ !== null ? String(skZ) : "Unavailable"}
          unit={skP !== null ? `p = ${formatPValue(skP)}` : "insufficient years"}
          detail={
            isSig
              ? `Significant cross-month trend at α = ${alpha}`
              : `Requires ≥ ${parameters.seasonal_kendall_min_years} yrs/month`
          }
          tone={isSig ? "positive" : undefined}
        />
        <Metric
          label="Significant Calendar Months"
          value={`${months.filter((m) => m.significant).length} / 12`}
          unit={`at α = ${alpha}`}
          detail="Months with individual Mann–Kendall p < α"
        />
        <Metric
          label="Strongest Warming/Increasing Month"
          value={
            months.reduce(
              (best, m) =>
                (m.decadal_slope ?? -Infinity) > (best?.decadal_slope ?? -Infinity)
                  ? m
                  : best,
              months[0],
            )?.month_name || "—"
          }
          unit={`${caseFile.unit}/decade`}
          detail="Maximum positive month-specific Sen’s slope"
        />
        <Metric
          label="Min Years per Month Rule"
          value={`≥ ${parameters.seasonal_kendall_min_years} yrs`}
          unit="Hirsch et al. (1982)"
          detail="Compares Jan vs Jan, Feb vs Feb … Dec vs Dec"
        />
      </div>

      <div className="chart-wrap" style={{ height: 240 }}>
        <svg
          ref={svgRef}
          viewBox="0 0 840 225"
          role="img"
          aria-label="Month-by-month decadal Sen slope bar chart for Seasonal Kendall analysis"
        >
          {[-1, -0.5, 0, 0.5, 1].map((frac) => {
            const val = frac * maxAbsSlope;
            const yPos = 112 - frac * 78;
            return (
              <g key={frac}>
                <line x1="62" x2="804" y1={yPos} y2={yPos} className="grid-line" />
                <text x="8" y={yPos + 3}>
                  {val.toFixed(2)}
                </text>
              </g>
            );
          })}
          {months.map((m, idx) => {
            const xCenter = 95 + idx * 60;
            const slopeVal = m.decadal_slope ?? null;
            const mkPVal = m.mk_p_value ?? null;
            const slope = slopeVal ?? 0;
            const barH = Math.abs(slope / maxAbsSlope) * 78;
            const barY = slope >= 0 ? 112 - barH : 112;
            const fill =
              slopeVal === null
                ? "var(--border)"
                : m.significant
                  ? slope >= 0
                    ? "var(--green-bright)"
                    : "#0284c7"
                  : "var(--muted)";
            return (
              <g key={m.month_name}>
                <rect
                  x={xCenter - 18}
                  y={barY}
                  width="36"
                  height={Math.max(2, barH)}
                  rx="4"
                  fill={fill}
                  opacity={m.significant ? 0.95 : 0.55}
                >
                  <title>
                    {m.month_name}:{" "}
                    {slopeVal !== null
                      ? `${formatSigned(slopeVal)} ${caseFile.unit}/dec`
                      : "insufficient data"}{" "}
                    (p = {mkPVal !== null ? formatPValue(mkPVal) : "—"})
                  </title>
                </rect>
                <text
                  x={xCenter}
                  y={slope >= 0 ? barY - 6 : barY + barH + 12}
                  textAnchor="middle"
                >
                  {slopeVal !== null ? formatSigned(slopeVal) : "—"}
                </text>
                <text x={xCenter} y="208" textAnchor="middle">
                  {m.month_name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/* ============================================================================
 * 4. SEN'S SLOPE ESTIMATOR SECTION
 * ========================================================================== */
function SenSlopeSectionBody({
  caseFile,
  parameters,
  svgRef,
}: {
  caseFile: CaseFileAnalysisResponse;
  parameters: AnalysisParameters;
  svgRef: RefObject<SVGSVGElement | null>;
}) {
  const isYearlyScale = parameters.sens_rate_scale === "year";
  const scaleFactor = isYearlyScale ? 0.1 : 1;
  const scaleLabel = isYearlyScale
    ? `${caseFile.unit} / year`
    : `${caseFile.unit} / decade`;
  const ciPct = Math.round(parameters.sens_confidence_level * 100);

  const validRows = useMemo(
    () =>
      caseFile.analysis_series.filter(
        (r) =>
          r.qa_flag === "Valid" &&
          r.deseasonalized_value !== null &&
          r.sen_trend !== null,
      ),
    [caseFile.analysis_series],
  );

  const chart = useMemo(() => {
    if (validRows.length < 2) return null;
    const xMin = Date.parse(validRows[0].timestamp);
    const xMax = Date.parse(validRows[validRows.length - 1].timestamp);
    const values = validRows.map((r) => r.deseasonalized_value as number);
    const senVals = validRows.map((r) => r.sen_trend as number);
    const yMinRaw = Math.min(...values, ...senVals);
    const yMaxRaw = Math.max(...values, ...senVals);
    const pad = (yMaxRaw - yMinRaw) * 0.15 || 0.5;
    const yMin = yMinRaw - pad;
    const yMax = yMaxRaw + pad;

    const x = (ts: number) => 64 + ((ts - xMin) / Math.max(1, xMax - xMin)) * 736;
    const y = (val: number) => 210 - ((val - yMin) / Math.max(1e-6, yMax - yMin)) * 172;

    const midTs = (xMin + xMax) / 2;
    const upperPts: string[] = [];
    const lowerPts: string[] = [];
    for (const r of validRows) {
      const ts = Date.parse(r.timestamp);
      const dtDecades = (ts - midTs) / (10 * 365.25 * 86400 * 1000);
      const sen = r.sen_trend as number;
      const upVal =
        sen + (caseFile.sens_ci_high - caseFile.sens_slope_decadal) * dtDecades;
      const loVal =
        sen + (caseFile.sens_ci_low - caseFile.sens_slope_decadal) * dtDecades;
      upperPts.push(`${x(ts).toFixed(1)},${y(Math.max(upVal, loVal)).toFixed(1)}`);
      lowerPts.unshift(`${x(ts).toFixed(1)},${y(Math.min(upVal, loVal)).toFixed(1)}`);
    }

    const obsPts = validRows
      .map(
        (r) =>
          `${x(Date.parse(r.timestamp)).toFixed(1)},${y(
            r.deseasonalized_value as number,
          ).toFixed(1)}`,
      )
      .join(" ");
    const senPts = validRows
      .map(
        (r) =>
          `${x(Date.parse(r.timestamp)).toFixed(1)},${y(
            r.sen_trend as number,
          ).toFixed(1)}`,
      )
      .join(" ");

    const ticks = Array.from({ length: 5 }, (_, i) => {
      const v = yMax - ((yMax - yMin) * i) / 4;
      return { value: v, y: y(v) };
    });

    return {
      xMin,
      xMax,
      ticks,
      obsPts,
      senPts,
      ciPolygon: [...upperPts, ...lowerPts].join(" "),
      firstSen: senVals[0],
      lastSen: senVals[senVals.length - 1],
      totalShift: senVals[senVals.length - 1] - senVals[0],
    };
  }, [
    validRows,
    caseFile.sens_ci_high,
    caseFile.sens_ci_low,
    caseFile.sens_slope_decadal,
  ]);

  return (
    <div className="da-section-body">
      <div className="metrics-grid">
        <Metric
          label="Theil–Sen Median Slope"
          value={formatSigned(caseFile.sens_slope_decadal * scaleFactor)}
          unit={scaleLabel}
          detail={`${ciPct}% CI [${formatSigned(
            caseFile.sens_ci_low * scaleFactor,
          )}, ${formatSigned(caseFile.sens_ci_high * scaleFactor)}]`}
          tone="positive"
        />
        <Metric
          label="Annualized Rate"
          value={formatSigned(caseFile.sens_slope_decadal / 10)}
          unit={`${caseFile.unit} / year`}
          detail={`Decadal: ${formatSigned(caseFile.sens_slope_decadal)} ${caseFile.unit}/dec`}
        />
        <Metric
          label="Cumulative Trend Shift"
          value={chart ? formatSigned(chart.totalShift) : "0.000"}
          unit={caseFile.unit}
          detail={`Over ${caseFile.start_year}–${caseFile.end_year}`}
        />
        <Metric
          label="Outlier Breakdown Point"
          value="29.3%"
          unit="rank-based median"
          detail={`Pairwise slopes across ${caseFile.valid_months_count} obs`}
        />
      </div>

      {chart && (
        <div className="chart-wrap">
          <svg
            ref={svgRef}
            viewBox="0 0 840 255"
            role="img"
            aria-label={`Theil-Sen median trend line and ${ciPct}% confidence corridor for ${caseFile.dataset_name}`}
          >
            {chart.ticks.map((t) => (
              <g key={t.value}>
                <line x1="60" x2="804" y1={t.y} y2={t.y} className="grid-line" />
                <text x="8" y={t.y + 3}>
                  {t.value.toFixed(2)}
                </text>
              </g>
            ))}
            <polygon points={chart.ciPolygon} className="ci-area" />
            <polyline points={chart.obsPts} className="data-line" />
            <polyline points={chart.senPts} className="slope-line" />
            <text x="68" y="26">
              Sen’s slope = {formatSigned(caseFile.sens_slope_decadal * scaleFactor)}{" "}
              {scaleLabel} ({ciPct}% CI [{formatSigned(caseFile.sens_ci_low * scaleFactor)},{" "}
              {formatSigned(caseFile.sens_ci_high * scaleFactor)}])
            </text>
            <text x="64" y="242">
              {new Date(chart.xMin).getUTCFullYear()} ({chart.firstSen.toFixed(2)}{" "}
              {caseFile.unit})
            </text>
            <text x="800" y="242" textAnchor="end">
              {new Date(chart.xMax).getUTCFullYear()} ({chart.lastSen.toFixed(2)}{" "}
              {caseFile.unit})
            </text>
          </svg>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * 5. PETTITT CHANGE-POINT SCREEN SECTION
 * ========================================================================== */
function PettittSectionBody({
  caseFile,
  parameters,
  svgRef,
}: {
  caseFile: CaseFileAnalysisResponse;
  parameters: AnalysisParameters;
  svgRef: RefObject<SVGSVGElement | null>;
}) {
  const cpTime = caseFile.change_point_timestamp ?? null;
  const cpP = caseFile.change_point_p_value ?? null;
  const isSig = cpP !== null && cpP < parameters.alpha;
  const meanBefore = caseFile.pettitt_mean_before;
  const meanAfter = caseFile.pettitt_mean_after;
  const stepShift =
    meanBefore !== null &&
    meanBefore !== undefined &&
    meanAfter !== null &&
    meanAfter !== undefined
      ? meanAfter - meanBefore
      : null;

  const utSeries = caseFile.pettitt_ut_series ?? [];

  const chart = useMemo(() => {
    if (utSeries.length < 3) return null;
    const xMin = Date.parse(utSeries[0].timestamp);
    const xMax = Date.parse(utSeries[utSeries.length - 1].timestamp);
    const maxAbsU = Math.max(
      1,
      ...utSeries.map((pt) => Math.abs(pt.ut)),
    );
    const x = (ts: number) => 64 + ((ts - xMin) / Math.max(1, xMax - xMin)) * 736;
    const y = (u: number) => 115 - (u / (maxAbsU * 1.15)) * 88;

    const poly = utSeries
      .map((pt) => `${x(Date.parse(pt.timestamp)).toFixed(1)},${y(pt.ut).toFixed(1)}`)
      .join(" ");

    let peakPt = utSeries[0];
    for (const pt of utSeries) {
      if (Math.abs(pt.ut) > Math.abs(peakPt.ut)) peakPt = pt;
    }

    return {
      xMin,
      xMax,
      maxAbsU,
      poly,
      peakPt,
      peakX: x(Date.parse(peakPt.timestamp)),
      peakY: y(peakPt.ut),
    };
  }, [utSeries]);

  return (
    <div className="da-section-body">
      <div className="metrics-grid">
        <Metric
          label="Candidate Breakpoint Date"
          value={cpTime ? cpTime.slice(0, 10) : "None detected"}
          unit={cpP !== null ? `p = ${formatPValue(cpP)}` : ""}
          detail={
            isSig
              ? `Statistically significant regime shift at α = ${parameters.alpha}`
              : `Candidate peak (p ≥ α = ${parameters.alpha})`
          }
          tone={isSig ? "positive" : undefined}
        />
        <Metric
          label="Pre-Breakpoint Mean"
          value={
            meanBefore !== null && meanBefore !== undefined
              ? meanBefore.toFixed(3)
              : "—"
          }
          unit={caseFile.unit}
          detail="Deseasonalized regime average before split"
        />
        <Metric
          label="Post-Breakpoint Mean"
          value={
            meanAfter !== null && meanAfter !== undefined
              ? meanAfter.toFixed(3)
              : "—"
          }
          unit={caseFile.unit}
          detail="Deseasonalized regime average after split"
        />
        <Metric
          label="Regime Step Shift (Δμ)"
          value={stepShift !== null ? formatSigned(stepShift) : "—"}
          unit={caseFile.unit}
          detail={`Min segment rule: ≥ ${parameters.pettitt_min_segment} obs`}
        />
      </div>

      {chart && (
        <div className="chart-wrap" style={{ height: 245 }}>
          <svg
            ref={svgRef}
            viewBox="0 0 840 235"
            role="img"
            aria-label="Pettitt Mann-Whitney U_t test statistic curve across observation timestamps"
          >
            {[-1, -0.5, 0, 0.5, 1].map((frac) => {
              const val = Math.round(frac * chart.maxAbsU);
              const yPos = 115 - (frac / 1.15) * 88;
              return (
                <g key={frac}>
                  <line x1="60" x2="804" y1={yPos} y2={yPos} className="grid-line" />
                  <text x="8" y={yPos + 3}>
                    {val}
                  </text>
                </g>
              );
            })}
            <polyline points={chart.poly} className="data-line" />
            <line
              x1={chart.peakX}
              x2={chart.peakX}
              y1="24"
              y2="205"
              stroke="#ef4444"
              strokeWidth="1.8"
              strokeDasharray="5 4"
            />
            <circle cx={chart.peakX} cy={chart.peakY} r="5.5" fill="#ef4444" />
            <text
              x={chart.peakX > 420 ? chart.peakX - 10 : chart.peakX + 10}
              y={Math.max(36, chart.peakY - 8)}
              textAnchor={chart.peakX > 420 ? "end" : "start"}
              fill="#ef4444"
            >
              Peak K_T = |{chart.peakPt.ut}| at {chart.peakPt.timestamp.slice(0, 10)}
            </text>
            <text x="64" y="225">
              {new Date(chart.xMin).getUTCFullYear()}
            </text>
            <text x="800" y="225" textAnchor="end">
              {new Date(chart.xMax).getUTCFullYear()}
            </text>
          </svg>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * 6. ANOMALY REVIEW SECTION
 * ========================================================================== */
function AnomaliesSectionBody({
  caseFile,
  parameters,
  svgRef,
}: {
  caseFile: CaseFileAnalysisResponse;
  parameters: AnalysisParameters;
  svgRef: RefObject<SVGSVGElement | null>;
}) {
  const threshold = caseFile.anomaly_threshold_used ?? parameters.anomaly_z_threshold;
  const flaggedRows = useMemo(
    () =>
      caseFile.analysis_series
        .filter(
          (r) =>
            r.qa_flag === "Valid" &&
            r.anomaly_z !== null &&
            Math.abs(r.anomaly_z) >= threshold,
        )
        .sort((a, b) => Math.abs(b.anomaly_z ?? 0) - Math.abs(a.anomaly_z ?? 0)),
    [caseFile.analysis_series, threshold],
  );

  const validWithZ = useMemo(
    () =>
      caseFile.analysis_series.filter(
        (r) => r.qa_flag === "Valid" && r.anomaly_z !== null,
      ),
    [caseFile.analysis_series],
  );

  const maxAbsZ = useMemo(() => {
    const zs = validWithZ.map((r) => Math.abs(r.anomaly_z as number));
    return Math.max(3.2, threshold * 1.25, ...(zs.length ? zs : [3.2]));
  }, [validWithZ, threshold]);

  return (
    <div className="da-section-body">
      <div className="metrics-grid">
        <Metric
          label={`Flagged Anomalies (|z| ≥ ${threshold})`}
          value={String(flaggedRows.length)}
          unit={`of ${caseFile.valid_months_count} valid obs`}
          detail={`${((flaggedRows.length / Math.max(1, caseFile.valid_months_count)) * 100).toFixed(
            1,
          )}% of series flagged for review`}
          tone={flaggedRows.length > 0 ? "positive" : undefined}
        />
        <Metric
          label="Highest Positive Departure"
          value={
            validWithZ.length
              ? formatSigned(
                  Math.max(...validWithZ.map((r) => r.anomaly_z as number)),
                )
              : "—"
          }
          unit="z-score"
          detail="Maximum standardized positive anomaly"
        />
        <Metric
          label="Lowest Negative Departure"
          value={
            validWithZ.length
              ? formatSigned(
                  Math.min(...validWithZ.map((r) => r.anomaly_z as number)),
                )
              : "—"
          }
          unit="z-score"
          detail="Minimum standardized negative anomaly"
        />
        <Metric
          label="Scale Dispersion Estimator"
          value={
            parameters.anomaly_dispersion_method === "mad"
              ? "Robust MAD"
              : "Sample SD"
          }
          unit="never auto-deleted"
          detail="Flagged records remain in all statistical tests"
        />
      </div>

      {/* Z-SCORE STEM CHART WITH THRESHOLD LINES */}
      <div className="chart-wrap" style={{ height: 240 }}>
        <svg
          ref={svgRef}
          viewBox="0 0 840 230"
          role="img"
          aria-label={`Standardized anomaly z-score stem plot with ±${threshold} threshold bounds`}
        >
          {[-3, -2, -1, 0, 1, 2, 3].map((zTick) => {
            if (Math.abs(zTick) > maxAbsZ) return null;
            const yPos = 112 - (zTick / maxAbsZ) * 86;
            return (
              <g key={zTick}>
                <line x1="60" x2="804" y1={yPos} y2={yPos} className="grid-line" />
                <text x="10" y={yPos + 3}>
                  {zTick > 0 ? `+${zTick}σ` : `${zTick}σ`}
                </text>
              </g>
            );
          })}
          {/* +threshold and -threshold lines */}
          <line
            x1="60"
            x2="804"
            y1={112 - (threshold / maxAbsZ) * 86}
            y2={112 - (threshold / maxAbsZ) * 86}
            stroke="#ef4444"
            strokeWidth="1.3"
            strokeDasharray="5 4"
          />
          <line
            x1="60"
            x2="804"
            y1={112 + (threshold / maxAbsZ) * 86}
            y2={112 + (threshold / maxAbsZ) * 86}
            stroke="#0284c7"
            strokeWidth="1.3"
            strokeDasharray="5 4"
          />
          {validWithZ.map((row, idx) => {
            const xPos =
              66 + (idx / Math.max(1, validWithZ.length - 1)) * 732;
            const z = row.anomaly_z as number;
            const yPos = 112 - Math.max(-maxAbsZ, Math.min(maxAbsZ, z)) * (86 / maxAbsZ);
            const isFlagged = Math.abs(z) >= threshold;
            const color = isFlagged
              ? z >= 0
                ? "#ef4444"
                : "#0284c7"
              : "var(--muted)";
            return (
              <g key={row.timestamp}>
                <line
                  x1={xPos}
                  x2={xPos}
                  y1="112"
                  y2={yPos}
                  stroke={color}
                  strokeWidth={isFlagged ? "2.2" : "1.1"}
                  opacity={isFlagged ? 0.95 : 0.45}
                />
                {isFlagged && (
                  <circle cx={xPos} cy={yPos} r="3.5" fill={color}>
                    <title>
                      {row.timestamp.slice(0, 10)}: value = {row.value} {caseFile.unit}, z ={" "}
                      {z.toFixed(2)}
                    </title>
                  </circle>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {flaggedRows.length > 0 && (
        <div className="da-anomaly-table-wrap">
          <div className="srs-sub-head">
            <strong>Top Flagged Extreme Observations (|z| ≥ {threshold})</strong>
            <small>Sorted by |z| magnitude · Retained in dataset</small>
          </div>
          <div className="da-anomaly-chips">
            {flaggedRows.slice(0, 8).map((row) => (
              <div className="da-anomaly-chip" key={row.timestamp}>
                <code>{row.timestamp.slice(0, 10)}</code>
                <strong>
                  {row.value} {caseFile.unit}
                </strong>
                <span className={(row.anomaly_z ?? 0) >= 0 ? "pos" : "neg"}>
                  z = {formatSigned(row.anomaly_z ?? 0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * 7. SEASONAL FINGERPRINT SECTION (SVG HEATMAP FOR PNG DOWNLOAD + VALUES)
 * ========================================================================== */
function SeasonalFingerprintSectionBody({
  caseFile,
  parameters,
  svgRef,
}: {
  caseFile: CaseFileAnalysisResponse;
  parameters: AnalysisParameters;
  svgRef: RefObject<SVGSVGElement | null>;
}) {
  const cap = parameters.fingerprint_color_cap;
  const monthLabels = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const rows = useMemo(() => {
    const observed = new Map<string, CaseFileObservation>();
    for (const point of caseFile.analysis_series) {
      const date = new Date(point.timestamp);
      observed.set(`${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`, point);
    }
    const firstYear = caseFile.start_year;
    const lastYear = caseFile.end_year;
    return Array.from(
      { length: Math.max(1, lastYear - firstYear + 1) },
      (_, index) => {
        const year = firstYear + index;
        return {
          year,
          cells: Array.from({ length: 12 }, (_, monthIndex) => ({
            month: monthIndex + 1,
            point: observed.get(`${year}-${monthIndex + 1}`),
          })),
        };
      },
    );
  }, [caseFile.analysis_series, caseFile.start_year, caseFile.end_year]);

  const svgHeight = Math.max(160, 48 + rows.length * 22);

  return (
    <div className="da-section-body">
      <p style={{ fontSize: 11, color: "var(--muted)", margin: "0 0 10px" }}>
        Year × Calendar Month standardized anomaly z-scores (color saturation cap ±{cap}z). Hover
        any cell to inspect the exact observed value in {caseFile.unit} and anomaly z-score, or
        click <strong>Download PNG</strong> above to export this heatmap.
      </p>
      <div style={{ overflowX: "auto" }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 840 ${svgHeight}`}
          role="img"
          aria-label={`Seasonal fingerprint year by month heatmap for ${caseFile.dataset_name}`}
          style={{ width: "100%", height: "auto", minWidth: 620 }}
        >
          {monthLabels.map((mName, idx) => (
            <text
              key={mName}
              x={68 + idx * 62 + 28}
              y="20"
              textAnchor="middle"
            >
              {mName}
            </text>
          ))}
          {rows.map((row, rIdx) => {
            const yTop = 30 + rIdx * 21;
            return (
              <g key={row.year}>
                <text x="12" y={yTop + 13}>
                  {row.year}
                </text>
                {row.cells.map(({ month, point }, cIdx) => {
                  const xLeft = 68 + cIdx * 62;
                  const z = point?.qa_flag === "Valid" ? point.anomaly_z : null;
                  const mag = z === null || z === undefined ? 0 : Math.min(1, Math.abs(z) / cap);
                  const fill =
                    z === null || z === undefined
                      ? "#e2e8f0"
                      : z < 0
                        ? `rgb(${Math.round(247 + (33 - 247) * mag)}, ${Math.round(
                            247 + (102 - 247) * mag,
                          )}, ${Math.round(247 + (172 - 247) * mag)})`
                        : `rgb(${Math.round(247 + (178 - 247) * mag)}, ${Math.round(
                            247 + (24 - 247) * mag,
                          )}, ${Math.round(247 + (43 - 247) * mag)})`;
                  return (
                    <g key={month}>
                      <rect
                        x={xLeft}
                        y={yTop}
                        width="56"
                        height="18"
                        rx="3"
                        fill={fill}
                        stroke="var(--border)"
                        strokeWidth="0.8"
                      >
                        <title>
                          {row.year}-{String(month).padStart(2, "0")}:{" "}
                          {point?.value ?? "missing"} {caseFile.unit} (z ={" "}
                          {z !== null && z !== undefined ? z.toFixed(2) : "unavailable"})
                        </title>
                      </rect>
                      {z !== null && z !== undefined && rows.length <= 16 && (
                        <text
                          x={xLeft + 28}
                          y={yTop + 12}
                          textAnchor="middle"
                          style={{
                            fontSize: "8px",
                            fill: mag > 0.55 ? "#ffffff" : "#1e293b",
                          }}
                        >
                          {z >= 0 ? `+${z.toFixed(1)}` : z.toFixed(1)}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  unit,
  detail,
  tone,
}: {
  label: string;
  value: string;
  unit: string;
  detail: string;
  tone?: string;
}) {
  return (
    <div className="metric">
      <div className="metric-label">
        {label}
        <Icon name="info" size={13} />
      </div>
      <div>
        <strong>{value}</strong>
        <span>{unit}</span>
      </div>
      <p className={tone}>{detail}</p>
    </div>
  );
}

function formatSigned(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(3)}`;
}

function formatPValue(value: number): string {
  return value < 0.0001 ? "<0.0001" : value.toFixed(4);
}

function TimeSeriesChart({
  svgRef,
  mode,
  series,
  unit,
  showSenTrend,
  anomalyThreshold,
}: {
  svgRef?: RefObject<SVGSVGElement | null>;
  mode: SignalMode;
  series: CaseFileObservation[];
  unit: string;
  showSenTrend: boolean;
  anomalyThreshold: number;
}) {
  const chart = useMemo(() => {
    const xMin = Date.parse(series[0]?.timestamp || "");
    const xMax = Date.parse(series[series.length - 1]?.timestamp || "");
    const yValue = (row: CaseFileObservation) =>
      mode === "raw"
        ? row.value
        : mode === "seasonal"
          ? row.seasonal_component
          : row.deseasonalized_value;
    const timestamps = series
      .map((row) => Date.parse(row.timestamp))
      .filter(Number.isFinite);
    const intervals = timestamps
      .slice(1)
      .map((timestamp, index) => timestamp - timestamps[index])
      .filter((interval) => interval > 0)
      .sort((a, b) => a - b);
    const typicalInterval = intervals.length
      ? intervals[Math.floor(intervals.length / 2)]
      : Number.POSITIVE_INFINITY;
    const validValues = series
      .filter((row) => row.qa_flag === "Valid")
      .map(yValue)
      .filter((value): value is number => value !== null && Number.isFinite(value));

    if (!validValues.length || !Number.isFinite(xMin) || !Number.isFinite(xMax)) {
      return null;
    }

    let yMin = Math.min(...validValues);
    let yMax = Math.max(...validValues);
    if (mode === "anomaly" && showSenTrend) {
      yMin = Math.min(yMin, 0);
      yMax = Math.max(yMax, 0);
    }
    const padding = (yMax - yMin) * 0.08 || Math.max(0.1, Math.abs(yMax) * 0.05);
    yMin -= padding;
    yMax += padding;
    const x = (timestamp: number) =>
      62 + ((timestamp - xMin) / Math.max(1, xMax - xMin)) * 730;
    const y = (value: number) => 210 - ((value - yMin) / (yMax - yMin)) * 170;

    const segments: string[] = [];
    let segment: string[] = [];
    let previousTimestamp: number | null = null;
    for (const row of series) {
      const timestamp = Date.parse(row.timestamp);
      const value = yValue(row);
      const valid = row.qa_flag === "Valid" && value !== null && Number.isFinite(value);
      const isGap =
        previousTimestamp !== null &&
        Number.isFinite(typicalInterval) &&
        timestamp - previousTimestamp > typicalInterval * 1.5;
      if (!valid || isGap) {
        if (segment.length > 1) segments.push(segment.join(" "));
        segment = [];
      }
      if (valid) segment.push(`${x(timestamp)},${y(value)}`);
      previousTimestamp = timestamp;
    }
    if (segment.length > 1) segments.push(segment.join(" "));

    const trendPoints: string[] = [];
    if (mode === "anomaly" && showSenTrend) {
      for (const row of series) {
        if (row.qa_flag === "Valid" && row.sen_trend !== null) {
          trendPoints.push(`${x(Date.parse(row.timestamp))},${y(row.sen_trend)}`);
        }
      }
    }
    const grid = Array.from({ length: 5 }, (_, index) => {
      const value = yMax - ((yMax - yMin) * index) / 4;
      return { value, y: y(value) };
    });

    return {
      segments,
      trend: trendPoints.join(" "),
      grid,
      x,
      xMin,
      xMax,
      y,
      yMin,
      yMax,
    };
  }, [mode, series, showSenTrend]);

  if (!chart) {
    return <p className="chart-wrap">No valid observations are available to plot.</p>;
  }

  const yearAt = (fraction: number) =>
    new Date(chart.xMin + (chart.xMax - chart.xMin) * fraction).getUTCFullYear();
  return (
    <div className="chart-wrap">
      <svg
        ref={svgRef}
        viewBox="0 0 840 260"
        role="img"
        aria-label={`${mode} time series in ${unit} from ${yearAt(0)} to ${yearAt(1)}; gaps are not interpolated`}
      >
        {chart.grid.map((tick) => (
          <g key={tick.value}>
            <line x1="58" x2="805" y1={tick.y} y2={tick.y} className="grid-line" />
            <text x="8" y={tick.y + 3}>
              {tick.value.toPrecision(3)}
            </text>
          </g>
        ))}
        {chart.segments.map((points, index) => (
          <polyline className="data-line" key={index} points={points} />
        ))}
        {chart.trend && <polyline className="slope-line" points={chart.trend} />}
        {mode === "anomaly" &&
          series.map((row) => {
            const anomalyValue = row.deseasonalized_value;
            if (
              row.qa_flag !== "Valid" ||
              row.anomaly_z === null ||
              Math.abs(row.anomaly_z) < anomalyThreshold ||
              anomalyValue === null
            ) {
              return null;
            }
            return (
              <circle
                className="anomaly"
                key={row.timestamp}
                cx={chart.x(Date.parse(row.timestamp))}
                cy={chart.y(anomalyValue)}
                r="4"
              >
                <title>
                  {row.timestamp}: z = {row.anomaly_z?.toFixed(2)}, {row.value} {unit}
                </title>
              </circle>
            );
          })}
        <g className="axis-labels">
          <text x="48" y="240">
            {yearAt(0)}
          </text>
          <text x="777" y="240" textAnchor="end">
            {yearAt(1)}
          </text>
        </g>
      </svg>
    </div>
  );
}

function CaseFileDiagnosticsSection({
  caseFile,
  onNotify,
}: {
  caseFile: CaseFileAnalysisResponse;
  onNotify: (msg: string) => void;
}) {
  const [explainLevel, setExplainLevel] = useState<"explorer" | "student" | "scientist">(
    "student",
  );
  const [activeTab, setActiveTab] = useState<
    "fingerprint" | "robustness" | "caveats" | "outlook"
  >("fingerprint");
  const stripesSvgRef = useRef<SVGSVGElement | null>(null);

  const downloadCaseFileJson = () => {
    const blob = new Blob([JSON.stringify(caseFile, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `iris-case-file-${caseFile.result_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify("Full SRS Case File JSON exported with provenance");
  };

  return (
    <div className="da-section-body">
      {/* 1. RESULT IDENTITY, PROVENANCE & DETERMINISTIC EVIDENCE GRADE */}
      <div className="srs-cf-top">
        <div>
          <div className="dp-badges-row">
            <span className="dp-api-badge">
              <Icon name="file" size={12} /> Dynamic Case File · {caseFile.result_id}
            </span>
            <span className="dp-freq-badge">
              {caseFile.provenance_mode === "live_extracted_result"
                ? `Handoff from Extraction Job (${caseFile.source_job_id})`
                : caseFile.provenance_mode === "live_nasa_power"
                  ? "Live NASA POWER Series"
                  : "Pinned Real Snapshot"}
            </span>
            <code>SHA-256: {caseFile.sha256_hash.slice(0, 14)}…</code>
          </div>
          <h3 style={{ marginTop: "6px", fontSize: "15px" }}>
            {caseFile.evidence_grade_title}
          </h3>
          <p style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
            Method: <code>{caseFile.method_version}</code> · Effective Sample Size{" "}
            <b>n_eff = {caseFile.effective_sample_size_n_eff}</b> (lag-1 r₁ ={" "}
            {caseFile.lag1_autocorrelation}) · BH-FDR{" "}
            <b>q = {formatPValue(caseFile.fdr_q_value)}</b> · Seasonal Kendall{" "}
            <b>
              p ={" "}
              {caseFile.seasonal_kendall_p == null
                ? "unavailable"
                : formatPValue(caseFile.seasonal_kendall_p)}
            </b>
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span className={`srs-grade-badge grade-${caseFile.evidence_grade}`}>
            Evidence Grade {caseFile.evidence_grade}
          </span>
          <button
            className="dp-export-btn"
            onClick={() =>
              void downloadSvgElementAsPng(
                stripesSvgRef.current,
                `iris-${caseFile.result_id}-warming-stripes.png`,
                `Annual Anomaly Stripes (${caseFile.start_year}–${caseFile.end_year})`,
                `${caseFile.dataset_name} · ${caseFile.location}`,
                onNotify,
              )
            }
            type="button"
          >
            <Icon name="download" size={14} /> Stripes PNG
          </button>
          <button className="dp-export-btn" onClick={downloadCaseFileJson} type="button">
            <Icon name="download" size={14} /> Case File JSON
          </button>
        </div>
      </div>

      {/* Deterministic Grade Reasons List */}
      <div className="srs-grade-reasons-strip">
        {caseFile.evidence_grade_reasons.map((reason) => (
          <div className="srs-grade-reason-item" key={reason}>
            <Icon name="check" size={13} />
            <span>{reason}</span>
          </div>
        ))}
      </div>

      {/* 2. THREE-LEVEL AUDIENCE EXPLANATION SWITCHER */}
      <div className="srs-explain-card">
        <div className="srs-explain-head">
          <div>
            <small>Deterministic Multi-Level Interpretation (Zero LLM-Invented Numbers)</small>
            <strong>Select Audience Depth</strong>
          </div>
          <div className="segmented" role="group" aria-label="Explanation level">
            {(["explorer", "student", "scientist"] as const).map((lvl) => (
              <button
                className={explainLevel === lvl ? "active" : ""}
                key={lvl}
                onClick={() => setExplainLevel(lvl)}
                type="button"
              >
                {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <p className="srs-explain-body">{caseFile.explanations[explainLevel]}</p>
      </div>

      {/* 3. DIAGNOSTIC VIEWS TABS */}
      <div className="srs-cf-tabs-bar">
        <div className="segmented" role="tablist" aria-label="Case File Diagnostic Views">
          <button
            className={activeTab === "fingerprint" ? "active" : ""}
            onClick={() => setActiveTab("fingerprint")}
            role="tab"
            type="button"
          >
            Stripes &amp; 12-Month Fingerprint
          </button>
          <button
            className={activeTab === "robustness" ? "active" : ""}
            onClick={() => setActiveTab("robustness")}
            role="tab"
            type="button"
          >
            Robustness &amp; Trend Triangle
          </button>
          <button
            className={activeTab === "caveats" ? "active" : ""}
            onClick={() => setActiveTab("caveats")}
            role="tab"
            type="button"
          >
            Caveats &amp; Provenance ({caseFile.caveats.length})
          </button>
          <button
            className={activeTab === "outlook" ? "active" : ""}
            onClick={() => setActiveTab("outlook")}
            role="tab"
            type="button"
          >
            Outlook &amp; Skill-Gated Forecast
          </button>
        </div>
      </div>

      {activeTab === "fingerprint" && (
        <div className="srs-cf-tab-content">
          <div className="srs-stripes-block">
            <div className="srs-sub-head">
              <strong>
                Annual Anomaly Stripes ({caseFile.start_year}–{caseFile.end_year})
              </strong>
              <small>Downloadable SVG/PNG barcode of annual standardized departures</small>
            </div>
            <svg
              ref={stripesSvgRef}
              viewBox="0 0 840 90"
              role="img"
              aria-label="Annual anomaly trend stripes"
              style={{ width: "100%", height: 90, marginTop: 8 }}
            >
              {caseFile.annual_stripes.map((item, idx) => {
                const count = Math.max(1, caseFile.annual_stripes.length);
                const colW = 780 / count;
                const xPos = 30 + idx * colW;
                const z = item.z;
                const bg =
                  z === null
                    ? "#cbd5e1"
                    : z > 1.2
                      ? "#b91c1c"
                      : z > 0.4
                        ? "#ea580c"
                        : z > -0.4
                          ? "#cbd5e1"
                          : z > -1.2
                            ? "#38bdf8"
                            : "#0369a1";
                return (
                  <g key={String(item.year)}>
                    <rect
                      x={xPos}
                      y="6"
                      width={Math.max(2, colW - 1.5)}
                      height="56"
                      rx="2"
                      fill={bg}
                    >
                      <title>{`${item.year}: mean ${item.mean} ${caseFile.unit} (anomaly ${
                        Number(item.anomaly) >= 0 ? "+" : ""
                      }${item.anomaly}, Z=${z ?? "unavailable"})`}</title>
                    </rect>
                    {(idx === 0 ||
                      idx === count - 1 ||
                      idx % Math.max(1, Math.floor(count / 6)) === 0) && (
                      <text x={xPos + colW / 2} y="78" textAnchor="middle">
                        {item.year}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="srs-fingerprint-block" style={{ marginTop: "16px" }}>
            <div className="srs-sub-head">
              <strong>12-Month Seasonal Fingerprint (Month-by-Month Sen&apos;s Slope)</strong>
              <small>
                Seasonal Kendall p ={" "}
                {caseFile.seasonal_kendall_p == null
                  ? "unavailable"
                  : formatPValue(caseFile.seasonal_kendall_p)}
              </small>
            </div>
            <div className="srs-month-grid">
              {caseFile.monthly_fingerprint.map((m) => (
                <div
                  className={`srs-month-cell ${m.significant ? "sig" : ""}`}
                  key={m.month_name}
                >
                  <small>{m.month_name}</small>
                  <strong className={(m.decadal_slope ?? 0) >= 0 ? "pos" : "neg"}>
                    {m.decadal_slope == null ? "—" : formatSigned(m.decadal_slope)}
                  </strong>
                  <span>p={m.mk_p_value == null ? "—" : formatPValue(m.mk_p_value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "robustness" && (
        <div className="srs-cf-tab-content">
          <div className="srs-sub-head">
            <strong>Multi-Window Trend Triangle (Start/End Year Sensitivity Matrix)</strong>
            <small>
              Tests whether the trend holds across sub-windows or depends on isolated endpoint years
            </small>
          </div>
          <div className="srs-triangle-grid">
            {caseFile.trend_triangle.map((cell) => (
              <div
                className={`srs-triangle-cell ${cell.significant ? "sig" : "insig"}`}
                key={`${cell.start_year}-${cell.end_year}`}
              >
                <div className="srs-tri-window">
                  {cell.start_year}–{cell.end_year} <small>({cell.span_years} yr)</small>
                </div>
                <strong className={cell.decadal_slope >= 0 ? "pos" : "neg"}>
                  {cell.decadal_slope >= 0 ? "+" : ""}
                  {cell.decadal_slope} {caseFile.unit}/dec
                </strong>
                <span>
                  Hamed–Rao p = {cell.mk_p_value.toFixed(4)}{" "}
                  {cell.significant ? "· Significant" : "· Marginal"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "caveats" && (
        <div className="srs-cf-tab-content">
          <div className="srs-sub-head">
            <strong>Registered Dataset &amp; Method Caveat Timeline</strong>
            <small>Source Archive: {caseFile.source_agency}</small>
          </div>
          <div className="srs-caveat-timeline">
            {caseFile.caveats.map((cav) => (
              <article className={`srs-caveat-item ${cav.severity}`} key={cav.title}>
                <div className="srs-caveat-meta">
                  <code>{cav.date_or_period}</code>
                  <span className="dp-freq-badge">{cav.category}</span>
                </div>
                <h4>{cav.title}</h4>
                <p>{cav.description}</p>
              </article>
            ))}
          </div>
        </div>
      )}

      {activeTab === "outlook" && (
        <div className="srs-cf-tab-content">
          <div className="srs-not-prediction-banner" role="alert">
            <Icon name="alert" size={16} />
            <strong>{caseFile.outlook.not_a_prediction_label}</strong>
          </div>

          <div className="srs-outlook-grid">
            <article className="srs-outlook-card">
              <small>1. Trend-Continuation Horizon (to {caseFile.outlook.horizon_year})</small>
              <h4>Conditional Sen&apos;s Slope Continuation Corridor</h4>
              <div className="srs-continuation-table">
                {caseFile.outlook.continuation_points.map((pt) => (
                  <div className="srs-cont-row" key={pt.year}>
                    <code>{pt.year}</code>
                    <strong>
                      {pt.central_value} {caseFile.unit}
                    </strong>
                    <span>
                      95% Corridor: [{pt.ci_low}, {pt.ci_high}]
                    </span>
                  </div>
                ))}
              </div>
            </article>

            <article className="srs-outlook-card">
              <small>2. Skill-Gated Short-Term Statistical Hindcast Check</small>
              <h4>
                {caseFile.outlook.skill_gate_passed
                  ? "Skill Gate Passed — 3-Year Hindcast Verified"
                  : "Skill Gate Suppressed — Noise Exceeds Short-Term Predictability"}
              </h4>
              <p style={{ fontSize: "12px", color: "var(--muted)", margin: "6px 0 10px" }}>
                {caseFile.outlook.skill_gate_reason}
              </p>
              <div className="srs-skill-metrics">
                <span>
                  <small>Skill Score (PSS)</small>
                  <b>{caseFile.outlook.skill_score_pss ?? "Not evaluated"}</b>
                </span>
                <span>
                  <small>Backtest RMSE</small>
                  <b>
                    {caseFile.outlook.backtest_rmse ?? "Not evaluated"}{" "}
                    {caseFile.outlook.backtest_rmse === null ? "" : caseFile.unit}
                  </b>
                </span>
                <span>
                  <small>Climatology RMSE</small>
                  <b>
                    {caseFile.outlook.climatology_baseline_rmse ?? "Not evaluated"}{" "}
                    {caseFile.outlook.climatology_baseline_rmse === null
                      ? ""
                      : caseFile.unit}
                  </b>
                </span>
              </div>
              <p className="srs-cmip6-note">{caseFile.outlook.cmip6_Reference_note}</p>
            </article>
          </div>
        </div>
      )}
    </div>
  );
}

function AnalysisRoute() {
  const params = useSearchParams();
  const id = params.get('forecastId');
  return id ? <ForecastWorkspace key={id} id={id} artifactId={params.get("run") || undefined}/> : <HistoricalAnalysis/>;
}
export default function DashboardAnalysis() {
  return <Suspense fallback={<div className="dashboard-page-inner">Loading workspace...</div>}><AnalysisRoute/></Suspense>;
}
