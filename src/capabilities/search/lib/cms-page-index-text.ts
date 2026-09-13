const EN_KEYS = ["titleEn", "subtitleEn", "badgeEn", "ctaLabelEn", "textEn", "bodyEn", "headingEn"];
const AR_KEYS = ["titleAr", "subtitleAr", "badgeAr", "ctaLabelAr", "textAr", "bodyAr", "headingAr"];
const SHARED_KEYS = ["title", "subtitle", "text", "heading", "label", "quote"];

function isArabicPrefix(localePrefix: string): boolean {
  return localePrefix === "ar" || localePrefix.startsWith("ar-");
}

function walkStrings(value: unknown, keys: string[], out: string[]): void {
  if (!value) return;
  if (Array.isArray(value)) {
    for (const item of value) walkStrings(item, keys, out);
    return;
  }
  if (typeof value !== "object") return;
  const obj = value as Record<string, unknown>;
  for (const key of keys) {
    const field = obj[key];
    if (typeof field === "string" && field.trim()) out.push(field.trim());
  }
  if (obj.props) walkStrings(obj.props, keys, out);
  if (obj.blocks) walkStrings(obj.blocks, keys, out);
  if (Array.isArray(obj.children)) walkStrings(obj.children, keys, out);
}

/** Pull visible copy from CMS/page-builder blocks so public pages are searchable. */
export function extractCmsBlockSearchText(blocks: unknown, localePrefix: string): string {
  const keys = [...(isArabicPrefix(localePrefix) ? AR_KEYS : EN_KEYS), ...SHARED_KEYS];
  const parts: string[] = [];
  walkStrings(blocks, keys, parts);
  return [...new Set(parts)].join(" ");
}

export function firstCmsBlockTitle(blocks: unknown, localePrefix: string): string {
  const preferred = isArabicPrefix(localePrefix)
    ? ["titleAr", "headingAr", "title", "heading"]
    : ["titleEn", "headingEn", "title", "heading"];
  const parts: string[] = [];
  walkStrings(blocks, preferred, parts);
  return parts[0] ?? "";
}
