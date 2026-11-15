import path from "path";
import type { NextConfig } from "next";

const FASTAPI_BASE = (
  process.env.FASTAPI_URL ||
  process.env.FASTAPI_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://48.202.57.192:8000"
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  transpilePackages: ["maplibre-gl", "react-map-gl", "@vis.gl/react-maplibre"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async rewrites() {
    return {
      fallback: [
        {
          source: "/api/v1/:path*",
          destination: `${FASTAPI_BASE}/api/v1/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
