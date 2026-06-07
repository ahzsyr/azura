import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";
import type { PublicLocale } from "@/i18n/locale-config";
import { buildHreflangAlternates, buildCanonicalUrl } from "@/i18n/seo-helpers";
import { getDefaultSiteIdentity } from "@/lib/site-identity";

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
  /** Dynamic hreflang support for N locales */
  enabledLocales?: PublicLocale[];
  slugByLocale?: Record<string, string>;
  htmlLang?: string;
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
}: PageMeta): Metadata {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const defaultUrl = buildCanonicalUrl(siteUrl, locale, path, slugByLocale?.[locale]);
  const url = canonicalUrl?.trim() || defaultUrl;
  const image = ogImage ?? `${siteUrl}/og-default.jpg`;
  const siteName = getSiteName();
  const displayTitle = `${title} | ${siteName}`;
  const socialTitle = ogTitle?.trim() ? `${ogTitle} | ${siteName}` : displayTitle;
  const keywords = focusKeywords
    ?.split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const languages =
    enabledLocales && enabledLocales.length > 0
      ? buildHreflangAlternates(path, enabledLocales, siteUrl, slugByLocale)
      : {
          en: `${siteUrl}/en${path}`,
          ar: `${siteUrl}/ar${path}`,
        };

  const ogLocale =
    htmlLang?.replace("-", "_") ?? (locale === "ar" ? "ar_SA" : "en_US");

  return {
    title: displayTitle,
    description,
    ...(keywords?.length ? { keywords } : {}),
    robots: parseRobots(robots),
    alternates: {
      canonical: url,
      languages,
    },
    openGraph: {
      title: socialTitle,
      description,
      url,
      siteName,
      locale: ogLocale,
      type: "website",
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: twitterCard ?? "summary_large_image",
      title: socialTitle,
      description,
      images: [image],
    },
  };
}

export function organizationJsonLd(company: {
  name: string;
  email: string;
  phone: string;
  addressEn: string;
  registrationNo: string;
}) {
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
      streetAddress: company.addressEn,
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
