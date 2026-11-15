/* ─── Iris Documentation — Navigation & Rendering ─────────────────────── */

const NAV = [
  {
    section: "Getting Started",
    items: [
      { id: "getting-started", title: "Platform Introduction" },
      { id: "quick-start", title: "Quick Start" },
      { id: "local-running", title: "Local Running" },
      { id: "workspace-overview", title: "Workspace Overview" },
    ],
  },
  {
    section: "User Guide",
    items: [
      { id: "dashboard", title: "Dashboard" },
      { id: "super-intelligence", title: "Super Intelligence" },
      { id: "data-selection", title: "Data Selection" },
      { id: "data-preview", title: "Data Preview" },
      { id: "data-analysis", title: "Data Analysis" },
      { id: "visualize", title: "Plot & Visualize" },
      { id: "globe", title: "Living Globe" },
      { id: "case-studies", title: "Case Studies" },
      { id: "forecasts", title: "Precipitation Forecasts" },
      { id: "hazards", title: "Hazard Investigations" },
      { id: "research", title: "Existing Research" },
    ],
  },
  {
    section: "Scientific Foundations",
    items: [
      { id: "architecture-overview", title: "Architecture Overview" },
      { id: "methodology", title: "Scientific Methodology" },
      { id: "data-sources", title: "Data Sources & Variables" },
    ],
  },
  {
    section: "Reference",
    items: [
      { id: "glossary", title: "Glossary" },
      { id: "comprehensive-documentation", title: "Complete Platform Reference" },
    ],
  },
];

/* ─── Flat lookup ────────────────────────────────────────────────────────── */

const ALL_PAGES = NAV.flatMap((s) => s.items);
const PAGE_INDEX = Object.fromEntries(ALL_PAGES.map((p) => [p.id, p]));

/* ─── State ─────────────────────────────────────────────────────────────── */

let currentPage = null;

/* ─── Build sidebar ─────────────────────────────────────────────────────── */

function buildSidebar() {
  const nav = document.getElementById("sidebar-nav");
  if (!nav) return;
  nav.innerHTML = NAV.map(
    (group) => `
    <details class="docs-nav-section" open>
      <summary class="docs-nav-section-label">${group.section}</summary>
      <div class="docs-nav-section-items">
        ${group.items
          .map(
            (item) => `
          <a
            class="docs-nav-link"
            href="#${item.id}"
            data-page="${item.id}"
          >${item.title}</a>`
          )
          .join("")}
      </div>
    </details>`
  ).join("");

  nav.querySelectorAll("[data-page]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const id = link.getAttribute("data-page");
      navigate(id, true);
      closeSidebar();
    });
  });
}

/* ─── Routing ───────────────────────────────────────────────────────────── */

function getPageFromHash() {
  const hash = window.location.hash.replace("#", "").trim();
  return PAGE_INDEX[hash] ? hash : "getting-started";
}

function navigate(id, pushState = false) {
  if (!PAGE_INDEX[id]) id = "getting-started";
  if (currentPage === id) return;
  currentPage = id;

  if (pushState) {
    window.history.pushState({ page: id }, "", `#${id}`);
  } else {
    window.history.replaceState({ page: id }, "", `#${id}`);
  }

  updateActiveNav(id);
  loadPage(id);
}

function updateActiveNav(id) {
  document.querySelectorAll(".docs-nav-link").forEach((el) => {
    el.classList.toggle("active", el.getAttribute("data-page") === id);
  });
}

/* ─── Page loading ───────────────────────────────────────────────────────── */

function showLoading() {
  document.getElementById("content-area").innerHTML = `
    <div id="content-loading">
      <div class="spinner"></div>
      <span>Loading…</span>
    </div>`;
}

function loadPage(id) {
  showLoading();
  const url = `pages/${id}.md`;

  fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.text();
    })
    .then((md) => renderPage(id, md))
    .catch((err) => {
      console.error("Failed to load page:", id, err);
      renderError(id, err);
    });
}

function renderPage(id, markdown) {
  const page = PAGE_INDEX[id] || { title: id };
  const html = window.marked ? window.marked.parse(markdown) : markdown;

  // Find section label
  const section = NAV.find((g) => g.items.some((i) => i.id === id));
  const sectionLabel = section ? section.section : "Docs";

  // Build pagination links (Previous / Next)
  const currentIndex = ALL_PAGES.findIndex((p) => p.id === id);
  const prevPage = currentIndex > 0 ? ALL_PAGES[currentIndex - 1] : null;
  const nextPage =
    currentIndex >= 0 && currentIndex < ALL_PAGES.length - 1
      ? ALL_PAGES[currentIndex + 1]
      : null;

  let paginationHtml = "";
  if (prevPage || nextPage) {
    paginationHtml = `
      <nav class="docs-pagination" aria-label="Page navigation">
        ${
          prevPage
            ? `<a class="docs-pagination-link docs-pagination-prev" href="#${prevPage.id}" data-page="${prevPage.id}">
                <span class="docs-pagination-sub">Previous</span>
                <span class="docs-pagination-title">← ${prevPage.title}</span>
              </a>`
            : `<div class="docs-pagination-empty"></div>`
        }
        ${
          nextPage
            ? `<a class="docs-pagination-link docs-pagination-next" href="#${nextPage.id}" data-page="${nextPage.id}">
                <span class="docs-pagination-sub">Next</span>
                <span class="docs-pagination-title">${nextPage.title} →</span>
              </a>`
            : `<div class="docs-pagination-empty"></div>`
        }
      </nav>`;
  }

  document.getElementById("content-area").innerHTML = `
    <article class="docs-content">
      <div class="docs-breadcrumb">
        <span>${sectionLabel}</span>
        <span>›</span>
        ${page.title}
      </div>
      ${html}
      ${paginationHtml}
      <div class="docs-page-footer">
        <span>Last updated: November 2026 · Draft</span>
        <a href="https://github.com/search?q=Iris&type=repositories" target="_blank" rel="noreferrer">
          Edit this page ↗
        </a>
      </div>
    </article>`;

  // Scroll to top
  window.scrollTo({ top: 0 });

  // Attach pagination click handlers
  document.querySelectorAll(".docs-pagination-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = link.getAttribute("data-page");
      if (targetId) {
        navigate(targetId, true);
        closeSidebar();
      }
    });
  });

  // Build in-page TOC
  buildTOC();

  // Add IDs to headings if missing
  document.querySelectorAll(".docs-content h2, .docs-content h3").forEach((h) => {
    if (!h.id) {
      h.id = h.textContent
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
    }
  });

  // Set page <title>
  document.title = `${page.title} · Iris Documentation`;
}

function renderError(id, err) {
  document.getElementById("content-area").innerHTML = `
    <article class="docs-content">
      <h1>Page not found</h1>
      <p>Could not load <code>${id}.md</code>. ${
        err.message.includes("Failed to fetch")
          ? `<br><br><strong>Running locally?</strong> Make sure you are serving the documentation with a local server:
             <pre><code>npx serve documentation -p 3001</code></pre>
             Or run <code>pnpm docs:dev</code> from the project root.`
          : err.message
      }</p>
    </article>`;
}

/* ─── In-page TOC ───────────────────────────────────────────────────────── */

function buildTOC() {
  const tocEl = document.getElementById("toc-list");
  if (!tocEl) return;

  const headings = document.querySelectorAll(".docs-content h2");
  if (headings.length < 2) {
    tocEl.innerHTML = "";
    return;
  }

  const label = document.querySelector(".docs-toc-label");
  if (label) label.style.display = "block";

  tocEl.innerHTML = Array.from(headings)
    .map(
      (h) =>
        `<a href="#${h.id}">${h.textContent.replace(/^#+\s*/, "")}</a>`
    )
    .join("");
}

/* ─── Theme ─────────────────────────────────────────────────────────────── */

function initTheme() {
  const saved = localStorage.getItem("iris-docs-theme");
  const theme = saved || "light";
  document.documentElement.setAttribute("data-theme", theme);
  updateThemeButton(theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("iris-docs-theme", next);
  updateThemeButton(next);
}

function updateThemeButton(theme) {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;

  const isDark = theme === "dark";
  const icon = isDark ? "light_mode" : "dark_mode";
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  btn.innerHTML = `<span class="material-symbols-outlined material-icons" aria-hidden="true">${icon}</span>`;
  btn.setAttribute("aria-label", label);
  btn.setAttribute("title", label);
}

/* ─── Mobile sidebar ─────────────────────────────────────────────────────── */

function openSidebar() {
  document.getElementById("sidebar").classList.add("open");
}
function closeSidebar() {
  document.getElementById("sidebar").classList.remove("open");
}

/* ─── Init ───────────────────────────────────────────────────────────────── */

document.addEventListener("DOMContentLoaded", () => {
  buildSidebar();
  initTheme();

  document.getElementById("theme-toggle")?.addEventListener("click", toggleTheme);
  document.getElementById("sidebar-toggle")?.addEventListener("click", openSidebar);

  // Initial page
  navigate(getPageFromHash(), false);

  // Handle back/forward and hash changes
  window.addEventListener("popstate", () => {
    const id = getPageFromHash();
    currentPage = null; // force reload
    navigate(id, false);
  });

  window.addEventListener("hashchange", () => {
    const id = getPageFromHash();
    if (currentPage !== id) {
      currentPage = null;
      navigate(id, false);
    }
  });
});
