/**
 * URL for the standalone Iris documentation site.
 * Set NEXT_PUBLIC_DOCS_URL in your deployment environment to override.
 * Run `pnpm docs:dev` to serve the docs locally on port 3001.
 */
export const DOCS_URL =
  process.env.NEXT_PUBLIC_DOCS_URL ?? "https://docs.projectiris.earth/";

export function getDocPageUrl(pageId: string): string {
  const cleanId = pageId.replace(/^#/, "").trim();
  const baseUrl = DOCS_URL.replace(/\/+$/, "");
  return `${baseUrl}/#${cleanId}`;
}
