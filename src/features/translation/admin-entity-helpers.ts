import type { CompanyInfo, EntityTranslation } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { localeService } from "@/features/i18n/locale.service";
import {
  loadTranslationsMap,
  localizedFieldValue,
  mergeCanonicalFields,
} from "@/features/translation/bilingual-serialize";
import { legacyShapeFromTranslations } from "@/features/portal/lib/portal-translation-shape";
import { resolveTranslation } from "@/features/translation/translation-resolver";
import type { AdminLocalizedEntityView, CompanyInfoView } from "./admin-localized-view";

export type { AdminLocalizedEntityView, CompanyInfoView } from "./admin-localized-view";
export { readAdminDefaultLocaleField } from "./admin-localized-view";

export async function loadAdminRowsWithLocalizedFields<
  T extends { id: string },
  const F extends readonly string[],
>(
  entityType: string,
  rows: T[],
  fields: F,
  displayField?: F[number]
): Promise<Array<AdminLocalizedEntityView<T>>> {
  const primaryField = displayField ?? fields[0];
  const translations = await loadTranslationsMap(
    entityType,
    rows.map((row) => row.id)
  );

  return rows.map((row) => {
    const rowTranslations = translations.get(row.id) ?? [];
    const localizedLegacy = legacyShapeFromTranslations(rowTranslations, [...fields]);
    const displayTitle = localizedFieldValue(rowTranslations, primaryField);
    return {
      ...row,
      ...localizedLegacy,
      localizedLegacy,
      displayTitle,
    };
  }) as Array<AdminLocalizedEntityView<T>>;
}

export async function loadBuilderOptionsWithTitles(
  entityType: string,
  rows: Array<{ id: string; slug: string; isPublished: boolean }>,
  countKey: string,
  counts: Record<string, number>
) {
  const enriched = await loadAdminRowsWithLocalizedFields(entityType, rows, ["title"]);
  const translations = await loadTranslationsMap(
    entityType,
    rows.map((row) => row.id)
  );
  return enriched.map((row) => ({
    slug: row.slug,
    isPublished: row.isPublished,
    titleEn: row.displayTitle,
    titleAr: resolveTranslation("title", "ar", {
      translations: translations.get(row.id) ?? [],
    }),
    displayTitle: row.displayTitle,
    [countKey]: counts[row.id] ?? 0,
  }));
}

export async function loadEntityTranslations(entityType: string, entityId: string) {
  const map = await loadTranslationsMap(entityType, [entityId]);
  return map.get(entityId) ?? [];
}

export function cmsPageLegacyFields(translations: EntityTranslation[]): {
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  excerptEn: string;
  excerptAr: string;
} & Record<string, string> {
  const shape = legacyShapeFromTranslations(translations, ["title", "subtitle", "description"]);
  return {
    ...shape,
    titleEn: shape.titleEn ?? "",
    titleAr: shape.titleAr ?? "",
    descriptionEn: shape.descriptionEn ?? "",
    descriptionAr: shape.descriptionAr ?? "",
    excerptEn: shape.subtitleEn ?? shape.descriptionEn ?? "",
    excerptAr: shape.subtitleAr ?? shape.descriptionAr ?? "",
  };
}

export function contentTypeLegacyFields(translations: EntityTranslation[]) {
  return legacyShapeFromTranslations(translations, ["name", "labelSingular", "labelPlural"]);
}

export function testimonialQuoteLegacyFields(translations: EntityTranslation[]) {
  const shape = legacyShapeFromTranslations(translations, ["quote"]);
  return {
    contentEn: shape.quoteEn ?? localizedFieldValue(translations, "quote"),
    contentAr: shape.quoteAr ?? resolveTranslation("quote", "ar", { translations }),
    ...shape,
  };
}

export async function loadContentTypeWithLegacyFields<T extends { id: string }>(
  row: T
): Promise<AdminLocalizedEntityView<T>> {
  const [enriched] = await loadAdminRowsWithLocalizedFields("ContentType", [row], [
    "name",
    "labelSingular",
    "labelPlural",
  ]);
  return enriched;
}

export async function loadCompanyInfoWithTranslations(): Promise<CompanyInfoView | null> {
  const company = await prisma.companyInfo.findUnique({ where: { id: "default" } });
  if (!company) return null;
  const translations = await loadEntityTranslations("CompanyInfo", company.id);
  const legacyShape = legacyShapeFromTranslations(translations, [
    "tagline",
    "story",
    "mission",
    "vision",
    "values",
    "address",
    "officeHours",
  ]);
  return {
    ...company,
    ...legacyShape,
    localizedLegacy: legacyShape,
  };
}

/** Resolve a list label using default locale, with optional active admin locale. */
export async function resolveAdminListLabel(
  translations: EntityTranslation[],
  field: string,
  localeCode?: string
): Promise<string> {
  const enabled = await localeService.listEnabled();
  const defaultCode = enabled.find((l) => l.isDefault)?.code ?? "en";
  const code = localeCode ?? defaultCode;
  const value = resolveTranslation(field, code, {
    translations,
    enabledLocales: enabled,
    defaultCode,
  });
  if (value.trim()) return value;
  return resolveTranslation(field, defaultCode, {
    translations,
    enabledLocales: enabled,
    defaultCode,
  });
}

export { mergeCanonicalFields, localizedFieldValue };
