import type { Product } from "@/features/products/types";
import { normalizeProductPayload } from "@/features/products/lib/product-payload-normalize";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function resolveImportSlug(raw: Record<string, unknown>): string | null {
  const candidate = String(
    raw.slug ?? raw.id ?? raw.productTitle ?? raw.name ?? raw.title ?? "",
  ).trim();
  return slugify(candidate) || null;
}

export function normalizeImportedProduct(raw: Record<string, unknown>, slug?: string): Product {
  const resolvedSlug = slug ?? resolveImportSlug(raw);
  if (!resolvedSlug) {
    throw new Error("Missing valid slug (slug, id, or title)");
  }

  const asProduct = raw as unknown as Product;
  return normalizeProductPayload(asProduct, resolvedSlug);
}
