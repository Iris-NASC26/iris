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
    source: "NASA POWER / MERRA-2 / AIRS",
    unit: "°C",
    resolution: "0.5° × 0.625°",
    coverage: "1981–present",
    description:
      "Average air temperature near the surface, comparable to a standard weather station or orbital infrared sounder measurement.",
  },
  {
    id: "precipitation",
    name: "Precipitation & Storm Runoff",
    code: "PRECTOTCORR",
    category: "Water",
    source: "NASA GES DISC / GPM IMERG / GLDAS",
    unit: "mm / day",
    resolution: "0.1° – 0.25°",
    coverage: "2000–present",
    description:
      "Satellite-gauge precipitation and storm surface runoff used to investigate extreme floods, cyclones, and hydrological whiplash.",
  },
  {
    id: "soil-moisture",
    name: "Soil moisture content",
    code: "SoilMoi",
    category: "Land",
    source: "NASA GES DISC / GLDAS Noah & CLSM",
    unit: "kg m-2",
    resolution: "0.25°",
    coverage: "2000–present",
    description:
      "Surface and deep root-zone soil moisture content used to trace watershed saturation and infiltration capacity.",
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
    name: "Snow water equivalent & Ground heat flux",
    code: "SWE_inst",
    category: "Cryosphere",
    source: "NASA GES DISC / GLDAS-2.1",
    unit: "kg m-2",
    resolution: "0.25° – 1.0°",
    coverage: "2000–present",
    description:
      "High-altitude snowpack water equivalent and downward ground heat flux driving spring snowmelt and permafrost thaw.",
  },
];

export const caseStudies: CaseStudy[] = [
  {
    id: "nepal-glacier-flood-2026",
    title: "2026 Nepal Flood & Glacier Disaster",
    location: "Rasuwa / Trishuli & Lirung Corridor, Nepal",
    region: "Rasuwa / Trishuli Basin, Nepal",
    bbox: "28.00, 85.00, 28.60, 85.80",
    phenomenon: "Flood & Glacier",
    datasetId: "precipitation",
    startYear: 2020,
    endYear: 2026,
    finding: "+0.15 °C/yr · +423% SWE",
    confidence: "p = 0.0016",
    source: "NASA GES DISC (MERRA-2 / GLDAS-2.1 / GPM)",
  },
  {
    id: "sri-lanka-cyclone-ditwah-2025",
    title: "2025 Sri Lanka Cyclone Ditwah Disaster",
    location: "Sri Lanka National Bounding Box",
    region: "Sri Lanka National Bounding Box",
    bbox: "5.91, 79.69, 9.83, 81.87",
    phenomenon: "Cyclone & Runoff",
    datasetId: "precipitation",
    startYear: 2014,
    endYear: 2026,
    finding: "+8.97σ Runoff · +3.9σ Rain",
    confidence: "+8.97σ Anomaly",
    source: "NASA GES DISC (GLDAS Noah v2.1)",
  },
  {
    id: "saudi-arabia-hajj-heat-2024",
    title: "2024 Saudi Arabia Hajj Extreme Heat Crisis",
    location: "Mecca Region, Saudi Arabia",
    region: "Mecca Region, Saudi Arabia",
    bbox: "20.50, 39.00, 22.50, 41.00",
    phenomenon: "Extreme Heat",
    datasetId: "temperature",
    startYear: 2004,
    endYear: 2026,
    finding: ">36.5 °C Grid · >51 °C Urban",
    confidence: "22-Yr Upper-Tail Peak",
    source: "NASA GES DISC (Aqua AIRS v7.0)",
  },
  {
    id: "libya-pakistan-compound-floods",
    title: "Derna (Libya 2023) & Pakistan (2022) Mega-Floods",
    location: "Wadi Derna (Libya) & Southern Pakistan",
    region: "Southern Pakistan & Wadi Derna",
    bbox: "23.50, 66.50, 28.50, 70.50",
    phenomenon: "Compound Floods",
    datasetId: "soil-moisture",
    startYear: 2004,
    endYear: 2026,
    finding: ">100 mm/d Libya · >31 kg/m² Soil",
    confidence: "22-Yr Record Peak",
    source: "NASA GES DISC (GPM IMERG / GLDAS / MODIS)",
  },
  {
    id: "usa-hurricane-helene-2024",
    title: "2024 Southeastern USA Hurricane Helene Whiplash",
    location: "Florida Big Bend to Western NC, USA",
    region: "Southeastern USA Corridor",
    bbox: "29.00, −84.50, 36.50, −81.00",
    phenomenon: "Hurricane & Whiplash",
    datasetId: "precipitation",
    startYear: 2019,
    endYear: 2026,
    finding: "212.52 kg/m² Rain · 2.51× Runoff",
    confidence: "p < 0.0001 (Soil) · p = 0.0462 (Rain)",
    source: "NASA GES DISC (NLDAS-2 / GLDAS-2.2 / MERRA-2)",
  },
];

export const intelligenceSuggestions = [
  "Analyze rainfall and glacier thaw in Rasuwa / Trishuli, Nepal (2020–2026)",
  "Examine Cyclone Ditwah storm surface runoff and soil saturation in Sri Lanka",
  "Investigate Hurricane Helene rainfall and soil moisture whiplash in Southeastern USA",
];

export function parseIntelligencePrompt(prompt: string) {
  const normalized = prompt.toLowerCase();
  const isNepal = normalized.includes("nepal") || normalized.includes("glacier") || normalized.includes("rasuwa");
  const isSriLanka = normalized.includes("sri lanka") || normalized.includes("ditwah") || normalized.includes("colombo");
  const isSaudi = normalized.includes("saudi") || normalized.includes("mecca") || normalized.includes("hajj") || normalized.includes("heat");
  const isLibyaPak = normalized.includes("libya") || normalized.includes("derna") || normalized.includes("pakistan");
  const selectedCase = isNepal
    ? caseStudies[0]
    : isSriLanka
      ? caseStudies[1]
      : isSaudi
        ? caseStudies[2]
        : isLibyaPak
          ? caseStudies[3]
          : caseStudies[4];
  const dataset = datasets.find((item) => item.id === selectedCase.datasetId) ?? datasets[0];

  return {
    category: dataset.category,
    topic: selectedCase.phenomenon,
    dataset,
    selectedCase,
    interpretation: `Matched this question to ${dataset.name} for ${selectedCase.region} (${selectedCase.startYear}–${selectedCase.endYear}).`,
  };
}
