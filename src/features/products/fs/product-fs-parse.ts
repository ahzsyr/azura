export function slugFromProductJsonFilename(name: string): string {
  return name.replace(/\.json$/i, "");
}

export function parseProductDataPath(path: string): { locale: string | null; slug: string } | null {
  const key = path.split("?")[0].replace(/\\/g, "/");
  const legacyMatch = key.match(/\/data\/products\/(?:.+\/)?([^/]+)\.json$/i);
  if (legacyMatch) return { locale: null, slug: legacyMatch[1] };
  const localeMatch = key.match(/\/data\/([^/]+)\/products\/(?:.+\/)?([^/]+)\.json$/i);
  if (localeMatch) {
    const localeSegment = localeMatch[1].toLowerCase();
    if (localeSegment === "products") return null;
    return { locale: localeSegment, slug: localeMatch[2] };
  }
  return null;
}
