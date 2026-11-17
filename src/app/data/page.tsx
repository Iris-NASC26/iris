"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PageShell } from "@/components/layout/PageShell";
import { InfoCard } from "@/components/layout/InfoCard";
import { PROVIDER_CAPABILITY_MATRIX } from "@/lib/srsCubeAndScienceEngine";

interface CatalogVariableItem {
  variable: string;
  code: string;
  category:
    | "Atmosphere"
    | "Water & Cryosphere"
    | "Land & Soil"
    | "Biosphere"
    | "Radiation"
    | "Oceans & Gravity";
  unit: string;
  resolution: string;
  coverage: string;
  source: string;
  subsystems: string;
  note: string;
  href: string;
}

const DATA_VARIABLES_CATALOG: CatalogVariableItem[] = [
  {
    variable: "Near-Surface Air Temperature (2 m)",
    code: "T2M",
    category: "Atmosphere",
    unit: "°C",
    resolution: "0.5° × 0.625°",
    coverage: "1981–present (Daily / Monthly)",
    source: "NASA POWER / MERRA-2",
    subsystems: "Custom Investigation · 3D Living Globe · Forecasts",
    note: "Average air temperature 2 meters above the ground, comparable to a standard weather station.",
    href: "/workspace/intelligence",
  },
  {
    variable: "Earth Skin Surface Temperature",
    code: "TS",
    category: "Land & Soil",
    unit: "°C",
    resolution: "0.5° × 0.625°",
    coverage: "1981–present (Monthly)",
    source: "NASA POWER / MERRA-2",
    subsystems: "3D Living Globe · Trend Cube",
    note: "Temperature of the ground or ocean surface itself, distinct from the air above it.",
    href: "/workspace/globe",
  },
  {
    variable: "Dew / Frost Point Temperature (2 m)",
    code: "T2MDEW",
    category: "Atmosphere",
    unit: "°C",
    resolution: "0.5° × 0.625°",
    coverage: "1981–present (Monthly)",
    source: "NASA POWER / MERRA-2",
    subsystems: "3D Living Globe · Custom Investigation",
    note: "Temperature at which air moisture condenses into dew or frost.",
    href: "/workspace/globe",
  },
  {
    variable: "Corrected Precipitation Rate",
    code: "PRECTOTCORR",
    category: "Water & Cryosphere",
    unit: "mm / day",
    resolution: "0.5° × 0.625°",
    coverage: "1981–present (Daily / Monthly)",
    source: "NASA POWER / MERRA-2 & GPM",
    subsystems: "Custom Investigation · 3D Living Globe · Disaster Studies",
    note: "Average daily rainfall and snowfall water equivalent, used for drought and flood analysis.",
    href: "/workspace/intelligence",
  },
  {
    variable: "Snow Depth",
    code: "SNODP",
    category: "Water & Cryosphere",
    unit: "cm",
    resolution: "0.5° × 0.625°",
    coverage: "1981–present (Monthly)",
    source: "NASA POWER / MERRA-2",
    subsystems: "3D Living Globe",
    note: "Average depth of snow on the ground in centimeters.",
    href: "/workspace/globe",
  },
  {
    variable: "Surface Topsoil Wetness (0–5 cm)",
    code: "GWETTOP",
    category: "Land & Soil",
    unit: "0–1 index",
    resolution: "0.5° × 0.625°",
    coverage: "1981–present (Daily / Monthly)",
    source: "NASA POWER / MERRA-2",
    subsystems: "Custom Investigation · 3D Living Globe · Case Studies",
    note: "Relative wetness of the top 5 cm of soil (from 0 completely dry to 1 saturated).",
    href: "/workspace/intelligence",
  },
  {
    variable: "Root-Zone Soil Wetness (0–100 cm)",
    code: "GWETROOT",
    category: "Land & Soil",
    unit: "0–1 index",
    resolution: "0.5° × 0.625°",
    coverage: "1981–present (Daily / Monthly)",
    source: "NASA POWER / MERRA-2 & GLDAS",
    subsystems: "Custom Investigation · 3D Living Globe",
    note: "Relative moisture across the deeper plant root zone, useful for agricultural drought tracking.",
    href: "/workspace/globe",
  },
  {
    variable: "Relative Humidity at 2 Meters",
    code: "RH2M",
    category: "Atmosphere",
    unit: "%",
    resolution: "0.5° × 0.625°",
    coverage: "1981–present (Daily / Monthly)",
    source: "NASA POWER / MERRA-2",
    subsystems: "Custom Investigation · 3D Living Globe",
    note: "Percentage of moisture in the air relative to the maximum it can hold at that temperature.",
    href: "/workspace/globe",
  },
  {
    variable: "Wind Speed at 10 Meters",
    code: "WS10M",
    category: "Atmosphere",
    unit: "m / s",
    resolution: "0.5° × 0.625°",
    coverage: "1981–present (Daily / Monthly)",
    source: "NASA POWER / MERRA-2",
    subsystems: "Custom Investigation · 3D Living Globe",
    note: "Average horizontal wind speed 10 meters above the surface.",
    href: "/workspace/globe",
  },
  {
    variable: "Surface Atmospheric Pressure",
    code: "PS",
    category: "Atmosphere",
    unit: "hPa",
    resolution: "0.5° × 0.625°",
    coverage: "1981–present (Hourly / Monthly)",
    source: "NASA POWER / MERRA-2",
    subsystems: "3D Living Globe · Forecasts",
    note: "Barometric air pressure at the local ground elevation.",
    href: "/workspace/globe",
  },
  {
    variable: "Surface Sunlight (Downward Shortwave Irradiance)",
    code: "ALLSKY_SFC_SW_DWN",
    category: "Radiation",
    unit: "W / m²",
    resolution: "1.0° × 1.0°",
    coverage: "1984–present (Monthly)",
    source: "NASA POWER / CERES",
    subsystems: "Custom Investigation · 3D Living Globe",
    note: "Solar energy reaching the Earth's surface under all sky conditions.",
    href: "/workspace/globe",
  },
  {
    variable: "Vegetation Greenness Index (MODIS NDVI)",
    code: "NDVI",
    category: "Biosphere",
    unit: "Index (−0.2 to 1.0)",
    resolution: "0.05° / 250 m",
    coverage: "2000–present (16-Day / Monthly)",
    source: "NASA MODIS Terra & Aqua",
    subsystems: "Catalog Search · Forecasts · Case Studies",
    note: "Measures plant health and forest canopy density from satellite reflectance.",
    href: "/workspace/forecasts",
  },
  {
    variable: "High-Resolution Vegetation Index (VIIRS NDVI)",
    code: "VIIRS_NDVI",
    category: "Biosphere",
    unit: "Index (0 to 1.0)",
    resolution: "500 m",
    coverage: "2012–present (16-Day)",
    source: "NASA / NOAA Suomi NPP VIIRS",
    subsystems: "Catalog Search · Forecasts",
    note: "16-day satellite vegetation greenness composite for tracking seasonal plant growth.",
    href: "/workspace/forecasts",
  },
  {
    variable: "Day & Night Land Surface Temperature",
    code: "MODIS_LST",
    category: "Land & Soil",
    unit: "°C / K",
    resolution: "1 km / 0.05°",
    coverage: "2000–present (Daily / 8-Day)",
    source: "NASA MODIS Terra",
    subsystems: "Catalog Search · Forecasts",
    note: "Direct thermal satellite measurement of daytime and nighttime land temperatures.",
    href: "/workspace/forecasts",
  },
  {
    variable: "Total Evapotranspiration",
    code: "MODIS_ET",
    category: "Biosphere",
    unit: "kg / m² / 8d",
    resolution: "500 m / 0.5°",
    coverage: "2000–present (8-Day / Monthly)",
    source: "NASA MODIS & MERRA-2",
    subsystems: "Custom Investigation · Forecasts",
    note: "Combined water vapor released into the air from soil evaporation and plant transpiration.",
    href: "/workspace/forecasts",
  },
  {
    variable: "Snow Cover Fraction",
    code: "NDSI_SNOW_COVER",
    category: "Water & Cryosphere",
    unit: "%",
    resolution: "0.05° / 500 m",
    coverage: "2000–present (Daily / Monthly)",
    source: "NASA NSIDC / MODIS Terra",
    subsystems: "Forecasts · Case Studies",
    note: "Percentage of a grid cell covered by snow as observed by satellite.",
    href: "/workspace/case-studies",
  },
  {
    variable: "SMAP Surface & Root-Zone Soil Moisture",
    code: "SMAP_SM",
    category: "Land & Soil",
    unit: "m³ / m³",
    resolution: "9 km",
    coverage: "2015–present (Daily)",
    source: "NASA SMAP Mission",
    subsystems: "Forecasts",
    note: "Satellite microwave measurements of water volume held in upper and root-zone soil.",
    href: "/workspace/forecasts",
  },
  {
    variable: "GLDAS Land Surface Hydrology (Soil Moisture & Runoff)",
    code: "GLDAS_NOAH",
    category: "Water & Cryosphere",
    unit: "kg / m²",
    resolution: "0.25° × 0.25°",
    coverage: "2000–present (Daily / Monthly)",
    source: "NASA GES DISC / GLDAS",
    subsystems: "Custom Investigation · Forecasts",
    note: "Tracks soil moisture, surface water runoff, and terrestrial water storage across land basins.",
    href: "/workspace/intelligence",
  },
  {
    variable: "Satellite & Ensemble Daily Precipitation",
    code: "GPM_IMERG / PRECIP",
    category: "Water & Cryosphere",
    unit: "mm / day · mm",
    resolution: "0.1° × 0.1° & Point",
    coverage: "2000–present (Daily & 3-Hourly)",
    source: "NASA GPM IMERG & ECMWF Ensemble",
    subsystems: "Forecasts",
    note: "Combines recent NASA satellite rainfall observations with 51-member weather ensemble outlooks.",
    href: "/workspace/forecasts",
  },
  {
    variable: "Ground Weather Station Records",
    code: "TAVG / PRCP / SNOW",
    category: "Atmosphere",
    unit: "°C · mm · m/s",
    resolution: "Weather Station Points",
    coverage: "1900–present (Daily / Monthly)",
    source: "NOAA Climate Data Online & OneStop",
    subsystems: "Custom Investigation",
    note: "Quality-controlled temperature, rainfall, snowfall, and wind measurements from ground stations.",
    href: "/workspace/intelligence",
  },
  {
    variable: "ERA5 Global & Land Climate Reanalysis",
    code: "ERA5_REANALYSIS",
    category: "Atmosphere",
    unit: "°C · mm · W/m²",
    resolution: "0.25° / 0.1°",
    coverage: "1940–present (Daily / Monthly)",
    source: "Copernicus Climate Data Store (ECMWF)",
    subsystems: "Custom Investigation · Forecasts",
    note: "Long-term global temperature, precipitation, soil moisture, and wind records.",
    href: "/workspace/intelligence",
  },
  {
    variable: "Sea Surface Temperature & Groundwater Storage",
    code: "SST_MUR / GRACE",
    category: "Oceans & Gravity",
    unit: "°C · cm water",
    resolution: "0.25° / 0.5°",
    coverage: "2002–present (Monthly)",
    source: "NASA JPL PO.DAAC (GHRSST & GRACE)",
    subsystems: "Global Trend Cube",
    note: "Tracks ocean surface warming and changes in continental water storage.",
    href: "/workspace/globe",
  },
];

const QA_FLAGS_SPEC = [
  {
    flag: "Valid Observation",
    badgeClass: "valid",
    meaning:
      "The measurement passed all agency quality checks and is included in charts and statistical tests.",
  },
  {
    flag: "Missing Observation",
    badgeClass: "flagged",
    meaning:
      "No measurement was recorded for this date. Iris leaves a visible gap on the chart rather than guessing or filling in a fake number.",
  },
  {
    flag: "Quality-Flagged (Cloud / Sensor)",
    badgeClass: "flagged",
    meaning:
      "The satellite view was blocked by clouds, snow glare, or a temporary sensor issue. Excluded from trend calculations with the reason noted in the table.",
  },
  {
    flag: "Out of Physical Bounds",
    badgeClass: "flagged",
    meaning:
      "A corrupted reading fell outside physically possible limits and was automatically filtered out.",
  },
];

export default function DataCatalogPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All variables");

  const categories = [
    "All variables",
    "Atmosphere",
    "Water & Cryosphere",
    "Land & Soil",
    "Biosphere",
    "Radiation",
    "Oceans & Gravity",
  ];

  const filtered = useMemo(
    () =>
      DATA_VARIABLES_CATALOG.filter(
        (item) =>
          (category === "All variables" || item.category === category) &&
          `${item.variable} ${item.code} ${item.source} ${item.subsystems} ${item.note}`
            .toLowerCase()
            .includes(query.toLowerCase())
      ),
    [category, query]
  );

  return (
    <PageShell
      action={
        <Link className="primary-page-button" href="/workspace/intelligence">
          Search Live Data <Icon name="arrow" size={15} />
        </Link>
      }
      description="Every investigation in Project Iris starts with real, publicly funded Earth observations from NASA, NOAA, and European climate archives. Browse the environmental variables and data providers available across the workspace."
      section="Our Data"
      title="Trusted public Earth observations, ready to explore"
    >
      {/* ─── 1. CATALOG OVERVIEW CARDS ───────────────────────────────── */}
      <section className="catalog-overview">
        {[
          ["layers", String(DATA_VARIABLES_CATALOG.length), "Environmental variables"],
          ["globe", "10 Catalogs", "Connected space & weather agencies"],
          ["activity", "11 Globe Layers", "Monthly 3D global maps"],
          ["check", "100% Real", "No synthetic or fabricated data"],
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

      {/* ─── 2. SEARCHABLE & FILTERABLE VARIABLE CATALOG TABLE ───────── */}
      <section className="catalog-panel">
        <div className="catalog-tools" style={{ flexWrap: "wrap" }}>
          <div className="catalog-search">
            <Icon name="search" size={17} />
            <input
              aria-label="Search data variables"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search variables (e.g. temperature, rainfall, NDVI, snow) or sources…"
              value={query}
            />
          </div>
          <div className="catalog-filters" style={{ flexWrap: "wrap" }}>
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
                <th>Category</th>
                <th>Source Agency</th>
                <th>Unit</th>
                <th>Resolution</th>
                <th>Time Span</th>
                <th>Where to Use It &amp; What It Measures</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.code}>
                  <td>
                    <div className="variable-name">
                      <span>{item.code.slice(0, 3)}</span>
                      <div>
                        <strong>{item.variable}</strong>
                        <small>{item.code}</small>
                      </div>
                    </div>
                  </td>
                  <td>{item.category}</td>
                  <td style={{ whiteSpace: "normal", minWidth: "180px" }}>{item.source}</td>
                  <td>
                    <code>{item.unit}</code>
                  </td>
                  <td>{item.resolution}</td>
                  <td>{item.coverage}</td>
                  <td style={{ whiteSpace: "normal", minWidth: "250px", lineHeight: 1.45 }}>
                    <div style={{ fontWeight: 600, color: "var(--foreground)", fontSize: "8.5px" }}>
                      {item.subsystems}
                    </div>
                    <div style={{ color: "var(--muted)", fontSize: "8px", marginTop: "2px" }}>
                      {item.note}
                    </div>
                  </td>
                  <td>
                    <Link aria-label={`Investigate ${item.variable}`} href={item.href}>
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
              <span>Try a broader search term or another category.</span>
            </div>
          )}
        </div>
      </section>

      {/* ─── 3. 10 CONNECTED DATA PROVIDERS ──────────────────────────── */}
      <section className="method-process" style={{ marginTop: "64px" }}>
        <div className="method-section-heading" style={{ maxWidth: "780px" }}>
          <div className="section-kicker">
            <span>Data Providers</span> Where our observations come from
          </div>
          <h2>Ten public space, weather, and climate archives</h2>
          <p>
            Iris connects directly to 10 established scientific data providers. Each dataset clearly
            shows whether it can be retrieved immediately into the workspace or requires an agency
            account sign-in.
          </p>
        </div>

        <div className="dashboard-table-wrap" style={{ marginTop: "18px" }}>
          <table>
            <thead>
              <tr>
                <th>Provider &amp; Agency</th>
                <th>Catalog Search</th>
                <th>Data Retrieval</th>
                <th>Supported Areas &amp; Time Steps</th>
                <th>What It Provides</th>
              </tr>
            </thead>
            <tbody>
              {PROVIDER_CAPABILITY_MATRIX.map((prov) => (
                <tr key={prov.provider_id}>
                  <td>
                    <strong>{prov.provider_name}</strong>
                    <div style={{ fontSize: "11px", color: "var(--muted)" }}>{prov.agency}</div>
                  </td>
                  <td>
                    <span className="quality-badge valid">
                      {prov.catalog_state === "extract_verified"
                        ? "Ready to search & retrieve"
                        : "Catalog searchable"}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`quality-badge ${
                        prov.extraction_state === "extract_verified" ? "valid" : "flagged"
                      }`}
                    >
                      {prov.extraction_state === "extract_verified"
                        ? "Direct retrieval"
                        : prov.extraction_state === "credential_required"
                        ? "Requires agency sign-in"
                        : "Catalog discovery"}
                    </span>
                  </td>
                  <td style={{ fontSize: "11.5px" }}>
                    <div>
                      <b>Areas:</b> {prov.supported_geometries.join(", ")}
                    </div>
                    <div>
                      <b>Time steps:</b> {prov.native_cadences.join(", ")}
                    </div>
                  </td>
                  <td style={{ fontSize: "11.5px", maxWidth: "380px" }}>
                    <div>{prov.notes}</div>
                    <div style={{ color: "var(--muted)", marginTop: "2px" }}>
                      <b>Access:</b> {prov.auth_mechanism}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── 4. QUALITY CONTROL & DATA INTEGRITY ─────────────────────── */}
      <section className="method-process" style={{ marginTop: "56px" }}>
        <div className="method-section-heading" style={{ maxWidth: "780px" }}>
          <div className="section-kicker">
            <span>Quality Control</span> How we handle missing or noisy readings
          </div>
          <h2>Clear quality labels on every observation</h2>
          <p>
            Every observation retrieved by Iris keeps its quality label from the source agency so you
            can always see which points were used in your analysis and which were excluded.
          </p>
        </div>

        <div className="srs-grade-rubric-grid">
          {QA_FLAGS_SPEC.map((item) => (
            <article className="srs-rubric-card" key={item.flag}>
              <div className="srs-rubric-head">
                <span className={`quality-badge ${item.badgeClass}`}>{item.flag}</span>
              </div>
              <p>{item.meaning}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="data-principles">
        <div>
          <div className="section-kicker">
            <span>Our standard</span> Data integrity
          </div>
          <h2>Evidence should always be inspectable</h2>
        </div>
        <div className="principle-grid">
          <InfoCard
            icon="external"
            number="01"
            title="Clear source citations"
            text="Every chart and Case File links directly back to its original agency, satellite mission, and official citation."
          />
          <InfoCard
            icon="activity"
            number="02"
            title="Honest handling of gaps"
            text="Missing observations and cloud-blocked readings stay visible throughout your analysis—never hidden or filled with fake data."
          />
          <InfoCard
            icon="file"
            number="03"
            title="Downloadable tables & reports"
            text="Exported CSV and JSON tables preserve units, region coordinates, quality flags, and source information for your own work."
          />
        </div>
      </section>
    </PageShell>
  );
}
