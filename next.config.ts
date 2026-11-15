import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Set NEXT_OUTPUT=standalone in Docker builds (deployment/Dockerfile.frontend).
  ...(process.env.NEXT_OUTPUT === "standalone" ? { output: "standalone" as const } : {}),
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
};

export default nextConfig;
