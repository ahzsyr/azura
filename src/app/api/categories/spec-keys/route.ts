import { NextResponse } from "next/server";
import { collectProductSpecKeys } from "@/features/categories/matching";
import { loadAllProducts } from "@/features/collections/collection-sync.service";
import { requireCatalogAdmin } from "@/lib/catalog-api-auth";
import { normalizeCatalogLocaleCode } from "@/features/catalog/locales";

/**
 * GET /api/categories/spec-keys?locale=en-us
 * Returns unique product specification keys from the catalog (for Matching Rules).
 */
export async function GET(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  try {
    const url = new URL(request.url);
    const locale = await normalizeCatalogLocaleCode(String(url.searchParams.get("locale") || "en-us"));
    const products = await loadAllProducts(locale);
    const keys = new Set<string>();
    for (const { product } of products) {
      for (const key of collectProductSpecKeys(product.specifications)) {
        keys.add(key);
      }
    }
    return NextResponse.json({
      keys: [...keys].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load specification keys" },
      { status: 500 },
    );
  }
}
