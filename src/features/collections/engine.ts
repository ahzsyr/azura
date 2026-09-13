import type { ProductRuleMatchMeta } from "@/features/products/fs/product-catalog-index";
import type { Product as CatalogProduct } from "@/features/products/types";
import {
  matchEntityToRulesBool,
  productToRuleFields,
  ruleMetaToRuleFields,
  upgradeLegacyRuleSet,
} from "@/features/categories/matching";
import type { Collection } from "./types";

/**
 * Product bag for collection/category rule matching.
 * Must carry the same fields as `productToRuleFields` so sync counts and
 * match-preview stay consistent (including matchingRules / specification).
 */
export type CollectionEngineProduct = {
  id: string | number;
  slug: string;
  name: string;
  category: string;
  categories: string[];
  brand?: string;
  price: number;
  comparePrice?: number | null;
  badge?: string;
  tags?: string[];
  status?: string;
  stock?: string;
  mpn?: string;
  description?: string;
  specification?: string[];
  matchingRules?: string[];
  /** Extra flattened fields (e.g. spec:Wi-Fi Standard). */
  ruleFields?: Record<string, unknown>;
};

function engineProductToFields(product: CollectionEngineProduct): Record<string, unknown> {
  return {
    ...(product.ruleFields ?? {}),
    id: product.id,
    slug: product.slug,
    name: product.name,
    title: product.name,
    category: product.category ?? "",
    categories: product.categories ?? [],
    brand: product.brand ?? "",
    price: product.price,
    comparePrice: product.comparePrice ?? null,
    badge: product.badge ?? "",
    tags: product.tags ?? [],
    status: product.status ?? "",
    stock: product.stock ?? "",
    mpn: product.mpn ?? "",
    description: product.description ?? "",
    specification: product.specification ?? [],
    matchingRules: product.matchingRules ?? [],
  };
}

/**
 * Match a product to a collection using the unified Matching Rules engine.
 * Legacy flat `{ match, rules[] }` conditions are upgraded to a root group.
 * Empty rules → no match (contract).
 */
export function matchProductToCollection(
  product: CollectionEngineProduct,
  collection: Collection
): boolean {
  const root = upgradeLegacyRuleSet(collection.conditions);
  return matchEntityToRulesBool(engineProductToFields(product), root);
}

function normalizeStockLabel(stockStatus?: string, availability?: string): string {
  if (stockStatus === "out_of_stock" || availability === "OutOfStock") return "out-of-stock";
  if (stockStatus === "preorder" || availability === "PreOrder") return "low-stock";
  return "in-stock";
}

/** Rule matching from index metadata (no full product parse). */
export function ruleMetaToCollectionProduct(meta: ProductRuleMatchMeta): CollectionEngineProduct {
  const fields = ruleMetaToRuleFields(meta);
  return {
    id: meta.id,
    slug: meta.slug,
    name: meta.name,
    category: meta.category,
    categories: meta.categories,
    brand: meta.brand,
    price: 0,
    badge: String(fields.badge ?? ""),
    tags: meta.tags.length ? meta.tags : undefined,
    status: meta.status,
    stock: meta.stock,
    matchingRules: Array.isArray(fields.matchingRules)
      ? (fields.matchingRules as string[])
      : [],
    specification: Array.isArray(fields.specification)
      ? (fields.specification as string[])
      : [],
    ruleFields: fields,
  };
}

export function catalogProductToCollectionProduct(slug: string, p: CatalogProduct): CollectionEngineProduct {
  const fields = productToRuleFields(slug, p);
  return {
    id: p.id,
    slug,
    name: String(fields.name ?? slug),
    category: String(fields.category ?? ""),
    categories: (fields.categories as string[]) ?? [],
    brand: String(fields.brand ?? ""),
    price: Number(fields.price) || 0,
    comparePrice: typeof fields.comparePrice === "number" ? fields.comparePrice : null,
    badge: String(fields.badge ?? ""),
    tags: Array.isArray(fields.tags) && fields.tags.length ? (fields.tags as string[]) : undefined,
    status: String(fields.status ?? ""),
    stock: String(fields.stock ?? normalizeStockLabel(p.stock_status, p.availability)),
    mpn: String(fields.mpn ?? ""),
    description: String(fields.description ?? ""),
    specification: Array.isArray(fields.specification) ? (fields.specification as string[]) : [],
    matchingRules: Array.isArray(fields.matchingRules) ? (fields.matchingRules as string[]) : [],
    ruleFields: fields,
  };
}
