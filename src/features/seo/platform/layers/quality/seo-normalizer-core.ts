import {
  SEO_DESCRIPTION_LENGTH,
  SEO_TITLE_LENGTH,
} from "@/features/seo/scoring/seo-scoring.service";
import type { ContentSnapshot, SeoExecutionContext, SeoSuggestion } from "../../types";
import { resolveSeoImageChain } from "../intelligence/image-selector";
import {
  buildStructuredDataObject,
  serializeStructuredData,
} from "../intelligence/structured-data.builder";
import { resolveSeoOgImageUrl } from "@/features/seo/seo-image-url";

const ROBOTS_PRESETS = new Set([
  "index, follow",
  "index, nofollow",
  "noindex, follow",
  "noindex, nofollow",
]);

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function smartTruncate(value: string, max: number): string {
  const trimmed = collapseWhitespace(value);
  if (trimmed.length <= max) return trimmed;
  const slice = trimmed.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  if (lastSpace > max * 0.6) {
    return slice.slice(0, lastSpace).trimEnd() + "…";
  }
  return slice.trimEnd() + "…";
}

function normalizeKeywords(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const part of raw.split(",")) {
    const term = part.trim().toLowerCase();
    if (!term || seen.has(term)) continue;
    seen.add(term);
    terms.push(term);
    if (terms.length >= 10) break;
  }
  return terms.length ? terms.join(", ") : undefined;
}

function normalizeRobots(raw: string | undefined): string {
  const value = collapseWhitespace(raw ?? "index, follow").toLowerCase();
  for (const preset of ROBOTS_PRESETS) {
    if (preset === value) return preset;
  }
  const index = value.includes("noindex") ? "noindex" : "index";
  const follow = value.includes("nofollow") ? "nofollow" : "follow";
  return `${index}, ${follow}`;
}

function pathFromRoutingKey(routingKey: string): string | undefined {
  const [prefix, ...rest] = routingKey.split(":");
  const slug = rest.join(":").trim();
  if (!slug) return undefined;
  if (prefix === "product") return `/products/${slug}`;
  if (prefix === "brand") return `/brands/${slug}`;
  if (prefix === "collection") return `/collections/${slug}`;
  if (prefix === "tag") return `/tags/${slug}`;
  if (prefix === "category") return `/categories/${slug}`;
  return undefined;
}

function inferPublicPath(ctx: SeoExecutionContext): string | undefined {
  const metadata = ctx.metadata ?? {};
  const explicitPath = typeof metadata.publicPath === "string" ? metadata.publicPath.trim() : "";
  if (explicitPath) {
    return explicitPath.startsWith("/") ? explicitPath : `/${explicitPath}`;
  }

  const routingKey = typeof metadata.routingKey === "string" ? metadata.routingKey.trim() : "";
  if (routingKey) {
    const fromRouting = pathFromRoutingKey(routingKey);
    if (fromRouting) return fromRouting;
  }

  const entityId = ctx.entityId.trim();
  if (!entityId) return undefined;
  const normalizedType = ctx.entityType.toLowerCase().replace(/_/g, "");
  if (normalizedType.includes("product")) return `/products/${entityId}`;
  if (normalizedType.includes("brand")) return `/brands/${entityId}`;
  if (normalizedType.includes("collection")) return `/collections/${entityId}`;
  if (normalizedType.includes("category")) return `/categories/${entityId}`;
  if (normalizedType.includes("tag")) return `/tags/${entityId}`;
  return undefined;
}

function normalizeCanonicalUrl(
  raw: string | undefined,
  siteUrl: string,
  fallbackPath?: string,
): string | undefined {
  const value = raw?.trim() || fallbackPath?.trim();
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
        const site = new URL(siteUrl);
        return `${site.origin}${url.pathname}${url.search}${url.hash}`;
      }
      return url.href;
    } catch {
      return undefined;
    }
  }
  const path = value.startsWith("/") ? value : `/${value}`;
  return `${siteUrl.replace(/\/$/, "")}${path}`;
}

function normalizeImageUrl(raw: string | undefined, siteUrl: string): string | undefined {
  return resolveSeoOgImageUrl(raw, siteUrl);
}

function normalizeJsonLd(
  raw: unknown,
  fallbackBuilder: () => Record<string, unknown>,
): unknown {
  if (raw == null || raw === "") {
    return fallbackBuilder();
  }
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return fallbackBuilder();
    }
  }
  if (typeof raw === "object") return raw;
  return fallbackBuilder();
}

export type SeoNormalizerContext = Readonly<{
  siteUrl: string;
  siteLogo?: string | null;
}>;

export function normalizeSeoSuggestionWithContext(
  ctx: SeoExecutionContext,
  snapshot: ContentSnapshot,
  suggestion: SeoSuggestion,
  normalizerContext: SeoNormalizerContext,
): SeoSuggestion {
  const { siteUrl, siteLogo } = normalizerContext;
  const systemDefault = `${siteUrl}/og-default.jpg`;

  const metaTitle = suggestion.metaTitle
    ? smartTruncate(suggestion.metaTitle, SEO_TITLE_LENGTH.max)
    : undefined;
  const metaDescription = suggestion.metaDescription
    ? smartTruncate(suggestion.metaDescription, SEO_DESCRIPTION_LENGTH.max)
    : undefined;

  const ogImageUrl = normalizeImageUrl(
    resolveSeoImageChain({
      explicit: suggestion.ogImageUrl,
      snapshot,
      siteLogo,
      systemDefault,
    }),
    siteUrl,
  );

  const structuredObject = normalizeJsonLd(suggestion.jsonLd, () =>
    buildStructuredDataObject({
      ctx,
      snapshot,
      title: metaTitle ?? snapshot.title,
      description: metaDescription ?? "",
      canonicalUrl: suggestion.canonicalUrl,
      imageUrl: ogImageUrl,
    }),
  );

  const inferredCanonicalPath = inferPublicPath(ctx);

  return Object.freeze({
    ...suggestion,
    metaTitle,
    metaDescription,
    ogTitle: suggestion.ogTitle ? smartTruncate(suggestion.ogTitle, 70) : metaTitle,
    focusKeywords: normalizeKeywords(suggestion.focusKeywords),
    canonicalUrl: normalizeCanonicalUrl(
      suggestion.canonicalUrl,
      siteUrl,
      inferredCanonicalPath,
    ),
    robots: normalizeRobots(suggestion.robots),
    ogImageUrl,
    twitterCard: suggestion.twitterCard === "summary" ? "summary" : "summary_large_image",
    jsonLd: structuredObject,
    provenance: Object.freeze({
      ...suggestion.provenance,
      metaTitle: Object.freeze([
        ...(suggestion.provenance.metaTitle ?? []),
        Object.freeze({ label: "SeoNormalizer" }),
      ]),
      metaDescription: Object.freeze([
        ...(suggestion.provenance.metaDescription ?? []),
        Object.freeze({ label: "SeoNormalizer" }),
      ]),
    }),
  });
}

export function serializeSuggestionJsonLd(suggestion: SeoSuggestion): SeoSuggestion {
  if (suggestion.jsonLd == null) return suggestion;
  if (typeof suggestion.jsonLd === "string") return suggestion;
  return Object.freeze({
    ...suggestion,
    jsonLd: serializeStructuredData(
      suggestion.jsonLd as Record<string, unknown> | Record<string, unknown>[],
    ),
  });
}
