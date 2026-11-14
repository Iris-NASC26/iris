"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { usePathname } from "next/navigation";
import { useDashboard } from "@/context/DashboardContext";
import { AssistantMarkdown } from "@/components/dashboard/AssistantMarkdown";
import { Icon } from "@/components/ui/Icon";

type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type AssistantPosition = { right: number; bottom: number };

const STORAGE_KEY = "iris-assistant-state";
const MAX_REQUEST_BYTES = 24_000;
const DEFAULT_POSITION: AssistantPosition = { right: 24, bottom: 24 };

function redactSensitiveText(value: string) {
  return value
    .replace(/\bAIza[0-9A-Za-z_-]{20,}\b/g, "[redacted]")
    .replace(/\b((?:api[_ -]?key|token|password|secret)\s*[:=]\s*)\S+/gi, "$1[redacted]");
}

function clampPosition(position: AssistantPosition): AssistantPosition {
  const maxRight = Math.max(8, window.innerWidth - 380 - 8);
  const maxBottom = Math.max(8, window.innerHeight - 120);
  return {
    right: Math.min(maxRight, Math.max(8, position.right)),
    bottom: Math.min(maxBottom, Math.max(8, position.bottom)),
  };
}

export function IrisAssistant({
  pageTitle,
  tourOpen = false,
}: {
  pageTitle: string;
  tourOpen?: boolean;
}) {
  const pathname = usePathname() ?? "/";
  const {
    dataset,
    activeProduct,
    extractionConfig,
    selectedProducts,
    extractedPreview,
    siConversationStage,
    siTurns,
  } = useDashboard();
  const isSystemIntelligencePage = pathname === "/workspace/intelligence";

  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(DEFAULT_POSITION);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const seeded = useRef(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const assistantRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number; position: AssistantPosition } | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as {
          open?: unknown;
          position?: Partial<AssistantPosition>;
        };
        if (typeof parsed.open === "boolean") setOpen(parsed.open);
        if (
          typeof parsed.position?.right === "number" &&
          Number.isFinite(parsed.position.right) &&
          typeof parsed.position?.bottom === "number" &&
          Number.isFinite(parsed.position.bottom)
        ) {
          setPosition(clampPosition(parsed.position as AssistantPosition));
        }
      }
    } catch {
      // Storage is optional; the component state remains usable.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ open, position }));
    } catch {
      // Storage is optional; the component state remains usable.
    }
  }, [hydrated, open, position]);

  useEffect(() => {
    const onResize = () => setPosition((current) => clampPosition(current));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (isSystemIntelligencePage || seeded.current) return;
    const previousTurns = siTurns
      .filter((turn) => turn.id !== "welcome" && turn.content.trim())
      .slice(-6)
      .map((turn) => ({
        id: `si-${turn.id}`,
        role: turn.role,
        content: redactSensitiveText(turn.content).slice(0, 700),
      }));
    if (previousTurns.length) {
      setMessages(previousTurns);
    } else {
      setMessages([
        {
          id: "assistant-welcome",
          role: "assistant",
          content: "Hi, I’m Iris Assistant. I can explain this page and help you navigate your investigation.",
        },
      ]);
    }
    seeded.current = true;
  }, [isSystemIntelligencePage, siTurns]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        window.requestAnimationFrame(() => launcherRef.current?.focus());
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const minimizeWhenUsingDashboardControls = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Element &&
        !assistantRef.current?.contains(target) &&
        target.closest("button, a[href], [role='button']")
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", minimizeWhenUsingDashboardControls, true);
    return () =>
      document.removeEventListener("pointerdown", minimizeWhenUsingDashboardControls, true);
  }, [open]);

  useEffect(() => {
    if (tourOpen) setOpen(false);
  }, [tourOpen]);

  useEffect(() => {
    if (isSystemIntelligencePage) setOpen(false);
  }, [isSystemIntelligencePage]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "auto" });
  }, [messages, loading, open]);

  const context = useMemo(
    () => ({
      pathname,
      page_title: pageTitle.slice(0, 160),
      active_dataset_id: activeProduct?.product_id || dataset.id,
      active_variable: activeProduct?.variable_id || extractionConfig.variable_id,
      source_api: activeProduct?.source_api || extractionConfig.source_api,
      region_name: extractionConfig.region_name,
      bbox: extractionConfig.bbox.slice(0, 4),
      start_date: extractionConfig.start_date,
      end_date: extractionConfig.end_date,
      target_frequency: extractionConfig.target_frequency,
      temporal_aggregation: extractionConfig.temporal_aggregation,
      spatial_level: extractionConfig.spatial_level,
      spatial_mode: extractionConfig.spatial_Submode,
      spatial_reduction: extractionConfig.spatial_reduction,
      point_lat: extractionConfig.point_lat,
      point_lon: extractionConfig.point_lon,
      selected_products: selectedProducts.slice(0, 5).map((product) => ({
        id: product.product_id,
        title: product.title,
        variable_id: product.variable_id,
        variable_name: product.variable_name,
        source_api: product.source_api,
        what_it_measures: product.what_it_measures.slice(0, 320),
        description: product.description.slice(0, 320),
        unit: product.unit,
        native_frequency: product.native_frequency,
      })),
      processed_data: extractedPreview
        ? {
            result_id: extractedPreview.result_id || null,
            product_name: extractedPreview.product.variable_name,
            total_rows: extractedPreview.total_rows,
            summary_stats: extractedPreview.summary_stats,
            sampled_observations: Array.from(
              { length: Math.min(16, extractedPreview.chart_series.length) },
              (_, index) => {
                const sampleCount = Math.min(16, extractedPreview.chart_series.length);
                const rowIndex =
                  sampleCount <= 1
                    ? 0
                    : Math.round(
                        (index * (extractedPreview.chart_series.length - 1)) /
                          (sampleCount - 1),
                      );
                const row = extractedPreview.chart_series[rowIndex];
                return {
                  timestamp: row.timestamp,
                  value: row.value,
                  secondary_value: row.secondary_value,
                  rolling_avg: row.rolling_avg,
                  anomaly_z: row.anomaly_z,
                  unit: row.unit,
                  qa_flag: row.qa_flag,
                };
              },
            ),
          }
        : null,
      extracted_preview_result_id: extractedPreview?.result_id || null,
      extracted_preview_job_id: extractedPreview?.job_id || null,
      si_conversation_stage: siConversationStage,
      recent_si_turns: siTurns
        .filter((turn) => turn.id !== "welcome" && turn.content.trim())
        .slice(-6)
        .map((turn) => ({
          role: turn.role,
          summary: redactSensitiveText(turn.content).slice(0, 180),
        })),
    }),
    [
      activeProduct,
      dataset.id,
      extractedPreview,
      extractionConfig,
      pageTitle,
      pathname,
      selectedProducts,
      siConversationStage,
      siTurns,
    ],
  );

  const setAssistantOpen = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) window.requestAnimationFrame(() => launcherRef.current?.focus());
  }, []);

  const onDragStart = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch" || (event.target as HTMLElement).closest("button")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = { x: event.clientX, y: event.clientY, position };
  };

  const onDragMove = (event: ReactPointerEvent<HTMLElement>) => {
    const start = dragStart.current;
    if (!start || window.innerWidth <= 680) return;
    setPosition(
      clampPosition({
        right: start.position.right - (event.clientX - start.x),
        bottom: start.position.bottom + (event.clientY - start.y),
      }),
    );
  };

  const onDragEnd = () => {
    dragStart.current = null;
  };

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const clean = input.trim();
    if (!clean || loading) return;

    const nextMessages = [...messages, { id: `user-${Date.now()}`, role: "user" as const, content: clean }];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setLoading(true);
    const payload = {
      message: redactSensitiveText(clean).slice(0, 2000),
      page_context: context,
      history: messages.slice(-7).map((message) => ({
        role: message.role,
        content: redactSensitiveText(message.content).slice(0, 700),
      })),
    };
    const body = JSON.stringify(payload);
    if (new TextEncoder().encode(body).byteLength > MAX_REQUEST_BYTES) {
      setLoading(false);
      setError("This assistant request is too large. Clear the conversation and try again.");
      return;
    }

    try {
      const response = await fetch("/api/v1/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const data = (await response.json()) as { assistant_reply?: string; error?: string; detail?: string };
      if (!response.ok) {
        setError(data.error || data.detail || "Iris Assistant could not complete the request.");
        return;
      }
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.assistant_reply || "Iris Assistant did not return a response. Please try again.",
        },
      ]);
    } catch (requestError) {
      setError(
        `Could not connect to Iris Assistant. ${requestError instanceof Error ? requestError.message : String(requestError)}`,
      );
    } finally {
      setLoading(false);
    }
  };

  if (!hydrated || isSystemIntelligencePage) return null;

  return (
    <div
      className="iris-assistant"
      ref={assistantRef}
      style={{
        right: `${tourOpen ? 8 : position.right}px`,
        bottom: `${tourOpen ? 8 : position.bottom}px`,
      }}
    >
      {open ? (
        <section
          aria-label="Iris Assistant"
          aria-modal="false"
          className="iris-assistant-panel"
          role="dialog"
        >
          <header
            className="iris-assistant-header"
            onLostPointerCapture={onDragEnd}
            onPointerDown={onDragStart}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
          >
            <div className="iris-assistant-heading">
              <span className="iris-assistant-mark"><Icon name="sparkles" size={17} /></span>
              <div>
                <strong>Iris Assistant</strong>
                <small>{pageTitle}</small>
              </div>
            </div>
            <div className="iris-assistant-actions">
              <button
                aria-label="Clear assistant conversation"
                onClick={() => {
                  setMessages([]);
                  setError("");
                }}
                title="Clear conversation"
                type="button"
              >
                <Icon name="trash" size={16} />
              </button>
              <button
                aria-label="Minimize Iris Assistant"
                onClick={() => setAssistantOpen(false)}
                title="Minimize assistant"
                type="button"
              >
                <Icon name="minimize" size={17} />
              </button>
            </div>
          </header>

          <div className="iris-assistant-thread" ref={threadRef} role="log" aria-live="polite">
            {messages.length === 0 && (
              <p className="iris-assistant-empty">
                Ask about this page, your selected dataset, or where to go next.
              </p>
            )}
            {messages.map((message) => (
              <article className={`iris-assistant-message ${message.role}`} key={message.id}>
                <span>{message.role === "assistant" ? "Iris" : "You"}</span>
                {message.role === "assistant" ? (
                  <AssistantMarkdown content={message.content} />
                ) : (
                  <p>{message.content}</p>
                )}
              </article>
            ))}
            {loading && <p className="iris-assistant-loading" role="status">Iris is thinking…</p>}
          </div>

          <form className="iris-assistant-composer" onSubmit={sendMessage}>
            {error && <p className="iris-assistant-error" role="alert">{error}</p>}
            <textarea
              aria-label="Message Iris Assistant"
              maxLength={2000}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="Ask a question about Iris…"
              ref={inputRef}
              rows={2}
              value={input}
            />
            <button disabled={loading || !input.trim()} type="submit">Send</button>
          </form>
        </section>
      ) : (
        <button
          aria-label="Open Iris Assistant"
          className="iris-assistant-launcher"
          onClick={() => setAssistantOpen(true)}
          ref={launcherRef}
          title="Open Iris Assistant"
          type="button"
        >
          <Icon name="sparkles" size={22} />
        </button>
      )}
    </div>
  );
}
