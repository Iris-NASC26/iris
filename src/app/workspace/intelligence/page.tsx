"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useDashboard } from "@/context/DashboardContext";
import { AssistantMarkdown } from "@/components/dashboard/AssistantMarkdown";
import {
  UPSTREAM_PROVIDER_LIST,
  type ChatTurnResponse,
  type DiscoveryResponse,
  type ExtractedIntent,
} from "@/lib/dataRetrievalEngine";

const RESEARCH_SUGGESTIONS = [
  "Monthly precipitation and soil moisture trends in Sri Lanka",
  "Heatwave and surface temperature trends in California",
  "Vegetation greenness and rainfall in the Amazon Basin",
  "Snow cover and surface temperature in Nepal",
];

function KeywordSourceReview({
  intent,
  keywords,
  onKeywordsChange,
  providers,
  onProvidersChange,
  onConfirm,
  loading,
}: {
  intent: ExtractedIntent;
  keywords: string[];
  onKeywordsChange: (keywords: string[]) => void;
  providers: string[];
  onProvidersChange: (providers: string[]) => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  const [newKeyword, setNewKeyword] = useState("");

  const addKeyword = () => {
    const value = newKeyword.trim();
    if (!value) return;
    if (!keywords.some((keyword) => keyword.toLowerCase() === value.toLowerCase())) {
      onKeywordsChange([...keywords, value]);
    }
    setNewKeyword("");
  };

  const toggleProvider = (provider: string) => {
    onProvidersChange(
      providers.includes(provider)
        ? providers.filter((item) => item !== provider)
        : [...providers, provider],
    );
  };

  return (
    <section className="si-review-card" aria-label="Review keywords and data sources">
      <div className="si-review-heading">
        <div>
          <span className="si-review-eyebrow">Review before searching</span>
          <h3>{intent.subject_domain}</h3>
        </div>
        <span className="si-review-category">{intent.scientific_category}</span>
      </div>

      <div className="si-scope-summary">
        <span><b>Area</b>{intent.inferred_region_name}</span>
        <span><b>Dates</b>{intent.inferred_start_date} – {intent.inferred_end_date}</span>
        <span><b>Frequency</b>{intent.inferred_frequency}</span>
      </div>

      <div className="si-review-field">
        <div className="si-review-field-title">
          <strong>Search keywords</strong>
          <span>Add or remove terms</span>
        </div>
        <div className="si-keyword-list">
          {keywords.map((keyword) => (
            <span className="si-keyword-chip" key={keyword}>
              {keyword}
              <button
                aria-label={`Remove ${keyword}`}
                disabled={loading || keywords.length <= 1}
                onClick={() => onKeywordsChange(keywords.filter((item) => item !== keyword))}
                type="button"
              >
                ×
              </button>
            </span>
          ))}
          <form
            className="si-add-keyword"
            onSubmit={(event) => {
              event.preventDefault();
              addKeyword();
            }}
          >
            <input
              aria-label="Add a search keyword"
              disabled={loading}
              onChange={(event) => setNewKeyword(event.target.value)}
              placeholder="Add keyword"
              value={newKeyword}
            />
            <button disabled={loading || !newKeyword.trim()} type="submit">
              Add
            </button>
          </form>
        </div>
      </div>

      <div className="si-review-field">
        <div className="si-review-field-title">
          <strong>Data sources</strong>
          <div className="si-source-shortcuts">
            <button onClick={() => onProvidersChange([...UPSTREAM_PROVIDER_LIST])} type="button">
              Select all
            </button>
            <button onClick={() => onProvidersChange([])} type="button">
              Clear
            </button>
          </div>
        </div>
        <div className="si-source-options">
          {UPSTREAM_PROVIDER_LIST.map((provider) => (
            <label className="si-source-option" key={provider}>
              <input
                checked={providers.includes(provider)}
                disabled={loading}
                onChange={() => toggleProvider(provider)}
                type="checkbox"
              />
              <span>{provider}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="si-review-footer">
        <span>Catalogs are queried only after you confirm.</span>
        <button
          className="si-submit-btn"
          disabled={loading || keywords.length === 0 || providers.length === 0}
          onClick={onConfirm}
          type="button"
        >
          {loading ? "Searching sources…" : "Confirm and search"}
          <Icon name="arrow" size={14} />
        </button>
      </div>
    </section>
  );
}

export default function SystemIntelligencePage() {
  const router = useRouter();
  const {
    discoveryResult,
    setDiscoveryResult,
    setSelectedProducts,
    siConversationStage,
    setSIConversationStage,
    siPendingIntent,
    setSIPendingIntent,
    siPendingKeywords,
    setSIPendingKeywords,
    siTurns,
    setSITurns,
    siSelectedProviders,
    setSISelectedProviders,
  } = useDashboard();

  const [chatInput, setChatInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchingCatalog, setSearchingCatalog] = useState(false);
  const [error, setError] = useState("");
  const threadRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const thread = threadRef.current;
    if (thread) thread.scrollTo({ top: thread.scrollHeight, behavior: "smooth" });
  }, [siTurns, siPendingIntent, loading]);

  const handleSendChatTurn = async (rawMessage: string, confirmSearch = false) => {
    const clean = rawMessage.trim();
    if (!clean || loading) return;
    setChatInput("");
    setError("");
    setLoading(true);
    setSearchingCatalog(confirmSearch);
    const effectiveStage = confirmSearch ? "keyword_confirmation" : "topic_discovery";
    setSITurns((previous) => [
      ...previous,
      { id: `user-${Date.now()}`, role: "user", content: clean },
    ]);

    try {
      const history = siTurns.slice(-8).map((turn) => ({
        role: turn.role,
        content: turn.content,
      }));
      const response = await fetch("/api/v1/si/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: clean,
          conversation_stage: effectiveStage,
          confirmed_keywords: confirmSearch ? siPendingKeywords : null,
          cached_intent: confirmSearch ? siPendingIntent : null,
          preferred_providers: siSelectedProviders,
          history,
        }),
      });
      const data = (await response.json()) as Partial<ChatTurnResponse> & {
        error?: string;
        detail?: string;
      };
      if (!response.ok) {
        setError(data.error || data.detail || "The topic search could not be completed.");
        return;
      }

      const chatResponse = data as ChatTurnResponse;
      const providerStatus = chatResponse.provider_status ?? {};
      const searchedSources = Object.keys(providerStatus);
      const catalogSearch = confirmSearch && Boolean(chatResponse.intent || siPendingIntent);
      let assistantTurn: (typeof siTurns)[number];

      if (catalogSearch) {
        const intent = chatResponse.intent ?? siPendingIntent;
        const products = Array.isArray(chatResponse.products) ? chatResponse.products : [];
        if (intent) {
          const result: DiscoveryResponse = {
            query: clean,
            intent,
            products,
            queried_sources: searchedSources.length ? searchedSources : siSelectedProviders,
            provider_status: providerStatus,
            cache_hit: false,
            total_candidates_evaluated: products.length,
          };
          setDiscoveryResult(result);
          const primary = products.find((item) => item.capability_state === "extract_verified") ?? products[0];
          setSelectedProducts(primary ? [primary] : []);
        }
        setSIPendingIntent(null);
        setSIPendingKeywords([]);
        setSIConversationStage("topic_discovery");
        assistantTurn = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: `Search complete — ${chatResponse.products.length} dataset${chatResponse.products.length === 1 ? "" : "s"} found across ${searchedSources.length} source${searchedSources.length === 1 ? "" : "s"}.`,
          providerStatus,
          productsCount: chatResponse.products.length,
          searchedSources: searchedSources.length ? searchedSources : siSelectedProviders,
        };
      } else {
        const nextStage = chatResponse.next_stage === "keyword_confirmation"
          ? "keyword_confirmation"
          : "topic_discovery";
        setSIConversationStage(nextStage);
        if (nextStage === "keyword_confirmation" && chatResponse.intent) {
          setSIPendingIntent(chatResponse.intent);
          setSIPendingKeywords(chatResponse.intent.keywords);
        }
        assistantTurn = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: chatResponse.assistant_reply,
          stage: nextStage,
          keywords: chatResponse.intent?.keywords,
        };
      }

      setSITurns((previous) => [...previous, assistantTurn]);
    } catch (requestError) {
      setError(
        `Could not connect to the topic search service. ${requestError instanceof Error ? requestError.message : String(requestError)}`,
      );
    } finally {
      setLoading(false);
      setSearchingCatalog(false);
    }
  };

  const handleConfirmSearch = () => {
    if (!siPendingKeywords.length || !siSelectedProviders.length) {
      setError("Choose at least one keyword and one data source to search.");
      return;
    }
    const message = `Search for ${siPendingKeywords.join(", ")}.`;
    void handleSendChatTurn(message, true);
  };

  const startNewTopic = () => {
    setSIConversationStage("topic_discovery");
    setSIPendingIntent(null);
    setSIPendingKeywords([]);
    setError("");
    inputRef.current?.focus();
  };

  const submitMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (siConversationStage !== "topic_discovery") return;
    void handleSendChatTurn(chatInput);
  };

  return (
    <div className="si-chat-workspace">
      <section className="si-chat-shell" aria-label="System Intelligence chat">
        <header className="si-chat-header">
          <div>
            <span className="dashboard-kicker">
              <Icon name="sparkles" size={14} /> System Intelligence
            </span>
            <h1>Explore a research topic</h1>
            <p>Describe what you want to study. Review keywords and sources before searching.</p>
          </div>
          {(siConversationStage !== "topic_discovery" || discoveryResult.products.length > 0) && (
            <button className="si-new-topic-btn" disabled={loading} onClick={startNewTopic} type="button">
              <Icon name="sparkles" size={14} /> New topic
            </button>
          )}
        </header>

        <div className="si-chat-thread" ref={threadRef} role="log" aria-live="polite">
          {siTurns.map((turn) => (
            <article className={`si-chat-turn ${turn.role}`} key={turn.id}>
              <div className="si-chat-avatar" aria-hidden="true">
                {turn.role === "assistant" ? <Icon name="sparkles" size={14} /> : "Y"}
              </div>
              <div className="si-chat-message">
                <span className="si-chat-speaker">{turn.role === "assistant" ? "Iris" : "You"}</span>
                {turn.role === "assistant" ? (
                  <AssistantMarkdown content={turn.content} />
                ) : (
                  <p>{turn.content}</p>
                )}

                {turn.id === "welcome" && siTurns.length === 1 && (
                  <div className="si-suggestions">
                    {RESEARCH_SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => void handleSendChatTurn(suggestion)}
                        type="button"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}

                {turn.keywords && turn.keywords.length > 0 && (
                  <div className="si-result-keywords" aria-label="Suggested keywords">
                    {turn.keywords.map((keyword) => <span key={keyword}>{keyword}</span>)}
                  </div>
                )}

                {turn.productsCount !== undefined && (
                  <div className="si-search-result">
                    <div className="si-result-source-list">
                      {(turn.searchedSources ?? []).map((source) => {
                        const status = turn.providerStatus?.[source] ?? "";
                        return (
                          <span className={status.startsWith("ok") ? "success" : "unavailable"} key={source}>
                            <Icon name={status.startsWith("ok") ? "check" : "alert"} size={11} />
                            {source}
                          </span>
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <button
                        className="si-result-action"
                        onClick={() => router.push("/workspace/data-selection")}
                        type="button"
                      >
                        {turn.productsCount > 0
                          ? `Review ${turn.productsCount} datasets`
                          : "Open Data Selection"}
                        <Icon name="arrow" size={14} />
                      </button>

                      {discoveryResult?.intent?.inferred_region_name && (
                        <button
                          className="si-result-action"
                          style={{
                            background: "rgba(19, 224, 192, 0.12)",
                            borderColor: "rgba(19, 224, 192, 0.3)",
                            color: "var(--iris-accent-bright, #2fffe0)",
                          }}
                          onClick={() => {
                            const r = discoveryResult.intent.inferred_region_name;
                            const center = discoveryResult.intent.inferred_Center;
                            const q = r
                              ? `place=${encodeURIComponent(r)}`
                              : center
                              ? `lat=${center[0]}&lon=${center[1]}`
                              : "";
                            router.push(`/workspace/globe${q ? `?${q}` : ""}`);
                          }}
                          type="button"
                        >
                          <Icon name="globe" size={14} />
                          View on Living Globe
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </article>
          ))}

          {siPendingIntent && siConversationStage === "keyword_confirmation" && (
            <div className="si-chat-widget-wrap">
              <div className="si-chat-avatar" aria-hidden="true"><Icon name="sparkles" size={14} /></div>
              <KeywordSourceReview
                intent={siPendingIntent}
                keywords={siPendingKeywords}
                onKeywordsChange={setSIPendingKeywords}
                providers={siSelectedProviders}
                onProvidersChange={setSISelectedProviders}
                onConfirm={handleConfirmSearch}
                loading={loading}
              />
            </div>
          )}

          {loading && (
            <article className="si-chat-turn assistant">
              <div className="si-chat-avatar" aria-hidden="true"><Icon name="sparkles" size={14} /></div>
              <div className="si-chat-message si-chat-loading">
                <span className="button-spinner" />
                {searchingCatalog
                  ? "Searching selected sources…"
                  : "Reviewing your topic…"}
              </div>
            </article>
          )}
        </div>

        <footer className="si-chat-composer">
          {error && (
            <p className="si-error-msg" role="alert">
              <Icon name="alert" size={14} /> {error}
            </p>
          )}
          <form className="si-composer-form" onSubmit={submitMessage}>
            <textarea
              aria-label="Describe a research topic"
              disabled={loading || siConversationStage === "keyword_confirmation"}
              onChange={(event) => {
                setChatInput(event.target.value);
                setError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  if (siConversationStage === "topic_discovery") {
                    void handleSendChatTurn(chatInput);
                  }
                }
              }}
              placeholder={
                siConversationStage === "keyword_confirmation"
                  ? "Review the keywords and sources above to start the search."
                  : "Describe a topic, place, variable, or time period…"
              }
              ref={inputRef}
              rows={1}
              value={chatInput}
            />
            <button
              className="si-composer-send"
              disabled={loading || siConversationStage === "keyword_confirmation" || !chatInput.trim()}
              type="submit"
            >
              <span>{loading ? "Working…" : "Send"}</span>
              <Icon name="arrow" size={15} />
            </button>
          </form>
          <div className="si-composer-note">
            {siConversationStage === "keyword_confirmation"
              ? "Choose keywords and sources in the review card above."
              : "No data catalogs are queried until you confirm the proposed search."}
          </div>
        </footer>
      </section>
    </div>
  );
}
