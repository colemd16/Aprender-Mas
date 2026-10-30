import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets other devices on the home network (e.g. a phone) use the dev server at this
  // Mac's address. Only affects `next dev`. Update it if the Mac's address changes.
  allowedDevOrigins: ["10.0.0.93"],
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
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
