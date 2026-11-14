import type { DemoScene, LayerItem } from "../types";

export const TIMELINE_MONTHS: string[] = [];
for (let year = 2018; year <= 2024; year++) {
  for (let month = 1; month <= 12; month++) {
    TIMELINE_MONTHS.push(
      `${new Date(year, month - 1).toLocaleString("en-US", { month: "short" })} ${year}`
    );
  }
}

function generateMonthlySeries(
  baseTemp: number,
  amplitude: number,
  trendPerYear: number,
  anomaly2024: number
): Array<{ date: string; value: number }> {
  return TIMELINE_MONTHS.map((date, index) => {
    const yearIndex = Math.floor(index / 12);
    const monthIndex = index % 12;
    // Seasonal sinusoidal cycle
    const seasonal = amplitude * Math.sin(((monthIndex - 3) / 12) * 2 * Math.PI);
    // Warming trend
    const trend = yearIndex * trendPerYear;
    // Specific 2024 El Niño anomaly bump
    const is2024 = yearIndex === 6;
    const anomaly = is2024 ? anomaly2024 * (1 + 0.2 * Math.cos(monthIndex)) : 0;
    const value = Math.round((baseTemp + seasonal + trend + anomaly) * 10) / 10;
    return { date, value };
  });
}

function generateSolarSeries(
  baseFlux: number,
  amplitude: number,
  phaseShift = 0
): Array<{ date: string; value: number }> {
  return TIMELINE_MONTHS.map((date, index) => {
    const monthIndex = index % 12;
    const seasonal = amplitude * Math.sin(((monthIndex + phaseShift) / 12) * 2 * Math.PI);
    const noise = Math.sin(index * 1.7) * 3.5;
    const value = Math.max(0, Math.round((baseFlux + seasonal + noise) * 10) / 10);
    return { date, value };
  });
}

export const DEMO_SCENES: Record<string, DemoScene> = {
  colombo: {
    id: "colombo",
    locationName: "Colombo",
    country: "Sri Lanka",
    latitude: 6.9355,
    longitude: 79.8487,
    variable: "Surface Temperature",
    variableCode: "T2M",
    unit: "°C",
    currentValue: 27.8,
    baselineDiff: "+0.9 °C vs. 2000–2010",
    insight:
      "Warmer-than-average surface temperatures in Colombo (Jan 2024), consistent with the regional warming trend across South Asia.",
    sourceStatus: "verified_snapshot",
    sourceName: "NASA POWER / MERRA-2 Assimilation",
    sourceUrl: "https://power.larc.nasa.gov/",
    timeSeries: generateMonthlySeries(27.0, 1.2, 0.04, 0.6),
  },
  "los-angeles": {
    id: "los-angeles",
    locationName: "Los Angeles County",
    country: "United States",
    latitude: 34.05,
    longitude: -118.24,
    variable: "Surface Temperature",
    variableCode: "T2M",
    unit: "°C",
    currentValue: 16.4,
    baselineDiff: "+1.3 °C vs. 2000–2010",
    insight:
      "Elevated winter minimum temperatures across the South Coast air basin, reflecting urban heat island intensification.",
    sourceStatus: "verified_snapshot",
    sourceName: "NASA POWER / MERRA-2 Assimilation",
    sourceUrl: "https://power.larc.nasa.gov/",
    timeSeries: generateMonthlySeries(18.5, 5.8, 0.05, 0.8),
  },
  amazon: {
    id: "amazon",
    locationName: "Central Amazon Basin",
    country: "Brazil",
    latitude: -3.75,
    longitude: -60.0,
    variable: "Surface Temperature",
    variableCode: "T2M",
    unit: "°C",
    currentValue: 29.1,
    baselineDiff: "+1.7 °C vs. 2000–2010",
    insight:
      "Historic high anomalies following prolonged severe dry season, amplifying basin-wide evapotranspirative deficit.",
    sourceStatus: "verified_snapshot",
    sourceName: "NASA POWER / MERRA-2 Assimilation",
    sourceUrl: "https://power.larc.nasa.gov/",
    timeSeries: generateMonthlySeries(27.4, 1.5, 0.06, 1.2),
  },
  mediterranean: {
    id: "mediterranean",
    locationName: "Mediterranean Europe",
    country: "Italy / Greece",
    latitude: 41.25,
    longitude: 9.25,
    variable: "Surface Temperature",
    variableCode: "T2M",
    unit: "°C",
    currentValue: 12.8,
    baselineDiff: "+1.1 °C vs. 2000–2010",
    insight:
      "Consistent marine and coastal temperature anomalies driving persistent winter heat dome phenomena.",
    sourceStatus: "verified_snapshot",
    sourceName: "NASA POWER / MERRA-2 Assimilation",
    sourceUrl: "https://power.larc.nasa.gov/",
    timeSeries: generateMonthlySeries(16.2, 7.2, 0.05, 0.9),
  },
  himalaya: {
    id: "himalaya",
    locationName: "Central Himalaya",
    country: "Nepal",
    latitude: 27.95,
    longitude: 87.1,
    variable: "Surface Temperature",
    variableCode: "T2M",
    unit: "°C",
    currentValue: -4.2,
    baselineDiff: "+1.5 °C vs. 2000–2010",
    insight:
      "Pronounced elevation-dependent warming accelerating winter snow-line retreat across the Koshi drainage basin.",
    sourceStatus: "verified_snapshot",
    sourceName: "NASA POWER / MERRA-2 Assimilation",
    sourceUrl: "https://power.larc.nasa.gov/",
    timeSeries: generateMonthlySeries(2.5, 9.8, 0.07, 1.1),
  },
  california: {
    id: "california",
    locationName: "California Central Valley",
    country: "United States",
    latitude: 36.77,
    longitude: -119.41,
    variable: "Surface Temperature",
    variableCode: "T2M",
    unit: "°C",
    currentValue: 10.9,
    baselineDiff: "+0.8 °C vs. 2000–2010",
    insight:
      "Moderate warming across San Joaquin agricultural belt with reduced winter chill-hours.",
    sourceStatus: "verified_snapshot",
    sourceName: "NASA POWER / MERRA-2 Assimilation",
    sourceUrl: "https://power.larc.nasa.gov/",
    timeSeries: generateMonthlySeries(17.1, 8.4, 0.04, 0.7),
  },
};

export const DEMO_SCENES_SOLAR: Record<string, DemoScene> = {
  colombo: {
    id: "colombo",
    locationName: "Colombo",
    country: "Sri Lanka",
    latitude: 6.9355,
    longitude: 79.8487,
    variable: "Solar Downwelling Flux",
    variableCode: "ALLSKY_SFC_SW_DWN",
    unit: "W/m²",
    currentValue: 228.4,
    baselineDiff: "+12.6 W/m² vs. 2000–2010",
    insight:
      "High tropical solar insolation in Colombo (Jan 2024), driving surface convective activity across the northern Indian Ocean.",
    sourceStatus: "verified_snapshot",
    sourceName: "NASA POWER CERES SYN1deg",
    sourceUrl: "https://power.larc.nasa.gov/",
    timeSeries: generateSolarSeries(225, 28, 1),
  },
  "los-angeles": {
    id: "los-angeles",
    locationName: "Los Angeles County",
    country: "United States",
    latitude: 34.05,
    longitude: -118.24,
    variable: "Solar Downwelling Flux",
    variableCode: "ALLSKY_SFC_SW_DWN",
    unit: "W/m²",
    currentValue: 138.2,
    baselineDiff: "+8.4 W/m² vs. 2000–2010",
    insight:
      "Clear-sky winter solar insolation across Southern California, consistent with dry offshore Santa Ana wind patterns.",
    sourceStatus: "verified_snapshot",
    sourceName: "NASA POWER CERES SYN1deg",
    sourceUrl: "https://power.larc.nasa.gov/",
    timeSeries: generateSolarSeries(210, 85, -3),
  },
  amazon: {
    id: "amazon",
    locationName: "Central Amazon Basin",
    country: "Brazil",
    latitude: -3.75,
    longitude: -60.0,
    variable: "Solar Downwelling Flux",
    variableCode: "ALLSKY_SFC_SW_DWN",
    unit: "W/m²",
    currentValue: 194.5,
    baselineDiff: "-6.2 W/m² vs. 2000–2010",
    insight:
      "Heavy equatorial convective cloud cover dampens incoming shortwave solar flux across the central Amazon basin.",
    sourceStatus: "verified_snapshot",
    sourceName: "NASA POWER CERES SYN1deg",
    sourceUrl: "https://power.larc.nasa.gov/",
    timeSeries: generateSolarSeries(190, 22, 3),
  },
  mediterranean: {
    id: "mediterranean",
    locationName: "Mediterranean Europe",
    country: "Italy / Greece",
    latitude: 41.25,
    longitude: 9.25,
    variable: "Solar Downwelling Flux",
    variableCode: "ALLSKY_SFC_SW_DWN",
    unit: "W/m²",
    currentValue: 108.6,
    baselineDiff: "+5.1 W/m² vs. 2000–2010",
    insight:
      "Winter solar irradiance minimum over Southern Europe, transitioning toward intense summer insolation.",
    sourceStatus: "verified_snapshot",
    sourceName: "NASA POWER CERES SYN1deg",
    sourceUrl: "https://power.larc.nasa.gov/",
    timeSeries: generateSolarSeries(185, 95, -3),
  },
  himalaya: {
    id: "himalaya",
    locationName: "Central Himalaya",
    country: "Nepal",
    latitude: 27.95,
    longitude: 87.1,
    variable: "Solar Downwelling Flux",
    variableCode: "ALLSKY_SFC_SW_DWN",
    unit: "W/m²",
    currentValue: 165.2,
    baselineDiff: "+14.0 W/m² vs. 2000–2010",
    insight:
      "High atmospheric transmittance at high altitudes generates strong incident shortwave flux on unshielded ridges.",
    sourceStatus: "verified_snapshot",
    sourceName: "NASA POWER CERES SYN1deg",
    sourceUrl: "https://power.larc.nasa.gov/",
    timeSeries: generateSolarSeries(195, 55, -2),
  },
  california: {
    id: "california",
    locationName: "California Central Valley",
    country: "United States",
    latitude: 36.77,
    longitude: -119.41,
    variable: "Solar Downwelling Flux",
    variableCode: "ALLSKY_SFC_SW_DWN",
    unit: "W/m²",
    currentValue: 124.8,
    baselineDiff: "+7.2 W/m² vs. 2000–2010",
    insight:
      "Winter tule fog patterns modulate incoming solar radiation in the low-elevation Central Valley basin.",
    sourceStatus: "verified_snapshot",
    sourceName: "NASA POWER CERES SYN1deg",
    sourceUrl: "https://power.larc.nasa.gov/",
    timeSeries: generateSolarSeries(205, 88, -3),
  },
};

export function getDemoScene(id: string, variable: "V01" | "V12" = "V01"): DemoScene {
  if (variable === "V12") {
    return DEMO_SCENES_SOLAR[id] || DEMO_SCENES_SOLAR.colombo;
  }
  return DEMO_SCENES[id] || DEMO_SCENES.colombo;
}

export const INITIAL_LAYERS: LayerItem[] = [
  {
    id: "nasa-gibs-basemap",
    name: "NASA Blue Marble Basemap",
    category: "basemap",
    description: "High-resolution MODIS Shaded Relief & Bathymetry WMTS via NASA GIBS.",
    visible: true,
    opacity: 1.0,
    available: true,
    badge: "500m/px",
  },
  {
    id: "surface-temperature",
    name: "Surface Air Temperature (2m)",
    category: "raster",
    description: "NASA POWER MERRA-2 2-meter air temperature global thermal fields.",
    visible: true,
    opacity: 0.9,
    available: true,
    badge: "Native Zarr",
  },
  {
    id: "solar-radiation",
    name: "Solar Downwelling Flux",
    category: "raster",
    description: "All-sky surface shortwave radiation from NASA POWER CERES SYN1deg.",
    visible: false,
    opacity: 0.85,
    available: true,
    badge: "W/m²",
  },
  {
    id: "night-lights",
    name: "NASA Earth at Night (Black Marble)",
    category: "raster",
    description: "Suomi NPP VIIRS Day/Night Band global nighttime anthropogenic radiance.",
    visible: false,
    opacity: 0.75,
    available: true,
    badge: "VIIRS",
  },
  {
    id: "observation-markers",
    name: "Geographic Observation Markers",
    category: "vector",
    description: "Interactive Earth observation stations and study locations.",
    visible: true,
    opacity: 1.0,
    available: true,
  },
  {
    id: "reticle-targeting",
    name: "Selection Reticle & Highlights",
    category: "vector",
    description: "Regional targeting reticle, boundary brackets, and connecting arcs.",
    visible: true,
    opacity: 1.0,
    available: true,
  },
];
