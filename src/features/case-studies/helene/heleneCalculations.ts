import { heleneData } from "./heleneData";

export interface ComparisonResult {
  valA: number;
  valB: number;
  unit: string;
  absDiff: number;
  relDiffPercent: number | null;
  ratio: number | null;
  formattedDiff: string;
}

export function formatScientificValue(val: number, decimals: number = 2): string {
  return val.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function calculateRainfallComparison(dateA: string, dateB: string): ComparisonResult | null {
  const obsA = heleneData.rainfall.observations.find((o) => o.date === dateA);
  const obsB = heleneData.rainfall.observations.find((o) => o.date === dateB);
  if (!obsA || !obsB) return null;

  const valA = obsA.value as number;
  const valB = obsB.value as number;
  const diff = valB - valA;
  const relDiff = valA !== 0 ? ((valB - valA) / valA) * 100 : null;
  const ratio = valA !== 0 ? valB / valA : null;

  const sign = diff > 0 ? "+" : "";
  return {
    valA,
    valB,
    unit: heleneData.rainfall.unit,
    absDiff: diff,
    relDiffPercent: relDiff,
    ratio,
    formattedDiff: `${sign}${diff.toFixed(2)} ${heleneData.rainfall.unit}`,
  };
}

export function calculateOceanDifference(): {
  augVal: number;
  sepVal: number;
  diff: number;
  formattedDiff: string;
} {
  const aug = heleneData.ocean.observations[0].value as number;
  const sep = heleneData.ocean.observations[1].value as number;
  const diff = sep - aug;
  const sign = diff > 0 ? "+" : "";
  return {
    augVal: aug,
    sepVal: sep,
    diff,
    formattedDiff: `${sign}${diff.toFixed(2)} °C`,
  };
}

export function calculateSoilDifference(dateA: string, dateB: string): ComparisonResult | null {
  const obsA = heleneData.soil.observations.find((o) => o.date === dateA);
  const obsB = heleneData.soil.observations.find((o) => o.date === dateB);
  if (!obsA || !obsB) return null;

  const valA = obsA.value as number;
  const valB = obsB.value as number;
  const diff = valB - valA;
  const relDiff = valA !== 0 ? ((valB - valA) / valA) * 100 : null;
  const ratio = valA !== 0 ? valB / valA : null;

  const sign = diff > 0 ? "+" : "";
  return {
    valA,
    valB,
    unit: heleneData.soil.unit,
    absDiff: diff,
    relDiffPercent: relDiff,
    ratio,
    formattedDiff: `${sign}${diff.toFixed(2)} ${heleneData.soil.unit}`,
  };
}

export function calculateRunoffComparison(dateA: string, dateB: string): ComparisonResult | null {
  const obsA = heleneData.runoff.observations.find((o) => o.date === dateA);
  const obsB = heleneData.runoff.observations.find((o) => o.date === dateB);
  if (!obsA || !obsB) return null;

  const valA = obsA.value as number;
  const valB = obsB.value as number;
  const diff = valB - valA;
  const relDiff = valA !== 0 ? ((valB - valA) / valA) * 100 : null;
  const ratio = valA !== 0 ? valB / valA : null;

  const sign = diff > 0 ? "+" : "";
  return {
    valA,
    valB,
    unit: heleneData.runoff.unit,
    absDiff: diff,
    relDiffPercent: relDiff,
    ratio,
    formattedDiff: `${sign}${diff.toFixed(6)} ${heleneData.runoff.unit}`,
  };
}
