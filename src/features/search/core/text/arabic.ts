export function hasArabicScript(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

/**
 * Normalize common Arabic character variants for improved LIKE recall.
 * Alef variants → ا, Ta Marbuta → ه, removes diacritics (tashkeel).
 */
export function normalizeArabicText(text: string): string {
  return text
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[\u0622\u0623\u0625]/g, "\u0627")
    .replace(/\u0629/g, "\u0647")
    .replace(/\u0640/g, "")
    .trim();
}

/** Normalize query text for matching — applies Arabic normalization when script detected. */
export function normalizeForMatch(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return hasArabicScript(trimmed) ? normalizeArabicText(trimmed) : trimmed.toLowerCase();
}
