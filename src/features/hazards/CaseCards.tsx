import Link from "next/link";
import { INVESTIGATIONS, investigationHref } from "./model";
import "./hazards.css";

export function CaseCards({ compact = false }: { compact?: boolean }) {
  return (
    <section
      className="hazard-cases"
      aria-label="Disaster evidence investigations"
    >
      <div>
        <span className="hazard-kicker">
          DISASTER EVIDENCE / NEW INVESTIGATIONS
        </span>
        <h2>From a past event to a better question.</h2>
        <p>
          Trace sourced event evidence, inspect NASA precipitation context and
          explore a current point outlook.
        </p>
      </div>
      <div className="hazard-case-grid">
        <Link
          href="/workspace/case-studies/hurricane-helene-2024"
          className="hazard-case-card"
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>2024 · COMPOUND WEATHER EVENTS</span>
            <span>SOUTHEASTERN USA</span>
          </div>
          <h3>Hurricane Helene</h3>
          <p>Five signals behind an extraordinary September.</p>
          <strong>Explore Case Study →</strong>
        </Link>
        <Link
          href="/workspace/case-studies/nepal-2026"
          className="hazard-case-card"
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>2026 · MOUNTAIN CLIMATE & FLOOD</span>
            <span>NEPAL HIMALAYAS</span>
          </div>
          <h3>Nepal 2026: Mountain Climate and Flood Risk</h3>
          <p>Investigating temperature warming, high-altitude snowpack surges, and glacier-flood disasters in Rasuwa.</p>
          <strong>Explore Case Study →</strong>
        </Link>
        <Link
          href="/workspace/case-studies/cyclone-ditwah-2025"
          className="hazard-case-card"
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>2025 · CYCLONE & HYDROLOGY</span>
            <span>SRI LANKA</span>
          </div>
          <h3>Cyclone Ditwah: Sri Lanka&apos;s Hydrological Shock</h3>
          <p>Multi-variable GLDAS land-surface audit of pre-saturated soils, runoff surges, and cyclone rainfall.</p>
          <strong>Explore Case Study →</strong>
        </Link>
        <Link
          href="/workspace/case-studies/saudi-arabia-heat-2024"
          className="hazard-case-card"
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>2024 · EXTREME HEAT CRISIS</span>
            <span>MECCA, SAUDI ARABIA</span>
          </div>
          <h3>Hajj 2024: Investigating Extreme Heat</h3>
          <p>Satellite infrared sounder analysis of surface air temperature, heat-dome physics, and the June 2024 anomaly.</p>
          <strong>Explore Case Study →</strong>
        </Link>
        <Link
          href="/workspace/case-studies/libya-pakistan-floods"
          className="hazard-case-card"
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>2023 / 2022 · COMPOUND FLOODS</span>
            <span>LIBYA &amp; PAKISTAN</span>
          </div>
          <h3>Extreme Floods: Libya and Pakistan</h3>
          <p>Comparative satellite audit of Storm Daniel in Derna (2023) and Indus Basin pre-saturated soils (2022).</p>
          <strong>Explore Case Study →</strong>
        </Link>
        {INVESTIGATIONS.map((item) => (
          <Link
            key={item.id}
            href={investigationHref(item.id)}
            className="hazard-case-card"
          >
            <span>
              {item.event_start.slice(0, 4)} · Historical investigation
            </span>
            <h3>{item.title}</h3>
            {!compact && <p>{item.summary}</p>}
            <strong>Open investigation →</strong>
          </Link>
        ))}
      </div>
    </section>
  );
}
