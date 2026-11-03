import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  async redirects() {
    return [{ source: "/", destination: "/play", permanent: false }];
  },
  partialPrefetching: true,
  // Share images read pictures from public/ at runtime: ship them with those serverless functions on Vercel.
  outputFileTracingIncludes: {
    "/api/og/**": ["./public/assets/worlds/*.png", "./public/assets/brand/*.png", "./public/assets/characters/*.png"],
    "/opengraph-image": ["./public/assets/worlds/*.png", "./public/assets/brand/*.png", "./public/assets/characters/*.png"],
    "/twitter-image": ["./public/assets/worlds/*.png", "./public/assets/brand/*.png", "./public/assets/characters/*.png"],
  },
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
