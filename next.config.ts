import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    serverActions: {
      // Bild-Upload bei Ideen (A8, Stufe 3, #95): Standardlimit 1 MB reicht
      // für Fotos nicht. 5 MB Spielraum für ein max. 4 MB großes Bild plus
      // multipart-Overhead (siehe updateGift() / MAX_GIFT_IMAGE_BYTES).
      bodySizeLimit: "5mb",
    },
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
