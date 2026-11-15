import ingested from "./ingestedDatasets.json";
import type { CaseStudyDefinition } from "../common/types";

export const NEPAL_CASE_STUDY: CaseStudyDefinition = {
  id: "case-01-nepal-2026",
  slug: "nepal-2026",
  title: "Nepal 2026: Mountain Climate and Flood Risk",
  subtitle: "Investigating Temperature Warming, High-Altitude Snowpack Surges, and Glacier-Flood Disasters in the Rasuwa and Trishuli River Corridor",
  location: "Rasuwa / Trishuli & Himalayan Mountain Region, Nepal",
  event: "August–September 2026 Hydro-Meteorological Disaster Window",
  year: "2026",
  tag: "MOUNTAIN CRYOSPHERE & FLOOD RISK",
  intro: {
    background:
      "In late summer 2026, the high-altitude Himalayan catchments of Rasuwa, Trishuli, and the upper Gandaki/Narayani basin experienced catastrophic compound flood and glacier-related events. An initial glacier-avalanche flash flood occurred on August 26, followed by extreme basin-wide monsoon cloudbursts and flooding during September 24–27, 2026. This investigation integrates satellite-derived precipitation, deep-soil moisture, and reported atmospheric and cryospheric telemetry from NASA Giovanni to analyze compound risk factors.",
    question:
      "Did multi-year regional warming, unseasonal winter snowpack surges, and anomalous subsurface ground heat flux pre-condition high Himalayan slopes for catastrophic collapse and subsequent flood inundation?",
    contextBullets: [
      "August 26, 2026: Debris-avalanche and flash flood triggered along the Lirung glacier and upper Trishuli River corridor.",
      "September 24–27, 2026: Late-monsoon extreme rainfall across pre-saturated Himalayan watersheds drove Narayani and Gandak rivers past record danger levels.",
      "Investigation Scope: Evaluates verified NASA Giovanni GPM precipitation and GLDAS deep-soil moisture records against published research metrics."
    ],
  },
  region: {
    locationDescription: "Rasuwa, Trishuli River basin, and Lirung Massif corridor, Central Nepal Himalayas",
    coordinates: {
      west: 85.0,
      east: 85.8,
      south: 28.0,
      north: 28.6,
    },
    center: {
      lat: 28.3,
      lon: 85.4,
    },
    datasetCoverageNote:
      "Giovanni User Bounding Box 85.0°E–85.8°E, 28.0°N–28.6°N. Captures the high-relief mountain valleys and glaciated terrain north of Kathmandu up to the Tibetan border.",
  },
  indicators: [
    {
      variableName: "Merged Satellite-Gauge Monthly Precipitation",
      product: "GPM_3IMERGM_07_precipitation",
      units: "mm/hr",
      temporalResolution: "Monthly (0.1°)",
      coverage: "Jan 2020 – Sep 2025 (69 months)",
      status: "partial",
      verifiedObservation: "Summer monsoon peak 0.517 mm/hr (June 2020); series archive ends Sep 2025.",
      note: "GPM Final Run monthly series terminates in September 2025 in the source archive; does not directly observe the August–September 2026 event window.",
    },
    {
      variableName: "Deep Soil Moisture Content (100–200 cm)",
      product: "GLDAS_NOAH025_M_2_0_SoilMoi100_200cm_inst",
      units: "kg/m²",
      temporalResolution: "Monthly (0.25°)",
      coverage: "Dec 2013 – Dec 2014 (13 months)",
      status: "partial",
      verifiedObservation: "Historical annual range: 271.4 kg/m² (June) to 344.8 kg/m² (August 2014).",
      note: "Legacy GLDAS v2.0 archive provides historical baseline only; retired before 2026.",
    },
    {
      variableName: "MERRA-2 2m Air Temperature (Reported Research Context)",
      product: "M2IMNXASM_5_12_4_T2M",
      units: "°C",
      temporalResolution: "Monthly (0.5° × 0.625°)",
      coverage: "Jan 2020 – Sep 2026 (Reported in publication)",
      status: "missing_in_source",
      verifiedObservation: "+0.15°C/yr warming trend (p = 0.0016); record July (13.34°C) and August (12.71°C) 2026.",
      note: "Reported in original Earth Trend Detective research report; corresponding numerical CSV was omitted from folder.",
    },
    {
      variableName: "Snow Water Equivalent (Reported Research Context)",
      product: "GLDAS_NOAH10_M_2_1_SWE_inst",
      units: "mm (kg/m²)",
      temporalResolution: "Monthly (1.0°)",
      coverage: "Jan 2020 – Jul 2026 (Reported in publication)",
      status: "missing_in_source",
      verifiedObservation: "Extreme snowpack surge in Feb 2026: 13.59 mm (+423% over 2.60 mm baseline).",
      note: "Reported in original research document; supporting CSV file not included in provided dataset.",
    },
    {
      variableName: "Subsurface Ground Heat Flux (Reported Research Context)",
      product: "GLDAS_NOAH025_M_2_1_Qg_tavg",
      units: "W/m²",
      temporalResolution: "Monthly (0.25°)",
      coverage: "Jan 2020 – Jul 2026 (Reported in publication)",
      status: "missing_in_source",
      verifiedObservation: "Record downward heat flux in June (+9.10 W/m²) and July (+5.97 W/m²) 2026.",
      note: "Described as permafrost thaw driver in research paper; matching CSV missing from folder.",
    },
  ],
  datasets: [
    {
      id: "nepal_gpm_precip",
      name: "Monthly Precipitation (GPM IMERG v07)",
      color: "#20b2aa",
      meta: {
        product: "GPM_3IMERGM_07",
        variable: "mean_GPM_3IMERGM_07_precipitation",
        variableName: "Merged Satellite-Gauge Monthly Precipitation",
        nativeUnit: "mm/hr",
        displayUnit: "mm/hr",
        spatialResolution: "0.1° (~10 km)",
        temporalResolution: "Monthly",
        userBbox: "85, 28, 85.8, 28.6",
        dataBbox: "85.05, 28.05, 85.75, 28.55",
        verifiedObservation: "Peak 0.5168 mm/hr (Jun 2020); Aug 2025: 0.4202 mm/hr.",
        coverage: {
          start: ingested.nepal_gpm_precip.startDate,
          end: ingested.nepal_gpm_precip.endDate,
          count: ingested.nepal_gpm_precip.count,
        },
        stats: ingested.nepal_gpm_precip.stats,
      },
      data: ingested.nepal_gpm_precip.series,
    },
    {
      id: "nepal_gldas_soil",
      name: "Deep Soil Moisture 100-200cm (GLDAS v2.0)",
      color: "#8fa560",
      meta: {
        product: "GLDAS_NOAH025_M_2_0",
        variable: "GLDAS_NOAH025_M_2_0_SoilMoi100_200cm_inst",
        variableName: "Soil Moisture Content (100–200 cm underground)",
        nativeUnit: "kg/m²",
        displayUnit: "kg/m²",
        spatialResolution: "0.25° (~25 km)",
        temporalResolution: "Monthly",
        userBbox: "85, 28, 85.8, 28.6",
        dataBbox: "85.125, 28.125, 85.625, 28.375",
        verifiedObservation: "Seasonal peak 344.86 kg/m² in Aug 2014.",
        coverage: {
          start: ingested.nepal_gldas_soil.startDate,
          end: ingested.nepal_gldas_soil.endDate,
          count: ingested.nepal_gldas_soil.count,
        },
        stats: ingested.nepal_gldas_soil.stats,
      },
      data: ingested.nepal_gldas_soil.series,
    },
  ],
  eventAnnotation: {
    date: "2026-08-26",
    label: "August 2026 Disaster Window",
  },
  scientificFindings: {
    mainObservations: [
      "The verified GPM monthly precipitation record for Rasuwa shows strong cyclical South Asian monsoon peaks (typically 0.35–0.52 mm/hr in June–August) with extreme dry winters (<0.06 mm/hr).",
      "GLDAS v2.0 deep-soil moisture (100–200 cm) exhibits distinct annual recharge cycles, reaching maximum saturation (344.8 kg/m²) following sustained monsoon infiltration.",
      "The research document reports that June and July 2026 exhibited the highest downward subsurface ground heat flux (+9.10 W/m² and +5.97 W/m²) in the 7-year record, weakening permafrost and rock bonds.",
      "A massive winter snowpack anomaly (+423% above baseline in February 2026 at 13.59 mm SWE) was followed by rapid spring-to-summer thaw prior to the August 26 collapse."
    ],
    anomaliesAndTrends: [
      "Deseasonalized temperature warming of +0.15°C/year (Mann-Kendall p = 0.0016) reported in MERRA-2 telemetry, culminating in record July (13.34°C) and August (12.71°C) summer warmth.",
      "The compound chain: Heavy winter mechanical loading -> early spring meltwater infiltration into fissures -> summer permafrost thaw -> late-monsoon watershed saturation and flash floods."
    ],
    reportExplanations: [
      "Steep high-relief catchments in the Trishuli corridor lack wide floodplains. When glaciated slopes and moraine dams fail, debris flows propagate rapidly downriver.",
      "Pre-saturated shallow and deep soils cannot buffer subsequent late-monsoon cloudbursts, leading to near 100% surface runoff conversion."
    ],
    limitations: [
      "Critical Dataset Limitation: The provided GPM precipitation CSV in the archive ends in September 2025. It does not provide direct numerical observation of the August–September 2026 events.",
      "Critical Temporal Coverage Gap: The GLDAS v2.0 soil moisture file covers only 2013–2014 and cannot be used as an observation of 2026 conditions.",
      "Missing Supporting Telemetry: MERRA-2 2m temperature, GLDAS SWE, and Ground Heat Flux CSV files are discussed in the report but were absent from the folder. In accordance with scientific integrity guidelines, Iris documents these findings from the research paper without generating synthetic 2026 data points."
    ],
  },
  sourcesAndMethods: {
    originalDatasets: [
      {
        name: "GPM IMERG Final Run Monthly Precipitation",
        productId: "GPM_3IMERGM_07",
        provider: "NASA GES DISC Giovanni",
        nativeUnit: "mm/hr",
        coverage: "2020-01 to 2025-09",
        spatialResolution: "0.1° (~10 km)",
        link: "https://giovanni.gsfc.nasa.gov/giovanni/#data=GPM_3IMERGM_07_precipitation",
      },
      {
        name: "GLDAS Noah Land Surface Model Deep Soil Moisture (100–200cm)",
        productId: "GLDAS_NOAH025_M_2_0",
        provider: "NASA GES DISC Giovanni",
        nativeUnit: "kg/m²",
        coverage: "2013-12 to 2014-12",
        spatialResolution: "0.25° (~25 km)",
        link: "https://giovanni.gsfc.nasa.gov/giovanni/#data=GLDAS_NOAH025_M_2_0_SoilMoi100_200cm_inst",
      },
    ],
    originalReport: {
      title: "Earth Trend Detective — 2026 Nepal Disaster Data Analysis",
      authorsOrPortal: "NASA Space Apps Challenge Case Study Team / NASA GES DISC Giovanni",
      keyCitation: "Earth Trend Detective (2026). Step-by-Step Dataset Audit, Visual Time-Series Charts & Causal Evidence Behind the 2026 Rasuwa Disasters.",
    },
    methodologyNotes: [
      "Coordinates strictly verified against Giovanni metadata: User Bounding Box 85.0°E–85.8°E, 28.0°N–28.6°N.",
      "All fill values (-9999 and -9999.9) removed during automated ingestion.",
      "Report claims regarding statistical significance (Mann-Kendall p = 0.0016) and Sen's slope estimator (+0.15°C/yr) are attributed directly to the report rather than recalculated from missing raw files."
    ],
    limitationsStatement:
      "Satellite and reanalysis data describe regional catchment envelopes (~10–25 km). Localized mountain hazards, valley-channel debris dynamics, and glacial lake breaches require high-resolution in-situ hydrometric monitoring and optical/SAR radar imagery.",
  },
};

export const DITWAH_CASE_STUDY: CaseStudyDefinition = {
  id: "case-02-ditwah-2025",
  slug: "cyclone-ditwah-2025",
  title: "Cyclone Ditwah: Sri Lanka's Hydrological Shock",
  subtitle: "Multi-Variable NASA GLDAS Land-Surface Audit of Pre-Saturated Soils, Runoff Surges, and Cyclone Rainfall Across Sri Lanka",
  location: "Sri Lanka National Bounding Box",
  event: "November 2025 Flash Floods and Infrastructure Destruction",
  year: "2025",
  tag: "CYCLONE & HYDROLOGICAL SHOCK",
  intro: {
    background:
      "In late November 2025, Tropical Cyclone Ditwah struck Sri Lanka, delivering extreme rainfall across the island. The resulting flash floods caused over $1.735 billion in infrastructure failure, destroying 480 bridges and approximately 16,000 kilometers of roads. Using continuous 2014–2026 NASA GLDAS v2.1 land-surface model data from GES DISC Giovanni, this investigation explores how antecedent soil saturation combined with intense precipitation to create an unprecedented overland runoff surge.",
    question:
      "Did pre-existing deep-soil saturation eliminate Sri Lanka's watershed absorption buffer prior to Cyclone Ditwah, transforming storm rainfall into an extraordinary +8.97σ surface runoff catastrophe?",
    contextBullets: [
      "November 2025 Rainfall Rate: 0.000182365 kg m⁻² s⁻¹ (~472.7 mm/month depth equivalent), a massive +3.9σ anomaly.",
      "Antecedent Deep Soil Saturation: Reached 176.01 kg/m² in November and peaked at 184.32 kg/m² in December 2025.",
      "Surface Runoff Spike: Exploded to 0.181638 kg/m² (+8.97σ above the 2020–2025 baseline mean of 0.0155 kg/m²).",
      "Near-Surface Wind Speed: Recorded at 2.74 m/s monthly mean; localized cyclone gusts required sub-daily cadence to isolate."
    ],
  },
  region: {
    locationDescription: "Sri Lanka National Domain covering all major river basins (Mahaweli, Kelani, Kalu)",
    coordinates: {
      west: 79.69,
      east: 81.87,
      south: 5.91,
      north: 9.83,
    },
    center: {
      lat: 7.87,
      lon: 80.77,
    },
    datasetCoverageNote:
      "Giovanni User Bounding Box 79.69°E–81.87°E, 5.91°N–9.83°N. Encompasses the entire island of Sri Lanka at 0.25° (~25 km) spatial resolution.",
  },
  indicators: [
    {
      variableName: "Rain Precipitation Rate",
      product: "GLDAS_NOAH025_M_2_1_Rainf_tavg",
      units: "kg m⁻² s⁻¹",
      temporalResolution: "Monthly (0.25°)",
      coverage: "Nov 2014 – Jul 2026 (141 observations)",
      status: "verified",
      verifiedObservation: "November 2025: 0.000182365 kg m⁻² s⁻¹ (+3.9σ anomaly; ~472.7 mm/month equivalent).",
      note: "Preserved in native rate units with optional temporal depth conversion.",
    },
    {
      variableName: "Deep Soil Moisture Content (40–100 cm)",
      product: "GLDAS_NOAH025_M_2_1_SoilMoi40_100cm_inst",
      units: "kg/m²",
      temporalResolution: "Monthly (0.25°)",
      coverage: "Nov 2014 – Jul 2026 (141 observations)",
      status: "verified",
      verifiedObservation: "November 2025: 176.008 kg/m²; baseline mean: 140.79 kg/m².",
      note: "Indicates island-wide soil profile reached maximum retention limit prior to peak cyclone landfall.",
    },
    {
      variableName: "Storm Surface Runoff",
      product: "GLDAS_NOAH025_M_2_1_Qs_acc",
      units: "kg/m²",
      temporalResolution: "Monthly (0.25°)",
      coverage: "Nov 2014 – Jul 2026 (141 observations)",
      status: "verified",
      verifiedObservation: "November 2025: 0.181638 kg/m² (+8.97σ anomaly; single highest in entire 12-year dataset).",
      note: "Modeled overland flow, not measured gauge discharge.",
    },
    {
      variableName: "Near Surface Wind Speed",
      product: "GLDAS_NOAH025_M_2_1_Wind_f_inst",
      units: "m/s",
      temporalResolution: "Monthly (0.25°)",
      coverage: "Nov 2014 – Jul 2026 (141 observations)",
      status: "verified",
      verifiedObservation: "November 2025: 2.743 m/s (baseline mean: 3.12 m/s).",
      note: "Monthly averaging smooths brief, extreme cyclone wind gusts.",
    },
  ],
  datasets: [
    {
      id: "ditwah_rain",
      name: "Rain Precipitation Rate",
      color: "#29b6f6",
      meta: {
        product: "GLDAS_NOAH025_M_2_1",
        variable: "mean_GLDAS_NOAH025_M_2_1_Rainf_tavg",
        variableName: "Rain precipitation rate",
        nativeUnit: "kg m⁻² s⁻¹",
        displayUnit: "kg m⁻² s⁻¹",
        spatialResolution: "0.25° (~25 km)",
        temporalResolution: "Monthly",
        userBbox: "79.69, 5.91, 81.87, 9.83",
        dataBbox: "79.875, 6.125, 81.625, 9.625",
        verifiedObservation: "November 2025: 0.000182365 kg m⁻² s⁻¹ (~472.7 mm/mo).",
        coverage: {
          start: ingested.ditwah_rain.startDate,
          end: ingested.ditwah_rain.endDate,
          count: ingested.ditwah_rain.count,
        },
        stats: ingested.ditwah_rain.stats,
      },
      data: ingested.ditwah_rain.series,
    },
    {
      id: "ditwah_soil",
      name: "Soil Moisture (40–100 cm)",
      color: "#66bb6a",
      meta: {
        product: "GLDAS_NOAH025_M_2_1",
        variable: "mean_GLDAS_NOAH025_M_2_1_SoilMoi40_100cm_inst",
        variableName: "Soil moisture content (40–100 cm underground)",
        nativeUnit: "kg/m²",
        displayUnit: "kg/m²",
        spatialResolution: "0.25° (~25 km)",
        temporalResolution: "Monthly",
        userBbox: "79.69, 5.91, 81.87, 9.83",
        dataBbox: "79.875, 6.125, 81.625, 9.625",
        verifiedObservation: "November 2025: 176.008 kg/m².",
        coverage: {
          start: ingested.ditwah_soil.startDate,
          end: ingested.ditwah_soil.endDate,
          count: ingested.ditwah_soil.count,
        },
        stats: ingested.ditwah_soil.stats,
      },
      data: ingested.ditwah_soil.series,
    },
    {
      id: "ditwah_runoff",
      name: "Storm Surface Runoff",
      color: "#ef5350",
      meta: {
        product: "GLDAS_NOAH025_M_2_1",
        variable: "mean_GLDAS_NOAH025_M_2_1_Qs_acc",
        variableName: "Storm surface runoff",
        nativeUnit: "kg/m²",
        displayUnit: "kg/m²",
        spatialResolution: "0.25° (~25 km)",
        temporalResolution: "Monthly",
        userBbox: "79.69, 5.91, 81.87, 9.83",
        dataBbox: "79.875, 6.125, 81.625, 9.625",
        verifiedObservation: "November 2025: 0.181638 kg/m² (+8.97σ).",
        coverage: {
          start: ingested.ditwah_runoff.startDate,
          end: ingested.ditwah_runoff.endDate,
          count: ingested.ditwah_runoff.count,
        },
        stats: ingested.ditwah_runoff.stats,
      },
      data: ingested.ditwah_runoff.series,
    },
    {
      id: "ditwah_wind",
      name: "Near Surface Wind Speed",
      color: "#ab47bc",
      meta: {
        product: "GLDAS_NOAH025_M_2_1",
        variable: "mean_GLDAS_NOAH025_M_2_1_Wind_f_inst",
        variableName: "Near surface wind speed",
        nativeUnit: "m/s",
        displayUnit: "m/s",
        spatialResolution: "0.25° (~25 km)",
        temporalResolution: "Monthly",
        userBbox: "79.69, 5.91, 81.87, 9.83",
        dataBbox: "79.875, 6.125, 81.625, 9.625",
        verifiedObservation: "November 2025: 2.743 m/s.",
        coverage: {
          start: ingested.ditwah_wind.startDate,
          end: ingested.ditwah_wind.endDate,
          count: ingested.ditwah_wind.count,
        },
        stats: ingested.ditwah_wind.stats,
      },
      data: ingested.ditwah_wind.series,
    },
  ],
  eventAnnotation: {
    date: "2025-11-01",
    label: "Nov 2025 Cyclone Ditwah",
  },
  scientificFindings: {
    mainObservations: [
      "In November 2025, Sri Lanka experienced an extraordinary precipitation surge to 0.000182365 kg m⁻² s⁻¹ (~472.7 mm depth equivalent), representing a +3.9σ anomaly relative to the multi-year baseline.",
      "The deep soil layer (40–100 cm) was already pre-conditioned at 176.008 kg/m² in November, peaking at 184.32 kg/m² in December, indicating near-complete saturation of the root zone.",
      "Surface runoff reached 0.181638 kg/m², which constitutes a monumental +8.97σ statistical spike over the baseline mean of 0.0155 kg/m².",
      "Monthly mean wind speed was 2.74 m/s; because Cyclone Ditwah was a fast-moving synoptic system, its peak gust kinetic energy was smoothed out by monthly temporal aggregation."
    ],
    anomaliesAndTrends: [
      "Three-stage physical compound chain: (1) Ground saturation pre-condition, (2) Atmospheric precipitation trigger, (3) Total watershed buffering failure resulting in catastrophic overland runoff.",
      "The runoff spike dwarfs all previous seasonal monsoon cycles across the 12-year dataset (2014–2026)."
    ],
    reportExplanations: [
      "Because soils were saturated from earlier autumn monsoon rains, infiltration capacity approached zero.",
      "Rainfall could not percolate downward, converting almost entirely to overland kinetic sheet flow that overwhelmed drainage structures and washed away roads and bridges."
    ],
    limitations: [
      "Modeled Runoff vs. Measured Discharge: GLDAS runoff (Qs_acc) is a simulated 1D vertical water-balance output from the Noah land surface model. It does not account for river routing, hydraulic backwater effects, or localized levee failures.",
      "Correlation vs. Causation: High runoff correlates with bridge and road destruction, but structural engineering design, lack of culvert maintenance, and terrain slope were significant co-factors.",
      "Temporal Aggregation: Monthly data masks peak 24-hour rainfall intensity, which often exceeds monthly averages by orders of magnitude during tropical cyclones."
    ],
  },
  sourcesAndMethods: {
    originalDatasets: [
      {
        name: "GLDAS Noah Land Surface Model Rain Precipitation Rate",
        productId: "GLDAS_NOAH025_M_2_1_Rainf_tavg",
        provider: "NASA GES DISC Giovanni",
        nativeUnit: "kg m⁻² s⁻¹",
        coverage: "2014-11 to 2026-07",
        spatialResolution: "0.25° (~25 km)",
        link: "https://giovanni.gsfc.nasa.gov/giovanni/#data=GLDAS_NOAH025_M_2_1_Rainf_tavg",
      },
      {
        name: "GLDAS Noah Land Surface Model Soil Moisture (40–100cm)",
        productId: "GLDAS_NOAH025_M_2_1_SoilMoi40_100cm_inst",
        provider: "NASA GES DISC Giovanni",
        nativeUnit: "kg/m²",
        coverage: "2014-11 to 2026-07",
        spatialResolution: "0.25° (~25 km)",
        link: "https://giovanni.gsfc.nasa.gov/giovanni/#data=GLDAS_NOAH025_M_2_1_SoilMoi40_100cm_inst",
      },
      {
        name: "GLDAS Noah Land Surface Model Storm Surface Runoff",
        productId: "GLDAS_NOAH025_M_2_1_Qs_acc",
        provider: "NASA GES DISC Giovanni",
        nativeUnit: "kg/m²",
        coverage: "2014-11 to 2026-07",
        spatialResolution: "0.25° (~25 km)",
        link: "https://giovanni.gsfc.nasa.gov/giovanni/#data=GLDAS_NOAH025_M_2_1_Qs_acc",
      },
      {
        name: "GLDAS Noah Land Surface Model Near Surface Wind Speed",
        productId: "GLDAS_NOAH025_M_2_1_Wind_f_inst",
        provider: "NASA GES DISC Giovanni",
        nativeUnit: "m/s",
        coverage: "2014-11 to 2026-07",
        spatialResolution: "0.25° (~25 km)",
        link: "https://giovanni.gsfc.nasa.gov/giovanni/#data=GLDAS_NOAH025_M_2_1_Wind_f_inst",
      },
    ],
    originalReport: {
      title: "2025 Sri Lanka Cyclone Ditwah Disaster: NASA Satellite Data Analysis",
      authorsOrPortal: "Earth Trend Detective NASA Space Apps Challenge Case Study Team",
      keyCitation: "Earth Trend Detective (2025). Step-by-Step Dataset Audit, Visual Time-Series Charts, Composite Multi-Trend Synthesis & Causal Evidence Behind the November 2025 Sri Lanka Flash Floods.",
    },
    methodologyNotes: [
      "Coordinates verified against Giovanni bounding box 79.69°E–81.87°E, 5.91°N–9.83°N.",
      "Rainfall rate preserved in native kg m⁻² s⁻¹; depth conversion computed via 86,400 seconds/day × 30 days.",
      "Anomaly values computed relative to 2020–2025 baseline climatology."
    ],
    limitationsStatement:
      "All GLDAS variables are modeled land-surface estimates driven by assimilated meteorological forcing, not direct streamflow measurements. River gauge data and field hydraulic surveys are required to determine flood hydrographs.",
  },
};

export const SAUDI_CASE_STUDY: CaseStudyDefinition = {
  id: "case-03-saudi-arabia-heat-2024",
  slug: "saudi-arabia-heat-2024",
  title: "Hajj 2024: Investigating Extreme Heat",
  subtitle: "Satellite Infrared Radiance Analysis of Surface Air Temperature, Heat-Dome Physics, and the June 2024 Mecca Thermal Anomaly",
  location: "Mecca & Western Saudi Arabia",
  event: "June 2024 Hajj Pilgrimage Heat Crisis",
  year: "2024",
  tag: "EXTREME HEAT DISASTER",
  intro: {
    background:
      "In June 2024, during the annual Hajj pilgrimage in Mecca, Saudi Arabia experienced an unprecedented extreme heat disaster resulting in over 1,300 heat-related casualties. While extreme summer temperatures are common across the Arabian Peninsula, the intensity and persistent duration of this event were historically anomalous. Using NASA Atmospheric Infrared Sounder (AIRS) satellite data on the Aqua spacecraft, this investigation analyzes daytime surface air temperatures across western Saudi Arabia from 2004 through 2026.",
    question:
      "How did regional satellite-derived surface air temperatures in June 2024 compare against the 22-year historical record, and what thermodynamic mechanisms generated such lethal ground-level conditions?",
    contextBullets: [
      "June 2024 Observed Value: 309.71 K, equivalent to 36.56°C area-averaged daytime surface air temperature across the 1° regional grid.",
      "Historical Context: Spanning 2004–2026 (274 monthly points), June 2024 stands among the highest June peaks in the satellite observation record.",
      "Physical Mechanism: Synoptic atmospheric heat-dome featuring a persistent upper-level high-pressure ridge trapping subsiding hot air over Mecca.",
      "Scale Distinction: Regional 1° satellite surface air temperature (~36.56°C) is distinct from local valley microclimates, where direct solar radiation, asphalt re-radiation, and human density drove local temperatures beyond 51°C."
    ],
  },
  region: {
    locationDescription: "Mecca Province and Western Arabian Desert plateau",
    coordinates: {
      west: 39.0,
      east: 41.0,
      south: 20.5,
      north: 22.5,
    },
    center: {
      lat: 21.42,
      lon: 39.83,
    },
    datasetCoverageNote:
      "Giovanni User Bounding Box 39.0°E–41.0°E, 20.5°N–22.5°N (analyzable grid 39.5°E–40.5°E, 20.5°N–22.5°N). Covers Mecca, Mina, Arafat, and the surrounding coastal desert margin.",
  },
  indicators: [
    {
      variableName: "Daytime Surface Air Temperature (AIRS)",
      product: "AIRS3STM_7_0_SurfAirTemp_A",
      units: "Kelvin (K) / Converted to °C",
      temporalResolution: "Monthly (1.0°)",
      coverage: "Jan 2004 – Oct 2026 (274 observations)",
      status: "verified",
      verifiedObservation: "June 2024: 309.707672 K (36.56°C); full record range: 295.73 K (22.58°C) to 310.85 K (37.70°C).",
      note: "Converted from native Kelvin via °C = K - 273.15. Area-averaged daytime ascending orbit measurement.",
    },
  ],
  datasets: [
    {
      id: "saudi_temp",
      name: "Daytime Surface Air Temperature (AIRS)",
      color: "#ff7043",
      meta: {
        product: "AIRS3STM_7_0",
        variable: "mean_AIRS3STM_7_0_SurfAirTemp_A",
        variableName: "Air temperature at surface (Daytime/Ascending, AIRS-only)",
        nativeUnit: "K",
        displayUnit: "°C",
        spatialResolution: "1.0° (~100 km)",
        temporalResolution: "Monthly",
        userBbox: "39, 20.5, 41, 22.5",
        dataBbox: "39.5, 20.5, 40.5, 22.5",
        verifiedObservation: "June 2024: 309.707672 K (36.56°C).",
        coverage: {
          start: ingested.saudi_temp.startDate,
          end: ingested.saudi_temp.endDate,
          count: ingested.saudi_temp.count,
        },
        stats: ingested.saudi_temp.stats,
      },
      data: ingested.saudi_temp.series,
    },
  ],
  eventAnnotation: {
    date: "2024-06-01",
    label: "June 2024 Hajj Crisis",
  },
  scientificFindings: {
    mainObservations: [
      "The AIRS satellite record demonstrates extreme seasonality, fluctuating from winter lows around 296 K (23°C) in January to summer peaks exceeding 309 K (36°C) in June–July.",
      "In June 2024, the monthly daytime surface air temperature reached 309.708 K (36.56°C), confirming an intense regional thermal anomaly across western Saudi Arabia.",
      "Comparing calendar months across all 22 years reveals that June 2024 was +1.15°C above the multi-year June baseline mean, representing a persistent thermodynamic anomaly.",
      "The regional anomaly was sustained across multiple grid cells, demonstrating that the heatwave was a macro-synoptic event rather than an isolated urban effect."
    ],
    anomaliesAndTrends: [
      "Synoptic Heat Dome: A persistent high-pressure ridge stalled over the Arabian Peninsula, creating strong subsidence (downward air motion) that compressed and adiabatically heated the air column while preventing convective cooling.",
      "Marine Humidity Influx: Prevailing surface winds transported warm moisture from the Red Sea, elevating wet-bulb temperatures and drastically suppressing the human body's evaporative cooling capacity."
    ],
    reportExplanations: [
      "When regional air temperatures above 36°C combine with high humidity, heat index values spike drastically.",
      "In the narrow, densely built Mecca valley and open pilgrim encampments (Mina, Arafat, Muzdalifah), localized ground-level thermometers recorded extreme ambient temperatures exceeding 51.8°C."
    ],
    limitations: [
      "Satellite Scale vs Local Heat Index: The AIRS instrument measures a 1° area-averaged daytime surface air temperature (~100 km × 100 km). This must NOT be confused with peak hourly local air temperature, surface radiometric skin temperature, or heat index.",
      "Absence of Wind & Humidity in Dataset: The single AIRS temperature series does not prove the full heat-dome circulation pattern or wet-bulb globe temperature (WBGT) independently; atmospheric soundings and surface weather stations are required for multi-parameter heat stress evaluation.",
      "Causation and Mortality: Satellite telemetry establishes environmental thermal loading, but cannot independently prove casualty numbers or specific medical mortality causes."
    ],
  },
  sourcesAndMethods: {
    originalDatasets: [
      {
        name: "AIRS/Aqua Monthly Surface Air Temperature (Daytime/Ascending)",
        productId: "AIRS3STM_7_0_SurfAirTemp_A",
        provider: "NASA GES DISC Giovanni",
        nativeUnit: "Kelvin (K)",
        coverage: "2004-01 to 2026-10",
        spatialResolution: "1.0° (~100 km)",
        link: "https://giovanni.gsfc.nasa.gov/giovanni/#data=AIRS3STM_7_0_SurfAirTemp_A",
      },
    ],
    originalReport: {
      title: "Anatomy of a Heat Disaster: Satellite Data Trend Analysis of the 2024 Saudi Arabia Hajj Crisis",
      authorsOrPortal: "Earth Trend Detective NASA Space Apps Challenge Research Case Study",
      keyCitation: "Earth Trend Detective (2024). Anatomy of a Heat Disaster: Satellite Data Trend Analysis of the 2024 Saudi Arabia Hajj Crisis.",
    },
    methodologyNotes: [
      "Native temperatures in Kelvin were converted to Celsius using the standard formula: T(°C) = T(K) - 273.15.",
      "Month-over-month comparison isolates June values from 2004 to 2026 to evaluate departure from the 22-year June climatological mean.",
      "Bounding box verified from Giovanni metadata: 39.0°E–41.0°E, 20.5°N–22.5°N."
    ],
    limitationsStatement:
      "Satellite infrared sounders observe the lower troposphere over large spatial footprints. Local urban canyon effects, microclimatic variations, radiant heat from paving, and crowd thermal dynamics require calibrated in-situ weather stations.",
  },
};

export const LIBYA_PAKISTAN_CASE_STUDY: CaseStudyDefinition = {
  id: "case-04-libya-pakistan-floods",
  slug: "libya-pakistan-floods",
  title: "Extreme Floods: Libya and Pakistan",
  subtitle: "Comparative Satellite Audit of Storm Daniel's Mediterranean Cloudburst (Derna, 2023) and Antecedent Soil Moisture Saturation in the Indus Basin (Pakistan, 2022)",
  location: "Derna, Northeastern Libya & Southern Sindh/Balochistan, Pakistan",
  event: "Mediterranean Storm Daniel (2023) & Supercharged Indus Monsoon (2022)",
  year: "2023 / 2022",
  tag: "COMPOUND FLOOD INVESTIGATIONS",
  intro: {
    background:
      "Natural disasters are increasingly driven by overlapping environmental extremes. This case study synthesizes two major flood catastrophes documented in NASA satellite telemetry: (1) The catastrophic Derna, Libya dam collapse triggered by Mediterranean Storm Daniel on September 10, 2023, and (2) The historic 2022 Pakistan monsoon floods that submerged one-third of the country following extreme antecedent soil saturation and an intense Arabian Sea marine heatwave.",
    question:
      "How did a single-day 100 mm cloudburst overwhelm the arid Wadi Derna basin in Libya, and how did antecedent pre-monsoon soil saturation eliminate Pakistan's infiltration buffer in 2022?",
    contextBullets: [
      "Investigation A — Derna, Libya (2023): GPM IMERG daily precipitation tracks the extraordinary September 10, 2023 spike to 100.18 mm/day, more than doubling any daily observation in the 21-year historical record.",
      "Investigation B — Pakistan (2022): GLDAS v2.1 0–10cm soil moisture reveals extreme antecedent saturation exceeding 31.33 kg/m² in August 2022, turning regional soils into an impermeable barrier prior to the peak monsoon deluge.",
      "Dual Investigation Structure: Preserves the geographic separation and physical distinction between the Mediterranean cyclone and the South Asian monsoon system."
    ],
  },
  region: {
    locationDescription: "Dual Study Regions: Northeastern Libya (Derna/Al-Jabal al-Akhdar) and Southern Pakistan (Sindh/Balochistan)",
    coordinates: {
      west: 21.0,
      east: 70.5,
      south: 23.5,
      north: 33.5,
    },
    center: {
      lat: 28.5,
      lon: 45.7,
    },
    datasetCoverageNote:
      "Libya domain: 21.0°E–23.5°E, 32.0°N–33.5°N (Wadi Derna catchment). Pakistan domain: 66.5°E–70.5°E, 23.5°N–28.5°N (Lower Indus basin).",
  },
  indicators: [
    {
      variableName: "Daily Mean Precipitation Rate (Libya)",
      product: "GPM_3IMERGDF_07_precipitation",
      units: "mm/day",
      temporalResolution: "Daily (0.1°)",
      coverage: "Jan 2004 – Sep 2025 (7,944 daily observations)",
      status: "verified",
      verifiedObservation: "September 10, 2023: 100.18 mm/day (Storm Daniel); normal dry-season average: <0.5 mm/day.",
      note: "Continuous daily time series over northeastern Libya.",
    },
    {
      variableName: "Soil Moisture Content 0–10 cm (Pakistan)",
      product: "GLDAS_NOAH10_M_2_1_SoilMoi0_10cm_inst",
      units: "kg/m²",
      temporalResolution: "Monthly (1.0°)",
      coverage: "Jan 2004 – Jul 2026 (271 observations)",
      status: "verified",
      verifiedObservation: "August 2022: 31.33 kg/m² (highest peak in 22-year record; baseline: 14.5 kg/m²).",
      note: "Topsoil saturation over southern Pakistan.",
    },
    {
      variableName: "Arabian Sea Sea Surface Temperature (Reported Research Context)",
      product: "MODIS-Aqua L3m SST (Reported)",
      units: "°C",
      temporalResolution: "Monthly (9 km)",
      coverage: "2004–2026 (Described in report)",
      status: "missing_in_source",
      verifiedObservation: "Report describes marine heatwave peaking near 30.7°C supercharging monsoon evaporation.",
      note: "Discussed in research report; separate numerical SST CSV was omitted from archive.",
    },
  ],
  datasets: [
    {
      id: "libya_precip",
      name: "Daily Precipitation — Derna, Libya (GPM IMERG)",
      color: "#00bcd4",
      meta: {
        product: "GPM_3IMERGDF_07",
        variable: "mean_GPM_3IMERGDF_07_precipitation",
        variableName: "Daily mean precipitation rate (combined microwave-IR)",
        nativeUnit: "mm/day",
        displayUnit: "mm/day",
        spatialResolution: "0.1° (~10 km)",
        temporalResolution: "Daily",
        userBbox: "21, 32, 23.5, 33.5",
        dataBbox: "21.05, 32.05, 23.45, 33.45",
        verifiedObservation: "Sept 10, 2023: 100.18 mm/day.",
        coverage: {
          start: ingested.libya_gpm_daily_precip.startDate,
          end: ingested.libya_gpm_daily_precip.endDate,
          count: ingested.libya_gpm_daily_precip.count,
        },
        stats: ingested.libya_gpm_daily_precip.stats,
      },
      data: ingested.libya_gpm_daily_precip.series,
    },
    {
      id: "pakistan_soil",
      name: "Topsoil Moisture — Southern Pakistan (GLDAS)",
      color: "#8bc34a",
      meta: {
        product: "GLDAS_NOAH10_M_2_1",
        variable: "mean_GLDAS_NOAH10_M_2_1_SoilMoi0_10cm_inst",
        variableName: "Soil moisture content (0 - 10 cm underground)",
        nativeUnit: "kg/m²",
        displayUnit: "kg/m²",
        spatialResolution: "1.0° (~100 km)",
        temporalResolution: "Monthly",
        userBbox: "66.5, 23.5, 70.5, 28.5",
        dataBbox: "66.5, 23.5, 70.5, 28.5",
        verifiedObservation: "August 2022: 31.33 kg/m².",
        coverage: {
          start: ingested.pakistan_gldas_soil.startDate,
          end: ingested.pakistan_gldas_soil.endDate,
          count: ingested.pakistan_gldas_soil.count,
        },
        stats: ingested.pakistan_gldas_soil.stats,
      },
      data: ingested.pakistan_gldas_soil.series,
    },
  ],
  eventAnnotation: {
    date: "2023-09-10",
    label: "Storm Daniel Peak (100.18 mm/day)",
  },
  scientificFindings: {
    mainObservations: [
      "Derna, Libya (2023): For nearly two decades (2004–2023), daily rainfall in arid northeastern Libya rarely exceeded 30–40 mm/day. On September 10, 2023, Storm Daniel produced a staggering 100.18 mm/day, representing an unprecedented statistical outlier.",
      "Pakistan (2022): GLDAS 0–10cm topsoil moisture in southern Pakistan spiked to 31.33 kg/m² in August 2022 (with July at 28.71 kg/m²), more than double the long-term arid baseline of ~14 kg/m².",
      "Marine Heatwave Trigger (Reported): Abnormally high Arabian Sea surface temperatures (~30.7°C) increased atmospheric water vapor via Clausius-Clapeyron thermodynamics, supercharging the monsoon moisture corridor into Pakistan.",
      "Infiltration Capacity Collapse: Antecedent saturation in Pakistan reduced soil infiltration capacity toward zero, converting subsequent monsoon downpours directly into overland runoff."
    ],
    anomaliesAndTrends: [
      "Libya: Extreme Mediterranean tropical-like cyclone ('Medicane') Daniel funneled massive convective rainfall directly into the dry Wadi Derna gorge within a 24-hour window.",
      "Pakistan: Compound climate pre-conditioning where consecutive monsoon depressions struck terrain already saturated by unseasonal early summer rains."
    ],
    reportExplanations: [
      "Derna Dam Overtopping: The sudden surge of water concentrated through the steep Wadi Derna basin rapidly filled the reservoirs of the upstream Abu Mansur and Derna dams, leading to overtopping and structural failure.",
      "Indus Inundation: With no absorption capacity left in the soil, floodwaters accumulated across Sindh and Balochistan flatlands, displacing millions."
    ],
    limitations: [
      "Engineering Failure Mechanisms: While GPM satellite precipitation measures the water volume arriving in the catchment, satellite data alone cannot prove the internal structural mechanics, concrete stress, or maintenance state of the Derna dams. Claims of '3 billion Newtons of lateral hydrostatic force' are theoretical calculations and should not be treated as empirical sensor measurements.",
      "Missing Arabian Sea SST Data: The report highlights a 30.7°C SST marine heatwave as the primary thermal engine, but no matching numerical CSV was provided in the folder. Iris presents this as documented research context without creating synthetic SST points.",
      "Spatial Resolution: GLDAS 1.0° resolution over Pakistan captures broad regional soil moisture across Sindh and Balochistan, but does not capture localized river embankment breaches, canal failures, or urban drainage blockages."
    ],
  },
  sourcesAndMethods: {
    originalDatasets: [
      {
        name: "GPM IMERG Final Run Daily Precipitation (Libya)",
        productId: "GPM_3IMERGDF_07_precipitation",
        provider: "NASA GES DISC Giovanni",
        nativeUnit: "mm/day",
        coverage: "2004-01-01 to 2025-09-30",
        spatialResolution: "0.1° (~10 km)",
        link: "https://giovanni.gsfc.nasa.gov/giovanni/#data=GPM_3IMERGDF_07_precipitation",
      },
      {
        name: "GLDAS Noah Land Surface Model 0–10cm Soil Moisture (Pakistan)",
        productId: "GLDAS_NOAH10_M_2_1_SoilMoi0_10cm_inst",
        provider: "NASA GES DISC Giovanni",
        nativeUnit: "kg/m²",
        coverage: "2004-01 to 2026-07",
        spatialResolution: "1.0° (~100 km)",
        link: "https://giovanni.gsfc.nasa.gov/giovanni/#data=GLDAS_NOAH10_M_2_1_SoilMoi0_10cm_inst",
      },
    ],
    originalReport: {
      title: "Global Disaster Trend Analysis: Graph-by-Graph Breakdown of Climate-Triggered Catastrophes",
      authorsOrPortal: "Earth Trend Detective NASA Space Apps Challenge Research Group",
      keyCitation: "Global Disaster Trend Analysis-v4. Step-by-Step Satellite Data Audit of Derna (Libya) and Pakistan Disasters.",
    },
    methodologyNotes: [
      "Data routing audit: The Libya and Pakistan CSVs were located inside the Nepal subfolder in the original archive. Iris audited the Giovanni bounding boxes (21°E–23.5°E, 32°N–33.5°N for Libya and 66.5°E–70.5°E, 23.5°N–28.5°N for Pakistan) and correctly mapped them to their true geographic locations rather than folder path.",
      "All negative fill values (-9999 and -9999.9) were removed during automated ingest.",
      "All original precisions are preserved."
    ],
    limitationsStatement:
      "Environmental satellite telemetry documents atmospheric and land-surface conditions. Complete disaster causality involves civil engineering structures, emergency warning dissemination, local governance, and river maintenance, which cannot be measured from orbit alone.",
  },
};

export const ALL_NEW_CASE_STUDIES = [
  NEPAL_CASE_STUDY,
  DITWAH_CASE_STUDY,
  SAUDI_CASE_STUDY,
  LIBYA_PAKISTAN_CASE_STUDY,
];

export function getCaseStudyBySlug(slug: string): CaseStudyDefinition | undefined {
  return ALL_NEW_CASE_STUDIES.find((c) => c.slug === slug || c.id === slug);
}
