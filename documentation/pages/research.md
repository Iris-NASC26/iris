# Existing Research

The research layer connects the active investigation to the broader scientific record. It helps users understand whether a dataset or signal is already described in peer-reviewed literature, technical documentation, or climate-analysis references.

## Purpose

This layer matters because Earth system science is never isolated from prior work. Good investigations need context:

- what has already been observed in the region
- which datasets are standard in the domain
- what prior studies found
- what references are relevant to the selected variable and area

Iris integrates this context into the user workflow so analysts are not working in a vacuum.

## What the research layer does

It supports:

- dataset-linked reference discovery
- topic-based filtering for research material
- citations and connection to external knowledge
- contextual interpretation of the selected variable or region

This is especially useful when a user is comparing a locally extracted signal to published findings or looking for scientific justification for a trend or anomaly.

## Typical research questions it answers

- What work has been done on precipitation variability in this region?
- Which papers discuss vegetation stress or drought signals in this climate zone?
- What prior studies are associated with the selected variable?
- What are the accepted references for a chosen Earth observation product?

## Integration with the workflow

The research layer is not standalone. It complements the data-analysis workflow by providing the scientific context behind the dataset and the broader interpretation of environmental change.

In practice, a user may:

- discover a dataset through conversational intelligence
- extract and review the time series
- run a case analysis
- open related literature for grounding and comparison

This makes the platform closer to a full research environment than a simple charting tool.

---

## Scholarly Data Sources & Architecture

Iris integrates directly with two global scholarly infrastructure APIs:

1. **OpenAlex**: A fully open bibliographic catalog of the global research system, indexing over 250 million scientific publications, authors, institutions, and citation networks.
2. **DataCite**: The global DOI registration agency for scientific research datasets, software, and computational artifacts.

### Search Modes

- **Dataset Context Mode (`mode: "dataset"`)**: When an investigation is active, Iris extracts the dataset's GCMD keywords, variable names, provider agency, and geographic region to formulate a targeted query for peer-reviewed literature that directly cites or analyzes the product.
- **Manual Mode (`mode: "manual"`)**: Allows the user to enter custom search terms to explore specific environmental phenomena, methodologies, or localized climate studies.

### Sorting & Filtering

Users can sort literature results by:
- **Relevance**: Standard BM25 text-relevance matching across title and abstract.
- **Citation Count**: Ranks foundational, highly cited papers at the top to highlight seminal works.
- **Publication Year**: Surfaces the latest peer-reviewed studies to inspect recent findings.

### Open Access Badges & Direct Links

Every paper card in the research view includes:
- **Open Access Indicator**: Flags publications that are freely available to the public.
- **Direct PDF / Repository Link**: Provides immediate access to the full text via Unpaywall and publisher repositories.
- **Persistent DOI**: Direct hyperlink to `https://doi.org/...` for academic citation.
- **Cited-by Count**: Real-time citation impact metrics from OpenAlex.

---

## Backend API Specification

Scholarly searches are executed through the backend via:

### `POST /api/v1/research/search`

**Request Body (`ResearchSearchRequest`):**
```json
{
  "mode": "dataset",
  "dataset_context": {
    "product_id": "merra2_t2m",
    "variable_id": "T2M",
    "variable_name": "Near-surface air temperature",
    "source_api": "NASA POWER",
    "citation_doi": "https://doi.org/10.5067/60Q177EW27LW",
    "gcmd_keywords": ["ATMOSPHERIC TEMPERATURE", "SURFACE TEMPERATURE"],
    "region_name": "Los Angeles County, CA"
  },
  "sources": ["openalex", "datacite"],
  "sort": "citations",
  "per_source_limit": 15
}
```

**Response Body (`ResearchSearchResponse`):**
Returns structured results including `openalex_count`, `datacite_count`, `open_access_count`, and a list of `ResearchWorkItem` objects containing authors, year, journal publication, DOI URL, and abstract snippets.

## Why it is important for trust

Scientific trust is not only about the numbers. It also depends on context, provenance, and interpretation. By linking the active analysis to a research record, Iris supports stronger evidence-based reasoning and better communication of findings.
