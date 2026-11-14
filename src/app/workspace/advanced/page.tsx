"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useDashboard } from "@/context/DashboardContext";

const snippets = {
  "Rolling anomaly": `# Iris custom transformation preview
df["rolling_mean"] = df["value"].rolling(12).mean()
df["anomaly"] = df["value"] - df["rolling_mean"]
result = df[["date", "anomaly"]].dropna()`,
  "Annual summary": `# Aggregate monthly observations by year
df["year"] = pd.to_datetime(df["date"]).dt.year
result = df.groupby("year")["value"].agg(["mean", "min", "max"])`,
  "Extreme events": `# Flag observations beyond two standard deviations
z = (df["value"] - df["value"].mean()) / df["value"].std()
result = df.loc[z.abs() >= 2, ["date", "value"]]`,
};

export default function AdvancedCodePage() {
  const { dataset } = useDashboard();
  const [snippet, setSnippet] = useState<keyof typeof snippets>("Rolling anomaly");
  const [code, setCode] = useState(snippets["Rolling anomaly"]);
  const [status, setStatus] = useState<"idle" | "running" | "complete">("idle");
  const [notice, setNotice] = useState("");
  const runTimer = useRef<number | undefined>(undefined);
  const noticeTimer = useRef<number | undefined>(undefined);
  const lines = useMemo(() => code.split("\n").length, [code]);

  useEffect(
    () => () => {
      window.clearTimeout(runTimer.current);
      window.clearTimeout(noticeTimer.current);
    },
    [],
  );

  const runPreview = () => {
    setStatus("running");
    window.clearTimeout(runTimer.current);
    runTimer.current = window.setTimeout(() => setStatus("complete"), 600);
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setNotice("Code copied");
    } catch {
      setNotice("Clipboard access was unavailable");
    }
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(""), 2200);
  };

  return (
    <div className="advanced-page dashboard-page-inner">
      <section className="advanced-notice">
        <Icon name="info" size={17} />
        <div>
          <strong>Safe preview mode</strong>
          <p>
            This interface simulates output with local fixtures. Isolated Python execution is not
            connected yet, and no code leaves your browser.
          </p>
        </div>
      </section>
      <section className="code-workspace">
        <div className="code-editor-panel">
          <header>
            <div>
              <span />
              <span />
              <span />
              <strong>analysis.py</strong>
            </div>
            <div className="code-editor-actions">
              <select
                aria-label="Starter snippet"
                onChange={(event) => {
                  const value = event.target.value as keyof typeof snippets;
                  setSnippet(value);
                  setCode(snippets[value]);
                  setStatus("idle");
                }}
                value={snippet}
              >
                {Object.keys(snippets).map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <button onClick={copyCode} type="button">
                <Icon name="file" size={14} /> Copy
              </button>
              <button
                onClick={() => {
                  setCode(snippets[snippet]);
                  setStatus("idle");
                }}
                type="button"
              >
                Reset
              </button>
            </div>
          </header>
          <div className="code-editor">
            <div className="line-numbers" aria-hidden="true">
              {Array.from({ length: lines }, (_, index) => (
                <span key={index}>{index + 1}</span>
              ))}
            </div>
            <textarea
              aria-label="Python analysis code"
              onChange={(event) => {
                setCode(event.target.value);
                setStatus("idle");
              }}
              spellCheck={false}
              value={code}
            />
          </div>
          <footer>
            <span>
              Dataset: {dataset.code} · {dataset.name}
            </span>
            <button disabled={status === "running"} onClick={runPreview} type="button">
              {status === "running" ? <i /> : <Icon name="arrow" size={14} />}
              {status === "running" ? "Running preview…" : "Run preview"}
            </button>
          </footer>
        </div>
        <div className="code-output-panel">
          <header>
            <span>Preview output</span>
            <b className={status}>{status === "complete" ? "Completed" : status}</b>
          </header>
          {status === "idle" && (
            <div className="code-output-empty">
              <Icon name="activity" size={25} />
              <strong>Ready to preview</strong>
              <p>Run the script to see deterministic sample output.</p>
            </div>
          )}
          {status === "running" && (
            <div className="code-output-loading">
              <i />
              Preparing a safe local preview…
            </div>
          )}
          {status === "complete" && (
            <>
              <div className="console-output">
                <span>$ iris preview analysis.py</span>
                <p>Loaded 288 monthly {dataset.code} records</p>
                <p>Transformation completed in 0.18s</p>
              </div>
              <div className="code-result-summary">
                <span>
                  <small>Rows returned</small>
                  <strong>276</strong>
                </span>
                <span>
                  <small>Mean anomaly</small>
                  <strong>+0.03</strong>
                </span>
              </div>
              <div className="code-mini-chart">
                {[42, 58, 37, 66, 54, 81, 62, 93, 76, 104, 88, 116].map((height, index) => (
                  <i key={index} style={{ height }} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>
      {notice && (
        <div className="dashboard-toast" role="status">
          <Icon name="check" size={15} /> {notice}
        </div>
      )}
    </div>
  );
}
