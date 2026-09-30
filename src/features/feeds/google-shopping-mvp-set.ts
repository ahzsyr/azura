/**
 * Parse the operator-defined initial campaign product set (MVP launch gate).
 * One id, slug, or MPN per line; # comments and blanks ignored.
 */
export function parseMvpCampaignProductSet(raw: unknown): string[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const token = line.replace(/#.*$/, "").trim();
    if (!token) continue;
    const key = token.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(token);
  }
  return out;
}

export type MvpCampaignTokenMatch = {
  token: string;
  matched: boolean;
  productId?: string;
  slug?: string;
  title?: string;
  status?: "ready" | "warning" | "excluded";
  inFeed: boolean;
};

function productMatchesToken(
  token: string,
  product: { id: string; slug: string; mpn?: string; manufacturer_part_number?: string },
): boolean {
  const t = token.trim().toLowerCase();
  if (!t) return false;
  if (product.id.toLowerCase() === t) return true;
  if (product.slug.toLowerCase() === t) return true;
  const mpn = (product.mpn || product.manufacturer_part_number || "").trim().toLowerCase();
  return Boolean(mpn && mpn === t);
}

/**
 * Cross-check MVP tokens against eligibility entries (AZURA send status only — not GMC approval).
 */
export function matchMvpCampaignProductSet(
  tokens: string[],
  entries: Array<{
    product: {
      id: string;
      slug: string;
      productTitle?: string;
      name?: string;
      title?: string;
      mpn?: string;
      manufacturer_part_number?: string;
    };
    result: { status: "ready" | "warning" | "excluded"; items: unknown[] };
  }>,
): MvpCampaignTokenMatch[] {
  return tokens.map((token) => {
    for (const { product, result } of entries) {
      if (!productMatchesToken(token, product)) continue;
      return {
        token,
        matched: true,
        productId: product.id,
        slug: product.slug,
        title: product.productTitle || product.name || product.title || product.id,
        status: result.status,
        inFeed: result.status !== "excluded" && result.items.length > 0,
      };
    }
    return { token, matched: false, inFeed: false };
  });
}
