/** Generate from in-memory authoritative Python OpenAPI; --check never writes. */
import { execFileSync } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import openapiTS, { astToString } from 'openapi-typescript';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const { values } = parseArgs({ options: { check: { type: 'boolean' }, 'output-root': { type: 'string' } } });
const root = resolve(values['output-root'] ?? repo);
const python = resolve(repo, 'backend/.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const json = execFileSync(python, ['-m', 'earth_trend.api.schemas.export'], {
  cwd: resolve(repo, 'backend'), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
  env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
});
const document = JSON.parse(json);
const ast = await openapiTS(document, { alphabetize: true, immutable: true, defaultNonNullable: false });
const aliases = Object.keys(document.components.schemas).sort().map(name => {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error(`Unsupported schema name: ${name}`);
  return `export type ${name} = components["schemas"]["${name}"];`;
}).join('\n');
const generated = '// Generated from Python contracts. Do not edit; run python scripts/dev.py contracts.\n'
  + astToString(ast) + '\n' + aliases + '\n';
const outputs = [
  ['contracts/openapi.json', json],
  ['web/src/contracts/generated.ts', generated],
];
let stale = false;
for (const [relativePath, expected] of outputs) {
  const target = resolve(root, relativePath);
  if (values.check) {
    let existing;
    try { existing = await readFile(target, 'utf8'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (existing?.replaceAll('\r\n', '\n') !== expected.replaceAll('\r\n', '\n')) {
      console.error(`Stale contract artifact: ${relativePath}`);
      stale = true;
    }
  } else {
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, expected, 'utf8');
  }
}
if (stale) {
  console.error('Run python scripts/dev.py contracts and review both generated diffs.');
  process.exitCode = 1;
} else {
  console.log(values.check ? 'Contract drift check passed (no files written).' : 'Contract artifacts generated.');
}
