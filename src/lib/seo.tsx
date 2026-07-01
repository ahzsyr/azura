import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";
import type { PublicLocale } from "@/i18n/locale-config";
import { buildHreflangAlternates, buildCanonicalUrl } from "@/i18n/seo-helpers";
import { getDefaultSiteIdentity } from "@/lib/site-identity";
import { isArabicLocale } from "@/shared/layout/direction/direction-resolver";
import {
  applyMetadataContributors,
  type MetadataContributorContext,
} from "@/features/seo/platform/read-path/metadata-contributors";
import {
  normalizeTwitterCard,
  sanitizeMetadataAbsoluteUrl,
} from "@/lib/metadata/absolute-url";

function getSiteName(): string {
  return getDefaultSiteIdentity().brandName;
}

export type PageMeta = {
  title: string;
  description: string;
  path?: string;
  locale?: Locale;
  ogImage?: string;
  ogTitle?: string;
  canonicalUrl?: string | null;
  robots?: string | null;
  focusKeywords?: string | null;
  twitterCard?: "summary" | "summary_large_image" | null;
  /** Override sync default site name (e.g. from DB company + theme). */
  siteName?: string;
  /** Dynamic hreflang support for N locales */
  enabledLocales?: PublicLocale[];
  slugByLocale?: Record<string, string>;
  htmlLang?: string;
  /** Resolved site origin (from resolveSiteOrigin). */
  origin?: string;
};

function parseRobots(robots?: string | null): Metadata["robots"] | undefined {
  if (!robots?.trim()) return undefined;
  const lower = robots.toLowerCase();
  return {
    index: !lower.includes("noindex"),
    follow: !lower.includes("nofollow"),
    googleBot: {
      index: !lower.includes("noindex"),
      follow: !lower.includes("nofollow"),
    },
  };
}

export function isNoIndex(robots?: string | null): boolean {
  return (robots ?? "").toLowerCase().includes("noindex");
}

export function buildMetadata({
  title,
  description,
  path = "",
  locale = "en",
  ogImage,
  ogTitle,
  canonicalUrl,
  robots,
  focusKeywords,
  twitterCard = "summary_large_image",
  enabledLocales,
  slugByLocale,
  htmlLang,
  siteName,
  origin,
}: PageMeta): Metadata {
  const siteUrl = (origin ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  const defaultUrl = buildCanonicalUrl(siteUrl, locale, path, slugByLocale?.[locale]);
  const rawCanonical = canonicalUrl?.trim() || defaultUrl;
  const url = sanitizeMetadataAbsoluteUrl(rawCanonical, siteUrl) ?? defaultUrl;
  const rawImage = ogImage ?? `${siteUrl}/og-default.jpg`;
  const image = sanitizeMetadataAbsoluteUrl(rawImage, siteUrl) ?? `${siteUrl}/og-default.jpg`;
  const safeTwitterCard = normalizeTwitterCard(twitterCard);

  const resolvedSiteName = siteName?.trim() || getSiteName();
  const trimmedTitle = title.trim();
  const displayTitle = trimmedTitle
    ? `${trimmedTitle} | ${resolvedSiteName}`
    : resolvedSiteName;
  const trimmedOgTitle = ogTitle?.trim();
  const socialTitle = trimmedOgTitle
    ? `${trimmedOgTitle} | ${resolvedSiteName}`
    : displayTitle;
  const keywords = focusKeywords
    ?.split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const languages =
    enabledLocales && enabledLocales.length > 0
      ? Object.fromEntries(
          Object.entries(buildHreflangAlternates(path, enabledLocales, siteUrl, slugByLocale))
            .map(([lang, href]) => [lang, sanitizeMetadataAbsoluteUrl(href, siteUrl) ?? href])
            .filter((entry): entry is [string, string] => Boolean(entry[1])),
        )
      : {
          en: sanitizeMetadataAbsoluteUrl(`${siteUrl}/en${path}`, siteUrl) ?? `${siteUrl}/en${path}`,
        };

  const ogLocale =
    htmlLang?.replace("-", "_") ?? (isArabicLocale(locale) ? "ar_SA" : "en_US");

  const contributorCtx: MetadataContributorContext = {
    title,
    description,
    path,
    locale,
    ogImage: image,
    ogTitle,
    canonicalUrl: url,
    robots,
    focusKeywords,
    twitterCard: safeTwitterCard,
    enabledLocales,
    slugByLocale,
    htmlLang,
    siteName,
    siteUrl,
    resolvedSiteName,
    displayTitle,
    socialTitle,
    url,
    image,
    keywords,
    ogLocale,
    languages,
  };

  return applyMetadataContributors(contributorCtx);
}

import { readLegacyFieldForLocale } from "@/features/translation/admin-field-value";

function resolveOrganizationAddress(company: Record<string, unknown>): string {
  const fromEn = readLegacyFieldForLocale(company, "address", "en");
  if (fromEn.trim()) return fromEn;
  for (const [key, val] of Object.entries(company)) {
    if (key.startsWith("address") && typeof val === "string" && val.trim()) return val;
  }
  return "";
}

export function organizationJsonLd(
  company: {
    name: string;
    email: string;
    phone: string;
    registrationNo: string;
  } & Record<string, unknown>
) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: company.name,
    url: siteUrl,
    email: company.email,
    telephone: company.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: resolveOrganizationAddress(company),
    },
    identifier: company.registrationNo,
  };
}

export function productJsonLd(pkg: {
  name: string;
  description: string;
  price: number;
  currency: string;
  url: string;
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: pkg.name,
    description: pkg.description,
    image: pkg.image,
    offers: {
      "@type": "Offer",
      price: pkg.price,
      priceCurrency: pkg.currency,
      availability: "https://schema.org/InStock",
      url: pkg.url,
    },
  };
}

export function faqJsonLd(items: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function reviewJsonLd(
  reviews: Array<{ name: string; rating: number; content: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: getSiteName(),
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue:
        reviews.reduce((sum, r) => sum + r.rating, 0) / (reviews.length || 1),
      reviewCount: reviews.length,
    },
    review: reviews.map((r) => ({
      "@type": "Review",
      author: { "@type": "Person", name: r.name },
      reviewRating: { "@type": "Rating", ratingValue: r.rating },
      reviewBody: r.content,
    })),
  };
}

export function JsonLd({
  data,
}: {
  data: Record<string, unknown> | Record<string, unknown>[];
}) {
  const payload = Array.isArray(data) ? data : [data];
  return (
    <>
      {payload.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  );
}
