/**
 * URL for the standalone Iris documentation site.
 * Set NEXT_PUBLIC_DOCS_URL in your deployment environment to override.
 * Run `pnpm docs:dev` to serve the docs locally on port 3001.
 */
export const DOCS_URL =
  process.env.NEXT_PUBLIC_DOCS_URL ?? "http://localhost:3001";

export function getDocPageUrl(pageId: string): string {
  const cleanId = pageId.replace(/^#/, "").trim();
  return `${DOCS_URL}/#${cleanId}`;
}
