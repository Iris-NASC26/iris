/* ─── Iris Documentation — Navigation & Rendering ─────────────────────── */

const NAV = [
  {
    section: "Getting Started",
    items: [
      { id: "getting-started",    title: "Introduction",         icon: "🌍" },
      { id: "quick-start",        title: "Quick Start Guide",    icon: "⚡" },
    ],
  },
  {
    section: "Using the Workspace",
    items: [
      { id: "workspace-overview",    title: "Workspace Overview",      icon: "🗺️" },
      { id: "system-intelligence",   title: "System Intelligence",     icon: "🤖" },
      { id: "data-selection",        title: "Data Selection",          icon: "📊" },
      { id: "data-preview",          title: "Data Preview",            icon: "👁️" },
      { id: "visualize",             title: "Plot & Visualize",        icon: "📈" },
    ],
  },
  {
    section: "Global Evidence",
    items: [
      { id: "globe",       title: "Living Globe",         icon: "🌐" },
      { id: "case-studies", title: "Case Studies",        icon: "📋" },
    ],
  },
  {
    section: "Science & Methods",
    items: [
      { id: "methodology",   title: "Scientific Methodology",   icon: "🔬" },
      { id: "data-sources",  title: "Data Sources & Variables", icon: "🛰️" },
    ],
  },
  {
    section: "Reference",
    items: [
      { id: "glossary", title: "Glossary", icon: "📖" },
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
    <div class="docs-nav-section">
      <span class="docs-nav-section-label">${group.section}</span>
      ${group.items
        .map(
          (item) => `
        <a
          class="docs-nav-link"
          href="#${item.id}"
          data-page="${item.id}"
        >
          <span class="nav-icon">${item.icon}</span>
          ${item.title}
        </a>`
        )
        .join("")}
    </div>`
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
  const page = PAGE_INDEX[id] || { title: id, icon: "📄" };
  const html = window.marked ? window.marked.parse(markdown) : markdown;

  // Find section label
  const section = NAV.find((g) => g.items.some((i) => i.id === id));
  const sectionLabel = section ? section.section : "Docs";

  document.getElementById("content-area").innerHTML = `
    <div class="docs-breadcrumb">
      <span>${sectionLabel}</span>
      <span>›</span>
      ${page.title}
    </div>
    <article class="docs-content">
      ${html}
      <div class="docs-page-footer">
        <span>Last updated: November 2026 · Draft</span>
        <a href="https://github.com/search?q=Iris&type=repositories" target="_blank" rel="noreferrer">
          Edit this page ↗
        </a>
      </div>
    </article>`;

  // Scroll to top
  window.scrollTo({ top: 0 });

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
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (prefersDark ? "dark" : "light");
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
  if (btn) btn.textContent = theme === "dark" ? "☀️" : "🌙";
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

  // Handle back/forward
  window.addEventListener("popstate", () => {
    const id = getPageFromHash();
    currentPage = null; // force reload
    navigate(id, false);
  });
});
