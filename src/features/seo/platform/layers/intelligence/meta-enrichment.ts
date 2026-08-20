import {
  SEO_DESCRIPTION_LENGTH,
  SEO_TITLE_LENGTH,
} from "@/features/seo/scoring/seo-scoring.service";
import type { ContentSnapshot } from "../../types";
import { smartTruncate } from "../quality/seo-normalizer-core";

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function appendUnique(base: string, addition: string, separator = " — "): string {
  const next = collapseWhitespace(addition);
  if (!next) return base;
  const lowerBase = base.toLowerCase();
  if (lowerBase.includes(next.toLowerCase())) return base;
  if (!base) return next;
  return collapseWhitespace(`${base}${separator}${next}`);
}

function pageIntentPhrase(title: string, brand: string): string {
  const t = collapseWhitespace(title) || "this page";
  const b = collapseWhitespace(brand) || "our site";
  return `Visit the ${t} page on ${b} for inquiries, support, and more information about our products and services.`;
}

function titleIntentPhrase(title: string, brand: string): string {
  const t = collapseWhitespace(title).toLowerCase();
  const b = collapseWhitespace(brand) || "us";
  if (t.includes("contact")) return `Get in touch with ${b}`;
  if (t.includes("about")) return `Learn more about ${b}`;
  return `${collapseWhitespace(title) || "Page"} from ${b}`;
}

/** Extend meta title until it meets the SEO minimum length, then cap at max. */
export function enrichMetaTitle(
  title: string,
  snapshot: ContentSnapshot,
  brand: string,
  tagline: string,
): string {
  let result = collapseWhitespace(title) || collapseWhitespace(snapshot.title) || brand;

  if (result.length < SEO_TITLE_LENGTH.min) {
    const h1 = snapshot.headings.find((h) => h.level === 1)?.text?.trim() ?? "";
    if (h1 && h1.toLowerCase() !== snapshot.title.toLowerCase()) {
      result = appendUnique(result, h1);
    }
  }

  if (result.length < SEO_TITLE_LENGTH.min && tagline.trim()) {
    result = appendUnique(result, tagline.trim());
  }

  if (result.length < SEO_TITLE_LENGTH.min) {
    result = appendUnique(result, titleIntentPhrase(snapshot.title || title, brand));
  }

  return smartTruncate(result, SEO_TITLE_LENGTH.max);
}

/** Extend meta description until it meets the SEO minimum length, then cap at max. */
export function enrichMetaDescription(
  description: string,
  snapshot: ContentSnapshot,
  brand: string,
  tagline: string,
): string {
  let result = collapseWhitespace(description);

  if (result.length < SEO_DESCRIPTION_LENGTH.min && tagline.trim()) {
    result = appendUnique(result, tagline.trim(), ". ");
  }

  if (result.length < SEO_DESCRIPTION_LENGTH.min) {
    const brandShort = collapseWhitespace(brand);
    if (brandShort && !result.toLowerCase().includes(brandShort.toLowerCase())) {
      result = appendUnique(result, brandShort, ". ");
    }
  }

  if (result.length < SEO_DESCRIPTION_LENGTH.min) {
    result = appendUnique(
      result,
      pageIntentPhrase(snapshot.title, brand),
      result ? " " : "",
    );
  }

  return smartTruncate(result, SEO_DESCRIPTION_LENGTH.max);
}

function tokenize(value: string, minLen = 4): string[] {
  return value
    .toLowerCase()
    .split(/\W+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= minLen);
}

function slugTokens(snapshot: ContentSnapshot): string[] {
  const id = snapshot.entityId || "";
  const fromId = id.includes(":") ? id.split(":").pop() ?? id : id;
  const routing =
    typeof snapshot.metadata?.routingKey === "string"
      ? (snapshot.metadata.routingKey as string)
      : "";
  const fromRouting = routing.includes(":") ? routing.split(":").pop() ?? routing : routing;
  return [
    ...tokenize(fromId.replace(/-/g, " "), 3),
    ...tokenize(fromRouting.replace(/-/g, " "), 3),
  ];
}

/**
 * Seed focus keywords when extraction is empty/sparse using title, slug, headings, and brand.
 */
export function enrichFocusKeywords(
  keywords: string,
  snapshot: ContentSnapshot,
  brand: string,
): string {
  const existing = keywords
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);

  if (existing.length >= 3) {
    return existing.slice(0, 8).join(", ");
  }

  const seen = new Set(existing);
  const seeded = [...existing];

  const candidates = [
    ...tokenize(snapshot.title, 3),
    ...slugTokens(snapshot),
    ...snapshot.headings
      .filter((h) => h.level <= 2)
      .flatMap((h) => tokenize(h.text, 3)),
    ...tokenize(brand, 3),
  ];

  for (const term of candidates) {
    if (seen.has(term)) continue;
    seen.add(term);
    seeded.push(term);
    if (seeded.length >= 8) break;
  }

  return seeded.join(", ");
}
