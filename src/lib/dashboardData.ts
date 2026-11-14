export type SignalMode = "raw" | "seasonal" | "anomaly";

export type Dataset = {
  id: string;
  name: string;
  code: string;
  category: string;
  source: string;
  unit: string;
  resolution: string;
  coverage: string;
  description: string;
};

export type CaseStudy = {
  id: string;
  title: string;
  location: string;
  region: string;
  bbox: string;
  phenomenon: string;
  datasetId: string;
  startYear: number;
  endYear: number;
  finding: string;
  confidence: string;
  source: string;
};

export const datasets: Dataset[] = [
  {
    id: "temperature",
    name: "Near-surface air temperature",
    code: "T2M",
    category: "Atmosphere",
    source: "NASA POWER / MERRA-2",
    unit: "°C",
    resolution: "0.5° × 0.625°",
    coverage: "1981–present",
    description:
      "Average air temperature two meters above the surface, comparable to a standard weather station measurement.",
  },
  {
    id: "precipitation",
    name: "Precipitation",
    code: "PRECTOTCORR",
    category: "Water",
    source: "NASA POWER / GPM",
    unit: "mm / day",
    resolution: "0.5° × 0.625°",
    coverage: "1981–present",
    description:
      "Bias-corrected precipitation rate used to investigate drought, wet periods, and long-term rainfall change.",
  },
  {
    id: "soil-moisture",
    name: "Topsoil moisture",
    code: "GWETTOP",
    category: "Land",
    source: "NASA POWER / MERRA-2",
    unit: "0–1 index",
    resolution: "0.5° × 0.625°",
    coverage: "1981–present",
    description:
      "Relative wetness in the upper soil layer, useful for tracing agricultural and ecological drought stress.",
  },
  {
    id: "vegetation",
    name: "Vegetation index",
    code: "NDVI",
    category: "Biosphere",
    source: "MODIS MOD13C2",
    unit: "Index",
    resolution: "0.05°",
    coverage: "2000–present",
    description:
      "A normalized measure of vegetation greenness used to identify persistent stress, recovery, and seasonal change.",
  },
  {
    id: "snow",
    name: "Snow cover fraction",
    code: "NDSI_SNOW_COVER",
    category: "Cryosphere",
    source: "MODIS MOD10C1",
    unit: "%",
    resolution: "0.05°",
    coverage: "2000–present",
    description:
      "The proportion of a grid cell covered by snow, derived from daily MODIS observations.",
  },
];

export const caseStudies: CaseStudy[] = [
  {
    id: "IR–042",
    title: "Two decades of urban warming",
    location: "Los Angeles County, CA",
    region: "Los Angeles County",
    bbox: "33.70, −118.95, 34.82, −117.62",
    phenomenon: "Extreme heat",
    datasetId: "temperature",
    startYear: 2005,
    endYear: 2025,
    finding: "+0.42 °C / decade",
    confidence: "99.86%",
    source: "NASA POWER / MERRA-2",
  },
  {
    id: "IR–038",
    title: "The signature of a historic drought",
    location: "Central Valley, CA",
    region: "California Central Valley",
    bbox: "35.00, −122.60, 40.80, −118.50",
    phenomenon: "Drought",
    datasetId: "soil-moisture",
    startYear: 2001,
    endYear: 2024,
    finding: "−0.07 index / decade",
    confidence: "98.2%",
    source: "NASA POWER / MERRA-2",
  },
  {
    id: "IR–031",
    title: "Forest resilience under pressure",
    location: "Amazon Basin, Brazil",
    region: "Central Amazon Basin",
    bbox: "−8.50, −68.00, 1.00, −52.00",
    phenomenon: "Vegetation",
    datasetId: "vegetation",
    startYear: 2003,
    endYear: 2024,
    finding: "−0.08 NDVI / decade",
    confidence: "95.4%",
    source: "MODIS MOD13C2",
  },
  {
    id: "IR–024",
    title: "Himalayan snow retreat",
    location: "Koshi Basin, Nepal",
    region: "Central Himalaya",
    bbox: "26.70, 85.00, 29.20, 89.20",
    phenomenon: "Snow & ice",
    datasetId: "snow",
    startYear: 2001,
    endYear: 2024,
    finding: "−3.8% cover / decade",
    confidence: "97.7%",
    source: "MODIS MOD10C1",
  },
];

export const intelligenceSuggestions = [
  "Show me drought signals in California since 2001",
  "Has the Amazon become less green over the past 20 years?",
  "Map this headline: Himalayan snow cover is retreating",
];

export function parseIntelligencePrompt(prompt: string) {
  const normalized = prompt.toLowerCase();
  const isSnow = normalized.includes("snow") || normalized.includes("himalaya");
  const isAmazon = normalized.includes("amazon") || normalized.includes("green");
  const isDrought =
    normalized.includes("drought") ||
    normalized.includes("soil") ||
    normalized.includes("california");
  const selectedCase = isSnow
    ? caseStudies[3]
    : isAmazon
      ? caseStudies[2]
      : isDrought
        ? caseStudies[1]
        : caseStudies[0];
  const dataset = datasets.find((item) => item.id === selectedCase.datasetId) ?? datasets[0];

  return {
    category: dataset.category,
    topic: isSnow
      ? "Snow / Ice Extent"
      : isAmazon
        ? "Vegetation Index"
        : isDrought
          ? "Land Surface Moisture"
          : "Surface Air Temperature",
    dataset,
    selectedCase,
    interpretation: `I matched this question to ${dataset.name} for ${selectedCase.region}. The suggested period balances available observations with a record long enough for trend testing.`,
  };
}
