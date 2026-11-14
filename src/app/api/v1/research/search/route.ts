import { NextResponse } from "next/server";
import type {
  ResearchDatasetContext,
  ResearchSearchRequest,
  ResearchSearchResponse,
  ResearchWorkItem,
} from "@/lib/dataRetrievalEngine";

const FASTAPI_BASE = process.env.FASTAPI_URL || "http://127.0.0.1:8000";
const OPENALEX_WORKS_URL = "https://api.openalex.org/works";
const DATACITE_DOIS_URL = "https://api.datacite.org/dois";
const DOI_REGEX = /(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)/i;

function extractCleanDoi(raw?: string | null): string | null {
  if (!raw) return null;
  const match = raw.trim().match(DOI_REGEX);
  if (!match) return null;
  return match[1].replace(/[.,;)]+$/, "");
}

function reconstructOpenAlexAbstract(
  invertedIndex?: Record<string, number[]> | null,
): string {
  if (!invertedIndex || typeof invertedIndex !== "object") return "";
  const pairs: Array<[number, string]> = [];
  for (const [word, indices] of Object.entries(invertedIndex)) {
    if (!Array.isArray(indices)) continue;
    for (const idx of indices) {
      if (typeof idx === "number") {
        pairs.push([idx, word]);
      }
    }
  }
  if (pairs.length === 0) return "";
  pairs.sort((a, b) => a[0] - b[0]);
  const text = pairs
    .map((item) => item[1])
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 420 ? `${text.slice(0, 417).trimEnd()}…` : text;
}

function cleanHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildDatasetSearchQuery(
  ctx: ResearchDatasetContext,
  extraQuery?: string,
): string {
  const parts: string[] = [];
  const varName = (ctx.variable_name || "").trim();
  if (varName) parts.push(varName);

  const mission = (ctx.mission_or_instrument || "").trim();
  const sourceApi = (ctx.source_api || "").trim();
  if (mission && !varName.toLowerCase().includes(mission.toLowerCase())) {
    const tokens = mission
      .split(/[/·,()]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.length <= 28);
    if (tokens.length > 0) parts.push(tokens[0]);
  } else if (sourceApi && !varName.toLowerCase().includes(sourceApi.toLowerCase())) {
    parts.push(sourceApi);
  }

  if (ctx.variable_id && ctx.variable_id.trim().length >= 3) {
    const vid = ctx.variable_id.trim();
    if (
      !parts.join(" ").toLowerCase().includes(vid.toLowerCase()) &&
      !vid.startsWith("NASA_")
    ) {
      parts.push(vid);
    }
  }

  if (extraQuery && extraQuery.trim()) {
    parts.push(extraQuery.trim());
  }

  return (
    parts.join(" ").trim() ||
    ctx.title ||
    ctx.product_id ||
    "Earth observation climate time series"
  );
}

function parseOpenAlexWork(
  work: Record<string, unknown>,
  matchContext: string | null,
): ResearchWorkItem | null {
  const title = String(work.display_name || work.title || "").trim();
  if (!title) return null;

  const workId = String(work.id || "");
  const shortId = workId.includes("/") ? workId.split("/").pop() || workId : workId;
  const recordUrl = workId.startsWith("http")
    ? workId
    : `https://openalex.org/${shortId}`;

  const cleanDoi = extractCleanDoi(typeof work.doi === "string" ? work.doi : null);
  const doiUrl = cleanDoi ? `https://doi.org/${cleanDoi}` : null;

  const authorships = Array.isArray(work.authorships) ? work.authorships : [];
  const authorNames: string[] = [];
  for (const auth of authorships.slice(0, 4)) {
    const authorObj =
      auth && typeof auth === "object" && "author" in auth
        ? (auth as { author?: { display_name?: string } }).author
        : undefined;
    if (authorObj?.display_name) {
      authorNames.push(String(authorObj.display_name));
    }
  }
  if (authorships.length > 4) authorNames.push("et al.");
  const authors =
    authorNames.length > 0 ? authorNames.join(", ") : "Authors listed in source";

  const year =
    typeof work.publication_year === "number" ? work.publication_year : null;

  const primaryLoc =
    work.primary_location && typeof work.primary_location === "object"
      ? (work.primary_location as Record<string, unknown>)
      : {};
  const sourceObj =
    primaryLoc.source && typeof primaryLoc.source === "object"
      ? (primaryLoc.source as Record<string, unknown>)
      : {};
  const publication = String(
    sourceObj.display_name ||
      primaryLoc.raw_source_name ||
      "Scholarly Publication (OpenAlex)",
  );

  const landingUrl =
    typeof primaryLoc.landing_page_url === "string"
      ? primaryLoc.landing_page_url
      : null;
  const pdfUrl =
    typeof primaryLoc.pdf_url === "string" ? primaryLoc.pdf_url : null;
  const oaObj =
    work.open_access && typeof work.open_access === "object"
      ? (work.open_access as Record<string, unknown>)
      : {};
  const oaUrl = typeof oaObj.oa_url === "string" ? oaObj.oa_url : null;
  const isOa = Boolean(oaObj.is_oa);

  const rawType = String(work.type || "article")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const topics = Array.isArray(work.topics) ? work.topics : [];
  const concepts = Array.isArray(work.concepts) ? work.concepts : [];
  let topicLabel = "Earth & Environmental Sciences";
  if (
    topics.length > 0 &&
    topics[0] &&
    typeof topics[0] === "object" &&
    "display_name" in topics[0]
  ) {
    topicLabel = String((topics[0] as { display_name?: string }).display_name);
  } else if (
    concepts.length > 0 &&
    concepts[0] &&
    typeof concepts[0] === "object" &&
    "display_name" in concepts[0]
  ) {
    topicLabel = String((concepts[0] as { display_name?: string }).display_name);
  }

  let abstractSnippet = reconstructOpenAlexAbstract(
    work.abstract_inverted_index as Record<string, number[]> | null,
  );
  if (!abstractSnippet) {
    abstractSnippet = `Indexed peer-reviewed ${rawType.toLowerCase()} in ${publication} covering ${topicLabel}.`;
  }

  const paperUrl = pdfUrl || oaUrl || landingUrl || doiUrl || recordUrl;
  const abstractUrl = landingUrl || recordUrl || doiUrl;
  const datasetUrl = rawType.toLowerCase().includes("dataset") ? doiUrl : null;
  const primaryUrl = landingUrl || doiUrl || oaUrl || recordUrl;
  const citedByCount =
    typeof work.cited_by_count === "number" ? work.cited_by_count : 0;

  return {
    id: `openalex-${shortId || Math.abs(title.length)}`,
    source_provider: "OpenAlex",
    title,
    authors,
    year,
    publication,
    work_type: rawType,
    topic: topicLabel,
    abstract_snippet: abstractSnippet,
    doi: cleanDoi,
    doi_url: doiUrl,
    primary_url: primaryUrl,
    paper_url: paperUrl,
    abstract_url: abstractUrl,
    dataset_url: datasetUrl,
    record_url: recordUrl,
    is_open_access: isOa,
    cited_by_count: citedByCount,
    match_context: matchContext,
  };
}

function parseDataCiteItem(
  item: Record<string, unknown>,
  matchContext: string | null,
): ResearchWorkItem | null {
  const attrs =
    item.attributes && typeof item.attributes === "object"
      ? (item.attributes as Record<string, unknown>)
      : {};
  const titles = Array.isArray(attrs.titles) ? attrs.titles : [];
  let title = "";
  for (const t of titles) {
    if (t && typeof t === "object" && "title" in t && (t as { title?: string }).title) {
      title = cleanHtml(String((t as { title?: string }).title));
      break;
    }
  }
  if (!title) return null;

  const cleanDoi = extractCleanDoi(
    String(attrs.doi || item.id || ""),
  );
  const doiUrl = cleanDoi ? `https://doi.org/${cleanDoi}` : null;
  const registeredUrl = typeof attrs.url === "string" ? attrs.url : null;
  const recordUrl = cleanDoi
    ? `https://commons.datacite.org/doi.org/${cleanDoi}`
    : registeredUrl || "https://commons.datacite.org";

  const creators = Array.isArray(attrs.creators) ? attrs.creators : [];
  const creatorNames: string[] = [];
  for (const c of creators.slice(0, 4)) {
    if (!c || typeof c !== "object") continue;
    const cObj = c as { name?: string; givenName?: string; familyName?: string };
    const name =
      cObj.name ||
      [cObj.givenName, cObj.familyName].filter(Boolean).join(" ");
    if (name) creatorNames.push(String(name).trim());
  }
  if (creators.length > 4) creatorNames.push("et al.");
  const authors =
    creatorNames.length > 0
      ? creatorNames.join(", ")
      : String(attrs.publisher || "DataCite Contributor");

  const pubYearRaw = Number(attrs.publicationYear);
  const year = Number.isFinite(pubYearRaw) && pubYearRaw > 1000 ? pubYearRaw : null;

  const publisher = String(attrs.publisher || "DataCite Repository");
  const typesObj =
    attrs.types && typeof attrs.types === "object"
      ? (attrs.types as Record<string, unknown>)
      : {};
  const workType = String(
    typesObj.resourceTypeGeneral ||
      typesObj.resourceType ||
      "Dataset / Resource",
  );

  const subjects = Array.isArray(attrs.subjects) ? attrs.subjects : [];
  let topicLabel = "Scientific Dataset & Research";
  for (const s of subjects) {
    if (s && typeof s === "object" && "subject" in s && (s as { subject?: string }).subject) {
      const subj = String((s as { subject?: string }).subject).trim();
      if (subj) {
        topicLabel = subj.slice(0, 65);
        break;
      }
    }
  }

  const descriptions = Array.isArray(attrs.descriptions) ? attrs.descriptions : [];
  let abstractSnippet = "";
  for (const d of descriptions) {
    if (
      d &&
      typeof d === "object" &&
      "description" in d &&
      (d as { description?: string }).description
    ) {
      const desc = cleanHtml(String((d as { description?: string }).description));
      if (desc.length > 25) {
        abstractSnippet =
          desc.length > 420 ? `${desc.slice(0, 417).trimEnd()}…` : desc;
        break;
      }
    }
  }
  if (!abstractSnippet) {
    abstractSnippet = `Registered ${workType} published by ${publisher} and indexed in DataCite.`;
  }

  const citedByCount =
    typeof attrs.citationCount === "number" ? attrs.citationCount : 0;
  const isDataset = ["dataset", "collection", "software", "dataperiodical", "model"].includes(
    workType.toLowerCase(),
  );
  const primaryUrl = registeredUrl || doiUrl || recordUrl;
  const datasetUrl = isDataset ? registeredUrl || doiUrl : doiUrl;
  const paperUrl = !isDataset ? registeredUrl || doiUrl : null;
  const abstractUrl = recordUrl || doiUrl || primaryUrl;

  return {
    id: `datacite-${cleanDoi || Math.abs(title.length)}`,
    source_provider: "DataCite",
    title,
    authors,
    year,
    publication: publisher,
    work_type: workType,
    topic: topicLabel,
    abstract_snippet: abstractSnippet,
    doi: cleanDoi,
    doi_url: doiUrl,
    primary_url: primaryUrl,
    paper_url: paperUrl,
    abstract_url: abstractUrl,
    dataset_url: datasetUrl,
    record_url: recordUrl,
    is_open_access: true,
    cited_by_count: citedByCount,
    match_context: matchContext,
  };
}

async function executeDirectResearchSearch(
  body: ResearchSearchRequest,
): Promise<ResearchSearchResponse> {
  const mode = body.mode || "manual";
  const manualQ = (body.query || "").trim();
  const datasetCtx = body.dataset_context;

  let searchQuery = "";
  let doiTarget: string | null = null;
  let datasetLabel: string | null = null;
  let matchContext: string | null = null;

  if (mode === "dataset") {
    if (!datasetCtx) {
      throw new Error("dataset_context is required when searching by selected dataset.");
    }
    searchQuery = buildDatasetSearchQuery(datasetCtx, manualQ);
    doiTarget = extractCleanDoi(datasetCtx.citation_doi);
    datasetLabel = `${datasetCtx.variable_name} (${datasetCtx.variable_id} · ${datasetCtx.source_api})`;
    matchContext = `Matched to ${datasetCtx.variable_id} · ${datasetCtx.source_api}`;
  } else {
    if (!manualQ) {
      throw new Error("A search query (DOI, keyword, author, or topic) is required.");
    }
    doiTarget = extractCleanDoi(manualQ);
    searchQuery = doiTarget && manualQ.length < 45 ? doiTarget : manualQ;
    datasetLabel = datasetCtx
      ? `${datasetCtx.variable_name} (${datasetCtx.variable_id})`
      : null;
    matchContext = doiTarget ? "Direct DOI / Keyword Search" : null;
  }

  const sources = new Set(body.sources ?? ["openalex", "datacite"]);
  const sort = body.sort ?? "relevance";
  const limit = Math.min(50, Math.max(1, body.per_source_limit ?? 15));

  const providerStatus: Record<string, string> = {};
  const openAlexItems: ResearchWorkItem[] = [];
  const dataCiteItems: ResearchWorkItem[] = [];

  const selectFields =
    "id,doi,title,display_name,publication_year,type,open_access,primary_location,authorships,cited_by_count,topics,concepts,abstract_inverted_index";

  await Promise.all([
    sources.has("openalex")
      ? (async () => {
          try {
            if (doiTarget) {
              const doiParams = new URLSearchParams({
                filter: `doi:https://doi.org/${doiTarget}`,
                select: selectFields,
                "per-page": "5",
              });
              const doiRes = await fetch(
                `${OPENALEX_WORKS_URL}?${doiParams.toString()}`,
                {
                  headers: { "User-Agent": "ProjectIris/3.0 (https://help.openalex.org)" },
                  signal: AbortSignal.timeout(15000),
                },
              );
              if (doiRes.ok) {
                const doiJson = (await doiRes.json()) as {
                  results?: Array<Record<string, unknown>>;
                };
                for (const raw of doiJson.results || []) {
                  const parsed = parseOpenAlexWork(raw, "Exact DOI Match");
                  if (parsed) openAlexItems.push(parsed);
                }
              }
            }

            const params = new URLSearchParams({
              search: searchQuery,
              select: selectFields,
              "per-page": String(limit),
            });
            if (sort === "citations") params.set("sort", "cited_by_count:desc");
            else if (sort === "year") params.set("sort", "publication_year:desc");

            const res = await fetch(`${OPENALEX_WORKS_URL}?${params.toString()}`, {
              headers: { "User-Agent": "ProjectIris/3.0 (https://help.openalex.org)" },
              signal: AbortSignal.timeout(18000),
            });
            if (!res.ok) {
              providerStatus.OpenAlex = `HTTP ${res.status}`;
              return;
            }
            const data = (await res.json()) as {
              results?: Array<Record<string, unknown>>;
            };
            for (const raw of data.results || []) {
              const parsed = parseOpenAlexWork(raw, matchContext);
              if (parsed) openAlexItems.push(parsed);
            }
            providerStatus.OpenAlex = `ok (${openAlexItems.length} works)`;
          } catch (err) {
            providerStatus.OpenAlex = `error: ${err instanceof Error ? err.message : String(err)}`;
          }
        })()
      : Promise.resolve(),

    sources.has("datacite")
      ? (async () => {
          try {
            if (doiTarget) {
              const doiRes = await fetch(
                `${DATACITE_DOIS_URL}/${encodeURIComponent(doiTarget)}`,
                {
                  headers: { Accept: "application/vnd.api+json" },
                  signal: AbortSignal.timeout(15000),
                },
              );
              if (doiRes.ok) {
                const doiJson = (await doiRes.json()) as {
                  data?: Record<string, unknown>;
                };
                if (doiJson.data) {
                  const parsed = parseDataCiteItem(doiJson.data, "Exact DOI Match");
                  if (parsed) dataCiteItems.push(parsed);
                }
              }
            }

            const params = new URLSearchParams({
              query: searchQuery,
              "page[size]": String(limit),
              sort:
                sort === "citations"
                  ? "-citation-count"
                  : sort === "year"
                    ? "-publicationYear"
                    : "relevance",
            });
            const res = await fetch(`${DATACITE_DOIS_URL}?${params.toString()}`, {
              headers: { Accept: "application/vnd.api+json" },
              signal: AbortSignal.timeout(18000),
            });
            if (!res.ok) {
              providerStatus.DataCite = `HTTP ${res.status}`;
              return;
            }
            const data = (await res.json()) as {
              data?: Array<Record<string, unknown>>;
            };
            for (const raw of data.data || []) {
              const parsed = parseDataCiteItem(raw, matchContext);
              if (parsed) dataCiteItems.push(parsed);
            }
            providerStatus.DataCite = `ok (${dataCiteItems.length} records)`;
          } catch (err) {
            providerStatus.DataCite = `error: ${err instanceof Error ? err.message : String(err)}`;
          }
        })()
      : Promise.resolve(),
  ]);

  const combined: ResearchWorkItem[] = [];
  const seen = new Map<string, ResearchWorkItem>();
  const maxLen = Math.max(openAlexItems.length, dataCiteItems.length);
  const interleaved: ResearchWorkItem[] = [];
  for (let i = 0; i < maxLen; i++) {
    if (i < openAlexItems.length) interleaved.push(openAlexItems[i]);
    if (i < dataCiteItems.length) interleaved.push(dataCiteItems[i]);
  }

  for (const item of interleaved) {
    const key = (item.doi || item.title).trim().toLowerCase();
    const existing = seen.get(key);
    if (existing) {
      if (!existing.dataset_url && item.dataset_url) existing.dataset_url = item.dataset_url;
      if (!existing.paper_url && item.paper_url) existing.paper_url = item.paper_url;
      if (item.cited_by_count > existing.cited_by_count) {
        existing.cited_by_count = item.cited_by_count;
      }
      continue;
    }
    seen.set(key, item);
    combined.push(item);
  }

  if (sort === "citations") {
    combined.sort(
      (a, b) => b.cited_by_count - a.cited_by_count || (b.year ?? 0) - (a.year ?? 0),
    );
  } else if (sort === "year") {
    combined.sort(
      (a, b) => (b.year ?? 0) - (a.year ?? 0) || b.cited_by_count - a.cited_by_count,
    );
  } else {
    combined.sort(
      (a, b) =>
        (a.match_context === "Exact DOI Match" ? 0 : 1) -
        (b.match_context === "Exact DOI Match" ? 0 : 1),
    );
  }

  return {
    mode,
    query_executed: searchQuery,
    dataset_label: datasetLabel,
    total_results: combined.length,
    openalex_count: combined.filter((i) => i.source_provider === "OpenAlex").length,
    datacite_count: combined.filter((i) => i.source_provider === "DataCite").length,
    open_access_count: combined.filter((i) => i.is_open_access).length,
    provider_status: providerStatus,
    results: combined,
    retrieved_at: new Date().toISOString(),
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ResearchSearchRequest;

    // 1. Try FastAPI backend endpoint first
    try {
      const upstream = await fetch(`${FASTAPI_BASE}/api/v1/research/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(22000),
      });
      if (upstream.ok) {
        return NextResponse.json(await upstream.json());
      }
      if (upstream.status === 400) {
        const errData = await upstream.json();
        return NextResponse.json(
          { error: errData?.detail || "Invalid research search parameters." },
          { status: 400 },
        );
      }
    } catch {
      // If FastAPI is offline, fall through to direct live OpenAlex & DataCite query
    }

    // 2. Direct live OpenAlex & DataCite query
    const result = await executeDirectResearchSearch(body);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: message || "Failed to execute live research search." },
      { status: 400 },
    );
  }
}
