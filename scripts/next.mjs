/** Cross-platform local Next.js entry; no dotenv, credentials or provider calls. */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const phase = process.argv[2];
if (!['dev', 'build', 'start'].includes(phase)) throw new Error('Expected dev, build or start.');
const cli = createRequire(import.meta.url).resolve('next/dist/bin/next');
const args = phase === 'build' ? ['build'] : [phase, '--hostname', '127.0.0.1', '--port', '5173'];
const child = spawn(process.execPath, [cli, ...args], {
  cwd: fileURLToPath(new URL('../', import.meta.url)), stdio: 'inherit',
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1', EARTH_TREND_NEXT_DEV: phase === 'dev' ? '1' : '0' },
});
child.on('error', () => { console.error('Could not start the local Next.js process.'); process.exitCode = 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', code => { process.exitCode = code ?? 1; });
