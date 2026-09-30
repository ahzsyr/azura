import "server-only";

import type { EntityTranslation } from "@prisma/client";
import { seoRepository } from "@/repositories/seo.repository";
import { translationService } from "@/features/translation/translation.service";
import { readLegacyFieldForLocale } from "@/features/translation/admin-field-value";
import type { SeoSuggestion, ValidationResult } from "../types";
import type { SeoEntityDescriptor } from "../types/entity-descriptor";
import type { SeoWriteTarget } from "../types/change-set";
import type { SeoDiffResult, SeoFieldDiff, SeoPreviewField, SeoPreviewModel } from "../types/autofill";
import { resolveWriteTarget } from "./write-target.resolver";

const TRANSLATABLE_FIELDS = ["metaTitle", "metaDescription", "ogTitle", "ogDescription"] as const;
const META_SCALAR_FIELDS = [
  "canonicalUrl",
  "robots",
  "focusKeywords",
  "ogImageUrl",
  "twitterCard",
] as const;

type CurrentSeoState = {
  translations: Record<string, string>;
  meta: {
    canonicalUrl?: string | null;
    robots?: string | null;
    focusKeywords?: string | null;
    ogImageUrl?: string | null;
    twitterCard?: string | null;
    jsonLd?: unknown;
  } | null;
};

async function loadCurrentSeo(
  writeTarget: SeoWriteTarget,
  locale: string
): Promise<CurrentSeoState> {
  let meta = null;
  if (writeTarget.cmsPageId) {
    meta = await seoRepository.getByCmsPageId(writeTarget.cmsPageId);
  } else if (writeTarget.postId) {
    meta = await seoRepository.getByPostId(writeTarget.postId);
  } else if (writeTarget.pageKey) {
    meta = await seoRepository.getByPageKey(writeTarget.pageKey);
  } else if (writeTarget.entityType && writeTarget.entityId) {
    meta = await seoRepository.getByEntity(writeTarget.entityType, writeTarget.entityId);
  }

  const rows: EntityTranslation[] = meta
    ? ((await translationService.getForEntity("SeoMeta", meta.id)) as EntityTranslation[])
    : [];
  const translations: Record<string, string> = {};
  for (const row of rows) {
    translations[`${row.field}:${row.localeCode}`] = row.value;
  }

  return {
    translations,
    meta: meta
      ? {
          canonicalUrl: meta.canonicalUrl,
          robots: meta.robots,
          focusKeywords: meta.focusKeywords,
          ogImageUrl: meta.ogImageUrl,
          twitterCard: meta.twitterCard,
          jsonLd: meta.jsonLd,
        }
      : null,
  };
}

function formatJsonLd(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "string") return value.trim() || null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function suggestionValue(suggestion: SeoSuggestion, field: string): string | null {
  const map: Record<string, string | undefined> = {
    metaTitle: suggestion.metaTitle,
    metaDescription: suggestion.metaDescription,
    ogTitle: suggestion.ogTitle,
    focusKeywords: suggestion.focusKeywords,
    canonicalUrl: suggestion.canonicalUrl ?? undefined,
    robots: suggestion.robots,
    ogImageUrl: suggestion.ogImageUrl,
    twitterCard: suggestion.twitterCard,
  };
  const v = map[field];
  return v?.trim() ? v.trim() : null;
}

function currentTranslationValue(
  translations: Record<string, string>,
  field: string,
  locale: string
): string | null {
  const v = readLegacyFieldForLocale(translations, field, locale);
  return v?.trim() ? v.trim() : null;
}

export async function compareSeoState(
  descriptor: SeoEntityDescriptor,
  locale: string,
  suggestion: SeoSuggestion,
  writeTarget?: SeoWriteTarget
): Promise<SeoDiffResult> {
  const target = writeTarget ?? resolveWriteTarget(descriptor);
  const current = await loadCurrentSeo(target, locale);
  const fields: SeoFieldDiff[] = [];

  for (const field of TRANSLATABLE_FIELDS) {
    const cur = currentTranslationValue(current.translations, field, locale);
    const sug = field === "ogDescription" ? null : suggestionValue(suggestion, field);
    if (sug === null && field === "ogDescription") continue;
    fields.push({
      field,
      current: cur,
      suggested: sug,
      changed: (cur ?? "") !== (sug ?? ""),
    });
  }

  for (const field of META_SCALAR_FIELDS) {
    const cur =
      field === "canonicalUrl"
        ? current.meta?.canonicalUrl?.trim() || null
        : field === "robots"
          ? current.meta?.robots?.trim() || null
          : field === "focusKeywords"
            ? current.meta?.focusKeywords?.trim() || null
            : field === "ogImageUrl"
              ? current.meta?.ogImageUrl?.trim() || null
              : current.meta?.twitterCard?.trim() || null;
    const sug = suggestionValue(suggestion, field);
    fields.push({
      field,
      current: cur,
      suggested: sug,
      changed: (cur ?? "") !== (sug ?? ""),
    });
  }

  const currentJsonLd = formatJsonLd(current.meta?.jsonLd);
  const suggestedJsonLd = formatJsonLd(suggestion.jsonLd);
  fields.push({
    field: "jsonLd",
    current: currentJsonLd,
    suggested: suggestedJsonLd,
    changed: (currentJsonLd ?? "") !== (suggestedJsonLd ?? ""),
  });

  return Object.freeze({
    fields: Object.freeze(fields),
    hasChanges: fields.some((f) => f.changed),
  });
}

const FIELD_LABELS: Record<string, string> = {
  metaTitle: "Meta title",
  metaDescription: "Meta description",
  ogTitle: "OG title",
  ogDescription: "OG description",
  focusKeywords: "Focus keywords",
  canonicalUrl: "Canonical URL",
  robots: "Robots",
  ogImageUrl: "OG image",
  twitterCard: "Twitter card",
  jsonLd: "JSON-LD",
};

export function toPreviewModel(
  correlationId: string,
  descriptor: SeoEntityDescriptor,
  diff: SeoDiffResult,
  validation?: ValidationResult
): SeoPreviewModel {
  const violationByField = new Map(
    (validation?.violations ?? [])
      .filter((v) => v.field)
      .map((v) => [v.field!, v])
  );

  const fields: SeoPreviewField[] = diff.fields
    .filter((f) => f.changed || f.suggested)
    .map((f) => {
      const violation = violationByField.get(f.field);
      return Object.freeze({
        field: f.field,
        label: FIELD_LABELS[f.field] ?? f.field,
        current: f.current,
        suggested: f.suggested,
        changed: f.changed,
        severity: violation?.severity,
        message: violation?.message,
      });
    });

  return Object.freeze({
    correlationId,
    descriptor,
    fields: Object.freeze(fields),
    validation,
    score: validation?.score,
  });
}

export const seoDiffService = {
  compare: compareSeoState,
  toPreviewModel,
};
