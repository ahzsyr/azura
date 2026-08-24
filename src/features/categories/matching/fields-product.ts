import type { ProductRuleMatchMeta } from "@/features/products/fs/product-catalog-index";
import type { Product as CatalogProduct, ProductSpecificationGroup } from "@/features/products/types";
import type { RuleEntityFields } from "./evaluate";

function normalizeStockLabel(stockStatus?: string, availability?: string): string {
  if (stockStatus === "out_of_stock" || availability === "OutOfStock") return "out-of-stock";
  if (stockStatus === "preorder" || availability === "PreOrder") return "low-stock";
  return "in-stock";
}

function badgeFromTags(tags: string[]): string {
  for (const t of tags) {
    const lower = t.toLowerCase();
    if (lower.startsWith("badge:")) return t.slice(6).trim() || t;
  }
  return "";
}

/** Spec keys promoted to first-class Matching Rules fields. */
export const SPEC_ALIAS_FIELDS = {
  environment: "Environment",
  mountingMethod: "Mounting Method",
  generation: "Generation",
  antennaDesign: "Antenna Design",
} as const;

export type SpecAliasField = keyof typeof SPEC_ALIAS_FIELDS;

/** Controlled mainCategory values from the converter. */
export const MAIN_CATEGORY_VALUES = [
  "Security Systems",
  "Fleet Management",
  "LTE / 5G",
  "Fiber Networks",
  "IoT",
  "Mounts & Brackets",
  "Electrical & Power",
  "Accessories",
  "Outdoor",
  "Indoor",
  "Networking",
  "Licenses",
  "Other",
] as const;

/** Flatten product specifications into `spec:<key>` fields (string values). */
export function flattenProductSpecifications(
  groups: ProductSpecificationGroup[] | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!groups?.length) return out;
  for (const group of groups) {
    const entries = [...(group.features ?? []), ...(group.items ?? [])];
    for (const entry of entries) {
      const key = (entry.name ?? "").trim();
      if (!key) continue;
      const value = (entry.value ?? "").trim();
      const field = `spec:${key}`;
      if (out[field] && value) {
        out[field] = `${out[field]}; ${value}`;
      } else if (value || !(field in out)) {
        out[field] = value;
      }
    }
  }
  return out;
}

export function collectProductSpecKeys(
  groups: ProductSpecificationGroup[] | undefined,
): string[] {
  return Object.keys(flattenProductSpecifications(groups)).map((k) => k.replace(/^spec:/, ""));
}

/**
 * Tokens for the unified `specification` rule field (equals / contains / in …).
 * Includes names, values, and "name: value" so free-text matching works like other fields.
 */
export function flattenSpecificationTokens(
  groups: ProductSpecificationGroup[] | undefined,
): string[] {
  const tokens = new Set<string>();
  if (!groups?.length) return [];
  for (const group of groups) {
    const entries = [...(group.features ?? []), ...(group.items ?? [])];
    for (const entry of entries) {
      const key = (entry.name ?? "").trim();
      const value = (entry.value ?? "").trim();
      if (key) tokens.add(key);
      if (value) tokens.add(value);
      if (key && value) tokens.add(`${key}: ${value}`);
    }
  }
  return [...tokens];
}

/** Read a single specification value by display name (case-insensitive). */
export function readSpecValueByName(
  groups: ProductSpecificationGroup[] | undefined,
  name: string,
): string {
  const target = name.trim().toLowerCase();
  if (!target || !groups?.length) return "";
  for (const group of groups) {
    const entries = [...(group.features ?? []), ...(group.items ?? [])];
    for (const entry of entries) {
      if ((entry.name ?? "").trim().toLowerCase() === target) {
        return (entry.value ?? "").trim();
      }
    }
  }
  return "";
}

export function extractSpecAliasFields(
  groups: ProductSpecificationGroup[] | undefined,
  overrides?: Partial<Record<SpecAliasField, string>>,
): Record<SpecAliasField, string> {
  const out = {} as Record<SpecAliasField, string>;
  for (const [field, specName] of Object.entries(SPEC_ALIAS_FIELDS) as Array<
    [SpecAliasField, string]
  >) {
    const override = overrides?.[field];
    out[field] =
      (override != null && String(override).trim() !== ""
        ? String(override).trim()
        : readSpecValueByName(groups, specName)) || "";
  }
  return out;
}

/** Normalize product.matchingRules from string | string[] | CSV-ish input. */
export function normalizeMatchingRulesList(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((v) => (typeof v === "string" ? v.trim() : String(v ?? "").trim()))
      .filter(Boolean);
  }
  if (typeof raw === "string") {
    return raw
      .split(/[\n,;|]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function readProductMatchingRules(p: CatalogProduct): string[] {
  const direct = normalizeMatchingRulesList(p.matchingRules);
  if (direct.length) return direct;
  const snake = (p as { matching_rules?: unknown }).matching_rules;
  return normalizeMatchingRulesList(snake);
}

/** Map catalog product → Matching Rules field bag (PRODUCT scope). */
export function productToRuleFields(slug: string, p: CatalogProduct): RuleEntityFields {
  const name = (p.name ?? p.productTitle ?? p.title ?? slug).trim();
  const category = (p.category ?? "").toString();

  const priceVal =
    p.price && typeof p.price === "object" && "value" in p.price ? Number(p.price.value) : Number(p.price) || 0;

  const catSet = new Set<string>();
  for (const c of p.categories ?? []) {
    const s = typeof c === "string" ? c.trim() : "";
    if (s) catSet.add(s);
  }
  if (category) catSet.add(category);
  const categories = [...catSet];

  const tagSet = new Set<string>();
  for (const t of p.tags ?? []) {
    const s = typeof t === "string" ? t.trim() : "";
    if (s) tagSet.add(s);
  }
  const tags = [...tagSet];
  const badge = badgeFromTags(tags);

  const description = [
    p.short_description,
    typeof p.description === "string" ? p.description : "",
  ]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join(" ")
    .slice(0, 2000);

  const specs = flattenProductSpecifications(p.specifications);
  const specification = flattenSpecificationTokens(p.specifications);
  const matchingRules = readProductMatchingRules(p);
  const aliases = extractSpecAliasFields(p.specifications);
  const mainCategory = String(p.mainCategory ?? "").trim();

  return {
    id: p.id,
    slug,
    name,
    title: name,
    category,
    categories,
    brand: p.brand ?? "",
    mainCategory,
    price: priceVal,
    comparePrice: typeof p.old_price === "number" ? p.old_price : null,
    badge,
    tags,
    status: p.availability ?? "",
    stock: normalizeStockLabel(p.stock_status, p.availability),
    mpn: p.mpn ?? "",
    description,
    specification,
    matchingRules,
    ...aliases,
    ...specs,
  };
}

export function ruleMetaToRuleFields(meta: ProductRuleMatchMeta): RuleEntityFields {
  return {
    id: meta.id,
    slug: meta.slug,
    name: meta.name,
    title: meta.name,
    category: meta.category,
    categories: meta.categories,
    brand: meta.brand,
    mainCategory: meta.mainCategory ?? "",
    price: 0,
    badge: badgeFromTags(meta.tags),
    tags: meta.tags.length ? meta.tags : [],
    status: meta.status,
    stock: meta.stock,
    specification: [],
    matchingRules: meta.matchingRules ?? [],
    environment: meta.environment ?? "",
    mountingMethod: meta.mountingMethod ?? "",
    generation: meta.generation ?? "",
    antennaDesign: meta.antennaDesign ?? "",
  };
}

export const PRODUCT_RULE_FIELDS = [
  "environment",
  "mountingMethod",
  "category",
  "tags",
  "generation",
  "antennaDesign",
  "brand",
  "title",
  "name",
  "categories",
  "matchingRules",
  "mainCategory",
  "badge",
  "status",
  "stock",
  "price",
  "mpn",
  "description",
  "specification",
] as const;

/** True when field is a flattened specification key (`spec:Wi‑Fi`). */
export function isSpecificationRuleField(field: string): boolean {
  return field.startsWith("spec:");
}
