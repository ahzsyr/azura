import type { SeoMeta } from "@prisma/client";

export type SeoScoreCheck = {
  id: string;
  label: string;
  passed: boolean;
  weight: number;
  message?: string;
};

export type SeoScoreResult = {
  score: number;
  grade: "good" | "fair" | "poor";
  checks: SeoScoreCheck[];
};

export type SeoScoreInput = {
  titleEn?: string | null;
  titleAr?: string | null;
  descriptionEn?: string | null;
  descriptionAr?: string | null;
  canonicalUrl?: string | null;
  focusKeywords?: string | null;
  ogImageUrl?: string | null;
  ogTitleEn?: string | null;
  ogTitleAr?: string | null;
  robots?: string | null;
  jsonLd?: unknown;
};

function titleScore(title: string | null | undefined, locale: string): SeoScoreCheck {
  const len = title?.trim().length ?? 0;
  const passed = len >= 30 && len <= 60;
  return {
    id: `title-${locale}`,
    label: `Meta title (${locale.toUpperCase()})`,
    passed,
    weight: 15,
    message:
      len === 0
        ? "Missing title"
        : len < 30
          ? `Too short (${len} chars, aim 30–60)`
          : len > 60
            ? `Too long (${len} chars, aim 30–60)`
            : `${len} chars — good length`,
  };
}

function descriptionScore(desc: string | null | undefined, locale: string): SeoScoreCheck {
  const len = desc?.trim().length ?? 0;
  const passed = len >= 120 && len <= 160;
  return {
    id: `description-${locale}`,
    label: `Meta description (${locale.toUpperCase()})`,
    passed,
    weight: 15,
    message:
      len === 0
        ? "Missing description"
        : len < 120
          ? `Too short (${len} chars, aim 120–160)`
          : len > 160
            ? `Too long (${len} chars, aim 120–160)`
            : `${len} chars — good length`,
  };
}

function boolCheck(
  id: string,
  label: string,
  passed: boolean,
  weight: number,
  message?: string
): SeoScoreCheck {
  return { id, label, passed, weight, message };
}

export function scoreSeoInput(input: SeoScoreInput): SeoScoreResult {
  const checks: SeoScoreCheck[] = [
    titleScore(input.titleEn, "en"),
    titleScore(input.titleAr, "ar"),
    descriptionScore(input.descriptionEn, "en"),
    descriptionScore(input.descriptionAr, "ar"),
    boolCheck(
      "og-image",
      "Social / OG image",
      Boolean(input.ogImageUrl?.trim()),
      10,
      input.ogImageUrl?.trim() ? "OG image set" : "Add an OG image for richer shares"
    ),
    boolCheck(
      "canonical",
      "Canonical URL",
      Boolean(input.canonicalUrl?.trim()),
      10,
      input.canonicalUrl?.trim() ? "Canonical set" : "Optional but recommended for duplicate URLs"
    ),
    boolCheck(
      "keywords",
      "Focus keywords",
      Boolean(input.focusKeywords?.trim()),
      5,
      input.focusKeywords?.trim() ? "Keywords defined" : "Add comma-separated focus keywords"
    ),
    boolCheck(
      "og-titles",
      "OG title overrides",
      Boolean(input.ogTitleEn?.trim() || input.ogTitleAr?.trim()),
      5,
      "Custom OG titles improve social click-through"
    ),
    boolCheck(
      "robots",
      "Robots directive",
      Boolean(input.robots?.trim()),
      5,
      input.robots?.trim() ?? "Defaults to index, follow"
    ),
    boolCheck(
      "jsonld",
      "Structured data (JSON-LD)",
      input.jsonLd != null && input.jsonLd !== "" && input.jsonLd !== "{}",
      10,
      "JSON-LD helps rich results"
    ),
  ];

  const earned = checks.filter((c) => c.passed).reduce((sum, c) => sum + c.weight, 0);
  const total = checks.reduce((sum, c) => sum + c.weight, 0);
  const score = Math.round((earned / total) * 100);

  let grade: SeoScoreResult["grade"] = "poor";
  if (score >= 80) grade = "good";
  else if (score >= 55) grade = "fair";

  return { score, grade, checks };
}

export function scoreSeoMeta(
  meta: SeoMeta | null | undefined,
  translations?: Record<string, string>
): SeoScoreResult {
  if (!meta && !translations) {
    return scoreSeoInput({});
  }
  return scoreSeoInput({




    canonicalUrl: meta?.canonicalUrl,
    focusKeywords: meta?.focusKeywords,
    ogImageUrl: meta?.ogImageUrl,


    robots: meta?.robots,
    jsonLd: meta?.jsonLd,
  });
}

export const seoScoringService = {
  scoreSeoInput,
  scoreSeoMeta,
};
