import type { PageSeoResolveInput } from "@/features/seo/page-seo-context.types";
import type { ParsedMarketingPath } from "@/features/seo/platform/schema-pipeline/context/parse-marketing-path";

export type SeoUrlContextInput = PageSeoResolveInput & {
  localePrefix: string;
  publicPath: string;
  pageType: string;
};

export function mapParsedPathToSeoInput(parsed: ParsedMarketingPath): SeoUrlContextInput {
  const base: SeoUrlContextInput = {
    localePrefix: parsed.localePrefix,
    publicPath: parsed.path,
    pageType: parsed.pageType,
    originContext: "public",
    allowWrites: false,
  };

  if (parsed.pageKey) {
    return { ...base, pageKey: parsed.pageKey };
  }

  if (parsed.pageType === "product" && parsed.slug) {
    return { ...base, pageKey: `product:${parsed.slug}`, slug: parsed.slug };
  }

  if (parsed.pageType === "blog" && parsed.slug) {
    return { ...base, slug: parsed.slug };
  }

  if (parsed.pageType === "brand" && parsed.slug) {
    return { ...base, pageKey: `brand:${parsed.slug}`, slug: parsed.slug };
  }

  if (parsed.pageType === "tag" && parsed.slug) {
    return { ...base, pageKey: `tag:${parsed.slug}`, slug: parsed.slug };
  }

  if (parsed.pageType === "collection" && parsed.slug) {
    return { ...base, pageKey: `category:${parsed.slug}`, slug: parsed.slug };
  }

  if (parsed.pageType === "package" && parsed.slug) {
    return { ...base, pageKey: `package:${parsed.slug}`, slug: parsed.slug };
  }

  if (parsed.pageType === "faq" && parsed.slug) {
    return { ...base, pageKey: `faq:${parsed.slug}`, slug: parsed.slug };
  }

  if (parsed.pageType === "cms" && parsed.slug) {
    return { ...base, slug: parsed.slug };
  }

  if (parsed.pageType === "search") {
    return { ...base, pageKey: "search" };
  }

  return { ...base, slug: parsed.slug };
}

export function extractPathnameFromUrl(url: string, siteOrigin: string): string {
  try {
    const parsed = new URL(url);
    const origin = siteOrigin.replace(/\/$/, "");
    const expected = new URL(`${origin}/`);
    if (parsed.origin === expected.origin) {
      return parsed.pathname || "/";
    }
    return parsed.pathname || "/";
  } catch {
    const trimmed = url.trim();
    if (trimmed.startsWith("/")) return trimmed.split("?")[0] ?? "/";
    return "/";
  }
}
