# Iris Documentation Site

Standalone static documentation website for the Iris Earth intelligence platform. Completely separate from the main Next.js application.

## Stack

- Pure HTML + CSS + JavaScript (no build step, no framework)
- Markdown content pages rendered client-side via [marked.js](https://marked.js.org/) (CDN)
- Zero dependencies to install

## Running locally

From the **project root**:

```bash
pnpm docs:dev
```

This serves the documentation on **http://localhost:3001**.

The main Iris app runs on http://localhost:3000. Both can run simultaneously.

If you don't have the project root available, you can serve directly:

```bash
npx serve documentation -p 3001
```

## Adding a new documentation page

1. Create a new Markdown file in `documentation/pages/`:
   ```
   documentation/pages/my-new-page.md
   ```

2. Write the page content in standard Markdown. Use headings (`##`, `###`) for structure — they automatically appear in the in-page table of contents.

3. Register the page in `documentation/assets/docs.js`. Find the `NAV` array at the top of the file and add an entry in the appropriate section:
   ```js
   { id: "my-new-page", title: "My New Page", icon: "📄" }
   ```
   The `id` must exactly match the filename (without `.md`).

4. That's it. The page will appear in the sidebar navigation automatically.

## Directory structure

```
documentation/
├── index.html              # Docs site shell (sidebar + content area)
├── README.md               # This file
├── assets/
│   ├── docs.css            # Iris-themed stylesheet
│   └── docs.js             # Navigation, routing, Markdown rendering
└── pages/                  # One .md file per documentation page
    ├── getting-started.md
    ├── quick-start.md
    ├── workspace-overview.md
    ├── system-intelligence.md
    ├── data-selection.md
    ├── data-preview.md
    ├── visualize.md
    ├── globe.md
    ├── case-studies.md
    ├── methodology.md
    ├── data-sources.md
    └── glossary.md
```

## Deployment

The documentation site is a static folder with no build step. To deploy:

- **Vercel / Netlify / GitHub Pages:** Deploy the `documentation/` folder as a static site
- **Custom domain:** Point `docs.iris.earth` or similar at the deployed site
- **Same server:** Serve from a subdirectory or subdomain alongside the main app

## Linking from the main app

The main app reads the docs URL from the environment variable `NEXT_PUBLIC_DOCS_URL`.

- **Development default:** `http://localhost:3001` (defined in `src/lib/docs.ts`)
- **Production:** Set `NEXT_PUBLIC_DOCS_URL=https://docs.iris.earth` in deployment environment variables

## Contributing

The documentation is intentionally written in plain Markdown so that anyone familiar with the platform can contribute. When adding content:

- Write for a newcomer who has never used Iris before
- Use concrete examples and avoid jargon without explanation (or link to the Glossary)
- Keep each page focused on one topic
- Update the Glossary when introducing a new term
