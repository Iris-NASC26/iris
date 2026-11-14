/** Shared local HTTP policy. No credential or dotenv access. */
const hosts = new Set(['127.0.0.1:5173', 'localhost:5173']);
const origins = new Set(['http://127.0.0.1:5173', 'http://localhost:5173']);

export function localRequestAllowed(headers: Headers): boolean {
  const host = headers.get('host');
  const origin = headers.get('origin');
  return host !== null && hosts.has(host.toLowerCase()) &&
    (origin === null || origins.has(origin));
}
