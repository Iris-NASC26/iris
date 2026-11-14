"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PageShell } from "@/components/layout/PageShell";
import { InfoCard } from "@/components/layout/InfoCard";

const dataSources = [
  [
    "Near-surface air temperature",
    "T2M",
    "Atmosphere",
    "°C",
    "0.5° × 0.625°",
    "1981–present",
    "NASA POWER / MERRA-2",
  ],
  [
    "Precipitation",
    "PRECTOTCORR",
    "Water",
    "mm / day",
    "0.5° × 0.625°",
    "1981–present",
    "NASA POWER / GPM",
  ],
  [
    "Topsoil moisture",
    "GWETTOP",
    "Land",
    "0–1",
    "0.5° × 0.625°",
    "1981–present",
    "NASA POWER / MERRA-2",
  ],
  ["Vegetation index", "NDVI", "Biosphere", "Index", "0.05°", "2000–present", "MODIS MOD13C2"],
  [
    "Surface solar radiation",
    "ALLSKY_SFC_SW_DWN",
    "Energy",
    "kWh / m² / day",
    "1° × 1°",
    "1984–present",
    "NASA POWER / CERES",
  ],
  [
    "Relative humidity",
    "RH2M",
    "Atmosphere",
    "%",
    "0.5° × 0.625°",
    "1981–present",
    "NASA POWER / MERRA-2",
  ],
].map(([variable, code, category, unit, resolution, coverage, source]) => ({
  variable,
  code,
  category,
  unit,
  resolution,
  coverage,
  source,
}));

export default function DataCatalogPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All variables");
  const categories = ["All variables", "Atmosphere", "Water", "Land", "Biosphere"];
  const filtered = useMemo(
    () =>
      dataSources.filter(
        (item) =>
          (category === "All variables" || item.category === category) &&
          `${item.variable} ${item.code} ${item.source}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [category, query],
  );

  return (
    <PageShell
      action={
        <a
          className="secondary-page-button"
          href="https://power.larc.nasa.gov/"
          rel="noreferrer"
          target="_blank"
        >
          NASA POWER API <Icon name="external" size={15} />
        </a>
      }
      description="Every investigation begins with transparent, well-documented Earth observation data. Browse the variables currently available in the workbench."
      section="Data foundation"
      title="A catalog built for traceable science"
    >
      <section className="catalog-overview">
        {[
          ["layers", "18", "Analysis-ready variables"],
          ["globe", "Global", "Land and ocean coverage"],
          ["activity", "40+ years", "Longest continuous record"],
          ["check", "Open", "Public, cited sources"],
        ].map(([icon, value, label]) => (
          <div className="catalog-stat" key={label}>
            <Icon name={icon as IconName} size={20} />
            <div>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          </div>
        ))}
      </section>

      <section className="catalog-panel">
        <div className="catalog-tools">
          <div className="catalog-search">
            <Icon name="search" size={17} />
            <input
              aria-label="Search data variables"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search variables, codes, or sources…"
              value={query}
            />
          </div>
          <div className="catalog-filters">
            {categories.map((item) => (
              <button
                className={category === item ? "active" : ""}
                key={item}
                onClick={() => setCategory(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="catalog-table-wrap">
          <table className="catalog-table">
            <thead>
              <tr>
                <th>Variable</th>
                <th>Source</th>
                <th>Unit</th>
                <th>Resolution</th>
                <th>Coverage</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.code}>
                  <td>
                    <div className="variable-name">
                      <span>{item.code.slice(0, 2)}</span>
                      <div>
                        <strong>{item.variable}</strong>
                        <small>{item.code}</small>
                      </div>
                    </div>
                  </td>
                  <td>{item.source}</td>
                  <td>
                    <code>{item.unit}</code>
                  </td>
                  <td>{item.resolution}</td>
                  <td>{item.coverage}</td>
                  <td>
                    <Link aria-label={`Investigate ${item.variable}`} href="/workspace">
                      <Icon name="arrow" size={15} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="catalog-empty">
              <Icon name="search" size={24} />
              <strong>No matching variables</strong>
              <span>Try a broader term or another category.</span>
            </div>
          )}
        </div>
      </section>

      <section className="data-principles">
        <div>
          <div className="section-kicker">
            <span>Our standard</span> Data integrity
          </div>
          <h2>Evidence should be inspectable</h2>
        </div>
        <div className="principle-grid">
          <InfoCard
            icon="external"
            number="01"
            title="Source traceability"
            text="Every result links back to its original provider and variable identifier."
          />
          <InfoCard
            icon="activity"
            number="02"
            title="Quality transparency"
            text="Missing observations and quality flags remain visible throughout analysis."
          />
          <InfoCard
            icon="file"
            number="03"
            title="Reproducible exports"
            text="Downloaded tables preserve units, spatial bounds, and transformation history."
          />
        </div>
      </section>
    </PageShell>
  );
}
