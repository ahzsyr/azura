import type { ProductRuleMatchMeta } from "@/features/products/fs/product-catalog-index";
import type { Product as CatalogProduct } from "@/features/products/types";
import type { Collection, CollectionRule } from "./types";
import { matchesContains, matchesExact, matchesStartsWith, normalizeForMatch } from "./normalization";

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
};

function applyOp(fieldVal: string, operator: CollectionRule["operator"], val: string): boolean {
  switch (operator) {
    case "equals":
      return matchesExact(fieldVal, val);
    case "contains":
      return matchesContains(fieldVal, val);
    case "starts_with":
      return matchesStartsWith(fieldVal, val);
    case "not_equals":
      return !matchesExact(fieldVal, val);
    default:
      return false;
  }
}

function evaluateArrayField(values: string[], operator: CollectionRule["operator"], val: string): boolean {
  switch (operator) {
    case "equals":
      return values.some((v) => matchesExact(v, val));
    case "contains":
      return values.some((v) => matchesContains(v, val) || matchesContains(val, v));
    case "starts_with":
      return values.some((v) => matchesStartsWith(v, val));
    case "not_equals":
      return values.every((v) => !matchesExact(v, val));
    default:
      return false;
  }
}

function evaluateRule(product: CollectionEngineProduct, rule: CollectionRule): boolean {
  const val = rule.value.trim();
  if (!val) return false;

  switch (rule.field) {
    case "category":
      return (
        applyOp(product.category ?? "", rule.operator, val) ||
        evaluateArrayField(product.categories ?? [], rule.operator, val)
      );
    case "categories":
      return evaluateArrayField(product.categories ?? [], rule.operator, val);
    case "brand":
      return applyOp(product.brand ?? "", rule.operator, val);
    case "title":
      return applyOp(product.name ?? "", rule.operator, val);
    case "badge":
      return applyOp(product.badge ?? "", rule.operator, val);
    case "status":
      return applyOp(product.status ?? "", rule.operator, val);
    case "stock":
      return applyOp(product.stock ?? "", rule.operator, val);
    case "tags": {
      const tags = (product.tags ?? []).map((t) => normalizeForMatch(t));
      const normVal = normalizeForMatch(val);
      switch (rule.operator) {
        case "contains":
          return tags.some((t) => t.includes(normVal) || normVal.includes(t));
        case "equals":
          return tags.includes(normVal);
        case "not_equals":
          return !tags.includes(normVal);
        case "starts_with":
          return tags.some((t) => t.startsWith(normVal));
        default:
          return false;
      }
    }
    default:
      return false;
  }
}

export function matchProductToCollection(product: CollectionEngineProduct, collection: Collection): boolean {
  const { match, rules } = collection.conditions;
  if (!rules || rules.length === 0) return false;
  if (match === "all") return rules.every((r) => evaluateRule(product, r));
  return rules.some((r) => evaluateRule(product, r));
}

function normalizeStockLabel(stockStatus?: string, availability?: string): string {
  if (stockStatus === "out_of_stock" || availability === "OutOfStock") return "out-of-stock";
  if (stockStatus === "preorder" || availability === "PreOrder") return "low-stock";
  return "in-stock";
}

/** Rule matching from index metadata (no full product parse). */
export function ruleMetaToCollectionProduct(meta: ProductRuleMatchMeta): CollectionEngineProduct {
  return {
    id: meta.id,
    slug: meta.slug,
    name: meta.name,
    category: meta.category,
    categories: meta.categories,
    brand: meta.brand,
    price: 0,
    tags: meta.tags.length ? meta.tags : undefined,
    status: meta.status,
    stock: meta.stock,
  };
}

export function catalogProductToCollectionProduct(slug: string, p: CatalogProduct): CollectionEngineProduct {
  const name = (p.name ?? p.productTitle ?? p.title ?? slug).trim();
  const category = (p.category ?? "").toString();

  const priceVal =
    p.price && typeof p.price === "object" && "value" in p.price ? p.price.value : Number(p.price) || 0;

  const catSet = new Set<string>();
  for (const c of p.categories ?? []) {
    const s = typeof c === "string" ? c.trim() : "";
    if (s) catSet.add(s);
  }
  if (category) catSet.add(category);
  const categories = [...catSet];
  const tagSet = new Set<string>(categories);
  const tags = [...tagSet];

  return {
    id: p.id,
    slug,
    name,
    category,
    categories,
    brand: p.brand ?? "",
    price: priceVal,
    comparePrice: typeof p.old_price === "number" ? p.old_price : null,
    tags: tags.length ? tags : undefined,
    status: p.availability ?? "",
    stock: normalizeStockLabel(p.stock_status, p.availability),
  };
}