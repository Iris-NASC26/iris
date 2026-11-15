import { cpSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = dirname(require.resolve("maplibre-gl/dist/maplibre-gl.mjs"));
const publicDir = join(root, "public");
const workers = ["maplibre-gl-worker.mjs", "maplibre-gl-worker-dev.mjs"];

mkdirSync(publicDir, { recursive: true });

for (const worker of workers) {
  const source = join(dist, worker);
  if (!existsSync(source)) {
    throw new Error(`MapLibre worker bundle not found at ${source}`);
  }
  cpSync(source, join(publicDir, worker));
}

console.log(`MapLibre ${require("maplibre-gl/package.json").version} worker bundles copied to public`);
