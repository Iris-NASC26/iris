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
