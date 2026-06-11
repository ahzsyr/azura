export type I18nReadMode = "legacy" | "hybrid" | "translation-only";

/**
 * When false, admin saves skip writing *En/*Ar legacy columns (Phase 4).
 * Default: true (dual-write during migration).
 */
export function shouldWriteLegacyColumns(): boolean {
  return process.env.I18N_WRITE_LEGACY !== "false";
}

/**
 * Controls public read priority:
 * - legacy: legacy columns only (emergency rollback)
 * - hybrid: EntityTranslation then legacy (default)
 * - translation-only: EntityTranslation only, skip legacy columns
 */
export function getI18nReadMode(): I18nReadMode {
  const mode = process.env.I18N_READ_MODE?.toLowerCase();
  if (mode === "legacy" || mode === "translation-only") return mode;
  return "hybrid";
}

export function shouldReadLegacyColumns(): boolean {
  return getI18nReadMode() !== "translation-only";
}

export function shouldReadEntityTranslations(): boolean {
  return getI18nReadMode() !== "legacy";
}
