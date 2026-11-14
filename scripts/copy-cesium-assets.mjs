// Copies the pinned Cesium runtime assets (workers, textures, widget css) into
// public/cesium so the bundled app never needs the unpkg/jsdelivr CDN.
// Runs on postinstall; rerun manually after bumping the cesium dependency.
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cesiumPackage = dirname(require.resolve("cesium/package.json"));
const source = join(cesiumPackage, "Build", "Cesium");
const target = join(root, "public", "cesium");

if (!existsSync(source)) {
  throw new Error(`Pinned Cesium build not found at ${source}`);
}
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(join(source, "index.js"), join(target, "index.js"));
for (const folder of ["Workers", "Assets", "ThirdParty", "Widgets"]) {
  cpSync(join(source, folder), join(target, folder), { recursive: true });
}
console.log(`Cesium ${require("cesium/package.json").version} assets copied to public/cesium`);
