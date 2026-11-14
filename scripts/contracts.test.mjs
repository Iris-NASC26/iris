/** Real generator tests use disposable directories; they never mutate tracked output. */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const script = fileURLToPath(new URL('./contracts.mjs', import.meta.url));
const files = ['contracts/openapi.json', 'src/contracts/generated.ts'];
const generate = root => execFileSync(process.execPath, [script, '--output-root', root], { encoding: 'utf8' });
const check = root => spawnSync(process.execPath, [script, '--output-root', root, '--check'], { encoding: 'utf8' });

async function temporaryOutput(t) {
  const parent = await realpath(tmpdir());
  const root = await mkdtemp(resolve(parent, 'earth-trend-contracts-'));
  t.after(async () => {
    const target = await realpath(root);
    assert.equal(dirname(target), parent);
    assert.ok(basename(target).startsWith('earth-trend-contracts-'));
    await rm(target, { recursive: true, force: true });
  });
  return root;
}

test('generation is deterministic and checking is non-mutating', async t => {
  const root = await temporaryOutput(t);
  generate(root);
  const first = await Promise.all(files.map(path => readFile(resolve(root, path), 'utf8')));
  generate(root);
  const second = await Promise.all(files.map(path => readFile(resolve(root, path), 'utf8')));
  assert.deepEqual(first, second);
  const before = await Promise.all(files.map(path => stat(resolve(root, path))));
  assert.equal(check(root).status, 0);
  const after = await Promise.all(files.map(path => stat(resolve(root, path))));
  assert.deepEqual(before.map(s => s.mtimeMs), after.map(s => s.mtimeMs));
});

for (const [label, mutate] of [
  ['enum', doc => { doc.components.schemas.AnalysisRequest.properties.schema_version.const = '2.0'; }],
  ['unit', doc => { doc.components.schemas.Series.properties.units = { const: 'K', type: 'string' }; }],
  ['nullability', doc => { doc.components.schemas.AvailableEstimate.properties.value = { type: ['number', 'null'] }; }],
]) {
  test(`stale ${label} schema fails without overwriting it`, async t => {
    const root = await temporaryOutput(t);
    generate(root);
    const path = resolve(root, files[0]);
    const document = JSON.parse(await readFile(path, 'utf8'));
    mutate(document);
    const stale = JSON.stringify(document);
    await writeFile(path, stale);
    const result = check(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Stale contract artifact: contracts\/openapi.json/);
    assert.equal(await readFile(path, 'utf8'), stale);
  });
}

test('stale generated TypeScript fails without repair', async t => {
  const root = await temporaryOutput(t);
  generate(root);
  const path = resolve(root, files[1]);
  const stale = (await readFile(path, 'utf8')) + '\n// deliberately stale\n';
  await writeFile(path, stale);
  assert.equal(check(root).status, 1);
  assert.equal(await readFile(path, 'utf8'), stale);
});

test('missing artifacts fail without creating output', async t => {
  const root = await temporaryOutput(t);
  assert.equal(check(root).status, 1);
  await assert.rejects(stat(resolve(root, 'contracts')), { code: 'ENOENT' });
});
