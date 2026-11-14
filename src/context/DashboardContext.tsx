"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  caseStudies,
  datasets,
  type CaseStudy,
  type Dataset,
  type SignalMode,
} from "@/lib/dashboardData";
import {
  EMPTY_DISCOVERY_STATE,
  UPSTREAM_PROVIDER_LIST,
  type DataProduct,
  type DiscoveryResponse,
  type ExtractedIntent,
  type ExtractionRequest,
  type PreviewResponse,
} from "@/lib/dataRetrievalEngine";

export type SIConversationStage = "topic_discovery" | "keyword_confirmation";

export interface SIConversationTurn {
  id: string;
  role: "user" | "assistant";
  content: string;
  stage?: SIConversationStage;
  providerStatus?: Record<string, string>;
  keywords?: string[];
  productsCount?: number;
  searchedSources?: string[];
}

export type DashboardState = {
  location: string;
  region: string;
  bbox: string;
  startYear: number;
  endYear: number;
  dataset: Dataset;
  selectedCase: CaseStudy;
  signalMode: SignalMode;
  autoRunCase: boolean;
  // Live Data Retrieval Pipeline State
  discoveryResult: DiscoveryResponse;
  selectedProducts: DataProduct[];
  activeProduct: DataProduct | null;
  extractionConfig: ExtractionRequest;
  extractedPreview: PreviewResponse | null;
};

export type DashboardContextValue = DashboardState & {
  setLocation: (value: string) => void;
  setRegion: (value: string) => void;
  setBbox: (value: string) => void;
  setStartYear: (value: number) => void;
  setEndYear: (value: number) => void;
  setDataset: (value: Dataset) => void;
  setSignalMode: (value: SignalMode) => void;
  setAutoRunCase: (value: boolean) => void;
  loadCase: (value: CaseStudy, shouldAutoRun?: boolean) => void;
  setDiscoveryResult: (value: DiscoveryResponse) => void;
  setSelectedProducts: Dispatch<SetStateAction<DataProduct[]>>;
  setActiveProduct: (value: DataProduct) => void;
  setExtractionConfig: Dispatch<SetStateAction<ExtractionRequest>>;
  setExtractedPreview: (value: PreviewResponse | null) => void;
  siConversationStage: SIConversationStage;
  setSIConversationStage: Dispatch<SetStateAction<SIConversationStage>>;
  siPendingIntent: ExtractedIntent | null;
  setSIPendingIntent: Dispatch<SetStateAction<ExtractedIntent | null>>;
  siPendingKeywords: string[];
  setSIPendingKeywords: Dispatch<SetStateAction<string[]>>;
  siTurns: SIConversationTurn[];
  setSITurns: Dispatch<SetStateAction<SIConversationTurn[]>>;
  siSelectedProviders: string[];
  setSISelectedProviders: Dispatch<SetStateAction<string[]>>;
  selectProductForConfiguration: (
    product: DataProduct,
    inferred?: {
      regionName?: string;
      spatialLevel?: "global" | "regional";
      bbox?: [number, number, number, number];
      center?: [number, number];
      startDate?: string;
      endDate?: string;
      frequency?: ExtractionRequest["target_frequency"];
    },
  ) => void;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const initialCase = caseStudies[0];
  const [location, setLocation] = useState(initialCase.location);
  const [region, setRegion] = useState(initialCase.region);
  const [bbox, setBbox] = useState(initialCase.bbox);
  const [startYear, setStartYear] = useState(initialCase.startYear);
  const [endYear, setEndYear] = useState(initialCase.endYear);
  const [dataset, setDataset] = useState(
    datasets.find((item) => item.id === initialCase.datasetId) ?? datasets[0],
  );
  const [selectedCase, setSelectedCase] = useState(initialCase);
  const [signalMode, setSignalMode] = useState<SignalMode>("anomaly");
  const [autoRunCase, setAutoRunCase] = useState(false);

  // Live pipeline state (populated strictly from real NASA API responses)
  const [discoveryResult, setDiscoveryResult] = useState<DiscoveryResponse>(EMPTY_DISCOVERY_STATE);
  const [activeProduct, setActiveProductState] = useState<DataProduct | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<DataProduct[]>([]);
  const [extractionConfig, setExtractionConfig] = useState<ExtractionRequest>({
    product_id: "NASA_POWER_T2M",
    variable_id: "T2M",
    variable_name: "Temperature at 2 Meters",
    source_api: "NASA POWER",
    unit: "C",
    start_date: "2018-01-01",
    end_date: "2024-12-31",
    target_frequency: "Monthly",
    temporal_aggregation: "mean",
    spatial_level: "regional",
    spatial_Submode: "point",
    region_name: "Colombo, Western Province, Sri Lanka",
    bbox: [78.849, 5.935, 80.849, 7.935],
    point_lat: 6.9355,
    point_lon: 79.8487,
    spatial_reduction: "mean",
  });
  const [extractedPreview, setExtractedPreview] = useState<PreviewResponse | null>(null);
  const [siConversationStage, setSIConversationStage] =
    useState<SIConversationStage>("topic_discovery");
  const [siPendingIntent, setSIPendingIntent] = useState<ExtractedIntent | null>(null);
  const [siPendingKeywords, setSIPendingKeywords] = useState<string[]>([]);
  const [siTurns, setSITurns] = useState<SIConversationTurn[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Describe the environmental topic you want to explore. I’ll suggest search keywords for you to review before choosing data sources.",
      stage: "topic_discovery",
    },
  ]);
  const [siSelectedProviders, setSISelectedProviders] =
    useState<string[]>([...UPSTREAM_PROVIDER_LIST]);

  const syncLegacyDataset = useCallback((prod: DataProduct) => {
    const varUpper = `${prod.variable_id} ${prod.variable_name} ${prod.category}`.toUpperCase();
    let mappedId = "temperature";
    if (varUpper.includes("GWET") || varUpper.includes("SOIL") || varUpper.includes("SWVL")) {
      mappedId = "soil-moisture";
    } else if (varUpper.includes("NDVI") || varUpper.includes("EVI") || varUpper.includes("BIOSPHERE")) {
      mappedId = "vegetation";
    } else if (varUpper.includes("SNOW") || varUpper.includes("CRYOSPHERE") || varUpper.includes("ICE")) {
      mappedId = "snow";
    } else if (varUpper.includes("PREC") || varUpper.includes("PRCP") || varUpper.includes("RAIN")) {
      mappedId = "precipitation";
    }
    setDataset({
      id: mappedId,
      name: prod.variable_name,
      code: prod.variable_id,
      category: prod.category,
      source: `${prod.source_api} · ${prod.provider_agency}`,
      unit: prod.unit,
      resolution: prod.spatial_resolution,
      coverage: `${prod.temporal_start.slice(0, 4)}–${prod.temporal_end.slice(0, 4)}`,
      description: prod.description,
    });
  }, []);

  const setActiveProduct = useCallback(
    (prod: DataProduct) => {
      setActiveProductState(prod);
      syncLegacyDataset(prod);
    },
    [syncLegacyDataset],
  );

  const selectProductForConfiguration = useCallback(
    (
      product: DataProduct,
      inferred?: {
        regionName?: string;
        spatialLevel?: "global" | "regional";
        bbox?: [number, number, number, number];
        center?: [number, number];
        startDate?: string;
        endDate?: string;
        frequency?: ExtractionRequest["target_frequency"];
      },
    ) => {
      setActiveProductState(product);
      syncLegacyDataset(product);
      setSelectedProducts((prev) =>
        prev.some((p) => p.product_id === product.product_id) ? prev : [product, ...prev.slice(0, 4)],
      );

      const nextRegion = inferred?.regionName || extractionConfig.region_name;
      const nextBbox = inferred?.bbox || extractionConfig.bbox;
      const nextStart =
        inferred?.startDate && inferred.startDate >= product.temporal_start
          ? inferred.startDate
          : product.temporal_start > "2015-01-01"
            ? product.temporal_start
            : "2015-01-01";
      const nextEnd = inferred?.endDate || "2024-12-31";
      const defaultLayer = product.available_layers[0];
      const agg =
        defaultLayer?.recommended_aggregation ||
        (product.variable_id.includes("PREC") || product.variable_id.includes("Rain")
          ? "sum"
          : "mean");

      setLocation(nextRegion);
      setRegion(nextRegion);
      setBbox(
        `${nextBbox[1].toFixed(2)}, ${nextBbox[0].toFixed(2)}, ${nextBbox[3].toFixed(2)}, ${nextBbox[2].toFixed(2)}`,
      );
      setStartYear(Number(nextStart.slice(0, 4)) || 2015);
      setEndYear(Number(nextEnd.slice(0, 4)) || 2024);

      setExtractionConfig((prev) => ({
        ...prev,
        product_id: product.product_id,
        variable_id: product.variable_id,
        variable_name: product.variable_name,
        source_api: product.source_api,
        unit: product.unit,
        start_date: nextStart,
        end_date: nextEnd,
        target_frequency:
          inferred?.frequency && product.supported_frequencies.includes(inferred.frequency)
            ? inferred.frequency
            : (product.supported_frequencies.includes("Monthly")
                ? "Monthly"
                : (product.native_frequency as ExtractionRequest["target_frequency"])) || "Monthly",
        temporal_aggregation: agg,
        spatial_level: inferred?.spatialLevel || prev.spatial_level,
        spatial_Submode:
          product.source_api === "NASA POWER" ||
          product.source_api === "NASA GES DISC" ||
          product.source_api === "OPeNDAP" ||
          product.source_api === "Copernicus CDS" ||
          product.source_api === "EODAG"
            ? "point"
            : prev.spatial_Submode,
        region_name: nextRegion,
        bbox: nextBbox,
        point_lat: inferred?.center?.[0] ?? Number(((nextBbox[1] + nextBbox[3]) / 2).toFixed(4)),
        point_lon: inferred?.center?.[1] ?? Number(((nextBbox[0] + nextBbox[2]) / 2).toFixed(4)),
      }));
    },
    [extractionConfig.bbox, extractionConfig.region_name, syncLegacyDataset],
  );

  // NOTE: Per strict API gating policy, zero catalog or extraction API requests are sent on page mount.
  // Catalog searches are only triggered after the user confirms the AI's proposed keywords.

  const value = useMemo<DashboardContextValue>(
    () => ({
      location,
      region,
      bbox,
      startYear,
      endYear,
      dataset,
      selectedCase,
      signalMode,
      autoRunCase,
      discoveryResult,
      selectedProducts,
      activeProduct,
      extractionConfig,
      extractedPreview,
      siConversationStage,
      siPendingIntent,
      siPendingKeywords,
      siTurns,
      siSelectedProviders,
      setLocation,
      setRegion,
      setBbox,
      setStartYear,
      setEndYear,
      setDataset,
      setSignalMode,
      setAutoRunCase,
      setDiscoveryResult,
      setSelectedProducts,
      setActiveProduct,
      setExtractionConfig,
      setExtractedPreview,
      setSIConversationStage,
      setSIPendingIntent,
      setSIPendingKeywords,
      setSITurns,
      setSISelectedProviders,
      selectProductForConfiguration,
      loadCase: (nextCase, shouldAutoRun = false) => {
        setSelectedCase(nextCase);
        setLocation(nextCase.location);
        setRegion(nextCase.region);
        setBbox(nextCase.bbox);
        setStartYear(nextCase.startYear);
        setEndYear(nextCase.endYear);
        setDataset(datasets.find((item) => item.id === nextCase.datasetId) ?? datasets[0]);
        setAutoRunCase(shouldAutoRun);
      },
    }),
    [
      activeProduct,
      autoRunCase,
      bbox,
      dataset,
      discoveryResult,
      endYear,
      extractedPreview,
      extractionConfig,
      location,
      region,
      selectProductForConfiguration,
      selectedCase,
      selectedProducts,
      setActiveProduct,
      signalMode,
      siConversationStage,
      siPendingIntent,
      siPendingKeywords,
      siSelectedProviders,
      siTurns,
      startYear,
    ],
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used inside DashboardProvider");
  }
  return context;
}
