import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 86400,
    /** Local catalog paths (/uploads, /assets) are served from public/ — no remotePatterns needed */
    localPatterns: [
      { pathname: "/uploads/**" },
      { pathname: "/assets/**" },
    ],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "utfs.io" },
      { protocol: "https", hostname: "*.uploadthing.com" },
      { protocol: "https", hostname: "uploadthing.com" },
      { protocol: "https", hostname: "developers.elementor.com" },
    ],
  },
};

export default withNextIntl(nextConfig);
