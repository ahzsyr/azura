import type { SeoMeta } from "@prisma/client";
import { isUsableOgImageUrl } from "@/features/seo/seo-image-url";

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
  enabledLocales?: string[];
  titlesByLocale?: Record<string, string | null | undefined>;
  descriptionsByLocale?: Record<string, string | null | undefined>;
  ogTitlesByLocale?: Record<string, string | null | undefined>;
  canonicalUrl?: string | null;
  focusKeywords?: string | null;
  ogImageUrl?: string | null;
  robots?: string | null;
  jsonLd?: unknown;
};

export const SEO_TITLE_LENGTH = { min: 30, max: 60 } as const;
export const SEO_DESCRIPTION_LENGTH = { min: 120, max: 160 } as const;

export type SeoFieldTone = "empty" | "short" | "good" | "long";

export type SeoLengthFieldFeedback = {
  passed: boolean;
  message: string;
  tone: SeoFieldTone;
  length: number;
  progress: number;
};

export function getLengthFieldFeedback(
  value: string | null | undefined,
  min: number,
  max: number,
  missingLabel: string,
): SeoLengthFieldFeedback {
  const length = value?.trim().length ?? 0;
  const passed = length >= min && length <= max;
  const rangeLabel = `${min}–${max}`;

  let tone: SeoFieldTone;
  let message: string;

  if (length === 0) {
    tone = "empty";
    message = missingLabel;
  } else if (length < min) {
    tone = "short";
    message = `Too short (${length} chars, aim ${rangeLabel})`;
  } else if (length > max) {
    tone = "long";
    message = `Too long (${length} chars, aim ${rangeLabel})`;
  } else {
    tone = "good";
    message = `${length} chars — good length`;
  }

  return {
    passed,
    message,
    tone,
    length,
    progress: Math.min(100, (length / max) * 100),
  };
}

export function getCheckById(result: SeoScoreResult, id: string): SeoScoreCheck | undefined {
  return result.checks.find((check) => check.id === id);
}

function titleScore(title: string | null | undefined, locale: string): SeoScoreCheck {
  const feedback = getLengthFieldFeedback(
    title,
    SEO_TITLE_LENGTH.min,
    SEO_TITLE_LENGTH.max,
    "Missing title",
  );
  return {
    id: `title-${locale}`,
    label: `Meta title (${locale.toUpperCase()})`,
    passed: feedback.passed,
    weight: 15,
    message: feedback.message,
  };
}

function descriptionScore(desc: string | null | undefined, locale: string): SeoScoreCheck {
  const feedback = getLengthFieldFeedback(
    desc,
    SEO_DESCRIPTION_LENGTH.min,
    SEO_DESCRIPTION_LENGTH.max,
    "Missing description",
  );
  return {
    id: `description-${locale}`,
    label: `Meta description (${locale.toUpperCase()})`,
    passed: feedback.passed,
    weight: 15,
    message: feedback.message,
  };
}

function boolCheck(
  id: string,
  label: string,
  passed: boolean,
  weight: number,
  message?: string,
): SeoScoreCheck {
  return { id, label, passed, weight, message };
}

const LOCALE_TITLE_WEIGHT = 15;
const LOCALE_DESCRIPTION_WEIGHT = 15;

function buildLocaleChecks(input: SeoScoreInput): SeoScoreCheck[] {
  const locales = input.enabledLocales ?? [];
  const checks: SeoScoreCheck[] = [];

  for (const locale of locales) {
    checks.push({
      ...titleScore(input.titlesByLocale?.[locale], locale),
      weight: LOCALE_TITLE_WEIGHT,
    });
    checks.push({
      ...descriptionScore(input.descriptionsByLocale?.[locale], locale),
      weight: LOCALE_DESCRIPTION_WEIGHT,
    });
  }

  return checks;
}

function hasOgTitleOverride(input: SeoScoreInput): boolean {
  const locales = input.enabledLocales ?? [];
  return locales.some((locale) => Boolean(input.ogTitlesByLocale?.[locale]?.trim()));
}

export function scoreSeoInput(input: SeoScoreInput): SeoScoreResult {
  const checks: SeoScoreCheck[] = [
    ...buildLocaleChecks(input),
    boolCheck(
      "og-image",
      "Social / OG image",
      isUsableOgImageUrl(input.ogImageUrl, "https://example.com"),
      10,
      isUsableOgImageUrl(input.ogImageUrl, "https://example.com")
        ? "OG image set"
        : "Add an OG image for richer shares",
    ),
    boolCheck(
      "canonical",
      "Canonical URL",
      Boolean(input.canonicalUrl?.trim()),
      10,
      input.canonicalUrl?.trim() ? "Canonical set" : "Optional but recommended for duplicate URLs",
    ),
    boolCheck(
      "keywords",
      "Focus keywords",
      Boolean(input.focusKeywords?.trim()),
      5,
      input.focusKeywords?.trim() ? "Keywords defined" : "Add comma-separated focus keywords",
    ),
    boolCheck(
      "og-titles",
      "OG title overrides",
      hasOgTitleOverride(input),
      5,
      "Custom OG titles improve social click-through",
    ),
    boolCheck(
      "robots",
      "Robots directive",
      Boolean(input.robots?.trim()),
      5,
      input.robots?.trim() ?? "Defaults to index, follow",
    ),
    boolCheck(
      "jsonld",
      "Structured data (JSON-LD)",
      input.jsonLd != null && input.jsonLd !== "" && input.jsonLd !== "{}",
      10,
      "JSON-LD helps rich results",
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
  translations?: Record<string, string>,
  enabledLocales: string[] = [],
): SeoScoreResult {
  if (!meta && !translations) {
    return scoreSeoInput({ enabledLocales });
  }
  return scoreSeoInput({
    enabledLocales,
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
  getLengthFieldFeedback,
  getCheckById,
};
