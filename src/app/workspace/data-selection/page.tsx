"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useDashboard } from "@/context/DashboardContext";
import {
  UPSTREAM_PROVIDER_LIST,
  type DataProduct,
  type ExtractionRequest,
  type PreviewResponse,
  type TemporalFrequency,
} from "@/lib/dataRetrievalEngine";
import {
  createDevelopmentDemoPreview,
  DEVELOPMENT_DEMO_BBOX,
  DEVELOPMENT_DEMO_DISCOVERY,
  DEVELOPMENT_DEMO_PRODUCTS,
  isDevelopmentDemoProduct,
} from "@/lib/developmentDemoData";
import { MAX_SELECTION_SPAN_DEGREES } from "@/lib/spatialLimits";

const IrisMap = dynamic(
  () => import("@/components/map/IrisMap").then((module) => module.IrisMap),
  { ssr: false },
);

const EXTRACTABLE_SOURCES = new Set([
  "NASA POWER",
  "NASA GES DISC",
  "NOAA CDO",
  "NOAA OneStop",
  "OPeNDAP",
  "EODAG",
  "Copernicus CDS",
]);

const SOURCE_ORIGINS: Record<string, string> = {
  "NASA POWER": "NASA Langley Research Center",
  "NASA CMR": "NASA Earthdata catalog",
  "NASA AppEEARS": "NASA LP DAAC",
  "NASA GES DISC": "NASA Goddard Earth Sciences",
  "NASA Harmony": "NASA Earthdata Cloud",
  "NOAA CDO": "NOAA National Centers for Environmental Information",
  "NOAA OneStop": "NOAA National Centers for Environmental Information",
  OPeNDAP: "Earthdata Cloud data services",
  EODAG: "Federated Earth observation data access",
  "Copernicus CDS": "Copernicus Climate Change Service",
};

const CATALOG_WEBSITES: Record<string, string> = {
  "NASA POWER": "https://power.larc.nasa.gov",
  "NASA CMR": "https://cmr.earthdata.nasa.gov/search",
  "NASA AppEEARS": "https://appeears.earthdatacloud.nasa.gov",
  "NASA GES DISC": "https://disc.gsfc.nasa.gov",
  "NASA Harmony": "https://harmony.earthdata.nasa.gov",
  "NOAA CDO": "https://www.ncdc.noaa.gov/cdo-web",
  "NOAA OneStop": "https://data.noaa.gov/onestop",
  "OPeNDAP": "https://opendap.earthdata.nasa.gov",
  "EODAG": "https://eodag.readthedocs.io",
  "Copernicus CDS": "https://cds.climate.copernicus.eu",
};

function canRetrieve(product: DataProduct) {
  if (isDevelopmentDemoProduct(product.product_id)) return true;
  if (product.capability_state) return product.capability_state === "extract_verified";
  return EXTRACTABLE_SOURCES.has(product.source_api);
}

function unavailableReason(product: DataProduct) {
  if (product.capability_state === "credential_required") {
    return "This source requires credentials configured on the server before retrieval.";
  }
  if (product.capability_state === "catalog_verified") {
    return "Catalog metadata is available, but this product has no direct time-series retrieval endpoint here.";
  }
  if (product.capability_state === "unsupported" || product.capability_state === "planned") {
    return "This product is not currently supported by the time-series retrieval service.";
  }
  if (product.capability_state === "deprecated") {
    return "This catalog entry has been retired and is no longer available for retrieval.";
  }
  return `The ${product.source_api} source currently provides catalog records only in this workspace.`;
}

function citationHref(product: DataProduct) {
  const citation = product.citation_doi.trim();
  if (!citation) return product.source_url;
  return citation.startsWith("http")
    ? citation
    : `https://doi.org/${citation.replace(/^doi:\s*/i, "")}`;
}

function explainExtractionError(detail: string, product: DataProduct) {
  const lower = detail.toLowerCase();
  if (
    lower.includes("no data") ||
    lower.includes("no observations") ||
    lower.includes("0 valid non-null observations") ||
    lower.includes("returned 0 observations") ||
    lower.includes("0 weather stations")
  ) {
    return `No ${product.variable_name} observations were found for this map area and date range. Try a wider area, a different date range, or another dataset. Details: ${detail}`;
  }
  if (
    lower.includes("requires") &&
    (lower.includes("token") || lower.includes("credentials") || lower.includes("auth"))
  ) {
    return `This data source needs credentials that are not configured for retrieval. Choose another dataset or ask an administrator to configure access. Details: ${detail}`;
  }
  if (
    lower.includes("does not expose a direct") ||
    lower.includes("unsupported or unconfigured provider")
  ) {
    return `This catalog entry cannot be retrieved as a time series by the current service. Choose a dataset marked “Retrieval available”. Details: ${detail}`;
  }
  return detail;
}

function DataSelectionWorkspaceInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    discoveryResult,
    activeProduct,
    selectedProducts,
    setSelectedProducts,
    setDiscoveryResult,
    extractionConfig,
    setExtractionConfig,
    setExtractedPreview,
    selectProductForConfiguration,
    setLocation,
    setRegion,
    setBbox,
    setStartYear,
    setEndYear,
  } = useDashboard();

  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");
  const [selectionNotice, setSelectionNotice] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"match" | "source" | "name">("match");

  const products = discoveryResult.products;
  const retrievableProducts = products.filter(canRetrieve);

  const availableSources = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.source_api)));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const list = products.filter((p) => {
      if (sourceFilter !== "all" && p.source_api !== sourceFilter) return false;
      return true;
    });

    return [...list].sort((a, b) => {
      const aAvailable = canRetrieve(a);
      const bAvailable = canRetrieve(b);
      // Retrievable/available datasets always on top, unavailable at the bottom
      if (aAvailable !== bAvailable) {
        return aAvailable ? -1 : 1;
      }
      if (sortBy === "source") {
        return a.source_api.localeCompare(b.source_api);
      }
      if (sortBy === "name") {
        return a.variable_name.localeCompare(b.variable_name);
      }
      return (b.relevance_score || 0) - (a.relevance_score || 0);
    });
  }, [products, sourceFilter, sortBy]);

  const loadDevelopmentDemoData = () => {
    const [primaryProduct] = DEVELOPMENT_DEMO_PRODUCTS;
    setDiscoveryResult(DEVELOPMENT_DEMO_DISCOVERY);
    setSelectedProducts(DEVELOPMENT_DEMO_PRODUCTS);
    setExtractedPreview(null);
    setError("");
    setSelectionNotice("");
    selectProductForConfiguration(primaryProduct, {
      regionName: DEVELOPMENT_DEMO_DISCOVERY.intent.inferred_region_name,
      spatialLevel: "regional",
      bbox: DEVELOPMENT_DEMO_BBOX,
      center: DEVELOPMENT_DEMO_DISCOVERY.intent.inferred_Center,
      startDate: DEVELOPMENT_DEMO_DISCOVERY.intent.inferred_start_date,
      endDate: DEVELOPMENT_DEMO_DISCOVERY.intent.inferred_end_date,
      frequency: "Monthly",
    });
    setExtractionConfig((previous) => ({
      ...previous,
      spatial_level: "regional",
      spatial_Submode: "bbox",
    }));
  };

  useEffect(() => {
    if (products.length === 0) return;
    const requestedId = searchParams.get("product_id");
    const requestedProduct = requestedId
      ? products.find((item) => item.product_id === requestedId)
      : undefined;
    const activeIsInResults =
      activeProduct && products.some((item) => item.product_id === activeProduct.product_id);
    const target =
      requestedProduct ??
      (activeIsInResults && activeProduct && canRetrieve(activeProduct)
        ? activeProduct
        : (retrievableProducts[0] ?? activeProduct ?? products[0]));

    if (!target || target.product_id === activeProduct?.product_id) return;
    selectProductForConfiguration(target, {
      regionName: discoveryResult.intent.inferred_region_name,
      spatialLevel: "regional",
      bbox: discoveryResult.intent.inferred_bbox,
      center: discoveryResult.intent.inferred_Center,
      startDate: discoveryResult.intent.inferred_start_date,
      endDate: discoveryResult.intent.inferred_end_date,
      frequency: discoveryResult.intent.inferred_frequency,
    });
    setExtractionConfig((previous) => ({
      ...previous,
      spatial_level: "regional",
      spatial_Submode: "bbox",
    }));
  }, [
    activeProduct,
    discoveryResult.intent,
    products,
    retrievableProducts,
    searchParams,
    selectProductForConfiguration,
    setExtractionConfig,
  ]);

  const handleSelectPrimary = (product: DataProduct) => {
    if (!canRetrieve(product)) {
      setSelectionNotice(unavailableReason(product));
      return;
    }
    if (
      !selectedProducts.some((item) => item.product_id === product.product_id) &&
      selectedProducts.length >= 5
    ) {
      setSelectionNotice("You can queue up to 5 datasets. Remove one before adding another.");
      return;
    }
    setSelectionNotice("");
    selectProductForConfiguration(product);
    setExtractionConfig((previous) => ({
      ...previous,
      spatial_level: "regional",
      spatial_Submode: "bbox",
    }));
  };

  const toggleQueuedProduct = (product: DataProduct) => {
    if (!canRetrieve(product)) {
      setSelectionNotice(unavailableReason(product));
      return;
    }
    const isQueued = selectedProducts.some((item) => item.product_id === product.product_id);
    if (isQueued) {
      if (product.product_id === activeProduct?.product_id) {
        setSelectionNotice("The primary dataset is always included in the retrieval.");
        return;
      }
      setSelectedProducts((previous) =>
        previous.filter((item) => item.product_id !== product.product_id),
      );
      setSelectionNotice("");
      return;
    }
    if (selectedProducts.length >= 5) {
      setSelectionNotice("You can queue up to 5 datasets. Remove one before adding another.");
      return;
    }
    setSelectedProducts((previous) => [...previous, product]);
    setSelectionNotice("");
  };

  const updateBboxCoordinate = (index: number, value: number) => {
    setExtractionConfig((previous) => {
      const bbox: [number, number, number, number] = [...previous.bbox];
      bbox[index] = value;
      const [minLon, minLat, maxLon, maxLat] = bbox;
      const centerLat = Number(((minLat + maxLat) / 2).toFixed(2));
      const centerLon = Number(((minLon + maxLon) / 2).toFixed(2));
      return {
        ...previous,
        spatial_level: "regional",
        spatial_Submode: "bbox",
        bbox,
        point_lat: centerLat,
        point_lon: centerLon,
        region_name: `Selected area (${centerLat}°, ${centerLon}°)`,
      };
    });
  };

  const handleRegionSelect = useCallback(
    (bbox: [number, number, number, number], customRegionName?: string) => {
      const [minLon, minLat, maxLon, maxLat] = bbox;
      const centerLat = Number(((minLat + maxLat) / 2).toFixed(2));
      const centerLon = Number(((minLon + maxLon) / 2).toFixed(2));
      setExtractionConfig((previous) => ({
        ...previous,
        spatial_level: "regional",
        spatial_Submode: "bbox",
        bbox,
        point_lat: centerLat,
        point_lon: centerLon,
        region_name: customRegionName || `Selected area (${centerLat}°, ${centerLon}°)`,
      }));
      setError("");
    },
    [setExtractionConfig],
  );

  const applyDatePreset = (yearsBack: number | "full") => {
    const product = activeProduct ?? retrievableProducts[0];
    if (!product) return;
    const latestAvailable =
      product.temporal_end === "Present"
        ? new Date().toISOString().slice(0, 10)
        : product.temporal_end;
    const endYear = Number(latestAvailable.slice(0, 4)) || new Date().getFullYear();
    const startDate =
      yearsBack === "full"
        ? product.temporal_start
        : [
            `${Math.max(Number(product.temporal_start.slice(0, 4)) || 1981, endYear - yearsBack)}-01-01`,
            product.temporal_start,
          ].sort().at(-1)!;
    setExtractionConfig((previous) => ({
      ...previous,
      start_date: startDate,
      end_date: latestAvailable,
    }));
    setStartYear(Number(startDate.slice(0, 4)) || 1981);
    setEndYear(endYear);
  };

  const handleRetrieveTimeSeries = async () => {
    const product = activeProduct ?? retrievableProducts[0];
    if (!product) {
      setError("Select a dataset marked “Retrieval available” to continue.");
      return;
    }
    if (!canRetrieve(product)) {
      setError(unavailableReason(product));
      return;
    }
    if (extractionConfig.end_date <= extractionConfig.start_date) {
      setError("Choose an end date that is after the start date.");
      return;
    }

    const isGlobal = extractionConfig.spatial_level === "global";
    const [minLon, minLat, maxLon, maxLat] = extractionConfig.bbox;
    if (
      !isGlobal && (
        !extractionConfig.bbox.every(Number.isFinite) ||
        minLon < -180 ||
        maxLon > 180 ||
        minLat < -90 ||
        maxLat > 90 ||
        minLon >= maxLon ||
        minLat >= maxLat
      )
    ) {
      setError("The map area is invalid. Check that the west/south coordinates are below the east/north coordinates.");
      return;
    }
    if (
      !isGlobal && (
        maxLon - minLon > MAX_SELECTION_SPAN_DEGREES ||
        maxLat - minLat > MAX_SELECTION_SPAN_DEGREES
      )
    ) {
      setError(`The selected area cannot exceed ${MAX_SELECTION_SPAN_DEGREES}° in either dimension.`);
      return;
    }

    setError("");
    setExtracting(true);
    try {
      const payload: ExtractionRequest = {
        ...extractionConfig,
        product_id: product.product_id,
        source_api: product.source_api,
        variable_id: extractionConfig.variable_id || product.variable_id,
        unit: product.unit,
        spatial_level: isGlobal ? "global" : "regional",
        spatial_Submode: isGlobal ? "preset" : "bbox",
        region_name: isGlobal ? "Global Average" : extractionConfig.region_name,
        bbox: isGlobal ? [-180, -90, 180, 90] : extractionConfig.bbox,
        point_lat: isGlobal ? 0 : Number(((minLat + maxLat) / 2).toFixed(2)),
        point_lon: isGlobal ? 0 : Number(((minLon + maxLon) / 2).toFixed(2)),
        spatial_reduction: "mean",
        additional_products: selectedProducts
          .filter((item) => item.product_id !== product.product_id)
          .slice(0, 4)
          .map((item) => ({ product_id: item.product_id, variable_id: item.variable_id })),
      };

      if (isDevelopmentDemoProduct(product.product_id)) {
        const data = createDevelopmentDemoPreview(payload, product);
        setExtractedPreview(data);
        setLocation(payload.region_name);
        setRegion(payload.region_name);
        setBbox(
          isGlobal
            ? "-90.00, -180.00, 90.00, 180.00"
            : `${minLat.toFixed(2)}, ${minLon.toFixed(2)}, ${maxLat.toFixed(2)}, ${maxLon.toFixed(2)}`,
        );
        setStartYear(Number(payload.start_date.slice(0, 4)) || 2015);
        setEndYear(Number(payload.end_date.slice(0, 4)) || 2024);
        router.push(`/workspace/data-preview?jobId=${encodeURIComponent(data.job_id)}`);
        return;
      }

      const response = await fetch("/api/v1/timeseries/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as PreviewResponse & {
        error?: string;
        detail?: string;
      };
      if (!response.ok) {
        const detail = data.detail || data.error || "The data provider could not complete this request.";
        setError(explainExtractionError(detail, product));
        return;
      }

      setExtractedPreview(data);
      setLocation(payload.region_name);
      setRegion(payload.region_name);
      setBbox(
        isGlobal
          ? "-90.00, -180.00, 90.00, 180.00"
          : `${minLat.toFixed(2)}, ${minLon.toFixed(2)}, ${maxLat.toFixed(2)}, ${maxLon.toFixed(2)}`,
      );
      setStartYear(Number(payload.start_date.slice(0, 4)) || 2015);
      setEndYear(Number(payload.end_date.slice(0, 4)) || 2024);
      router.push(`/workspace/data-preview?jobId=${encodeURIComponent(data.job_id)}`);
    } catch (requestError) {
      setError(
        `Could not retrieve ${product.variable_name} from ${product.source_api}. Check the connection and try again. ${requestError instanceof Error ? requestError.message : String(requestError)}`,
      );
    } finally {
      setExtracting(false);
    }
  };

  if (products.length === 0) {
    return (
      <div className="data-selection-workspace ds-empty-workspace">
        <section className="ds-setup-column">
          <div className="dashboard-card ds-empty-state">
            <h2>No datasets selected yet</h2>
            <p>
              Start in Iris Intelligence to specify your research scope and discover candidate datasets.
            </p>
            <div className="ds-empty-actions">
              <button
                className="dp-proceed-btn"
                onClick={() => router.push("/workspace/intelligence")}
                type="button"
              >
                Open Iris Intelligence <Icon name="arrow" size={14} />
              </button>
              {process.env.NODE_ENV === "development" && (
                <button
                  className="ds-link-btn"
                  onClick={loadDevelopmentDemoData}
                  type="button"
                >
                  Load local demo data
                </button>
              )}
            </div>
          </div>
        </section>
        <section className="dashboard-card ds-products-column">
          <div className="ds-column-header">
            <h2>Connected catalogs</h2>
            <p>Click any catalog to visit its official portal and explore raw archive collections.</p>
          </div>
          <div className="ds-source-tile-grid">
            {UPSTREAM_PROVIDER_LIST.map((source) => (
              <a
                className="ds-source-tile"
                href={CATALOG_WEBSITES[source] || "https://earthdata.nasa.gov"}
                key={source}
                rel="noreferrer"
                target="_blank"
                title={`Visit ${source} catalog website`}
              >
                <Icon name="globe" size={15} />
                <div>
                  <strong>
                    {source} <Icon name="external" size={11} />
                  </strong>
                  <span>{SOURCE_ORIGINS[source] ?? "Earth observation data provider"}</span>
                </div>
              </a>
            ))}
          </div>
        </section>
      </div>
    );
  }

  const product = activeProduct ?? products[0];
  const isDemoProduct = isDevelopmentDemoProduct(product.product_id);
  const productEndDate =
    product.temporal_end === "Present"
      ? new Date().toISOString().slice(0, 10)
      : product.temporal_end;
  const selectedProductCount = selectedProducts.length
    ? selectedProducts.length
    : product
      ? 1
      : 0;
  const bboxValues = extractionConfig.bbox;
  const isGlobalActive = extractionConfig.spatial_level === "global";

  return (
    <div className="data-selection-workspace">
      <section className="ds-setup-column">
        <div className="dashboard-card ds-config-card">
          {selectedProducts.length > 1 && (
            <div className="ds-dataset-switcher">
              <span className="ds-dataset-switcher-label">Configuring dataset:</span>
              <div className="ds-dataset-switcher-tabs" role="tablist">
                {selectedProducts.map((p) => {
                  const isCurrent = p.product_id === product.product_id;
                  const isPrimary = p.product_id === (activeProduct?.product_id ?? products[0]?.product_id);
                  return (
                    <button
                      aria-selected={isCurrent}
                      className={`ds-dataset-tab${isCurrent ? " is-active" : ""}${isPrimary ? " is-primary" : ""}`}
                      key={p.product_id}
                      onClick={() => selectProductForConfiguration(p)}
                      role="tab"
                      type="button"
                    >
                      {isPrimary && <span className="ds-tab-star">★</span>}
                      <span className="ds-tab-title">{p.variable_name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <header className="ds-column-header">
            <h2>{product.variable_name}</h2>
            <p>
              {product.source_api} · {product.provider_agency}
            </p>
          </header>

          {isDemoProduct && (
            <div className="ds-demo-notice" role="status">
              Local development fixture — illustrative values only; retrieval makes no provider API calls.
            </div>
          )}

          {!canRetrieve(product) && (
            <div className="ds-capability-notice" role="status">
              <Icon name="info" size={14} />
              <span>{unavailableReason(product)}</span>
            </div>
          )}

          <div className="ds-control-group">
            <div className="ds-control-heading">
              <div className="ds-info-wrap">
                <label className="ds-control-label" htmlFor="ds-layer">
                  Variable
                </label>
                <span className="ds-info-trigger" tabIndex={0} aria-label="Variable information">
                  <Icon name="info" size={11} />
                  <span className="ds-info-tooltip" role="tooltip">
                    The physical measurement parameter, sensor layer, and scientific units to extract from the catalog archive.
                  </span>
                </span>
              </div>
            </div>
            <select
              id="ds-layer"
              onChange={(event) => {
                const layer = product.available_layers.find(
                  (item) => item.variable_id === event.target.value,
                );
                if (!layer) return;
                setExtractionConfig((previous) => ({
                  ...previous,
                  variable_id: layer.variable_id,
                  variable_name: layer.variable_name,
                  unit: layer.unit,
                  temporal_aggregation: layer.recommended_aggregation,
                }));
              }}
              value={extractionConfig.variable_id}
            >
              {product.available_layers.map((layer) => (
                <option key={layer.variable_id} value={layer.variable_id}>
                  {layer.variable_name} ({layer.variable_id} · {layer.unit})
                </option>
              ))}
            </select>
          </div>

          <div className="ds-control-group">
            <div className="ds-control-heading">
              <span className="ds-control-label">Date range</span>
              <span className="ds-control-hint">
                {product.temporal_start} – {product.temporal_end}
              </span>
            </div>
            <div className="ds-date-presets">
              <button onClick={() => applyDatePreset(1)} type="button">1 year</button>
              <button onClick={() => applyDatePreset(5)} type="button">5 years</button>
              <button onClick={() => applyDatePreset("full")} type="button">Full record</button>
            </div>
            <div className="ds-date-fields">
              <label>
                Start
                <input
                  max={extractionConfig.end_date}
                  min={product.temporal_start}
                  onChange={(event) =>
                    setExtractionConfig((previous) => ({
                      ...previous,
                      start_date: event.target.value,
                    }))
                  }
                  type="date"
                  value={extractionConfig.start_date}
                />
              </label>
              <label>
                End
                <input
                  max={productEndDate}
                  min={extractionConfig.start_date}
                  onChange={(event) =>
                    setExtractionConfig((previous) => ({
                      ...previous,
                      end_date: event.target.value,
                    }))
                  }
                  type="date"
                  value={extractionConfig.end_date}
                />
              </label>
            </div>
          </div>

          <div className="ds-control-row">
            <div className="ds-control-group">
              <div className="ds-control-heading">
                <div className="ds-info-wrap">
                  <span className="ds-control-label">Frequency</span>
                  <span className="ds-info-trigger" tabIndex={0} aria-label="Frequency information">
                    <Icon name="info" size={11} />
                    <span className="ds-info-tooltip" role="tooltip">
                      The temporal cadence of observation points. Series are aligned to Daily, 8-Day, 16-Day, Monthly, Seasonal, or Yearly intervals.
                    </span>
                  </span>
                </div>
              </div>
              <select
                onChange={(event) =>
                  setExtractionConfig((previous) => ({
                    ...previous,
                    target_frequency: event.target.value as TemporalFrequency,
                  }))
                }
                value={extractionConfig.target_frequency}
              >
                {product.supported_frequencies.map((frequency) => (
                  <option key={frequency} value={frequency}>
                    {frequency}{frequency === product.native_frequency ? " · native" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="ds-control-group">
              <div className="ds-control-heading">
                <div className="ds-info-wrap">
                  <span className="ds-control-label">Aggregation</span>
                  <span className="ds-info-trigger" tabIndex={0} aria-label="Aggregation information">
                    <Icon name="info" size={11} />
                    <span className="ds-info-tooltip" role="tooltip">
                      Reduction method applied across observations within each time interval: Mean (average value), Sum (accumulation e.g. precipitation), Min (lowest value), or Max (peak extreme).
                    </span>
                  </span>
                </div>
              </div>
              <select
                onChange={(event) =>
                  setExtractionConfig((previous) => ({
                    ...previous,
                    temporal_aggregation: event.target.value as ExtractionRequest["temporal_aggregation"],
                  }))
                }
                value={extractionConfig.temporal_aggregation}
              >
                <option value="mean">Mean</option>
                <option value="sum">Sum</option>
                <option value="min">Minimum</option>
                <option value="max">Maximum</option>
              </select>
            </div>
          </div>

          <div className="ds-control-group">
            <div className="ds-control-heading">
              <span className="ds-control-label">Retrieval queue</span>
              <span className="ds-control-hint">{selectedProductCount} of 5 selected</span>
            </div>
            {selectionNotice && <p className="ds-selection-notice" role="status">{selectionNotice}</p>}
            <div className="ds-retrieval-summary">
              {selectedProducts.slice(0, 5).map((selected) => (
                <span key={selected.product_id}>{selected.variable_name}</span>
              ))}
              {!selectedProducts.length && <span>{product.variable_name}</span>}
            </div>
          </div>

          {error && (
            <p className="ds-error-alert" role="alert">
              <Icon name="alert" size={14} /> {error}
            </p>
          )}
          <button
            className="ds-primary-extract-btn"
            disabled={extracting || !canRetrieve(product)}
            onClick={handleRetrieveTimeSeries}
            type="button"
          >
            {extracting ? (
              <>
                <span className="button-spinner" /> Retrieving data…
              </>
            ) : (
              <>
                Retrieve selected datasets <Icon name="arrow" size={15} />
              </>
            )}
          </button>
        </div>

        <section className="dashboard-card ds-map-card">
          <header className="ds-column-header ds-map-title">
            <div className="ds-map-title-row">
              <div>
                <h2>{isGlobalActive ? "Global Average (Planetary Mean)" : extractionConfig.region_name}</h2>
                <p>
                  {isGlobalActive
                    ? "Multi-zone planetary extraction (cosine-latitude weighted)"
                    : "Draw a rectangle or adjust spatial bounding box"}
                </p>
              </div>
              <div className="ds-spatial-mode-pills">
                <button
                  className={`ds-mode-pill${!isGlobalActive ? " active" : ""}`}
                  onClick={() => {
                    setExtractionConfig((previous) => ({
                      ...previous,
                      spatial_level: "regional",
                      spatial_Submode: "bbox",
                      bbox:
                        previous.bbox[0] === -180 && previous.bbox[2] === 180
                          ? [-122.6, 35.0, -118.5, 40.8]
                          : previous.bbox,
                      region_name:
                        previous.region_name === "Global Average"
                          ? "Regional selection"
                          : previous.region_name,
                    }));
                  }}
                  type="button"
                >
                  <Icon name="box" size={12} /> Regional
                </button>
                <button
                  className={`ds-mode-pill${isGlobalActive ? " active" : ""}`}
                  onClick={() => {
                    setExtractionConfig((previous) => ({
                      ...previous,
                      spatial_level: "global",
                      spatial_Submode: "preset",
                      bbox: [-180, -90, 180, 90],
                      region_name: "Global Average",
                      point_lat: 0,
                      point_lon: 0,
                    }));
                  }}
                  type="button"
                >
                  <Icon name="globe" size={12} /> Global avg
                </button>
              </div>
            </div>
          </header>

          {isGlobalActive ? (
            <div className="ds-global-notice" role="status">
              <Icon name="globe" size={14} />
              <div>
                <strong>Global Planetary Average Active</strong>
                <span>
                  Iris will extract observations across 5 representative global latitudinal zones (-60°, -30°, 0°, 30°, 60°) and compute the true cosine-weighted planetary average time series.
                </span>
              </div>
            </div>
          ) : (
            <>
              <IrisMap
                bbox={extractionConfig.bbox}
                height="min(38vh, 330px)"
                mode="selection"
                onRegionSelect={handleRegionSelect}
                regionName={extractionConfig.region_name}
              />
              <div className="ds-bbox-fields">
                {[
                  { index: 0, label: "West lon", min: -180, max: 180 },
                  { index: 1, label: "South lat", min: -90, max: 90 },
                  { index: 2, label: "East lon", min: -180, max: 180 },
                  { index: 3, label: "North lat", min: -90, max: 90 },
                ].map((coordinate) => (
                  <label key={coordinate.label}>
                    {coordinate.label}
                    <input
                      max={coordinate.max}
                      min={coordinate.min}
                      onChange={(event) =>
                        updateBboxCoordinate(coordinate.index, Number(event.target.value))
                      }
                      step="0.01"
                      type="number"
                      value={bboxValues[coordinate.index]}
                    />
                  </label>
                ))}
              </div>
              <p className="ds-spatial-note">
                Max span {MAX_SELECTION_SPAN_DEGREES}° per side · Areas ≥ 2° average grid cells; smaller areas sample the center point.
              </p>
            </>
          )}
        </section>
      </section>

      <section className="dashboard-card ds-products-column">
        <div className="ds-column-header ds-products-header">
          <div>
            <h2>{discoveryResult.intent.subject_domain}</h2>
            <p>{products.length} matching datasets · select up to 5</p>
          </div>
          <div className="ds-product-header-actions">
            <button
              className="ds-link-btn"
              onClick={() => router.push("/workspace/intelligence")}
              type="button"
            >
              New search <Icon name="arrow" size={12} />
            </button>
          </div>
        </div>

        <div className="ds-filter-bar">
          <div className="ds-filter-group">
            <label htmlFor="ds-source-filter">Data source:</label>
            <select
              className="ds-filter-select"
              id="ds-source-filter"
              onChange={(e) => setSourceFilter(e.target.value)}
              value={sourceFilter}
            >
              <option value="all">All sources ({products.length})</option>
              {availableSources.map((source) => (
                <option key={source} value={source}>
                  {source} ({products.filter((p) => p.source_api === source).length})
                </option>
              ))}
            </select>
          </div>
          <div className="ds-filter-group">
            <label htmlFor="ds-sort-filter">Sort by:</label>
            <select
              className="ds-filter-select"
              id="ds-sort-filter"
              onChange={(e) => setSortBy(e.target.value as "match" | "source" | "name")}
              value={sortBy}
            >
              <option value="match">Match percentage (highest)</option>
              <option value="source">Data source (A–Z)</option>
              <option value="name">Dataset name (A–Z)</option>
            </select>
          </div>
        </div>

        <div className="ds-identified-keywords">
          {discoveryResult.intent.keywords.map((keyword) => (
            <code key={keyword}>{keyword}</code>
          ))}
        </div>

        <div className="ds-product-list">
          {filteredProducts.map((item) => {
            const isPrimary = item.product_id === product.product_id;
            const isQueued = selectedProducts.some((selected) => selected.product_id === item.product_id);
            const available = canRetrieve(item);
            return (
              <article
                className={`ds-product-tile${isPrimary ? " is-primary" : isQueued ? " is-queued" : ""}${!available ? " is-unavailable" : ""}`}
                key={item.product_id}
              >
                <div className="ds-product-tile-top">
                  <div className="ds-tile-badges">
                    <span className="ds-api-pill">
                      <Icon name="globe" size={12} /> {item.source_api}
                    </span>
                    {isPrimary ? (
                      <span className="ds-primary-badge">
                        <Icon name="sparkles" size={11} /> Primary dataset
                      </span>
                    ) : isQueued ? (
                      <span className="ds-queued-badge">
                        <Icon name="check" size={11} /> Queued for retrieval
                      </span>
                    ) : null}
                  </div>
                  <span className="ds-match-pill">{item.relevance_score}% match</span>
                </div>
                <h3>{item.variable_name}</h3>
                <code className="ds-product-variable">{item.variable_id}</code>
                <p className="ds-product-description">
                  {item.what_it_measures || item.description}
                </p>

                <div className="ds-product-parameters">
                  <div className="ds-param-chip">
                    <small>Frequency</small>
                    <strong>{item.native_frequency}</strong>
                  </div>
                  <div className="ds-param-chip">
                    <small>Time coverage</small>
                    <strong>
                      {item.temporal_start.slice(0, 10)} – {item.temporal_end.slice(0, 10)}
                    </strong>
                  </div>
                  <div className="ds-param-chip">
                    <small>Resolution</small>
                    <strong>{item.spatial_resolution}</strong>
                  </div>
                  <div className="ds-param-chip">
                    <small>Unit</small>
                    <strong>{item.unit}</strong>
                  </div>
                  <div className="ds-param-chip">
                    <small>Agency</small>
                    <strong>{item.provider_agency}</strong>
                  </div>
                </div>

                <div className={`ds-product-capability${available ? " is-ready" : ""}`}>
                  <Icon name={available ? "check" : "alert"} size={12} />
                  {available ? "Retrieval available" : unavailableReason(item)}
                </div>

                <div className="ds-product-tile-actions">
                  <a
                    className="ds-doi-link"
                    href={citationHref(item)}
                    onClick={(event) => event.stopPropagation()}
                    rel="noreferrer"
                    target="_blank"
                    title="Open dataset documentation, DOI, or provider portal"
                  >
                    Citation / DOI / Portal <Icon name="external" size={11} />
                  </a>

                  {available ? (
                    <>
                      <button
                        className={`ds-use-btn${isPrimary ? " active" : ""}`}
                        disabled={!available || (!isQueued && selectedProducts.length >= 5)}
                        onClick={() => handleSelectPrimary(item)}
                        type="button"
                      >
                        {isPrimary ? "Primary dataset" : "Use as primary"}
                      </button>
                      <label className="ds-queue-toggle">
                        <input
                          checked={isQueued}
                          disabled={
                            !available ||
                            (isPrimary && isQueued) ||
                            (!isQueued && selectedProducts.length >= 5)
                          }
                          onChange={() => toggleQueuedProduct(item)}
                          type="checkbox"
                        />
                        <span>{isPrimary ? "Included" : "Add to retrieval"}</span>
                      </label>
                    </>
                  ) : (
                    <a
                      className="ds-external-access-btn"
                      href={citationHref(item)}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Access on {item.source_api} portal <Icon name="external" size={11} />
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default function DataSelectionPage() {
  return (
    <Suspense fallback={<div className="dashboard-page-inner">Loading data selection…</div>}>
      <DataSelectionWorkspaceInner />
    </Suspense>
  );
}
