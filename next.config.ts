import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";
import packageJson from "./package.json";
import {
  NEXT_IMAGE_LOCAL_PATTERNS,
  NEXT_IMAGE_REMOTE_PATTERNS,
} from "./src/lib/config/next-image";
import { parsePreferredApexSiteUrl } from "./src/lib/preferred-host";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

function resolveServerActionAllowedOrigins(): string[] {
  const origins = new Set<string>(["localhost:3000", "127.0.0.1:3000"]);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (siteUrl) {
    try {
      const host = new URL(siteUrl).host;
      origins.add(host);
      const hostname = new URL(siteUrl).hostname;
      if (hostname.startsWith("www.")) {
        origins.add(hostname.slice(4));
      } else {
        origins.add(`www.${hostname}`);
      }
    } catch {
      /* ignore invalid NEXT_PUBLIC_SITE_URL */
    }
  }
  for (const entry of (process.env.SERVER_ACTIONS_ALLOWED_ORIGINS ?? "").split(",")) {
    const trimmed = entry.trim();
    if (trimmed) origins.add(trimmed);
  }
  return [...origins];
}

/** Permanent www→apex consolidation (SEO policy: apex is canonical). */
function preferredHostRedirects(): {
  source: string;
  destination: string;
  permanent: boolean;
  has: { type: "host"; value: string }[];
}[] {
  const preferred = parsePreferredApexSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (!preferred) return [];

  const alternateHost = `www.${preferred.hostname}`;

  return [
    {
      source: "/:path*",
      has: [{ type: "host", value: alternateHost }],
      destination: `${preferred.origin}/:path*`,
      permanent: true,
    },
  ];
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION ?? packageJson.version,
  },
  experimental: {
    /** Keep recently visited routes warm in the client router cache for snappier back/forward nav */
    staleTimes: {
      dynamic: 30,
      static: 30,
    },
    serverActions: {
      allowedOrigins: resolveServerActionAllowedOrigins(),
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
      /** Serve uploads from LOCAL_PUBLIC_DIR / LOCAL_UPLOADS_DIR when not in cwd/public */
      {
        source: "/uploads/:path*",
        destination: "/api/local-uploads/:path*",
      },
      /** IndexNow verification file at https://{host}/{key}.txt */
      {
        source: "/:key([A-Za-z0-9\\-]{8,128}).txt",
        destination: "/api/seo/indexnow-key/:key",
      },
      /** Yoast-compatible head REST API alias */
      {
        source: "/wp-json/yoast/v1/get_head",
        destination: "/api/seo/head",
      },
      /** Typed sitemaps at Yoast-compatible root paths */
      {
        source: "/:file((?:page|post|product|category|brand|video)-sitemap\\d*\\.xml)",
        destination: "/sitemaps/:file",
      },
    ];
  },
  /** 301 redirects: host consolidation + old standalone service CmsPage URLs */
  async redirects() {
    const serviceRedirects = [
      "enterprise-wireless",
      "smart-home",
      "security-solutions",
    ];
    return [
      ...preferredHostRedirects(),
      // Legacy English locale prefix → unprefixed public URLs (permanent)
      {
        source: "/en",
        destination: "/",
        permanent: true,
      },
      {
        source: "/en/:path*",
        destination: "/:path*",
        permanent: true,
      },
      // Exact /faq hub → canonical /faqs CMS page (keep /faq/[slug] FAQ sets)
      {
        source: "/faq",
        destination: "/faqs",
        permanent: true,
      },
      {
        source: "/sitemap.xml",
        destination: "/sitemap_index.xml",
        permanent: true,
      },
      {
        source: "/:locale/faq",
        destination: "/:locale/faqs",
        permanent: true,
      },
      ...serviceRedirects.flatMap((slug) => [
        {
          source: `/${slug}`,
          destination: `/services/${slug}`,
          permanent: true,
        },
        {
          source: `/:locale/${slug}`,
          destination: `/:locale/services/${slug}`,
          permanent: true,
        },
      ]),
      // Categories unification: collections → categories
      {
        source: "/collections",
        destination: "/categories",
        permanent: true,
      },
      {
        source: "/collections/:slug",
        destination: "/categories/:slug",
        permanent: true,
      },
      {
        source: "/:locale/collections",
        destination: "/:locale/categories",
        permanent: true,
      },
      {
        source: "/:locale/collections/:slug",
        destination: "/:locale/categories/:slug",
        permanent: true,
      },
    ];
  },
  images: {
    loader: "custom",
    loaderFile: "./src/lib/config/next-image-loader.ts",
    formats: ["image/avif", "image/webp"],
    /** Fewer breakpoints = less CPU on Hostinger image optimizer under catalog traffic */
    deviceSizes: [640, 1080, 1920],
    imageSizes: [32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 86400,
    localPatterns: NEXT_IMAGE_LOCAL_PATTERNS,
    remotePatterns: NEXT_IMAGE_REMOTE_PATTERNS,
  },
  async headers() {
    const cspReportOnly = [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https:",
      "media-src 'self' blob: https:",
      "style-src 'self' 'unsafe-inline' https:",
      [
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "https://www.googletagmanager.com",
        "https://www.google-analytics.com",
        "https://www.google.com",
        "https://www.googleadservices.com",
        "https://googleads.g.doubleclick.net",
        "https://connect.facebook.net",
        "https://www.facebook.com",
        "https://static.cloudflareinsights.com",
        "https://snap.licdn.com",
        "https://ajax.googleapis.com",
      ].join(" "),
      "worker-src 'self' blob:",
      "connect-src 'self' https: blob:",
      "frame-src 'self' https://www.googletagmanager.com https://www.google.com https://www.facebook.com",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
          { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
