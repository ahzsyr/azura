/**
 * Hybrid translation storage (En/Ar columns + EntityTranslation).
 *
 * On admin save:
 * - All enabled locales write to EntityTranslation (PUBLISHED).
 * - English and Arabic also sync to legacy `fieldEn` / `fieldAr` via legacy-adapter.
 *
 * On public read:
 * - resolveTranslation / getLocalizedField checks EntityTranslation first,
 *   then legacy columns for the locale chain, then `fieldEn` as final fallback.
 *
 * Locales without legacy columns (e.g. id, ur) use EntityTranslation only.
 */

export {
  localeHasLegacyColumn,
  legacyColumnLocales,
  extractLegacyColumns,
  syncLegacyColumnsFromTranslations,
  readLegacyField,
  readLegacyFieldWithFallback,
} from "./legacy-adapter";
