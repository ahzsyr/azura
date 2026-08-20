import { getDefaultLocaleFieldFromForm } from "@/features/translation/form-fields";
import type { PublicLocale } from "@/i18n/locale-config";
import { seoMetaBaseSchema } from "@/schemas/seo";

const TWITTER_CARDS = new Set(["summary", "summary_large_image"]);

export type ParsedSeoForm = {
  pageKey?: string;
  entityType?: string;
  entityId?: string;
  canonicalUrl: string | null;
  robots: string | null;
  focusKeywords: string | null;
  ogImageUrl: string | null;
  twitterCard: "summary" | "summary_large_image" | null;
  jsonLd: string | null;
};

function readOptionalFormString(formData: FormData, key: string): string | null {
  const raw = formData.get(key);
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed || null;
}

function coerceTwitterCard(raw: string | null): ParsedSeoForm["twitterCard"] {
  if (!raw) return null;
  return TWITTER_CARDS.has(raw) ? (raw as ParsedSeoForm["twitterCard"]) : "summary_large_image";
}

/** Invalid JSON-LD must not fail the save; translations still store the raw string. */
export function parseJsonLdForSeoColumn(raw: string | null | undefined): unknown | null {
  if (!raw?.trim()) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

/**
 * Dual-write: SeoMeta columns mirror the default-locale translation values.
 * Must not throw on relative canonicals or invalid JSON — those used to 500
 * when saving a non-default locale (default-locale fields are still submitted).
 */
export function parseSeoForm(formData: FormData, enabledLocales: PublicLocale[]): ParsedSeoForm {
  const focusKeywords =
    getDefaultLocaleFieldFromForm(formData, enabledLocales, "focusKeywords") ||
    readOptionalFormString(formData, "focusKeywords");
  const jsonLdRaw =
    getDefaultLocaleFieldFromForm(formData, enabledLocales, "jsonLd") ||
    readOptionalFormString(formData, "jsonLd") ||
    "";
  const canonicalUrl =
    getDefaultLocaleFieldFromForm(formData, enabledLocales, "canonicalUrl") ||
    readOptionalFormString(formData, "canonicalUrl");

  const payload = {
    pageKey: readOptionalFormString(formData, "pageKey") ?? undefined,
    entityType: readOptionalFormString(formData, "entityType") ?? undefined,
    entityId: readOptionalFormString(formData, "entityId") ?? undefined,
    canonicalUrl: canonicalUrl?.trim() ? canonicalUrl.trim() : null,
    robots: readOptionalFormString(formData, "robots"),
    focusKeywords: focusKeywords?.trim() ? focusKeywords.trim() : null,
    ogImageUrl: readOptionalFormString(formData, "ogImageUrl"),
    twitterCard: coerceTwitterCard(readOptionalFormString(formData, "twitterCard")),
    jsonLd: jsonLdRaw.trim() ? jsonLdRaw : null,
  };

  const parsed = seoMetaBaseSchema.safeParse(payload);
  if (parsed.success) {
    return {
      pageKey: parsed.data.pageKey,
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
      canonicalUrl: parsed.data.canonicalUrl?.trim() ? parsed.data.canonicalUrl.trim() : null,
      robots: parsed.data.robots ?? null,
      focusKeywords: parsed.data.focusKeywords ?? null,
      ogImageUrl: parsed.data.ogImageUrl ?? null,
      twitterCard: coerceTwitterCard(parsed.data.twitterCard ?? null),
      jsonLd: parsed.data.jsonLd?.trim() ? parsed.data.jsonLd : null,
    };
  }

  return payload;
}
