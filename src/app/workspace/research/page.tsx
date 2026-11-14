"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useDashboard } from "@/context/DashboardContext";
import { researchPapers } from "@/lib/dashboardData";

export default function ResearchPage() {
  const { dataset } = useDashboard();
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("All topics");
  const [notice, setNotice] = useState("");
  const noticeTimer = useRef<number | undefined>(undefined);
  const topics = ["All topics", ...new Set(researchPapers.map((paper) => paper.topic))];
  const visible = useMemo(
    () =>
      researchPapers.filter(
        (paper) =>
          (topic === "All topics" || paper.topic === topic) &&
          `${paper.title} ${paper.authors} ${paper.summary}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [query, topic],
  );

  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

  const copyCitation = async (title: string, authors: string, year: number) => {
    try {
      await navigator.clipboard.writeText(`${authors} (${year}). ${title}.`);
      setNotice("Citation copied");
    } catch {
      setNotice("Clipboard access was unavailable");
    }
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(""), 2200);
  };

  return (
    <div className="research-page dashboard-page-inner">
      <section className="research-context dashboard-card">
        <span className="research-context-icon">
          <Icon name="file" size={22} />
        </span>
        <div>
          <small>Research matched to the active variable</small>
          <h2>{dataset.name}</h2>
          <p>
            {dataset.code} · {dataset.source}
          </p>
        </div>
        <span className="research-match">
          {researchPapers.filter((paper) => paper.datasetIds.includes(dataset.id)).length} direct
          matches
        </span>
      </section>

      <section className="research-library">
        <div className="research-tools">
          <label>
            <Icon name="search" size={16} />
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, author, or topic"
              value={query}
            />
          </label>
          <select onChange={(event) => setTopic(event.target.value)} value={topic}>
            {topics.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
        <div className="research-list">
          {visible.map((paper) => {
            const directMatch = paper.datasetIds.includes(dataset.id);
            return (
              <article className="research-paper dashboard-card" key={paper.id}>
                <div className="research-paper-meta">
                  <span>{paper.topic}</span>
                  <span>{paper.year}</span>
                  {directMatch && <b>Dataset match</b>}
                  {!paper.verified && <b className="demo-record">Demo record</b>}
                </div>
                <h3>{paper.title}</h3>
                <p className="research-authors">
                  {paper.authors} · {paper.publication}
                </p>
                <p>{paper.summary}</p>
                <div className="research-paper-actions">
                  <a href={paper.doi} rel="noreferrer" target="_blank">
                    View source <Icon name="external" size={14} />
                  </a>
                  <button
                    onClick={() => copyCitation(paper.title, paper.authors, paper.year)}
                    type="button"
                  >
                    <Icon name="file" size={14} /> Copy citation
                  </button>
                </div>
              </article>
            );
          })}
          {visible.length === 0 && (
            <div className="research-empty dashboard-card">
              <Icon name="search" size={24} />
              <strong>No research records found</strong>
              <span>Try a broader search or another topic.</span>
            </div>
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
