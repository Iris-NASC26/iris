"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

export default function VisualizePlaceholderPage() {
  return (
    <section className="empty-state dashboard-card" style={{ maxWidth: "820px", margin: "0 auto" }}>
      <div className="empty-visual" aria-hidden="true">
        <div className="scan-ring ring-one" />
        <div className="scan-ring ring-two" />
        <Icon name="activity" size={54} />
      </div>
      <div className="empty-kicker">
        <span />
        Placeholder
      </div>
      <h2>Plot &amp; Visualize</h2>
      <p>
        This page is being kept as a placeholder. The complete analysis workspace, including its
        Case File tools and backend integrations, is now available in Data Analysis.
      </p>
      <Link className="dp-proceed-btn" href="/workspace/data-analysis">
        Open Data Analysis <Icon name="arrow" size={15} />
      </Link>
    </section>
  );
}
