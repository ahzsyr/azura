import type { PublicLocale } from "@/i18n/locale-config";

export type BilingualTitleFields = {
  titleEn: string;
  titleAr: string;
  excerptEn?: string;
  excerptAr?: string;
  contentEn?: string;
  contentAr?: string;
};

function coalesceAr(ar: string | undefined, en: string | undefined): string | undefined {
  const arTrim = ar?.trim();
  if (arTrim) return arTrim;
  const enTrim = en?.trim();
  return enTrim || undefined;
}

/**
 * Ensures legacy *Ar columns have a value when only English is submitted (English-first).
 * Empty Ar fields fall back to English so DB constraints and Zod pass without requiring
 * a disabled locale in the form.
 */
export function applyBilingualLegacyFallbacks<T extends BilingualTitleFields>(
  payload: T,
  _enabledLocales: PublicLocale[] = []
): T {
  const titleEn = payload.titleEn.trim();
  const titleAr = payload.titleAr.trim() || titleEn;
  const excerptEn = payload.excerptEn?.trim();
  const excerptAr = coalesceAr(payload.excerptAr, excerptEn);
  const contentEn = payload.contentEn?.trim();
  const contentAr = coalesceAr(payload.contentAr, contentEn);

  return {
    ...payload,
    titleEn,
    titleAr,
    excerptEn: excerptEn || undefined,
    excerptAr: excerptAr || undefined,
    contentEn: contentEn || undefined,
    contentAr: contentAr || undefined,
  };
}
