import type { IconName } from "@/components/ui/Icon";
import type { CaseStudy } from "@/lib/dashboardData";

export interface ManualDatasetInfo {
  name: string;
  code: string;
  agency: string;
  resolution: string;
  coverage: string;
  units: string;
  baselineMetric: string;
  eventPeakOrTrend: string;
  statisticalFinding: string;
  whatDataShows: string;
  giovanniUrl?: string;
}

export interface ManualAnalysisStep {
  step: string;
  title: string;
  detail: string;
  manualEffort: string;
  irisEquivalent: string;
}

export interface PhysicalCascadeStage {
  stage: string;
  title: string;
  timeframe: string;
  mechanism: string;
  quantitativeProof: string;
}

export interface ManualChartFigure {
  title: string;
  datasetCode: string;
  imageSrc: string;
  caption: string;
  giovanniUrl?: string;
}

export interface ManualCaseStudy {
  id: string;
  caseNumber: string;
  shortTitle: string;
  title: string;
  subtitle: string;
  location: string;
  regionBox: string;
  observationWindow: string;
  eventDate: string;
  phenomenon: "Flood & Glacier" | "Cyclone & Runoff" | "Extreme Heat" | "Compound Floods" | "Hurricane & Whiplash";
  icon: IconName;
  tone: "warm" | "dry" | "forest" | "ice" | "monsoon" | "heat" | "drought";
  primaryFinding: string;
  secondaryMetric: string;
  statisticalConfidence: string;
  manualTimeSpent: string;
  irisTimeEquivalent: string;
  executiveSummary: string;
  howDataWasAnalysed: {
    overview: string;
    statisticalMethodsUsed: string[];
    spatialTemporalNotes: string;
    steps: ManualAnalysisStep[];
  };
  whatTheOutcomeIs: {
    headlineVerdict: string;
    summary: string;
    keyMetrics: Array<{ label: string; value: string; context: string }>;
    physicalStages: PhysicalCascadeStage[];
    realWorldImpact: string;
  };
  datasets: ManualDatasetInfo[];
  figures: ManualChartFigure[];
  workbenchPreset: CaseStudy;
}

export const MANUAL_CASE_STUDIES_PURPOSE = {
  kicker: "Manual Research Benchmark vs. Iris Automated Platform",
  title: "Why Our Research Team Built These 5 Manual Case Studies",
  summary:
    "Before automating our statistical and multi-sensor workflows inside Iris, our research team manually investigated five major global climate disasters using raw NASA GES DISC Giovanni satellite telemetry. We built these manual case studies to establish a rigorous scientific ground truth—and to demonstrate how much faster, clearer, and more reproducible Earth trend analysis becomes when comparing traditional manual data wrangling against the Iris platform.",
  comparisonMetrics: [
    {
      label: "Data Retrieval & Slicing",
      manual: "2–4 hours per case manually querying separate NASA Giovanni bounding boxes, filtering retired archives, and exporting individual CSVs.",
      iris: "Under 30 seconds via plain-English search across 10 federated catalogs with interactive map bounding-box selection.",
      speedup: "10× Faster Discovery",
    },
    {
      label: "Deseasonalization & Trend Testing",
      manual: "Manual spreadsheet & script calculations to remove 18°C seasonal swings, compute Z-scores (σ), and run Mann–Kendall & OLS tests.",
      iris: "Instant 8-method statistical workbench (OLS, Mann–Kendall, Seasonal Kendall, Sen's Slope, Pettitt Change-Point & Anomaly Review).",
      speedup: "Instant 8-Test Verification",
    },
    {
      label: "Multi-Sensor Causal Synthesis",
      manual: "Manual alignment of monthly atmospheric reanalyses (0.5°) with daily hydrological & soil moisture grids (0.1°–0.25°).",
      iris: "Synchronized 2D/3D Visualization Studio, Living Globe layers, and automated Evidence Grading (Grades A–D).",
      speedup: "Unified Case File",
    },
  ],
};

export const MANUAL_CASE_STUDIES: ManualCaseStudy[] = [
  {
    id: "nepal-glacier-flood-2026",
    caseNumber: "Manual Case 01",
    shortTitle: "Nepal Flood & Glacier Disaster",
    title: "2026 Nepal Flood & Glacier Disaster: Multi-Sensor Telemetry Audit",
    subtitle:
      "Step-by-Step Dataset Audit, Deseasonalized Warming Signal, Snowpack Surge & Subsurface Permafrost Thaw Behind the Rasuwa, Trishuli & Narayani/Gandak Disasters",
    location: "Rasuwa / Trishuli & Lirung Massif Corridor, Nepal",
    regionBox: "85.0°E–85.8°E, 28.0°N–28.6°N",
    observationWindow: "Jan 2020 – Nov 2026",
    eventDate: "Aug 26 & Sep 24–27, 2026",
    phenomenon: "Flood & Glacier",
    icon: "globe",
    tone: "ice",
    primaryFinding: "+0.15 °C/yr Warming & +423% Snow Surge",
    secondaryMetric: "+9.10 W/m² Ground Heat Record",
    statisticalConfidence: "Mann–Kendall p = 0.0016 (Deseasonalized)",
    manualTimeSpent: "~6.5 hrs manual Giovanni CSV audit & Z-score scripting",
    irisTimeEquivalent: "~3 mins in Iris Data Analysis & Multi-Variable Studio",
    executiveSummary:
      "To demonstrate how Earth Trend Detective separates genuine climate trends from massive seasonal mountain weather swings, our research team audited active 2020–2026 NASA satellite datasets over the Rasuwa / Trishuli / Upper Gandaki basin. While raw monthly temperatures swing by nearly 18°C between winter and summer—masking the trend in raw tests (p = 0.1989)—deseasonalizing the record revealed a statistically significant warming rate of +0.15°C/year (p = 0.0016) that converged with a +423% winter snowpack surge and record summer downward ground heat flux (+9.10 W/m²).",
    howDataWasAnalysed: {
      overview:
        "Our research team audited all available NASA GES DISC Giovanni series over the 85.0°E–85.8°E, 28.0°N–28.6°N corridor, excluding retired legacy archives (such as GLDAS v2.0 ending in 2015) so that every metric reflects continuous 2020–2026 coverage. Because high-altitude Himalayan temperatures fluctuate between −5.99°C in January and +13.34°C in July, raw linear or Mann–Kendall testing fails to detect the underlying warming shift. We subtracted the 2020–2025 monthly climatology from each observation, ran non-parametric Mann–Kendall and Sen's slope tests on the deseasonalized anomalies, and transformed all four active variables into standardized Z-scores (σ) on a synchronized timeline.",
      statisticalMethodsUsed: [
        "Climatological Deseasonalization (subtracting 2020–2025 monthly baseline means)",
        "Non-Parametric Mann–Kendall Trend Test & Sen's Slope Estimator (p = 0.0016, r = 0.346)",
        "Multi-Variable Z-Score (σ) Standardization across Air Temp, Ground Heat Flux, SWE, and Monsoon Rainfall",
        "Legacy Archive Quality Filtering (excluding discontinued GLDAS v2.0 & truncated series)",
      ],
      spatialTemporalNotes:
        "GPM IMERG resolves valley-scale monsoon rainfall down to 0.1° (~10 km × 10 km), GLDAS-2.1 resolves land-surface ground heat flux and snowpack at 0.25°–1.0° (~25–100 km), and MERRA-2 tracks regional atmospheric warming at 0.5° × 0.625° (~50 km). Monthly series capture multi-year cryospheric pre-conditioning months ahead of slope failure.",
      steps: [
        {
          step: "01",
          title: "Archive Audit & Continuous Coverage Screening",
          detail:
            "Audited NASA Giovanni datasets over 85.0°E–85.8°E, 28.0°N–28.6°N and filtered out retired GLDAS v2.0 series to retain continuous 2020–2026 observations across MERRA-2, GLDAS-2.1, and GPM IMERG.",
          manualEffort: "Manual inspection of 6+ CSV exports and temporal end-dates",
          irisEquivalent: "Automated completeness screening & active catalog validation in Data Preview",
        },
        {
          step: "02",
          title: "Climatological Deseasonalization of Mountain Air Temperature",
          detail:
            "Raw monthly MERRA-2 temperatures swung ~18°C seasonally, yielding a non-significant raw Mann–Kendall p = 0.1989. Subtracting the 2020–2025 monthly climatology isolated the true warming signal (+0.15°C/yr, p = 0.0016).",
          manualEffort: "Custom Python/spreadsheet monthly baseline subtraction and anomaly grouping",
          irisEquivalent: "One-click Anomaly / Deseasonalized mode in Iris Data Analysis workbench",
        },
        {
          step: "03",
          title: "Synchronized Multi-Sensor Z-Score Overlay",
          detail:
            "Standardized Air Temperature Anomalies, Subsurface Ground Heat Flux (Qg_tavg), Snow Water Equivalent (SWE_inst), and Monsoon Precipitation into unitless Z-scores (σ) to trace their convergence on August–September 2026.",
          manualEffort: "Manual Z-score normalization and multi-axis matplotlib plotting",
          irisEquivalent: "Automated multi-panel anomaly synthesis & Evidence Grade verification",
        },
      ],
    },
    whatTheOutcomeIs: {
      headlineVerdict:
        "A four-stage compound cryospheric-hydrological cascade—driven by +1.03°C cumulative warming, a +423% February snowpack surge, and record +9.10 W/m² downward ground heat flux—destabilized high-altitude permafrost and saturated watersheds prior to the August–September 2026 disasters.",
      summary:
        "The manual analysis proved that the August 26, 2026 Rasuwa/Trishuli glacier-avalanche flash flood and September 24–27 Narayani/Gandak river surges were not isolated weather flukes. Instead, four measurable satellite anomalies converged in sequence over the Lirung and Trishuli corridor.",
      keyMetrics: [
        {
          label: "Deseasonalized Warming Trend",
          value: "+0.15 °C / yr",
          context: "+1.03°C cumulative (2020–2026), Mann–Kendall p = 0.0016 vs. raw p = 0.1989",
        },
        {
          label: "Feb 2026 Snowpack Surge",
          value: "13.59 mm SWE",
          context: "+423% above the 2.60 mm February baseline, followed by rapid spring melt",
        },
        {
          label: "June–July 2026 Ground Heat Flux",
          value: "+9.10 W/m²",
          context: "All-time 2020–2026 June record (vs +6.40 W/m² mean) driving permafrost thaw",
        },
        {
          label: "Peak Summer Air Temperature",
          value: "13.34 °C (Jul 2026)",
          context: "Warmest July (+0.63°C anomaly) & warmest August (12.71°C, +0.37°C anomaly)",
        },
      ],
      physicalStages: [
        {
          stage: "Stage 1",
          title: "Winter Mechanical Snowpack Loading",
          timeframe: "February 2026",
          mechanism:
            "GLDAS-2.1 Snow Water Equivalent (SWE_inst) captured an extreme winter snowpack accumulation spike on steep Lirung/Rasuwa slopes.",
          quantitativeProof: "13.59 mm SWE (+423% above the 2.60 mm February baseline)",
        },
        {
          stage: "Stage 2",
          title: "Early-Spring Meltwater Infiltration",
          timeframe: "February – March 2026",
          mechanism:
            "Elevated MERRA-2 air temperature anomalies triggered rapid early snowmelt, forcing meltwater into rock fractures and shallow mountain soils.",
          quantitativeProof: "+1.42°C (Feb) and +1.67°C (Mar) above monthly baseline",
        },
        {
          stage: "Stage 3",
          title: "Record Summer Permafrost Thaw & Glacier Collapse",
          timeframe: "June – August 26, 2026",
          mechanism:
            "Downward subsurface ground heat flux (Qg_tavg) hit 7-year highs alongside record July–August air temperatures, weakening ice and permafrost bonds until the August 26 Rasuwa/Trishuli glacier-debris collapse.",
          quantitativeProof: "+9.10 W/m² (Jun) & +5.97 W/m² (Jul) ground heat flux; 13.34°C Jul air temp",
        },
        {
          stage: "Stage 4",
          title: "Saturated Basin Overflow",
          timeframe: "September 24–27, 2026",
          mechanism:
            "Pre-saturated Himalayan watersheds could not absorb late-monsoon cloudbursts, converting rainfall directly into overland runoff across the Narayani and Gandak basins.",
          quantitativeProof: "318.5 mm/mo Jun–Sep monsoon envelope + late-September deluge surge",
        },
      ],
      realWorldImpact:
        "Triggered the August 26, 2026 Rasuwa/Trishuli glacier-avalanche flash flood and the late-September 2026 Narayani/Gandak river flood surge past danger levels.",
    },
    datasets: [
      {
        name: "MERRA-2 2m Air Temperature",
        code: "M2IMNXASM_5_12_4_T2M",
        agency: "NASA GES DISC (MERRA-2)",
        resolution: "0.5° × 0.625° Monthly",
        coverage: "Jan 2020 – Sep 2026 (n = 81 months)",
        units: "°C / K",
        baselineMetric: "−5.99°C (winter) to +12.7°C (summer)",
        eventPeakOrTrend: "+0.15°C/yr (+1.03°C cumulative); Jul 2026 peak 13.34°C",
        statisticalFinding: "Deseasonalized Mann–Kendall p = 0.0016 (r = 0.346)",
        whatDataShows:
          "Isolates a statistically significant +0.15°C/year warming trend once the 18°C seasonal cycle is removed, culminating in the warmest July and August on record.",
        giovanniUrl:
          "https://giovanni.gsfc.nasa.gov/giovanni/#service=ArAvTs&starttime=2020-01-01T00:00:00Z&endtime=2026-09-30T23:59:59Z&bbox=85,28,85.8,28.6&data=M2IMNXASM_5_12_4_T2M&portal=GIOVANNI",
      },
      {
        name: "GLDAS-2.1 Snow Water Equivalent",
        code: "GLDAS_NOAH10_M_2_1_SWE_inst",
        agency: "NASA GES DISC (GLDAS Noah v2.1)",
        resolution: "1.0° Monthly",
        coverage: "Jan 2020 – Jul 2026 (n = 79 months)",
        units: "kg m⁻² (mm)",
        baselineMetric: "2.60 mm February baseline",
        eventPeakOrTrend: "13.59 mm in Feb 2026 (+423% surge)",
        statisticalFinding: "+423% winter loading anomaly followed by complete spring ablation",
        whatDataShows:
          "Captures an extreme winter snowpack loading spike in February 2026 followed immediately by rapid spring-to-summer snowmelt prior to the August 26 collapse.",
        giovanniUrl:
          "https://giovanni.gsfc.nasa.gov/giovanni/#service=ArAvTs&starttime=2020-01-01T00:00:00Z&endtime=2026-08-01T00:00:00Z&bbox=85,28,85.8,28.6&data=GLDAS_NOAH10_M_2_1_SWE_inst&portal=GIOVANNI",
      },
      {
        name: "GLDAS-2.1 Subsurface Ground Heat Flux & Deep Soil Moisture",
        code: "GLDAS_NOAH025_M_2_1_Qg_tavg",
        agency: "NASA GES DISC (GLDAS Noah 0.25°)",
        resolution: "0.25° Monthly",
        coverage: "Jan 2020 – Jul 2026 (n = 79 months)",
        units: "W m⁻²",
        baselineMetric: "+0.78 W/m² mean (Jun avg +6.40, Jul avg +4.58)",
        eventPeakOrTrend: "+9.10 W/m² (Jun 2026) & +5.97 W/m² (Jul 2026)",
        statisticalFinding: "7-year record downward thermal flux into high-altitude frozen ground",
        whatDataShows:
          "Proves intense downward thermal energy penetration and subsurface permafrost thaw directly beneath steep Rasuwa slopes immediately preceding the August 26 failure.",
        giovanniUrl:
          "https://giovanni.gsfc.nasa.gov/giovanni/#service=ArAvTs&starttime=2013-12-01T00:00:00Z&endtime=2026-11-30T23:59:59Z&bbox=85,28,85.8,28.6&data=GLDAS_NOAH025_M_2_0_Qsm_acc%2CGLDAS_NOAH025_M_2_1_Qg_tavg%2CGLDAS_NOAH025_M_2_0_SoilMoi100_200cm_inst%2CGLDAS_NOAH025_M_2_0_Qs_acc&portal=GIOVANNI&format=json",
      },
      {
        name: "GPM IMERG Merged Satellite-Gauge Precipitation",
        code: "GPM_3IMERGM_07_precipitation",
        agency: "NASA GES DISC (GPM IMERG Final v07)",
        resolution: "0.1° Monthly",
        coverage: "Jan 2020 – Nov 2026",
        units: "mm/hr (mm/month)",
        baselineMetric: "318.5 mm/mo Jun–Sep monsoon envelope",
        eventPeakOrTrend: "Sustained monsoon saturation prior to Sep 24–27 cloudbursts",
        statisticalFinding: "High-resolution (10 km) valley precipitation baseline",
        whatDataShows:
          "Tracks the recurring monsoon rainfall envelope that saturated mountain watersheds ahead of the late-September 2026 extreme river surges.",
        giovanniUrl:
          "https://giovanni.gsfc.nasa.gov/giovanni/#service=ArAvTs&starttime=2020-01-01T00:00:00Z&endtime=2026-11-30T23:59:59Z&bbox=85,28,85.8,28.6&data=GPM_3IMERGM_07_precipitation&dataKeyword=GPM_3IMERGM&portal=GIOVANNI&format=json",
      },
    ],
    figures: [
      {
        title: "MERRA-2 2-Meter Air Temperature (2020–2026)",
        datasetCode: "M2IMNXASM_5_12_4_T2M",
        imageSrc: "/manual-case-studies/nepal-air-temp.jpeg",
        caption:
          "Area-averaged monthly 2-meter air temperature (K) over Rasuwa/Trishuli (85.0°E–85.8°E, 28.0°N–28.6°N), showing the seasonal cycle and record 2026 summer peak.",
        giovanniUrl:
          "https://giovanni.gsfc.nasa.gov/giovanni/#service=ArAvTs&starttime=2020-01-01T00:00:00Z&endtime=2026-09-30T23:59:59Z&bbox=85,28,85.8,28.6&data=M2IMNXASM_5_12_4_T2M&portal=GIOVANNI",
      },
      {
        title: "GLDAS-2.1 Subsurface Ground Heat Flux (Qg_tavg)",
        datasetCode: "GLDAS_NOAH025_M_2_1_Qg_tavg",
        imageSrc: "/manual-case-studies/nepal-ground-heat-flux.jpeg",
        caption:
          "Monthly ground heat flux (W m⁻²) across 85.0°E–85.8°E, 28.0°N–28.6°N, capturing the all-time +9.10 W/m² June 2026 downward heat spike before the August 26 glacier collapse.",
        giovanniUrl:
          "https://giovanni.gsfc.nasa.gov/giovanni/#service=ArAvTs&starttime=2013-12-01T00:00:00Z&endtime=2026-11-30T23:59:59Z&bbox=85,28,85.8,28.6&data=GLDAS_NOAH025_M_2_0_Qsm_acc%2CGLDAS_NOAH025_M_2_1_Qg_tavg%2CGLDAS_NOAH025_M_2_0_SoilMoi100_200cm_inst%2CGLDAS_NOAH025_M_2_0_Qs_acc&portal=GIOVANNI&format=json",
      },
      {
        title: "GLDAS-2.1 Snow Water Equivalent (SWE_inst)",
        datasetCode: "GLDAS_NOAH10_M_2_1_SWE_inst",
        imageSrc: "/manual-case-studies/nepal-swe.jpeg",
        caption:
          "Monthly snow depth water equivalent (kg m⁻²) over the Rasuwa/Lirung corridor, highlighting the +423% February 2026 snowpack surge (13.59 mm) and rapid spring thaw.",
      },
      {
        title: "GPM IMERG Monthly Monsoon Precipitation Rate",
        datasetCode: "GPM_3IMERGM_07_precipitation",
        imageSrc: "/manual-case-studies/nepal-gpm-precip.jpeg",
        caption:
          "Merged satellite-gauge monthly precipitation rate (mm/hr) at 0.1° resolution over 85.0°E–85.8°E, 28.0°N–28.6°N.",
        giovanniUrl:
          "https://giovanni.gsfc.nasa.gov/giovanni/#service=ArAvTs&starttime=2020-01-01T00:00:00Z&endtime=2026-11-30T23:59:59Z&bbox=85,28,85.8,28.6&data=GPM_3IMERGM_07_precipitation&dataKeyword=GPM_3IMERGM&portal=GIOVANNI&format=json",
      },
    ],
    workbenchPreset: {
      id: "IR–024",
      title: "2026 Nepal Flood & Glacier Disaster",
      location: "Rasuwa / Trishuli Basin, Nepal",
      region: "Central Himalaya (Rasuwa / Trishuli)",
      bbox: "28.00, 85.00, 28.60, 85.80",
      phenomenon: "Snow & ice",
      datasetId: "snow",
      startYear: 2020,
      endYear: 2026,
      finding: "+0.15 °C/yr · +423% SWE",
      confidence: "99.84% (p = 0.0016)",
      source: "NASA MERRA-2 / GLDAS-2.1 / GPM",
    },
  },
  {
    id: "sri-lanka-cyclone-ditwah-2025",
    caseNumber: "Manual Case 02",
    shortTitle: "Sri Lanka Cyclone Ditwah",
    title: "2025 Sri Lanka Cyclone Ditwah Disaster: Hydrological Failure Analysis",
    subtitle:
      "Multi-Variable Z-Score Standardization of Extreme Rainfall (+3.9σ), Deep Soil Saturation & Catastrophic Overland Runoff (+8.97σ) Across Sri Lanka",
    location: "Sri Lanka National Bounding Box",
    regionBox: "79.69°E–81.87°E, 5.91°N–9.83°N",
    observationWindow: "Jan 2020 – Jul 2026 (2014–2026 Giovanni archive)",
    eventDate: "November 28–30, 2025",
    phenomenon: "Cyclone & Runoff",
    icon: "sparkles",
    tone: "monsoon",
    primaryFinding: "+8.97σ Surface Runoff Explosion",
    secondaryMetric: "+3.9σ Rainfall Spike on Pre-Saturated Soil",
    statisticalConfidence: "+8.97σ Runoff / +3.9σ Rainfall Anomaly",
    manualTimeSpent: "~5 hrs manual Giovanni extraction & Z-score standardization",
    irisTimeEquivalent: "~2.5 mins in Iris Data Analysis & Hazard Workspace",
    executiveSummary:
      "To demonstrate how Earth Trend Detective isolates catastrophic cyclone anomalies from recurring seasonal monsoons, our research team analyzed four GLDAS v2.1 0.25° monthly datasets spanning Sri Lanka (79.69°E–81.87°E, 5.91°N–9.83°N). By standardizing rainfall, deep soil moisture (40–100 cm), overland storm runoff, and wind speed against the 2020–2025 baseline, the analysis mathematically proved how pre-saturated autumn soils (+1.2σ to +1.5σ) converted Cyclone Ditwah's +3.9σ rainfall shock into an unprecedented +8.97σ surface runoff surge—causing $1.735 billion in infrastructure damage.",
    howDataWasAnalysed: {
      overview:
        "Our research team retrieved area-averaged monthly NASA GLDAS Noah v2.1 time series across the Sri Lanka national bounding box (79.69°E–81.87°E, 5.91°N–9.83°N). Because Sri Lanka experiences strong bi-annual monsoon cycles, raw rainfall values alone do not explain why November 2025 caused total watershed collapse. We computed 5-year historical baseline means and standard deviations (2020–2025) for each variable and transformed the raw CSV series into synchronized Z-score (σ) trajectories, while also testing whether monthly wind averages capture fast-moving cyclone gusts.",
      statisticalMethodsUsed: [
        "Historical Baseline Mean & Standard Deviation Standardization (Z-Score σ transformation)",
        "Compound Hydrological Pre-Conditioning Analysis (Deep Soil Moisture vs. Overland Runoff response)",
        "Extreme Event Return-Period Anomaly Quantification (+3.9σ rainfall & +8.97σ runoff)",
        "Temporal Averaging Sensitivity Audit (evaluating monthly vs. daily/hourly wind speed resolution)",
      ],
      spatialTemporalNotes:
        "GLDAS v2.1 0.25° monthly grids accurately capture cumulative island-wide hydrological loading (soil moisture retention and total overland storm runoff), whereas short-lived cyclone wind gusts are smoothed out over a 30-day averaging window (remaining at 2.74 m/s vs. 3.12 m/s mean)—proving why Iris pairs monthly land-surface reanalyses with daily/hourly point telemetry.",
      steps: [
        {
          step: "01",
          title: "National Bounding-Box Telemetry Extraction",
          detail:
            "Extracted four GLDAS v2.1 0.25° monthly datasets across Sri Lanka (79.69°E–81.87°E, 5.91°N–9.83°N): Precipitation Rate (Rainf_tavg), 40–100 cm Soil Moisture, Storm Surface Runoff (Qs_acc), and Wind Speed.",
          manualEffort: "4 separate Giovanni ArAvTs queries, CSV downloads, and fill-value (-9999) cleaning",
          irisEquivalent: "Single region selection & multi-variable catalog pull in Iris Data Selection",
        },
        {
          step: "02",
          title: "Z-Score (σ) Anomaly Standardization",
          detail:
            "Converted each physical unit series (kg m⁻²s⁻¹, kg m⁻², m s⁻¹) into standardized Z-scores relative to the 2020–2025 baseline so rainfall, soil retention, and runoff could be compared on a single vertical scale.",
          manualEffort: "Manual baseline mean/std calculation and multi-series Z-score plotting",
          irisEquivalent: "Automated Z-score & anomaly detection in Iris Case File Diagnostics",
        },
        {
          step: "03",
          title: "Watershed Buffering & Temporal Resolution Audit",
          detail:
            "Verified that 40–100 cm soil moisture reached 176.00–184.32 kg m⁻² (eliminating infiltration capacity) right before the +3.9σ rainfall spike, and documented the monthly wind-averaging caveat.",
          manualEffort: "Manual cross-table inspection and report synthesis",
          irisEquivalent: "Automated caveat flagging & multi-depth soil wetness comparison in Iris",
        },
      ],
    },
    whatTheOutcomeIs: {
      headlineVerdict:
        "Pre-saturated deep soils (176.00 kg m⁻²) eliminated Sri Lanka's watershed buffering capacity, causing Cyclone Ditwah's +3.9σ rainfall shock to trigger an unprecedented +8.97σ overland storm runoff explosion (0.1816 kg m⁻²).",
      summary:
        "The manual analysis isolated the exact three-stage physical mechanism behind Sri Lanka's November 2025 flash floods and explained why infrastructure failure ($1.735B damage, 480 bridges destroyed) was disproportionately severe.",
      keyMetrics: [
        {
          label: "Storm Surface Runoff Spike",
          value: "+8.97σ (0.1816 kg m⁻²)",
          context: "Nearly 12× the 0.0155 kg m⁻² baseline mean—single largest runoff event in the record",
        },
        {
          label: "Rainfall Rate Anomaly",
          value: "+3.9σ (0.000182 kg m⁻²s⁻¹)",
          context: "More than 3.4× the 0.000053 kg m⁻²s⁻¹ historical monthly baseline",
        },
        {
          label: "Deep Soil Moisture (40–100 cm)",
          value: "176.00 → 184.32 kg m⁻²",
          context: "Well above the 140.79 kg m⁻² baseline (+1.2σ to +1.5σ saturation plateau)",
        },
        {
          label: "Documented Infrastructure Impact",
          value: "$1.735 Billion",
          context: "480 bridges destroyed and 16,000 km of road network damaged island-wide",
        },
      ],
      physicalStages: [
        {
          stage: "Stage 1",
          title: "Complete Ground Saturation (The Pre-Condition)",
          timeframe: "Autumn – November 2025",
          mechanism:
            "Earlier autumn monsoon rains steadily raised 40–100 cm deep soil moisture well above its 140.79 kg m⁻² mean, exhausting the island's subsurface water storage capacity.",
          quantitativeProof: "176.00 kg m⁻² in Nov 2025, peaking at 184.32 kg m⁻² in Dec 2025 (+1.2σ to +1.5σ)",
        },
        {
          stage: "Stage 2",
          title: "Extreme Atmospheric Loading (The Trigger)",
          timeframe: "November 28–30, 2025",
          mechanism:
            "Cyclone Ditwah delivered a 100-year intensity downpour directly onto the already saturated Sri Lankan watersheds.",
          quantitativeProof: "0.000182 kg m⁻²s⁻¹ monthly precipitation rate (+3.9σ anomaly)",
        },
        {
          stage: "Stage 3",
          title: "Total Watershed Failure (The Disaster)",
          timeframe: "Late November 2025",
          mechanism:
            "Because Stage 1 eliminated soil infiltration capacity, Stage 2 rainwater could not percolate underground and converted instantaneously into violent overland storm runoff.",
          quantitativeProof: "0.1816 kg m⁻² surface runoff (+8.97σ anomaly vs. 0.0155 kg m⁻² baseline)",
        },
      ],
      realWorldImpact:
        "Catastrophic island-wide flash floods that displaced thousands, destroyed 480 bridges, damaged 16,000 km of roads, and caused $1.735 billion in infrastructure damage.",
    },
    datasets: [
      {
        name: "GLDAS v2.1 Rain Precipitation Rate",
        code: "GLDAS_NOAH025_M_2_1_Rainf_tavg",
        agency: "NASA GES DISC (GLDAS Noah 0.25°)",
        resolution: "0.25° Monthly",
        coverage: "Nov 2014 – Nov 2026 (2020–2026 primary window)",
        units: "kg m⁻² s⁻¹",
        baselineMetric: "0.000053 kg m⁻² s⁻¹ (rarely > 0.00015)",
        eventPeakOrTrend: "0.000182 kg m⁻² s⁻¹ (Nov 2025)",
        statisticalFinding: "+3.9σ extreme anomaly above 5-year baseline",
        whatDataShows:
          "Captures the violent November 2025 cyclone downpour exceeding all standard 2020–2025 seasonal monsoon cycles.",
        giovanniUrl:
          "https://giovanni.gsfc.nasa.gov/giovanni/#service=ArAvTs&starttime=2014-11-01T00:00:00Z&endtime=2026-11-30T23:59:59Z&bbox=79.69,5.91,81.87,9.83&data=GLDAS_NOAH025_M_2_1_Rainf_tavg&dataKeyword=rainfall&portal=GIOVANNI&format=json",
      },
      {
        name: "GLDAS v2.1 Deep Soil Moisture (40–100 cm)",
        code: "GLDAS_NOAH025_M_2_1_SoilMoi40_100cm_inst",
        agency: "NASA GES DISC (GLDAS Noah 0.25°)",
        resolution: "0.25° Monthly",
        coverage: "Nov 2014 – Nov 2026",
        units: "kg m⁻²",
        baselineMetric: "140.79 kg m⁻² (2020–2025 mean)",
        eventPeakOrTrend: "176.00 kg m⁻² (Nov 2025) → 184.32 kg m⁻² (Dec 2025)",
        statisticalFinding: "+1.2σ to +1.5σ pre-event saturation plateau",
        whatDataShows:
          "Proves that Sri Lankan subsurface soils were already near maximum water retention capacity when Cyclone Ditwah made landfall.",
        giovanniUrl:
          "https://giovanni.gsfc.nasa.gov/giovanni/#service=ArAvTs&starttime=2014-11-01T00:00:00Z&endtime=2026-11-30T23:59:59Z&bbox=79.69,5.91,81.87,9.83&data=GLDAS_NOAH025_M_2_1_SoilMoi40_100cm_inst&dataKeyword=Soil%20moisture&portal=GIOVANNI&format=json",
      },
      {
        name: "GLDAS v2.1 Storm Surface Runoff",
        code: "GLDAS_NOAH025_M_2_1_Qs_acc",
        agency: "NASA GES DISC (GLDAS Noah 0.25°)",
        resolution: "0.25° Monthly",
        coverage: "Nov 2014 – Nov 2026",
        units: "kg m⁻²",
        baselineMetric: "0.0155 kg m⁻² (2020–2025 mean)",
        eventPeakOrTrend: "0.1816 kg m⁻² (Nov 2025)",
        statisticalFinding: "+8.97σ extreme overland runoff spike",
        whatDataShows:
          "Directly measures unabsorbed rainwater flowing overland—exploding to a nearly 9-sigma anomaly in November 2025.",
        giovanniUrl:
          "https://giovanni.gsfc.nasa.gov/giovanni/#service=ArAvTs&starttime=2014-11-01T00:00:00Z&endtime=2026-11-30T23:59:59Z&bbox=79.69,5.91,81.87,9.83&data=GLDAS_NOAH025_M_2_1_Qs_acc&dataKeyword=Surface%20runoff&portal=GIOVANNI&format=json",
      },
      {
        name: "GLDAS v2.1 Near-Surface Wind Speed",
        code: "GLDAS_NOAH025_M_2_1_Wind_f_inst",
        agency: "NASA GES DISC (GLDAS Noah 0.25°)",
        resolution: "0.25° Monthly",
        coverage: "Nov 2014 – Nov 2026",
        units: "m s⁻¹",
        baselineMetric: "3.12 m/s cyclical monthly mean",
        eventPeakOrTrend: "2.74 m/s (Nov 2025 monthly mean)",
        statisticalFinding: "Demonstrates monthly temporal smoothing of brief cyclone wind gusts",
        whatDataShows:
          "Shows that while monthly grids capture cumulative rainfall and runoff, daily/hourly sensors are required to isolate short-lived cyclone wind gusts.",
        giovanniUrl:
          "https://giovanni.gsfc.nasa.gov/giovanni/#service=ArAvTs&starttime=2014-11-01T00:00:00Z&endtime=2026-11-30T23:59:59Z&bbox=79.69,5.91,81.87,9.83&data=GLDAS_NOAH025_M_2_1_Wind_f_inst&dataKeyword=Wind%20speed&portal=GIOVANNI&format=json",
      },
    ],
    figures: [
      {
        title: "GLDAS v2.1 Storm Surface Runoff (Qs_acc)",
        datasetCode: "GLDAS_NOAH025_M_2_1_Qs_acc",
        imageSrc: "/manual-case-studies/ditwah-runoff.png",
        caption:
          "Monthly storm surface runoff (kg m⁻²) across Sri Lanka (79.69°E–81.87°E, 5.91°N–9.83°N), showing the massive 0.1816 kg m⁻² (+8.97σ) spike in November 2025.",
        giovanniUrl:
          "https://giovanni.gsfc.nasa.gov/giovanni/#service=ArAvTs&starttime=2014-11-01T00:00:00Z&endtime=2026-11-30T23:59:59Z&bbox=79.69,5.91,81.87,9.83&data=GLDAS_NOAH025_M_2_1_Qs_acc&dataKeyword=Surface%20runoff&portal=GIOVANNI&format=json",
      },
      {
        title: "GLDAS v2.1 Rain Precipitation Rate (Rainf_tavg)",
        datasetCode: "GLDAS_NOAH025_M_2_1_Rainf_tavg",
        imageSrc: "/manual-case-studies/ditwah-rainfall.png",
        caption:
          "Monthly rain precipitation rate (kg m⁻² s⁻¹) over Sri Lanka, highlighting the +3.9σ November 2025 Cyclone Ditwah spike (0.000182 kg m⁻² s⁻¹).",
        giovanniUrl:
          "https://giovanni.gsfc.nasa.gov/giovanni/#service=ArAvTs&starttime=2014-11-01T00:00:00Z&endtime=2026-11-30T23:59:59Z&bbox=79.69,5.91,81.87,9.83&data=GLDAS_NOAH025_M_2_1_Rainf_tavg&dataKeyword=rainfall&portal=GIOVANNI&format=json",
      },
      {
        title: "GLDAS v2.1 Deep Soil Moisture (40–100 cm)",
        datasetCode: "GLDAS_NOAH025_M_2_1_SoilMoi40_100cm_inst",
        imageSrc: "/manual-case-studies/ditwah-soil-moisture.png",
        caption:
          "Monthly 40–100 cm soil moisture content (kg m⁻²) over Sri Lanka, demonstrating high antecedent saturation (176.00–184.32 kg m⁻²) during November–December 2025.",
        giovanniUrl:
          "https://giovanni.gsfc.nasa.gov/giovanni/#service=ArAvTs&starttime=2014-11-01T00:00:00Z&endtime=2026-11-30T23:59:59Z&bbox=79.69,5.91,81.87,9.83&data=GLDAS_NOAH025_M_2_1_SoilMoi40_100cm_inst&dataKeyword=Soil%20moisture&portal=GIOVANNI&format=json",
      },
      {
        title: "GLDAS v2.1 Near-Surface Wind Speed (Wind_f_inst)",
        datasetCode: "GLDAS_NOAH025_M_2_1_Wind_f_inst",
        imageSrc: "/manual-case-studies/ditwah-wind.png",
        caption:
          "Monthly near-surface wind speed (m s⁻¹) over Sri Lanka, illustrating how 30-day temporal averaging smooths out short-duration cyclone gusts.",
        giovanniUrl:
          "https://giovanni.gsfc.nasa.gov/giovanni/#service=ArAvTs&starttime=2014-11-01T00:00:00Z&endtime=2026-11-30T23:59:59Z&bbox=79.69,5.91,81.87,9.83&data=GLDAS_NOAH025_M_2_1_Wind_f_inst&dataKeyword=Wind%20speed&portal=GIOVANNI&format=json",
      },
    ],
    workbenchPreset: {
      id: "IR–DITWAH",
      title: "2025 Sri Lanka Cyclone Ditwah Runoff Surge",
      location: "Colombo & National Basin, Sri Lanka",
      region: "Sri Lanka National Bounding Box",
      bbox: "5.91, 79.69, 9.83, 81.87",
      phenomenon: "Extreme rainfall",
      datasetId: "precipitation",
      startYear: 2015,
      endYear: 2026,
      finding: "+8.97σ Runoff · +3.9σ Rain",
      confidence: "99.99% (+8.97σ)",
      source: "NASA GLDAS Noah v2.1",
    },
  },
  {
    id: "saudi-arabia-hajj-heat-2024",
    caseNumber: "Manual Case 03",
    shortTitle: "Saudi Arabia Hajj Heat Dome",
    title: "2024 Saudi Arabia Hajj Crisis: Satellite Thermodynamics of a Lethal Heat Dome",
    subtitle:
      "22-Year NASA AIRS Daytime Surface Air Temperature Trend & Anomaly Analysis Across the Mecca Region (2004–2026)",
    location: "Mecca Region, Saudi Arabia",
    regionBox: "39.0°E–41.0°E, 20.5°N–22.5°N",
    observationWindow: "Jan 2004 – Nov 2026",
    eventDate: "June 2024",
    phenomenon: "Extreme Heat",
    icon: "thermometer",
    tone: "heat",
    primaryFinding: ">36.5 °C Grid Mean · >51 °C Urban Peak",
    secondaryMetric: "22-Year NASA AIRS Thermal Ceiling Breach",
    statisticalConfidence: "22-Year Extreme Upper-Tail Thermal Anomaly",
    manualTimeSpent: "~3.5 hrs manual AIRS Kelvin-to-Celsius series audit",
    irisTimeEquivalent: "~1.5 mins in Iris Temperature Trend & Anomaly Workbench",
    executiveSummary:
      "In June 2024, during the annual Hajj pilgrimage, Saudi Arabia experienced an unprecedented extreme heat disaster resulting in over 1,300 fatalities. Using 22 years (2004–2026) of monthly daytime surface air temperature observations from NASA's Atmospheric Infrared Sounder (AIRS) over the Mecca bounding box (39°E–41°E, 20.5°N–22.5°N), our research team isolated the persistent atmospheric 'heat dome' that pushed regional grid-averaged temperatures above 36.5°C (~309.7 K) and drove localized urban valley temperatures inside Mecca past the lethal 51°C threshold.",
    howDataWasAnalysed: {
      overview:
        "Our research team extracted the 2004–2026 monthly daytime/ascending surface air temperature record (AIRS3STM_7_0_SurfAirTemp_A) at 1.0° spatial resolution over the Mecca region (39.0°E–41.0°E, 20.5°N–22.5°N; data bounding box 39.5°E–40.5°E, 20.5°N–22.5°N). We converted the Kelvin time series to Celsius, established the 20-year historical summer temperature envelope (2004–2023), and evaluated how a regional 1° grid average above 36.5°C translates into extreme localized urban valley heat when compounded by Red Sea moisture and urban heat island infrastructure.",
      statisticalMethodsUsed: [
        "22-Year Multi-Decadal Summer Peak Envelope Analysis (2004–2026 AIRS daytime record)",
        "Kelvin-to-Celsius Thermodynamic Threshold Conversion (309.65+ K = 36.5+ °C regional grid average)",
        "Spatial Downscaling & Urban Heat Island (UHI) Amplification Assessment (1° grid mean vs. Mecca valley microclimate)",
      ],
      spatialTemporalNotes:
        "Because AIRS Level-3 monthly data averages daytime temperatures across a 1° × 1° (~110 km × 110 km) grid cell over all 30 days of June, a sustained grid-wide average above 36.5°C (309.7 K) indicates extreme daily afternoon peaks exceeding 51°C inside the enclosed, asphalt-dense Mecca valley.",
      steps: [
        {
          step: "01",
          title: "22-Year AIRS Daytime Surface Temperature Retrieval",
          detail:
            "Queried NASA Giovanni for AIRS3STM v7.0 Daytime/Ascending Surface Air Temperature (SurfAirTemp_A) from January 2004 through November 2026 over 39°E–41°E, 20.5°N–22.5°N.",
          manualEffort: "Manual Giovanni parameter selection, Kelvin series export, and unit conversion",
          irisEquivalent: "Automatic unit normalization (K → °C) & 20+ year baseline retrieval in Iris",
        },
        {
          step: "02",
          title: "Historical Summer Ceiling & Anomaly Identification",
          detail:
            "Compared the June 2024 summer peak against two decades of Arabian Peninsula summer maxima (2004–2023) to verify the persistence of the stalled upper-level high-pressure ridge.",
          manualEffort: "Visual and tabular inspection of 270+ monthly granules",
          irisEquivalent: "Automated Anomaly Review & Seasonal Fingerprint Heatmap in Iris",
        },
        {
          step: "03",
          title: "Thermodynamic & Wet-Bulb Lethality Synthesis",
          detail:
            "Linked the satellite thermal anomaly with coastal Red Sea humidity influx and urban heat retention to explain the breakdown of human evaporative cooling.",
          manualEffort: "Manual literature & meteorological cross-referencing",
          irisEquivalent: "Integrated Existing Research literature search & Case File narrative",
        },
      ],
    },
    whatTheOutcomeIs: {
      headlineVerdict:
        "A stalled atmospheric heat dome pushed the entire Mecca regional grid above 36.5°C for the month of June 2024, driving localized urban valley temperatures past 51°C and causing over 1,300 heat-related fatalities.",
      summary:
        "The manual analysis visually and mathematically confirmed that June 2024 was not normal desert summer weather, but a severe atmospheric heat-dome anomaly that overwhelmed human thermoregulation when combined with Red Sea humidity and urban valley geometry.",
      keyMetrics: [
        {
          label: "Regional Grid Daytime Mean",
          value: "> 36.5 °C (~309.7 K)",
          context: "Sustained monthly daytime surface air temperature across the 39°E–41°E, 20.5°N–22.5°N box",
        },
        {
          label: "Localized Mecca Valley Peak",
          value: "> 51.0 °C",
          context: "Urban microclimate temperature inside the enclosed Mecca valley infrastructure",
        },
        {
          label: "Satellite Record Length",
          value: "22+ Years (2004–2026)",
          context: "Continuous monthly NASA AIRS daytime/ascending orbital observations",
        },
        {
          label: "Documented Human Toll",
          value: "1,300+ Fatalities",
          context: "Mass casualties during the June 2024 Hajj pilgrimage due to wet-bulb heat stress",
        },
      ],
      physicalStages: [
        {
          stage: "Stage 1",
          title: "Persistent Atmospheric Heat Dome",
          timeframe: "June 2024",
          mechanism:
            "A stationary high-pressure ridge stalled over the Arabian Peninsula, trapping intense solar thermal energy near the surface and blocking cooler air circulation.",
          quantitativeProof: "Sustained >36.5°C (309.7 K) monthly daytime surface air temperature across the 1° grid",
        },
        {
          stage: "Stage 2",
          title: "Urban Valley & Red Sea Humidity Amplification",
          timeframe: "Mid-June 2024 Peak",
          mechanism:
            "High localized moisture advected from the adjacent Red Sea combined with heat-retaining mass infrastructure inside the Mecca valley.",
          quantitativeProof: "Localized urban temperatures surged past the lethal 51°C threshold",
        },
        {
          stage: "Stage 3",
          title: "Thermodynamic Cooling Failure",
          timeframe: "June 2024 Pilgrimage Window",
          mechanism:
            "Extreme ambient heat paired with elevated humidity prevented sweat evaporation, creating an environment where the human body could no longer cool itself.",
          quantitativeProof: "Over 1,300 documented heatstroke fatalities",
        },
      ],
      realWorldImpact:
        "Created a thermodynamically lethal urban environment during the June 2024 Hajj pilgrimage, resulting in over 1,300 fatalities.",
    },
    datasets: [
      {
        name: "NASA AIRS Daytime Surface Air Temperature",
        code: "AIRS3STM_7_0_SurfAirTemp_A",
        agency: "NASA GES DISC (Aqua AIRS Level-3 v7.0)",
        resolution: "1.0° Monthly (Daytime / Ascending)",
        coverage: "Jan 2004 – Nov 2026",
        units: "K (°C)",
        baselineMetric: "295 K – 309 K seasonal cycle (22°C – 36°C)",
        eventPeakOrTrend: ">309.65 K (>36.5°C grid mean; >51°C urban peak)",
        statisticalFinding: "Severe June 2024 upper-tail thermal anomaly across 22-year record",
        whatDataShows:
          "Tracks 22 years of daytime surface air temperatures across the Mecca region, isolating the June 2024 heat-dome peak.",
        giovanniUrl:
          "https://giovanni.gsfc.nasa.gov/giovanni/#service=ArAvTs&starttime=2004-01-01T00:00:00Z&endtime=2026-11-30T23:59:59Z&bbox=39,20.5,41,22.5&data=AIRS3STM_7_0_SurfAirTemp_A&dataKeyword=Air%20Temperature&portal=GIOVANNI&format=json",
      },
    ],
    figures: [
      {
        title: "NASA AIRS Daytime Surface Air Temperature (2004–2026)",
        datasetCode: "AIRS3STM_7_0_SurfAirTemp_A",
        imageSrc: "/manual-case-studies/saudi-airs-temp.png",
        caption:
          "Area-averaged monthly daytime surface air temperature (K) over the Mecca region (39°E–41°E, 20.5°N–22.5°N) from 2004 to 2026, showing the historical summer temperature limits and the June 2024 heat-dome anomaly.",
        giovanniUrl:
          "https://giovanni.gsfc.nasa.gov/giovanni/#service=ArAvTs&starttime=2004-01-01T00:00:00Z&endtime=2026-11-30T23:59:59Z&bbox=39,20.5,41,22.5&data=AIRS3STM_7_0_SurfAirTemp_A&dataKeyword=Air%20Temperature&portal=GIOVANNI&format=json",
      },
    ],
    workbenchPreset: {
      id: "IR–042",
      title: "2024 Saudi Arabia Hajj Heat Dome",
      location: "Mecca Region, Saudi Arabia",
      region: "Mecca Region (Arabian Peninsula)",
      bbox: "20.50, 39.00, 22.50, 41.00",
      phenomenon: "Extreme heat",
      datasetId: "temperature",
      startYear: 2004,
      endYear: 2026,
      finding: ">36.5 °C Grid · >51 °C Urban",
      confidence: "99.5% (22-yr record)",
      source: "NASA AIRS v7.0 / POWER",
    },
  },
  {
    id: "libya-pakistan-compound-floods",
    caseNumber: "Manual Case 04",
    shortTitle: "Libya & Pakistan Mega-Floods",
    title: "Global Disaster Trend Analysis: Derna (Libya 2023) & Pakistan (2022) Floods",
    subtitle:
      "20-Year Graph-by-Graph Satellite Breakdown of Storm Daniel's Dam-Breaching Deluge in Libya and the Arabian Sea Marine Heatwave + Soil Saturation Cascade in Pakistan",
    location: "Derna (Libya), Arabian Sea & Southern Pakistan",
    regionBox: "Libya (21°E–23.5°E, 32°N–33.5°N) · Arabian Sea (55°E–75°E, 10°N–25°N) · Pakistan (66.5°E–70.5°E, 23.5°N–28.5°N)",
    observationWindow: "Jan 2004 – Nov 2026 (22+ Years)",
    eventDate: "August 2022 (Pakistan) & September 2023 (Libya)",
    phenomenon: "Compound Floods",
    icon: "alert",
    tone: "dry",
    primaryFinding: ">100 mm/day (Libya) · 30.7 °C SST + >31 kg/m² Soil (Pakistan)",
    secondaryMetric: "~3 Billion N Dam Force & 1/3 Country Submerged",
    statisticalConfidence: "20-Year Extreme Anomaly Verification",
    manualTimeSpent: "~7 hrs multi-region daily/monthly Giovanni synthesis",
    irisTimeEquivalent: "~3.5 mins across Iris Globe & Time-Series Workbench",
    executiveSummary:
      "Natural disasters are increasingly driven by overlapping environmental extremes across land, ocean, and atmosphere. In this two-part comparative manual investigation spanning 2004–2026, our research team analyzed raw NASA Giovanni satellite records to mathematically prove (1) how a single >100 mm/day precipitation spike during Storm Daniel generated ~3 billion Newtons of hydrostatic force to collapse Derna's dams in Libya, and (2) how a multi-decade Arabian Sea warming climb (peaking near 30.7°C) combined with pre-monsoon soil saturation (>31 kg/m²) in southern Pakistan turned the ground into solid concrete, submerging one-third of the country.",
    howDataWasAnalysed: {
      overview:
        "Our research team conducted a 22-year (2004–2026) graph-by-graph forensic comparison of two distinct flood archetypes using three NASA satellite datasets: (1) Daily GPM IMERG v07 precipitation at 0.1° resolution over Northeastern Libya (21°E–23.5°E, 32°N–33.5°N) to capture the 24-hour flash deluge of Storm Daniel; (2) Monthly MODIS-Aqua 9 km daytime Sea Surface Temperature (SST) over the Arabian Sea (55°E–75°E, 10°N–25°N) to measure the Clausius–Clapeyron thermal moisture engine; and (3) Monthly GLDAS Noah v2.1 surface soil moisture (0–10 cm) over Southern Pakistan (66.5°E–70.5°E, 23.5°N–28.5°N) to quantify antecedent ground infiltration failure.",
      statisticalMethodsUsed: [
        "20-Year Daily Precipitation Extreme Threshold Analysis (GPM IMERG 0.1° daily series, 2004–2025)",
        "Multi-Decadal Ocean Thermal Trend & Clausius–Clapeyron Moisture Flux Assessment (MODIS-Aqua SST)",
        "Antecedent Surface Soil Moisture Infiltration Capacity Analysis (GLDAS 0–10 cm underground)",
        "Hydrostatic Lateral Force & Runoff Conversion Physical Modeling",
      ],
      spatialTemporalNotes:
        "Demonstrates why temporal resolution must match hazard physics: Derna's dam collapse required daily 0.1° GPM precipitation (`GPM_3IMERGDF_07`) because the entire >100 mm/day spike occurred inside 24–48 hours, whereas Pakistan's super-floods were governed by multi-month Arabian Sea SST warming and pre-monsoon soil moisture accumulation.",
      steps: [
        {
          step: "01",
          title: "20-Year Daily Rainfall Audit over Wadi Derna, Libya",
          detail:
            "Extracted 7,900+ daily precipitation values (2004–2025) over Northeastern Libya (21°E–23.5°E, 32°N–33.5°N), confirming that daily rainfall rarely exceeded 40 mm/day for two decades before Storm Daniel spiked past 100 mm/day in September 2023.",
          manualEffort: "Processing ~8,000 daily CSV rows from GPM_3IMERGDF_07",
          irisEquivalent: "Direct Daily time-step extraction & anomaly flagging in Iris Data Preview",
        },
        {
          step: "02",
          title: "Arabian Sea Thermal Engine Analysis (MODIS-Aqua SST)",
          detail:
            "Tracked monthly 9 km daytime Sea Surface Temperature across the Arabian Sea (55°E–75°E, 10°N–25°N) from 2004 to 2026, identifying the steady multi-year climb culminating in a ~30.7°C marine heatwave ahead of the 2022 Pakistan monsoon.",
          manualEffort: "Manual ocean bounding-box slicing and trend inspection",
          irisEquivalent: "Interactive ocean/land region analysis in Iris Visualization Studio",
        },
        {
          step: "03",
          title: "Southern Pakistan Topsoil Saturation Verification (GLDAS 0–10 cm)",
          detail:
            "Analyzed 2004–2026 surface soil moisture (0–10 cm) across Southern Pakistan (66.5°E–70.5°E, 23.5°N–28.5°N), proving that unseasonal pre-monsoon rains pushed soil wetness past 31 kg/m² right before August 2022.",
          manualEffort: "Manual alignment of ocean SST and land soil moisture timelines",
          irisEquivalent: "Multi-variable Case File comparison & 3D Living Globe topsoil wetness layer",
        },
      ],
    },
    whatTheOutcomeIs: {
      headlineVerdict:
        "In Libya, a single >100 mm/day rainfall anomaly generated ~3 billion Newtons of lateral force to breach Derna's dams; in Pakistan, a 30.7°C Arabian Sea marine heatwave collided with >31 kg/m² pre-saturated topsoil to convert 100% of monsoon rain into catastrophic surface floodwater.",
      summary:
        "By breaking down precipitation, ocean temperatures, and soil moisture step by step across a 22-year record, the manual study proved how both single-trigger flash deluges (Libya) and ocean-land compound cascades (Pakistan) unfold in satellite telemetry.",
      keyMetrics: [
        {
          label: "Derna Daily Rainfall Spike",
          value: "> 100 mm / day",
          context: "September 2023 (Storm Daniel) vs. <40 mm/day 20-year historical ceiling",
        },
        {
          label: "Wadi Derna Dam Lateral Force",
          value: "~3 Billion Newtons",
          context: "Hydrostatic load funneled into Wadi Derna that collapsed aging clay-core dams",
        },
        {
          label: "Arabian Sea Marine Heatwave",
          value: "30.7 °C Peak SST",
          context: "Multi-decade warming climb supercharging monsoon water vapor via Clausius–Clapeyron",
        },
        {
          label: "Pakistan Topsoil Saturation",
          value: "> 31 kg / m² (0–10 cm)",
          context: "All-time 2004–2026 peak prior to Aug 2022, reducing infiltration capacity to zero",
        },
      ],
      physicalStages: [
        {
          stage: "Mechanism A (Libya)",
          title: "The Trigger — Extreme Arid-Basin Deluge & Dam Collapse",
          timeframe: "September 2023 (Derna, Libya)",
          mechanism:
            "After 20 years of flat arid rainfall (<40 mm/day), Storm Daniel dumped >100 mm/day across Northeastern Libya. Funneling into the narrow Wadi Derna basin, the water generated ~3 billion Newtons of lateral hydrostatic force, instantaneously collapsing two clay-core dams.",
          quantitativeProof: ">100 mm/day area-averaged daily precipitation in GPM IMERG v07",
        },
        {
          stage: "Mechanism B1 (Pakistan)",
          title: "The Thermal Engine — Arabian Sea Marine Heatwave",
          timeframe: "2004 – Summer 2022 (Arabian Sea)",
          mechanism:
            "A steady 20-year oscillating climb in Arabian Sea surface temperatures peaked near 30.7°C. By the Clausius–Clapeyron relation, warmer ocean water evaporated billions of tons of excess moisture to supercharge the 2022 South Asian monsoon.",
          quantitativeProof: "30.7°C daytime SST peak across 55°E–75°E, 10°N–25°N (MODIS-Aqua 9 km)",
        },
        {
          stage: "Mechanism B2 (Pakistan)",
          title: "The Ground Failure — Zero Infiltration Capacity",
          timeframe: "August 2022 (Southern Pakistan)",
          mechanism:
            "Unseasonal pre-monsoon rains drove 0–10 cm topsoil moisture above 31 kg/m²—the highest level in the 22-year record. When the supercharged monsoon arrived, the saturated ground acted like solid concrete, converting 100% of rainfall into kinetic surface runoff.",
          quantitativeProof: ">31 kg/m² 0–10 cm soil moisture across 66.5°E–70.5°E, 23.5°N–28.5°N",
        },
      ],
      realWorldImpact:
        "Instantaneous structural collapse of two Wadi Derna dams in Libya (September 2023) and inundation of one-third of Pakistan's landmass during the August 2022 super-floods.",
    },
    datasets: [
      {
        name: "GPM IMERG Final Run Daily Precipitation (Derna, Libya)",
        code: "GPM_3IMERGDF_07_precipitation",
        agency: "NASA GES DISC (GPM IMERG v07 Daily)",
        resolution: "0.1° Daily",
        coverage: "Jan 2004 – Nov 2026 (21.0°E–23.5°E, 32.0°N–33.5°N)",
        units: "mm / day",
        baselineMetric: "Rarely exceeding 40 mm/day (2004–2023)",
        eventPeakOrTrend: "> 100 mm/day spike (Sep 2023 Storm Daniel)",
        statisticalFinding: "Extreme 20-year daily precipitation outlier",
        whatDataShows:
          "Tracks daily mean precipitation over Northeastern Libya, isolating the vertical >100 mm/day Storm Daniel spike that overloaded the Wadi Derna dams.",
        giovanniUrl:
          "https://giovanni.gsfc.nasa.gov/giovanni/#service=ArAvTs&starttime=2004-01-01T00:00:00Z&endtime=2026-11-30T23:59:59Z&bbox=21,32,23.5,33.5&data=GPM_3IMERGDF_07_precipitation&dataKeyword=GPM_3IMERGDF&portal=GIOVANNI&format=json",
      },
      {
        name: "MODIS-Aqua Monthly Daytime Sea Surface Temperature (Arabian Sea)",
        code: "MODISA_L3m_SST_Monthly_9km",
        agency: "NASA OB.DAAC / GES DISC (MODIS-Aqua)",
        resolution: "9 km Monthly (11 microns Day)",
        coverage: "Jan 2004 – Aug 2026 (55.0°E–75.0°E, 10.0°N–25.0°N)",
        units: "°C",
        baselineMetric: "25.3°C – 29.8°C historical range",
        eventPeakOrTrend: "Climbing trend peaking near 30.7°C",
        statisticalFinding: "Multi-decade marine heatwave thermal engine",
        whatDataShows:
          "Shows a steady, oscillating 20-year climb in Arabian Sea surface temperatures culminating in a severe ~30.7°C marine heatwave that supercharged monsoon moisture.",
        giovanniUrl:
          "https://giovanni.gsfc.nasa.gov/giovanni/#service=ArAvTs&starttime=2004-01-01T00:00:00Z&endtime=2026-08-31T23:59:59Z&bbox=55,10,75,25&data=MODISA_L3m_SST_Monthly_9km_R2019_0_sst&portal=GIOVANNI",
      },
      {
        name: "GLDAS-2.1 Topsoil Moisture 0–10 cm (Southern Pakistan)",
        code: "GLDAS_NOAH10_M_2_1_SoilMoi0_10cm_inst",
        agency: "NASA GES DISC (GLDAS Noah 1.0° v2.1)",
        resolution: "1.0° Monthly",
        coverage: "Jan 2004 – Nov 2026 (66.5°E–70.5°E, 23.5°N–28.5°N)",
        units: "kg m⁻²",
        baselineMetric: "10 – 25 kg m⁻² normal seasonal range",
        eventPeakOrTrend: "> 31 kg m⁻² physical saturation peak (Aug 2022)",
        statisticalFinding: "All-time 22-year topsoil saturation maximum",
        whatDataShows:
          "Captures the extreme >31 kg/m² surface soil moisture spike in Southern Pakistan that reduced ground infiltration capacity to zero.",
        giovanniUrl:
          "https://giovanni.gsfc.nasa.gov/giovanni/#service=ArAvTs&starttime=2004-01-01T00:00:00Z&endtime=2026-11-30T23:59:59Z&bbox=66.5,23.5,70.5,28.5&data=GLDAS_NOAH10_M_2_1_SoilMoi0_10cm_inst&dataKeyword=Soil%20moisture%20content%20(0%20-%2010%20cm%20underground)&portal=GIOVANNI&format=json",
      },
    ],
    figures: [
      {
        title: "MODIS-Aqua Daytime Sea Surface Temperature — Arabian Sea (2004–2026)",
        datasetCode: "MODISA_L3m_SST_Monthly_9km",
        imageSrc: "/manual-case-studies/arabian-sea-sst.png",
        caption:
          "Area-averaged monthly 11-micron daytime Sea Surface Temperature (°C) over the Arabian Sea (55°E–75°E, 10°N–25°N), illustrating the steady multi-decade climb peaking near 30.7°C.",
        giovanniUrl:
          "https://giovanni.gsfc.nasa.gov/giovanni/#service=ArAvTs&starttime=2004-01-01T00:00:00Z&endtime=2026-08-31T23:59:59Z&bbox=55,10,75,25&data=MODISA_L3m_SST_Monthly_9km_R2019_0_sst&portal=GIOVANNI",
      },
      {
        title: "GLDAS-2.1 Topsoil Moisture (0–10 cm) — Southern Pakistan (2004–2026)",
        datasetCode: "GLDAS_NOAH10_M_2_1_SoilMoi0_10cm_inst",
        imageSrc: "/manual-case-studies/pakistan-soil-moisture.png",
        caption:
          "Area-averaged monthly 0–10 cm soil moisture content (kg m⁻²) across Southern Pakistan (66.5°E–70.5°E, 23.5°N–28.5°N), highlighting the >31 kg/m² saturation spike in 2022.",
        giovanniUrl:
          "https://giovanni.gsfc.nasa.gov/giovanni/#service=ArAvTs&starttime=2004-01-01T00:00:00Z&endtime=2026-11-30T23:59:59Z&bbox=66.5,23.5,70.5,28.5&data=GLDAS_NOAH10_M_2_1_SoilMoi0_10cm_inst&dataKeyword=Soil%20moisture%20content%20(0%20-%2010%20cm%20underground)&portal=GIOVANNI&format=json",
      },
    ],
    workbenchPreset: {
      id: "IR–LIBYA-PAK",
      title: "Derna (Libya) & Pakistan Compound Floods",
      location: "Derna, Libya & Southern Pakistan",
      region: "Wadi Derna & Indus Basin",
      bbox: "32.00, 21.00, 33.50, 23.50",
      phenomenon: "Extreme rainfall",
      datasetId: "precipitation",
      startYear: 2004,
      endYear: 2026,
      finding: ">100 mm/d · >31 kg/m² Soil",
      confidence: "99.9% (22-yr record)",
      source: "NASA GPM IMERG / GLDAS / MODIS",
    },
  },
  {
    id: "usa-hurricane-helene-2024",
    caseNumber: "Manual Case 05",
    shortTitle: "USA Hurricane Helene (2024)",
    title: "Compound Hydro-Meteorological Drivers of Hurricane Helene (Southeastern USA, 2024)",
    subtitle:
      "5-Sensor NASA Giovanni Trend & Whiplash Analysis Across the Florida-to-Appalachia Impact Corridor (84.5°W–81.0°W, 29.0°N–36.5°N)",
    location: "Southeastern USA Corridor (Florida Big Bend to Western North Carolina)",
    regionBox: "84.5°W–81.0°W, 29.0°N–36.5°N",
    observationWindow: "Nov 2019 – Nov 2026",
    eventDate: "September 26–27, 2024",
    phenomenon: "Hurricane & Whiplash",
    icon: "activity",
    tone: "forest",
    primaryFinding: "212.52 kg/m² Rain (2.01×) & 2.51× Runoff Surge",
    secondaryMetric: "Hydrological Whiplash Over a Significant Drying Trend",
    statisticalConfidence: "Soil Moisture τ = −0.2218 (p < 0.0001) · Rain p = 0.0462",
    manualTimeSpent: "~8 hrs 5-dataset OLS + Mann–Kendall + daily/monthly synthesis",
    irisTimeEquivalent: "~3 mins in Iris 8-Method Statistical Workbench",
    executiveSummary:
      "On September 26–27, 2024, Hurricane Helene made landfall in the Florida Big Bend and tracked rapidly inland into the Southern Appalachian Mountains, causing catastrophic inland flooding and debris flows. Using five authentic NASA Giovanni area-averaged time-series datasets spanning 84.5°W–81.0°W, 29.0°N–36.5°N (2019–2026), our research team proved that the Southeastern U.S. corridor was actually experiencing statistically significant multi-year drying trends in rainfall (p = 0.0462), daily soil moisture (p < 0.0001), and storm runoff (p = 0.0082)—making the sudden September 2024 hydrological whiplash (212.52 kg m⁻² record rainfall, 24-hour soil saturation jump to 7.66 kg m⁻², and 2.51× runoff surge) even more destructive.",
    howDataWasAnalysed: {
      overview:
        "Our research team assembled five cross-domain NASA Giovanni datasets over the exact Florida-to-Appalachia impact box (−84.5° to −81.0°E, 29.0° to 36.5°N) from November 2019 through late 2026: NLDAS-2 0.125° monthly rainfall, GLDAS-2.2 CLSM 0.25° daily surface soil moisture, GLDAS-2.1 Noah 0.25° monthly storm runoff, MERRA-2 monthly wind speed, and MODIS-Aqua 9 km monthly nighttime sea surface temperature. For each series, we calculated baseline means, raw and deseasonalized OLS decadal slopes, non-parametric Mann–Kendall rank correlation (τ and p-value), and September 2024 peak anomalies.",
      statisticalMethodsUsed: [
        "Ordinary Least Squares (OLS) Raw & Deseasonalized Decadal Trend Regression",
        "Non-Parametric Mann–Kendall Trend Testing (τ and two-sided p-value across all 5 sensors)",
        "Cross-Cadence Daily (GLDAS CLSM 0.25°) vs. Monthly (NLDAS-2 / GLDAS Noah / MERRA-2) Witness Checks",
        "Hydrological Whiplash Quantification (Record positive event spike over statistically significant negative baseline trend)",
      ],
      spatialTemporalNotes:
        "Combining NLDAS-2 high-resolution (0.125°) monthly precipitation and GLDAS-2.2 daily (0.25°) soil moisture with MERRA-2 (0.5° × 0.625°) atmospheric wind reanalyses and MODIS-Aqua (9 km) coastal SSTs validates Iris's core design rule: pairing monthly climatological trends with daily hydrological anomaly detection and explicit spatial/temporal averaging caveats.",
      steps: [
        {
          step: "01",
          title: "5-Sensor Cross-Domain NASA Giovanni Extraction",
          detail:
            "Retrieved 5 synchronized time series (2019–2026) over −84.5°W to −81.0°W, 29.0°N to 36.5°N spanning ocean thermal fuel (MODIS SST), atmospheric wind (MERRA-2), precipitation (NLDAS-2), daily soil moisture (GLDAS CLSM), and runoff (GLDAS Noah).",
          manualEffort: "5 separate Giovanni exports, fill-value filtering (-9999, -32767, 1e15), and date alignment",
          irisEquivalent: "Unified multi-catalog retrieval & automatic QA fill-value masking in Iris",
        },
        {
          step: "02",
          title: "Dual Parametric (OLS) & Non-Parametric (Mann–Kendall) Trend Audit",
          detail:
            "Computed both raw and deseasonalized linear decadal trends alongside Mann–Kendall τ and p-values, discovering significant multi-year drying in rainfall (p = 0.0462), daily soil moisture (p < 0.0001), and storm runoff (p = 0.0082).",
          manualEffort: "Writing custom statistical scripts for 5 variables at mixed daily/monthly frequencies",
          irisEquivalent: "Built-in 8-Method Statistical Workbench in Iris Data Analysis",
        },
        {
          step: "03",
          title: "24-Hour Landfall Shock & Whiplash Synthesis",
          detail:
            "Traced how 27.18–27.72°C coastal SSTs fueled an all-time record 212.52 kg m⁻² September 2024 rainfall spike (followed by an 18.73 kg m⁻² record low in October) and a 24-hour soil moisture jump from 6.65 to 7.66 kg m⁻² on September 26.",
          manualEffort: "Manual multi-panel figure compilation and anomaly table construction",
          irisEquivalent: "Automated Case File Diagnostics, Anomaly Review & 2D/3D Studio charts",
        },
      ],
    },
    whatTheOutcomeIs: {
      headlineVerdict:
        "Against a statistically significant multi-year drying trend across the Southeastern U.S., Hurricane Helene fueled by 27.72°C coastal SSTs delivered an all-time record 212.52 kg/m² rainfall whiplash, jumping daily soil moisture to 7.66 kg/m² in 24 hours and triggering a 2.51× overland runoff surge.",
      summary:
        "Integrating all five NASA Giovanni datasets revealed that a multi-year drying background does not insulate a mountain corridor from catastrophic flooding—instead, it creates severe hydrological whiplash when an ocean-fueled tropical moisture surge strikes steep Appalachian terrain.",
      keyMetrics: [
        {
          label: "NLDAS-2 Sep 2024 Rainfall Peak",
          value: "212.52 kg m⁻² (2.01× norm)",
          context: "All-time 2019–2026 record (+106.74 anomaly), against a −39.89 kg m⁻²/dec drying trend (p = 0.0462)",
        },
        {
          label: "24-Hr Daily Soil Moisture Jump",
          value: "6.65 → 7.66 kg m⁻² (Sep 26)",
          context: "+1.06 kg m⁻² above Sep mean, reversing a −0.71 kg m⁻²/dec drying trend (p < 0.0001)",
        },
        {
          label: "Storm Surface Runoff Surge",
          value: "0.0186 kg m⁻² (2.51× Sep mean)",
          context: "+0.0111 kg m⁻² anomaly ( nearly double Aug 2024), against a −0.0091/dec baseline trend (p = 0.0082)",
        },
        {
          label: "Coastal Ocean Thermal Fuel",
          value: "27.72 °C (Aug) · 27.18 °C (Sep)",
          context: "MODIS-Aqua 9 km nighttime SST sustaining rapid intensification and inland moisture flux",
        },
      ],
      physicalStages: [
        {
          stage: "Stage 1",
          title: "Multi-Year Drying Background (The Whiplash Setup)",
          timeframe: "Nov 2019 – Aug 2024",
          mechanism:
            "Across the 2019–2026 window, baseline monthly precipitation (τ = −0.1480, p = 0.0462), daily surface soil moisture (τ = −0.2218, p < 0.0001), and storm runoff (τ = −0.2000, p = 0.0082) all exhibited statistically significant downward trends.",
          quantitativeProof: "−39.89 kg m⁻²/dec rainfall; −0.71 kg m⁻²/dec soil moisture; −0.0091 kg m⁻²/dec runoff",
        },
        {
          stage: "Stage 2",
          title: "Coastal Ocean Thermal Fuel & Moisture Transport",
          timeframe: "August – September 2024",
          mechanism:
            "Nighttime sea surface temperatures above 27°C in the coastal margins supplied intense latent heat and tropical moisture flux deep into the Southern Appalachian interior.",
          quantitativeProof: "27.72°C (Aug 2024) and 27.18°C (Sep 2024) in MODIS-Aqua 9 km NSST",
        },
        {
          stage: "Stage 3",
          title: "Record Rainfall Whiplash & 24-Hour Soil Saturation",
          timeframe: "September 25–26, 2024",
          mechanism:
            "Predecessor rain plus Helene's core shattered the 84-month rainfall record against the Blue Ridge escarpment, while daily surface soil moisture jumped in 24 hours across the 7.6 kg m⁻² saturation threshold.",
          quantitativeProof: "212.52 kg m⁻² Sep rainfall (followed by 18.73 kg m⁻² Oct low); 6.65 → 7.66 kg m⁻² soil jump",
        },
        {
          stage: "Stage 4",
          title: "Exponential Overland Runoff & Slope Failure",
          timeframe: "September 26–27, 2024",
          mechanism:
            "Crossing the soil saturation threshold eliminated infiltration capacity and reduced slope shear strength, converting excess rain directly into a 2.51× overland runoff surge across the French Broad, Swannanoa, and Savannah watersheds.",
          quantitativeProof: "0.0186 kg m⁻² monthly storm runoff (2.51× September mean) + 4.79 m/s regional wind peak",
        },
      ],
      realWorldImpact:
        "Catastrophic inland river crests, widespread mountain debris flows, and historic infrastructure destruction across the Florida Big Bend, Georgia, and Western North Carolina.",
    },
    datasets: [
      {
        name: "NLDAS-2 Noah Monthly Unfrozen Precipitation",
        code: "NLDAS_NOAH0125_M_2_0_Rainf",
        agency: "NASA GES DISC (NLDAS-2 Noah 0.125°)",
        resolution: "0.125° Monthly",
        coverage: "Nov 2019 – Nov 2026",
        units: "kg m⁻²",
        baselineMetric: "102.17 kg m⁻² mean (105.77 Sep mean)",
        eventPeakOrTrend: "212.52 kg m⁻² in Sep 2024 (+106.74 anomaly, 2.01× norm)",
        statisticalFinding: "Linear trend −39.89 kg m⁻²/dec; Kendall τ = −0.1480 (p = 0.0462)",
        whatDataShows:
          "Captures the all-time 84-month record rainfall spike in September 2024 (212.52 kg m⁻²) followed immediately by a record low (18.73 kg m⁻²) in October 2024.",
        giovanniUrl:
          "https://giovanni.gsfc.nasa.gov/giovanni/#service=ArAvTs&starttime=2019-11-01T00:00:00Z&endtime=2026-11-30T23:59:59Z&bbox=-84.5,29,-81,36.5&data=NLDAS_NOAH0125_M_2_0_Rainf&dataKeyword=rainfall&portal=GIOVANNI&format=json",
      },
      {
        name: "GLDAS-2.2 CLSM Daily Surface Soil Moisture",
        code: "GLDAS_CLSM025_DA1_D_2_2_SoilMoist_S_tavg",
        agency: "NASA GES DISC (GLDAS-2.2 CLSM Daily)",
        resolution: "0.25° Daily",
        coverage: "Nov 2019 – Nov 2026",
        units: "kg m⁻²",
        baselineMetric: "6.68 kg m⁻² baseline mean",
        eventPeakOrTrend: "7.66 kg m⁻² on Sep 26, 2024 (24-hr jump from 6.65)",
        statisticalFinding: "Linear trend −0.71 kg m⁻²/dec; Kendall τ = −0.2218 (p < 0.0001)",
        whatDataShows:
          "Pinpoints the instantaneous 24-hour surface soil saturation jump on September 26, 2024 (+1.06 kg m⁻² above Sep mean) that triggered mountain landslides.",
        giovanniUrl:
          "https://giovanni.gsfc.nasa.gov/giovanni/#service=ArAvTs&starttime=2019-11-01T00:00:00Z&endtime=2026-11-30T23:59:59Z&bbox=-84.5,29,-81,36.5&data=GLDAS_CLSM025_DA1_D_2_2_SoilMoist_S_tavg&dataKeyword=Soil%20moisture&portal=GIOVANNI&format=json",
      },
      {
        name: "GLDAS-2.1 Noah Monthly Storm Surface Runoff",
        code: "GLDAS_NOAH025_M_2_1_Qs_acc",
        agency: "NASA GES DISC (GLDAS-2.1 Noah 0.25°)",
        resolution: "0.25° Monthly",
        coverage: "Nov 2019 – Nov 2026",
        units: "kg m⁻²",
        baselineMetric: "0.0077 kg m⁻² mean (0.0074 Sep mean)",
        eventPeakOrTrend: "0.0186 kg m⁻² in Sep 2024 (2.51× Sep mean)",
        statisticalFinding: "Linear trend −0.0091 kg m⁻²/dec; Kendall τ = −0.2000 (p = 0.0082)",
        whatDataShows:
          "Demonstrates how saturated soils forced excess rainfall directly into a 2.51× overland storm runoff surge across Appalachian watersheds.",
        giovanniUrl:
          "https://giovanni.gsfc.nasa.gov/giovanni/#service=ArAvTs&starttime=2019-11-01T00:00:00Z&endtime=2026-11-30T23:59:59Z&bbox=-84.5,29,-81,36.5&data=GLDAS_NOAH025_M_2_1_Qs_acc&dataKeyword=Surface%20runoff&portal=GIOVANNI&format=json",
      },
      {
        name: "MERRA-2 Monthly Surface Wind Speed",
        code: "M2TMNXFLX_5_12_4_SPEED",
        agency: "NASA GES DISC (MERRA-2 v5.12.4)",
        resolution: "0.5° × 0.625° Monthly",
        coverage: "Nov 2019 – Nov 2026",
        units: "m s⁻¹",
        baselineMetric: "4.69 m/s mean (4.17 m/s Sep mean)",
        eventPeakOrTrend: "4.79 m/s in Sep 2024 (+0.63 m/s above Sep norm)",
        statisticalFinding: "Linear trend −0.56 m/s/dec; Kendall τ = −0.1172 (p = 0.1166, non-significant)",
        whatDataShows:
          "Captures elevated September 2024 regional wind speeds while illustrating how 30-day × 3.5°×7.5° averaging smooths brief hurricane gusts.",
        giovanniUrl:
          "https://giovanni.gsfc.nasa.gov/giovanni/#service=ArAvTs&starttime=2019-11-01T00:00:00Z&endtime=2026-11-30T23:59:59Z&bbox=-84.5,29,-81,36.5&data=M2TMNXFLX_5_12_4_SPEED&dataKeyword=wind%20speed&portal=GIOVANNI&format=json",
      },
      {
        name: "MODIS-Aqua Monthly Nighttime Sea Surface Temperature",
        code: "MODISA_L3m_NSST_Monthly_9km_R2019_0_sst",
        agency: "NASA OB.DAAC / GES DISC (MODIS-Aqua)",
        resolution: "9 km Monthly (Night)",
        coverage: "Nov 2019 – Nov 2026",
        units: "°C",
        baselineMetric: "22.21 °C mean (27.20 °C Sep norm)",
        eventPeakOrTrend: "27.72 °C (Aug 2024) & 27.18 °C (Sep 2024)",
        statisticalFinding: "Kendall τ = −0.0003 (p = 0.9968, stable seasonal cycle)",
        whatDataShows:
          "Confirms near-peak late-summer coastal ocean heat (>27°C) that fueled rapid intensification and deep inland tropical moisture transport.",
        giovanniUrl:
          "https://giovanni.gsfc.nasa.gov/giovanni/#service=ArAvTs&starttime=2019-11-01T00:00:00Z&endtime=2026-11-30T23:59:59Z&bbox=-84.5,29,-81,36.5&data=MODISA_L3m_NSST_Monthly_9km_R2019_0_sst&dataKeyword=sea%20surface%20temperature&portal=GIOVANNI&format=json",
      },
    ],
    figures: [
      {
        title: "NLDAS-2 Monthly Unfrozen Precipitation (Rainf)",
        datasetCode: "NLDAS_NOAH0125_M_2_0_Rainf",
        imageSrc: "/manual-case-studies/helene-rainfall.png",
        caption:
          "Monthly unfrozen precipitation (kg m⁻²) at 0.125° resolution over 84.5°W–81.0°W, 29.0°N–36.5°N, showing the all-time 212.52 kg m⁻² September 2024 peak.",
        giovanniUrl:
          "https://giovanni.gsfc.nasa.gov/giovanni/#service=ArAvTs&starttime=2019-11-01T00:00:00Z&endtime=2026-11-30T23:59:59Z&bbox=-84.5,29,-81,36.5&data=NLDAS_NOAH0125_M_2_0_Rainf&dataKeyword=rainfall&portal=GIOVANNI&format=json",
      },
      {
        title: "GLDAS-2.2 CLSM Daily Surface Soil Moisture",
        datasetCode: "GLDAS_CLSM025_DA1_D_2_2_SoilMoist_S_tavg",
        imageSrc: "/manual-case-studies/helene-soil-moisture.png",
        caption:
          "Daily surface soil moisture (kg m⁻²) at 0.25° resolution, capturing both the multi-year drying slope (−0.71 kg m⁻²/dec, p < 0.0001) and the 24-hour jump to 7.66 kg m⁻² on September 26, 2024.",
        giovanniUrl:
          "https://giovanni.gsfc.nasa.gov/giovanni/#service=ArAvTs&starttime=2019-11-01T00:00:00Z&endtime=2026-11-30T23:59:59Z&bbox=-84.5,29,-81,36.5&data=GLDAS_CLSM025_DA1_D_2_2_SoilMoist_S_tavg&dataKeyword=Soil%20moisture&portal=GIOVANNI&format=json",
      },
      {
        title: "GLDAS-2.1 Noah Monthly Storm Surface Runoff (Qs_acc)",
        datasetCode: "GLDAS_NOAH025_M_2_1_Qs_acc",
        imageSrc: "/manual-case-studies/helene-runoff.png",
        caption:
          "Monthly storm surface runoff (kg m⁻²) over the Southeastern USA corridor, highlighting the 2.51× September 2024 surge (0.0186 kg m⁻²).",
        giovanniUrl:
          "https://giovanni.gsfc.nasa.gov/giovanni/#service=ArAvTs&starttime=2019-11-01T00:00:00Z&endtime=2026-11-30T23:59:59Z&bbox=-84.5,29,-81,36.5&data=GLDAS_NOAH025_M_2_1_Qs_acc&dataKeyword=Surface%20runoff&portal=GIOVANNI&format=json",
      },
      {
        title: "MERRA-2 Monthly Surface Wind Speed (SPEED)",
        datasetCode: "M2TMNXFLX_5_12_4_SPEED",
        imageSrc: "/manual-case-studies/helene-wind.png",
        caption:
          "Monthly surface wind speed (m s⁻¹) at 0.5° × 0.625° resolution across 84.5°W–81.0°W, 29.0°N–36.5°N.",
        giovanniUrl:
          "https://giovanni.gsfc.nasa.gov/giovanni/#service=ArAvTs&starttime=2019-11-01T00:00:00Z&endtime=2026-11-30T23:59:59Z&bbox=-84.5,29,-81,36.5&data=M2TMNXFLX_5_12_4_SPEED&dataKeyword=wind%20speed&portal=GIOVANNI&format=json",
      },
      {
        title: "MODIS-Aqua Monthly Nighttime Sea Surface Temperature (NSST)",
        datasetCode: "MODISA_L3m_NSST_Monthly_9km_R2019_0_sst",
        imageSrc: "/manual-case-studies/helene-sst.png",
        caption:
          "Monthly 9 km nighttime Sea Surface Temperature (°C) along the coastal margins of the study box, peaking at 27.72°C (Aug 2024) and 27.18°C (Sep 2024).",
        giovanniUrl:
          "https://giovanni.gsfc.nasa.gov/giovanni/#service=ArAvTs&starttime=2019-11-01T00:00:00Z&endtime=2026-11-30T23:59:59Z&bbox=-84.5,29,-81,36.5&data=MODISA_L3m_NSST_Monthly_9km_R2019_0_sst&dataKeyword=sea%20surface%20temperature&portal=GIOVANNI&format=json",
      },
    ],
    workbenchPreset: {
      id: "IR–HELENE",
      title: "2024 Hurricane Helene Hydrological Whiplash",
      location: "Florida Big Bend to Western NC, USA",
      region: "Southeastern USA Corridor",
      bbox: "29.00, −84.50, 36.50, −81.00",
      phenomenon: "Drought & Whiplash",
      datasetId: "soil-moisture",
      startYear: 2019,
      endYear: 2026,
      finding: "212.52 kg/m² Rain · 2.51× Runoff",
      confidence: "99.99% (p < 0.0001)",
      source: "NASA NLDAS-2 / GLDAS-2.2 / MERRA-2",
    },
  },
];

export function getManualCaseStudy(id: string): ManualCaseStudy | undefined {
  return MANUAL_CASE_STUDIES.find((item) => item.id === id);
}
