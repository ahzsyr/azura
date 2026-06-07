import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "@radix-ui/react-accordion",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-label",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-select",
      "@radix-ui/react-separator",
      "@radix-ui/react-slot",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
    ],
  },
  /** Set OUTPUT_STANDALONE=1 before build to deploy a prebuilt bundle on Hostinger (no on-server build). */
  ...(process.env.OUTPUT_STANDALONE === "1" ? { output: "standalone" as const } : {}),
  /** Hostinger build blocks scanning folders named `admin`; URLs stay /api/admin via rewrite */
  async rewrites() {
    return [
      {
        source: "/api/admin/:path*",
        destination: "/api/manage/:path*",
      },
    ];
  },
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
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default withNextIntl(nextConfig);
