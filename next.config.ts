import type { NextConfig } from 'next';
import path from 'node:path';

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Keep dev and build artifacts separate so a production check cannot break a demo.
  distDir: process.env.EARTH_TREND_NEXT_DEV === '1' ? '.next-dev' : '.next',
  turbopack: { root: path.resolve(import.meta.dirname) },
  outputFileTracingRoot: path.resolve(import.meta.dirname),
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'same-origin' },
    ] }];
  },
};
export default config;
