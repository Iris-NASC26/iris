"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { useDashboard } from "@/context/DashboardContext";
import type {
  ResearchDatasetContext,
  ResearchSearchResponse,
  ResearchSortOrder,
  ResearchSourceProvider,
  ResearchWorkItem,
} from "@/lib/dataRetrievalEngine";

type SearchState = "empty" | "loading" | "complete" | "error";
type ProviderFilter = "ALL" | "OpenAlex" | "DataCite";

const SOURCE_OPTIONS: Array<{
  id: ResearchSourceProvider;
  label: string;
  detail: string;
}> = [
  {
    id: "openalex",
    label: "OpenAlex Scholarly Index",
    detail: "Peer-reviewed articles, preprints, reconstructed abstracts & open-access PDFs",
  },
  {
    id: "datacite",
    label: "DataCite DOI Registry",
    detail: "Registered scientific datasets, Earth observation collections, software & DOIs",
  },
];

export default function ResearchPage() {
  const { extractedPreview } = useDashboard();

  const [query, setQuery] = useState("");
  const [selectedSources, setSelectedSources] = useState<ResearchSourceProvider[]>([
    "openalex",
    "datacite",
  ]);
  const [sortOrder, setSortOrder] = useState<ResearchSortOrder>("relevance");
  const [perSourceLimit, setPerSourceLimit] = useState<number>(15);
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>("ALL");

  const [searchState, setSearchState] = useState<SearchState>("empty");
  const [searchResponse, setSearchResponse] = useState<ResearchSearchResponse | null>(null);
  const [searchError, setSearchError] = useState("");
  const [activeMode, setActiveMode] = useState<"manual" | "dataset">("manual");
  const [toast, setToast] = useState("");

  const requestController = useRef<AbortController | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      requestController.current?.abort();
      window.clearTimeout(toastTimer.current);
    },
    [],
  );

  const notify = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2400);
  }, []);

  // Selected dataset details are populated strictly once the dataset is retrieved
  const hasRetrievedDataset = Boolean(extractedPreview);

  const retrievedDatasetContext = useMemo<ResearchDatasetContext | null>(() => {
    if (!extractedPreview) return null;
    const { product, extraction_config: cfg } = extractedPreview;
    return {
      product_id: product.product_id,
      variable_id: cfg.variable_id || product.variable_id,
      variable_name: product.variable_name || cfg.variable_name || product.title,
      title: product.title,
      category: product.category,
      source_api: product.source_api,
      provider_agency: product.provider_agency,
      mission_or_instrument: product.mission_or_instrument,
      citation_doi: product.citation_doi,
      gcmd_keywords: product.gcmd_keywords,
      region_name: cfg.region_name,
      start_date: cfg.start_date,
      end_date: cfg.end_date,
    };
  }, [extractedPreview]);

  const toggleSource = (sourceId: ResearchSourceProvider) => {
    setSelectedSources((current) => {
      if (current.includes(sourceId)) {
        if (current.length === 1) return current;
        return current.filter((item) => item !== sourceId);
      }
      return [...current, sourceId];
    });
  };

  const executeSearch = useCallback(
    async (mode: "manual" | "dataset") => {
      const trimmedQuery = query.trim();
      if (mode === "manual" && !trimmedQuery) {
        setSearchError("Enter a DOI, keyword, variable name, author, or research topic to search.");
        setSearchState("error");
        return;
      }
      if (mode === "dataset" && !retrievedDatasetContext) {
        return;
      }

      requestController.current?.abort();
      const controller = new AbortController();
      requestController.current = controller;

      setActiveMode(mode);
      setSearchError("");
      setSearchState("loading");
      setProviderFilter("ALL");

      try {
        const response = await fetch("/api/v1/research/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            mode,
            query: trimmedQuery || undefined,
            dataset_context: retrievedDatasetContext,
            sources: selectedSources,
            sort: sortOrder,
            per_source_limit: perSourceLimit,
          }),
        });

        const body = await response.json();
        if (!response.ok) {
          throw new Error(
            body?.error || body?.detail || `Research search failed (HTTP ${response.status}).`,
          );
        }

        setSearchResponse(body as ResearchSearchResponse);
        setSearchState("complete");
      } catch (err) {
        if (controller.signal.aborted) return;
        setSearchError(err instanceof Error ? err.message : String(err));
        setSearchState("error");
      }
    },
    [perSourceLimit, query, retrievedDatasetContext, selectedSources, sortOrder],
  );

  const handleManualSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void executeSearch("manual");
  };

  const copyCitation = async (item: ResearchWorkItem) => {
    const yearStr = item.year ? `(${item.year})` : "(n.d.)";
    const linkStr = item.doi_url || item.primary_url;
    const citationText = `${item.authors} ${yearStr}. ${item.title}. ${item.publication}. ${linkStr}`;
    try {
      await navigator.clipboard.writeText(citationText);
      notify("Citation copied to clipboard");
    } catch {
      notify("Clipboard access was unavailable");
    }
  };

  const filteredResults = useMemo(() => {
    if (!searchResponse) return [];
    if (providerFilter === "ALL") return searchResponse.results;
    return searchResponse.results.filter((item) => item.source_provider === providerFilter);
  }, [providerFilter, searchResponse]);

  return (
    <div className="visualize-page research-workspace-page">
      <main className="workspace">
        {/* LEFT CONTROL PANEL — Same Design Language as Plot & Visualize */}
        <aside className="control-panel">
          <div className="panel-scroll">
            <section className="wizard-section">
              <div className="section-kicker">Existing Research</div>
              <h1>Literature &amp; Dataset Index</h1>
              <p className="section-copy">
                Query live scholarly publications and registered scientific datasets via OpenAlex and
                DataCite. Search manually by DOI or keyword, or match directly to your retrieved
                dataset.
              </p>

              <section className="analysis-options" aria-labelledby="research-options-title">
                <div className="field-label" id="research-options-title">
                  Search configuration
                </div>

                <label className="analysis-select-label" htmlFor="research-sort-order">
                  Sort results by
                </label>
                <select
                  id="research-sort-order"
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value as ResearchSortOrder)}
                >
                  <option value="relevance">Relevance &amp; exact DOI priority</option>
                  <option value="citations">Citation count (highest first)</option>
                  <option value="year">Publication year (newest first)</option>
                </select>

                <label className="analysis-select-label" htmlFor="research-limit">
                  Results per API source
                </label>
                <select
                  id="research-limit"
                  value={perSourceLimit}
                  onChange={(event) => setPerSourceLimit(Number(event.target.value))}
                >
                  <option value={10}>Up to 10 per source (20 combined)</option>
                  <option value={15}>Up to 15 per source (30 combined)</option>
                  <option value={25}>Up to 25 per source (50 combined)</option>
                </select>

                <p className="analysis-option-note">
                  All records are fetched live from upstream scholarly registries. Zero synthetic or
                  pre-populated citations are shown.
                </p>

                <div className="field-label analysis-method-heading">Upstream APIs</div>
                <div className="analysis-method-list">
                  {SOURCE_OPTIONS.map((source) => (
                    <label className="analysis-method-option" key={source.id}>
                      <input
                        checked={selectedSources.includes(source.id)}
                        onChange={() => toggleSource(source.id)}
                        type="checkbox"
                      />
                      <span>
                        <strong>{source.label}</strong>
                        <small>{source.detail}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </section>
            </section>

            {/* RETRIEVED DATASET CARD */}
            <section className="variable-card">
              <div className="variable-top">
                <div className="variable-icon">
                  <Icon name={hasRetrievedDataset ? "layers" : "info"} size={18} />
                </div>
                <div>
                  <div className="eyebrow">
                    {hasRetrievedDataset ? "Retrieved dataset active" : "Dataset status"}
                  </div>
                  <h2>
                    {retrievedDatasetContext
                      ? retrievedDatasetContext.variable_name
                      : "No dataset retrieved yet"}
                  </h2>
                </div>
              </div>
              {retrievedDatasetContext ? (
                <>
                  <p>
                    {retrievedDatasetContext.title || retrievedDatasetContext.variable_name} ·{" "}
                    {retrievedDatasetContext.region_name}
                  </p>
                  <div className="metadata">
                    <span>
                      <small>Variable</small>
                      <strong>{retrievedDatasetContext.variable_id}</strong>
                    </span>
                    <span>
                      <small>Source</small>
                      <strong>{retrievedDatasetContext.source_api}</strong>
                    </span>
                    <span>
                      <small>Window</small>
                      <strong>
                        {retrievedDatasetContext.start_date?.slice(0, 4)}–
                        {retrievedDatasetContext.end_date?.slice(0, 4)}
                      </strong>
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <p>
                    Select and retrieve a dataset in Data Selection or Data Preview to unlock
                    automated dataset-matched literature discovery.
                  </p>
                  <div className="metadata">
                    <span>
                      <small>Status</small>
                      <strong>Awaiting retrieval</strong>
                    </span>
                    <span>
                      <small>Action</small>
                      <Link href="/workspace/data-selection">
                        <strong>
                          Select dataset <Icon name="arrow" size={11} />
                        </strong>
                      </Link>
                    </span>
                  </div>
                </>
              )}
            </section>
          </div>
        </aside>

        {/* RIGHT MAIN PANEL — Search Bar + Dataset Button + Guide / Results */}
        <section className="analysis-panel" aria-live="polite">
          <div className="results research-main-container">
            {/* SEARCH BAR & SIDE-BY-SIDE ACTION BUTTONS */}
            <section className="chart-card research-search-card">
              <div className="chart-header">
                <div>
                  <div className="chart-title-row">
                    <h2>Search OpenAlex &amp; DataCite</h2>
                    <span className="data-chip">Live APIs</span>
                  </div>
                  <p>
                    Search manually by DOI, keyword, author, or topic — or search literature for
                    your retrieved dataset
                  </p>
                </div>
              </div>

              <form className="research-search-bar-form" onSubmit={handleManualSubmit}>
                <label className="search-field research-query-field">
                  <Icon name="search" size={16} />
                  <input
                    aria-label="Search DOIs, keywords, authors, or topics"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Enter DOI (e.g. 10.1175/JCLI-D-16-0758.1), keywords, satellite mission, or topic…"
                    type="text"
                    value={query}
                  />
                  {query && (
                    <button
                      aria-label="Clear search query"
                      className="research-clear-btn"
                      onClick={() => setQuery("")}
                      type="button"
                    >
                      ×
                    </button>
                  )}
                </label>

                <div className="research-action-buttons">
                  <button
                    className="run-button research-primary-search-btn"
                    disabled={
                      (searchState === "loading" && activeMode === "manual") ||
                      query.trim().length === 0
                    }
                    type="submit"
                  >
                    {searchState === "loading" && activeMode === "manual" ? (
                      <span className="button-spinner" />
                    ) : (
                      <Icon name="search" size={16} />
                    )}
                    {searchState === "loading" && activeMode === "manual"
                      ? "Searching…"
                      : "Search"}
                  </button>

                  <button
                    className="run-button research-dataset-search-btn"
                    disabled={!hasRetrievedDataset || searchState === "loading"}
                    onClick={() => void executeSearch("dataset")}
                    title={
                      hasRetrievedDataset && retrievedDatasetContext
                        ? `Search existing research for ${retrievedDatasetContext.variable_name} (${retrievedDatasetContext.variable_id})`
                        : "Retrieve a dataset first in Data Selection / Data Preview to enable dataset-matched research search"
                    }
                    type="button"
                  >
                    {searchState === "loading" && activeMode === "dataset" ? (
                      <span className="button-spinner" />
                    ) : (
                      <Icon name="layers" size={16} />
                    )}
                    {searchState === "loading" && activeMode === "dataset"
                      ? "Searching dataset…"
                      : retrievedDatasetContext
                        ? `Search Selected Dataset (${retrievedDatasetContext.variable_id})`
                        : "Search Selected Dataset"}
                  </button>
                </div>
              </form>
            </section>

            {/* ON-LOAD GUIDE (SHOWN BEFORE ANY SEARCH IS EXECUTED) */}
            {searchState === "empty" && (
              <ResearchOnboardingGuide
                hasRetrievedDataset={hasRetrievedDataset}
                datasetContext={retrievedDatasetContext}
                onQuickFill={(sample) => setQuery(sample)}
              />
            )}

            {/* LOADING STATE */}
            {searchState === "loading" && (
              <ResearchLoadingState
                mode={activeMode}
                query={query}
                datasetContext={retrievedDatasetContext}
              />
            )}

            {/* ERROR STATE */}
            {searchState === "error" && (
              <div className="empty-state research-error-card" role="alert">
                <div className="empty-kicker">
                  <span /> Search unavailable
                </div>
                <h2>Could not complete the research search</h2>
                <p>{searchError}</p>
                <button onClick={() => void executeSearch(activeMode)} type="button">
                  Retry search <Icon name="arrow" size={16} />
                </button>
              </div>
            )}

            {/* RESULTS VIEW */}
            {searchState === "complete" && searchResponse && (
              <ResearchResultsSection
                response={searchResponse}
                filteredResults={filteredResults}
                providerFilter={providerFilter}
                setProviderFilter={setProviderFilter}
                onCopyCitation={copyCitation}
              />
            )}
          </div>
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

function ResearchOnboardingGuide({
  hasRetrievedDataset,
  datasetContext,
  onQuickFill,
}: {
  hasRetrievedDataset: boolean;
  datasetContext: ResearchDatasetContext | null;
  onQuickFill: (sample: string) => void;
}) {
  return (
    <section className="research-guide-section">
      <div className="verdict research-guide-banner">
        <div className="verdict-icon">
          <Icon name="book" size={22} />
        </div>
        <div className="verdict-body">
          <div className="verdict-label">How to Find Existing Research</div>
          <h2>Connect your investigation to peer-reviewed literature and cited datasets</h2>
          <p>
            Use the search bar above to look up specific DOIs, keywords, or topics, or use the{" "}
            <strong>Search Selected Dataset</strong> button right next to Search once you have
            retrieved a dataset.
          </p>
        </div>
        <div className="confidence">
          <small>Connected APIs</small>
          <strong>2 Live</strong>
          <span>OpenAlex &amp; DataCite</span>
        </div>
      </div>

      <div className="research-guide-grid">
        <article className="chart-card research-guide-card">
          <div className="research-guide-step">
            <span className="research-step-badge">Method 01</span>
            <span className="data-chip">
              {hasRetrievedDataset ? "Ready to run" : "Requires retrieved dataset"}
            </span>
          </div>
          <h3>Find research for a particular dataset</h3>
          <p>
            Select a dataset in <strong>System Intelligence</strong> or{" "}
            <strong>Data Selection</strong> and complete its retrieval. Once the dataset is
            retrieved, its metadata (variable name, parameter code, satellite mission, provider
            agency, and citation DOI) is automatically linked here and unlocks the{" "}
            <strong>Search Selected Dataset</strong> button next to Search.
          </p>
          {hasRetrievedDataset && datasetContext ? (
            <div className="research-guide-status active">
              <Icon name="check" size={14} />
              <span>
                Active dataset: <strong>{datasetContext.variable_name}</strong> (
                {datasetContext.variable_id} · {datasetContext.source_api})
              </span>
            </div>
          ) : (
            <div className="research-guide-status">
              <Icon name="info" size={14} />
              <span>
                No dataset retrieved yet — the dataset search button is grayed out until a dataset
                is retrieved.{" "}
                <Link href="/workspace/data-selection">Go to Data Selection →</Link>
              </span>
            </div>
          )}
        </article>

        <article className="chart-card research-guide-card">
          <div className="research-guide-step">
            <span className="research-step-badge">Method 02</span>
            <span className="data-chip">Always available</span>
          </div>
          <h3>Search manually by DOI, keyword, or topic</h3>
          <p>
            Enter any Digital Object Identifier (DOI), climate variable, satellite sensor, author
            name, or research question in the search box above and click <strong>Search</strong>.
            Results include direct links to the paper, abstract, dataset repository, and persistent
            DOI record.
          </p>
          <div className="research-sample-chips">
            <small>Try filling an example query:</small>
            <div>
              <button
                onClick={() => onQuickFill("10.1175/JCLI-D-16-0758.1")}
                type="button"
              >
                DOI: 10.1175/JCLI-D-16-0758.1
              </button>
              <button
                onClick={() => onQuickFill("MERRA-2 surface air temperature trend")}
                type="button"
              >
                MERRA-2 temperature trend
              </button>
              <button
                onClick={() => onQuickFill("MODIS NDVI drought vegetation")}
                type="button"
              >
                MODIS NDVI drought
              </button>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

function ResearchLoadingState({
  mode,
  query,
  datasetContext,
}: {
  mode: "manual" | "dataset";
  query: string;
  datasetContext: ResearchDatasetContext | null;
}) {
  return (
    <div className="results-loading" style={{ marginTop: 14 }}>
      <div className="loading-status">
        <span className="radar">
          <i />
        </span>
        <div>
          <strong>
            {mode === "dataset" && datasetContext
              ? `Querying OpenAlex & DataCite for ${datasetContext.variable_name} (${datasetContext.variable_id})`
              : `Querying OpenAlex & DataCite for “${query}”`}
          </strong>
          <p>
            Resolving DOIs, reconstructing paper abstracts, and indexing dataset records…
          </p>
        </div>
      </div>
      <div className="metrics-grid">
        {[1, 2, 3, 4].map((item) => (
          <div className="metric skeleton-card" key={item}>
            <i />
            <b />
          </div>
        ))}
      </div>
      <div className="chart-card skeleton-chart" style={{ minHeight: 220 }}>
        <div className="skeleton-line short" />
        <div className="skeleton-line" />
        <div className="skeleton-line" style={{ width: "65%" }} />
      </div>
    </div>
  );
}

function ResearchResultsSection({
  response,
  filteredResults,
  providerFilter,
  setProviderFilter,
  onCopyCitation,
}: {
  response: ResearchSearchResponse;
  filteredResults: ResearchWorkItem[];
  providerFilter: ProviderFilter;
  setProviderFilter: (value: ProviderFilter) => void;
  onCopyCitation: (item: ResearchWorkItem) => void;
}) {
  return (
    <div className="research-results-wrap">
      <div className="result-header" style={{ marginTop: 18 }}>
        <div>
          <div className="section-kicker">
            <span>{response.mode === "dataset" ? "DATASET MATCH" : "MANUAL QUERY"}</span>{" "}
            Literature &amp; DOI Discovery Complete
          </div>
          <h1>
            {response.mode === "dataset" && response.dataset_label
              ? `References for ${response.dataset_label}`
              : `Results for “${response.query_executed}”`}
          </h1>
          <p>
            Query executed: <code>{response.query_executed}</code> · OpenAlex (
            {response.provider_status.OpenAlex || "not queried"}) · DataCite (
            {response.provider_status.DataCite || "not queried"})
          </p>
        </div>
      </div>

      {/* METRICS SUMMARY GRID */}
      <div className="metrics-grid">
        <div className="metric">
          <div className="metric-label">
            Total references
            <Icon name="file" size={13} />
          </div>
          <div>
            <strong>{response.total_results}</strong>
            <span>deduplicated works</span>
          </div>
          <p className="positive">All items linked to source</p>
        </div>

        <div className="metric">
          <div className="metric-label">
            OpenAlex works
            <Icon name="book" size={13} />
          </div>
          <div>
            <strong>{response.openalex_count}</strong>
            <span>papers &amp; preprints</span>
          </div>
          <p>https://api.openalex.org/works</p>
        </div>

        <div className="metric">
          <div className="metric-label">
            DataCite records
            <Icon name="layers" size={13} />
          </div>
          <div>
            <strong>{response.datacite_count}</strong>
            <span>datasets &amp; DOIs</span>
          </div>
          <p>https://api.datacite.org/dois</p>
        </div>

        <div className="metric">
          <div className="metric-label">
            Open access / public
            <Icon name="globe" size={13} />
          </div>
          <div>
            <strong>{response.open_access_count}</strong>
            <span>accessible records</span>
          </div>
          <p>Direct landing &amp; abstract links</p>
        </div>
      </div>

      {/* FILTER BAR */}
      <section className="chart-card" style={{ marginTop: 14 }}>
        <div className="chart-controls">
          <div className="segmented" role="group" aria-label="Filter by source">
            <button
              className={providerFilter === "ALL" ? "active" : ""}
              onClick={() => setProviderFilter("ALL")}
              type="button"
            >
              All results ({response.total_results})
            </button>
            <button
              className={providerFilter === "OpenAlex" ? "active" : ""}
              onClick={() => setProviderFilter("OpenAlex")}
              type="button"
            >
              OpenAlex ({response.openalex_count})
            </button>
            <button
              className={providerFilter === "DataCite" ? "active" : ""}
              onClick={() => setProviderFilter("DataCite")}
              type="button"
            >
              DataCite ({response.datacite_count})
            </button>
          </div>
          <div className="legend">
            <span>Click any title or action button to open the paper, abstract, or dataset</span>
          </div>
        </div>

        {filteredResults.length === 0 ? (
          <div className="research-empty" style={{ padding: "48px 24px" }}>
            <Icon name="search" size={26} />
            <strong>No matching records found for this filter</strong>
            <span>Try broadening your search keywords or enabling both OpenAlex and DataCite.</span>
          </div>
        ) : (
          <div className="research-results-list">
            {filteredResults.map((item) => (
              <article className="research-result-item" key={item.id}>
                <div className="research-paper-meta">
                  <b
                    className={
                      item.source_provider === "OpenAlex"
                        ? "source-badge-openalex"
                        : "source-badge-datacite"
                    }
                  >
                    {item.source_provider}
                  </b>
                  <span>{item.work_type}</span>
                  {item.year && <span>{item.year}</span>}
                  <span>{item.topic}</span>
                  {item.cited_by_count > 0 && (
                    <span>{item.cited_by_count.toLocaleString()} citations</span>
                  )}
                  {item.is_open_access && <b>Open Access</b>}
                  {item.match_context && <b>{item.match_context}</b>}
                </div>

                <h3>
                  <a
                    className="research-title-link"
                    href={item.primary_url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {item.title} <Icon name="external" size={14} />
                  </a>
                </h3>

                <p className="research-authors">
                  {item.authors} · <span>{item.publication}</span>
                  {item.doi && item.doi_url && (
                    <>
                      {" "}
                      ·{" "}
                      <a
                        className="research-inline-doi"
                        href={item.doi_url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        DOI: {item.doi}
                      </a>
                    </>
                  )}
                </p>

                <p className="research-abstract">{item.abstract_snippet}</p>

                <div className="research-paper-actions">
                  <a href={item.primary_url} rel="noreferrer" target="_blank">
                    <Icon name="external" size={13} /> Open Result
                  </a>

                  {item.paper_url && (
                    <a href={item.paper_url} rel="noreferrer" target="_blank">
                      <Icon name="file" size={13} /> Paper / Full Text
                    </a>
                  )}

                  {item.abstract_url && (
                    <a href={item.abstract_url} rel="noreferrer" target="_blank">
                      <Icon name="book" size={13} /> Abstract / Metadata
                    </a>
                  )}

                  {item.dataset_url && (
                    <a href={item.dataset_url} rel="noreferrer" target="_blank">
                      <Icon name="layers" size={13} /> Dataset / DOI
                    </a>
                  )}

                  {item.record_url && item.record_url !== item.abstract_url && (
                    <a href={item.record_url} rel="noreferrer" target="_blank">
                      <Icon name="globe" size={13} /> {item.source_provider} Record
                    </a>
                  )}

                  <button onClick={() => onCopyCitation(item)} type="button">
                    <Icon name="file" size={13} /> Copy Citation
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
