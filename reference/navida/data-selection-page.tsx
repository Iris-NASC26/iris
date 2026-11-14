"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
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

function canRetrieve(product: DataProduct) {
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

  const products = discoveryResult.products;
  const retrievableProducts = products.filter(canRetrieve);

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
    (bbox: [number, number, number, number]) => {
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
        region_name: `Selected area (${centerLat}°, ${centerLon}°)`,
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

    const [minLon, minLat, maxLon, maxLat] = extractionConfig.bbox;
    if (
      !extractionConfig.bbox.every(Number.isFinite) ||
      minLon < -180 ||
      maxLon > 180 ||
      minLat < -90 ||
      maxLat > 90 ||
      minLon >= maxLon ||
      minLat >= maxLat
    ) {
      setError("The map area is invalid. Check that the west/south coordinates are below the east/north coordinates.");
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
        spatial_level: "regional",
        spatial_Submode: "bbox",
        bbox: extractionConfig.bbox,
        point_lat: Number(((minLat + maxLat) / 2).toFixed(2)),
        point_lon: Number(((minLon + maxLon) / 2).toFixed(2)),
        spatial_reduction: "mean",
        additional_products: selectedProducts
          .filter((item) => item.product_id !== product.product_id)
          .slice(0, 4)
          .map((item) => ({ product_id: item.product_id, variable_id: item.variable_id })),
      };

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
        `${minLat.toFixed(2)}, ${minLon.toFixed(2)}, ${maxLat.toFixed(2)}, ${maxLon.toFixed(2)}`,
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
            <span className="dashboard-kicker">
              <Icon name="layers" size={13} /> Data selection
            </span>
            <h2>No datasets selected yet</h2>
            <p>
              To select a dataset and retrieve data, go to System Intelligence and specify a scope.
            </p>
            <button
              className="dp-proceed-btn"
              onClick={() => router.push("/workspace/intelligence")}
              type="button"
            >
              Open System Intelligence <Icon name="arrow" size={14} />
            </button>
          </div>
        </section>
        <section className="dashboard-card ds-products-column">
          <div className="ds-column-header">
            <span className="dashboard-kicker">
              <Icon name="globe" size={13} /> Data sources
            </span>
            <h2>Connected catalogs</h2>
          </div>
          <div className="ds-source-tile-grid">
            {UPSTREAM_PROVIDER_LIST.map((source) => (
              <article className="ds-source-tile" key={source}>
                <Icon name="globe" size={15} />
                <div>
                  <strong>{source}</strong>
                  <span>{SOURCE_ORIGINS[source] ?? "Earth observation data provider"}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    );
  }

  const product = activeProduct ?? products[0];
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

  return (
    <div className="data-selection-workspace">
      <section className="ds-setup-column">
        <div className="dashboard-card ds-config-card">
          <header className="ds-column-header">
            <span className="dashboard-kicker">
              <Icon name="activity" size={13} /> Configure retrieval
            </span>
            <h2>{product.variable_name}</h2>
            <p>
              {product.source_api} · {product.provider_agency}
            </p>
          </header>

          {!canRetrieve(product) && (
            <div className="ds-capability-notice" role="status">
              <Icon name="info" size={14} />
              <span>{unavailableReason(product)}</span>
            </div>
          )}

          <div className="ds-control-group">
            <label className="ds-control-label" htmlFor="ds-layer">
              Variable
            </label>
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
                Available: {product.temporal_start} – {product.temporal_end}
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
            <label className="ds-control-group">
              <span className="ds-control-label">Frequency</span>
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
            </label>
            <label className="ds-control-group">
              <span className="ds-control-label">Aggregation</span>
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
            </label>
          </div>

          <div className="ds-control-group">
            <div className="ds-control-heading">
              <span className="ds-control-label">Datasets to retrieve</span>
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
                Retrieve selected datasets <Icon name="arrow" size={16} />
              </>
            )}
          </button>
        </div>

        <section className="dashboard-card ds-map-card">
          <header className="ds-column-header ds-map-title">
            <span className="dashboard-kicker">
              <Icon name="globe" size={13} /> Area of interest
            </span>
            <h2>{extractionConfig.region_name}</h2>
            <p>Draw a rectangle or polygon to update the retrieval area.</p>
          </header>
          <IrisMap
            bbox={extractionConfig.bbox}
            height="min(42vh, 380px)"
            mode="selection"
            onRegionSelect={handleRegionSelect}
          />
          <div className="ds-bbox-fields">
            {[
              { index: 0, label: "West longitude", min: -180, max: 180 },
              { index: 1, label: "South latitude", min: -90, max: 90 },
              { index: 2, label: "East longitude", min: -180, max: 180 },
              { index: 3, label: "North latitude", min: -90, max: 90 },
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
            The map bounding box is included in the request. Station sources search within the area;
            point-based sources sample its center.
          </p>
        </section>
      </section>

      <section className="dashboard-card ds-products-column">
        <div className="ds-column-header ds-products-header">
          <div>
            <span className="dashboard-kicker">
              <Icon name="layers" size={13} /> Retrieved products
            </span>
            <h2>{discoveryResult.intent.subject_domain}</h2>
            <p>{products.length} matching datasets · select up to 5</p>
          </div>
          <button
            className="ds-link-btn"
            onClick={() => router.push("/workspace/intelligence")}
            type="button"
          >
            New search <Icon name="arrow" size={12} />
          </button>
        </div>
        <div className="ds-identified-keywords">
          {discoveryResult.intent.keywords.map((keyword) => (
            <code key={keyword}>{keyword}</code>
          ))}
        </div>

        <div className="ds-product-list">
          {products.map((item) => {
            const primary = item.product_id === product.product_id;
            const queued = selectedProducts.some((selected) => selected.product_id === item.product_id);
            const available = canRetrieve(item);
            return (
              <article
                className={`ds-product-tile${primary ? " is-primary" : ""}${!available ? " is-unavailable" : ""}`}
                key={item.product_id}
              >
                <div className="ds-product-tile-top">
                  <span className="ds-api-pill">
                    <Icon name="globe" size={12} /> {item.source_api}
                  </span>
                  <span className="ds-match-pill">{item.relevance_score}% match</span>
                </div>
                <h3>{item.variable_name}</h3>
                <code className="ds-product-variable">{item.variable_id}</code>
                <p className="ds-product-description">
                  {item.what_it_measures || item.description}
                </p>
                <div className="ds-product-provenance">
                  <span>
                    <Icon name="info" size={12} />
                    {item.provider_agency} · {item.mission_or_instrument}
                  </span>
                  <span>
                    <Icon name="activity" size={12} />
                    {item.native_frequency} · {item.temporal_start.slice(0, 4)}–{item.temporal_end.slice(0, 4)}
                  </span>
                </div>
                <div className="ds-product-meta">
                  <span>{item.spatial_resolution}</span>
                  <span>{item.unit}</span>
                  <span>{item.category}</span>
                </div>
                <div className={`ds-product-capability${available ? " is-ready" : ""}`}>
                  <Icon name={available ? "check" : "alert"} size={12} />
                  {available ? "Retrieval available" : unavailableReason(item)}
                </div>
                <div className="ds-product-tile-actions">
                  <a
                    href={citationHref(item)}
                    onClick={(event) => event.stopPropagation()}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Citation / DOI <Icon name="external" size={11} />
                  </a>
                  <button
                    className={`ds-use-btn${primary ? " active" : ""}`}
                    disabled={!available || (!queued && selectedProducts.length >= 5)}
                    onClick={() => handleSelectPrimary(item)}
                    type="button"
                  >
                    {primary ? "Primary dataset" : "Use as primary"}
                  </button>
                  <label className="ds-queue-toggle">
                    <input
                      checked={queued}
                      disabled={
                        !available ||
                        (primary && queued) ||
                        (!queued && selectedProducts.length >= 5)
                      }
                      onChange={() => toggleQueuedProduct(item)}
                      type="checkbox"
                    />
                    <span>{primary ? "Included" : "Add to retrieval"}</span>
                  </label>
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
