import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";
import {
  NEXT_IMAGE_LOCAL_PATTERNS,
  NEXT_IMAGE_REMOTE_PATTERNS,
} from "./src/lib/config/next-image";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  experimental: {
    /** Keep recently visited routes warm in the client router cache for snappier back/forward nav */
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
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
    /** Fewer breakpoints = less CPU on Hostinger image optimizer under catalog traffic */
    deviceSizes: [640, 1080, 1920],
    imageSizes: [32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 86400,
    localPatterns: NEXT_IMAGE_LOCAL_PATTERNS,
    remotePatterns: NEXT_IMAGE_REMOTE_PATTERNS,
  },
};

export default withNextIntl(nextConfig);
