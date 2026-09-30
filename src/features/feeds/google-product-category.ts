/**
 * Map coarse catalog categories to Google product taxonomy IDs / paths.
 * Per-product `googleProductCategory` always wins over this map.
 */

const MAIN_CATEGORY_MAP: Record<string, string> = {
  networking: "278",
  electronics: "222",
  "smart home": "536",
  accessories: "2082",
  wireless: "278",
  routers: "278",
  switches: "278",
  outdoor: "278",
  indoor: "278",
  cameras: "152",
  security: "152",
};

/**
 * Resolve Google product category: product override, then mainCategory / category heuristics.
 */
export function resolveGoogleProductCategory(product: {
  googleProductCategory?: string;
  mainCategory?: string;
  category?: string | null;
  categories?: string[];
}): string | undefined {
  const override = product.googleProductCategory?.trim();
  if (override) return override;

  const candidates = [
    product.mainCategory,
    typeof product.category === "string" ? product.category : undefined,
    ...(product.categories ?? []),
  ]
    .map((c) => (typeof c === "string" ? c.trim() : ""))
    .filter(Boolean);

  for (const candidate of candidates) {
    const key = candidate.toLowerCase();
    if (MAIN_CATEGORY_MAP[key]) return MAIN_CATEGORY_MAP[key];
    for (const [mapKey, value] of Object.entries(MAIN_CATEGORY_MAP)) {
      if (key.includes(mapKey)) return value;
    }
  }

  return undefined;
}

export function resolveGoogleProductType(product: {
  categoryPaths?: string[];
  categories?: string[];
  brandPaths?: string[];
}): string | undefined {
  const paths = (product.categoryPaths ?? []).filter(
    (p): p is string => typeof p === "string" && Boolean(p.trim()),
  );
  if (paths.length) return paths[0]!.trim();

  const cats = (product.categories ?? []).filter(
    (p): p is string => typeof p === "string" && Boolean(p.trim()),
  );
  if (cats.length) return cats.join(" > ");

  const brandPaths = (product.brandPaths ?? []).filter(
    (p): p is string => typeof p === "string" && Boolean(p.trim()),
  );
  if (brandPaths.length) return brandPaths[0]!.trim();

  return undefined;
}
