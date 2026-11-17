"use client";

import { useRouter } from "next/navigation";
import { useDashboard } from "@/context/DashboardContext";
import { ManualCaseStudiesSection } from "@/components/case-studies/ManualCaseStudiesSection";
import { GLOSSARY_TERMS } from "@/lib/srsCubeAndScienceEngine";

export default function DashboardCasesPage() {
  const router = useRouter();
  const { loadManualCaseStudy } = useDashboard();

  const handleOpenCaseInWorkspace = async (
    caseId: string,
    destination: "preview" | "analysis" | "visualize" | "selection",
    preferredVariableId?: string,
  ) => {
    const previews = await loadManualCaseStudy(caseId, preferredVariableId);
    const activeJobId = previews[0]?.job_id || "";
    if (destination === "analysis") {
      router.push(
        `/workspace/data-analysis${activeJobId ? `?jobId=${encodeURIComponent(activeJobId)}` : ""}`,
      );
    } else if (destination === "visualize") {
      router.push(
        `/workspace/visualize${activeJobId ? `?jobId=${encodeURIComponent(activeJobId)}` : ""}`,
      );
    } else if (destination === "selection") {
      router.push("/workspace/data-selection");
    } else {
      router.push(
        `/workspace/data-preview${activeJobId ? `?jobId=${encodeURIComponent(activeJobId)}` : ""}`,
      );
    }
  };

  return (
    <div className="dashboard-cases-page dashboard-page-inner">
      <ManualCaseStudiesSection
        mode="dashboard"
        onOpenCaseInWorkspace={handleOpenCaseInWorkspace}
      />

      {/* SCIENTIFIC & STATISTICAL GLOSSARY */}
      <section className="dashboard-card srs-glossary-section" style={{ marginTop: "20px", padding: "24px" }}>
        <span className="section-kicker">
          <span>02</span> Scientific &amp; Statistical Glossary
        </span>
        <h3 style={{ marginTop: "6px", marginBottom: "14px" }}>
          Core Definitions Used Across Case Studies, Globe &amp; Case File
        </h3>
        <div className="srs-glossary-grid">
          {GLOSSARY_TERMS.map((item) => (
            <article className="srs-glossary-card" key={item.term}>
              <div className="srs-glossary-top">
                <strong>{item.term}</strong>
                <span className="dp-freq-badge">{item.category}</span>
              </div>
              <p>{item.definition}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
