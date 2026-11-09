import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Auth + Postgres pages are fully dynamic; keep classic rendering.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
