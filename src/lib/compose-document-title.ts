/**
 * Compose a final document/OG title with a single site-name suffix.
 * Strips redundant trailing brand segments and avoids double-appending.
 */

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Alphanumeric-only key for fuzzy brand matching (e.g. "B R T Trading" ≈ "BRT TRADING"). */
export function normalizeBrandKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function brandsMatch(a: string, b: string): boolean {
  const ka = normalizeBrandKey(a);
  const kb = normalizeBrandKey(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  // "BRT TRADING" vs "B R T Trading LLC — Solutions"
  if (ka.length >= 6 && kb.length >= 6 && (ka.includes(kb) || kb.includes(ka))) {
    return true;
  }
  return false;
}

/**
 * Remove trailing `| …` / `— …` segments that are the same brand as `siteName`.
 * Leaves the primary page title intact.
 */
export function stripRedundantSiteSuffixes(title: string, siteName: string): string {
  let result = collapseWhitespace(title);
  const site = collapseWhitespace(siteName);
  if (!result || !site) return result;

  // Split on pipe primarily (layout / buildMetadata separators).
  while (true) {
    const parts = result.split(/\s*\|\s*/).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) break;
    const last = parts[parts.length - 1]!;
    if (!brandsMatch(last, site)) break;
    parts.pop();
    result = parts.join(" | ");
  }

  return result;
}

export function titleIncludesSiteName(title: string, siteName: string): boolean {
  const t = collapseWhitespace(title);
  const s = collapseWhitespace(siteName);
  if (!t || !s) return false;
  if (t.toLowerCase().includes(s.toLowerCase())) return true;
  return brandsMatch(t, s) || normalizeBrandKey(t).includes(normalizeBrandKey(s));
}

/**
 * Final title for `<title>` / Open Graph:
 * - empty page title → site name
 * - page title already carries the brand → use as-is (after stripping duplicate suffixes)
 * - otherwise → `Page | SiteName` once
 */
export function composeDocumentTitle(pageTitle: string, siteName: string): string {
  const site = collapseWhitespace(siteName);
  const cleaned = stripRedundantSiteSuffixes(pageTitle, site);
  if (!cleaned) return site;
  if (!site) return cleaned;
  if (titleIncludesSiteName(cleaned, site)) return cleaned;
  return `${cleaned} | ${site}`;
}
