import type { ProductListingRecord } from "@/features/products/listing/types";
import type {
  ProductOrderingDefaultSort,
  ProductOrderingKeywordField,
  ProductOrderingKeywordPriority,
  ProductOrderingProfile,
  ProductOrderingRuleId,
} from "./product-ordering.schema";

const BEST_SELLING_TAGS = new Set(["badge:bestseller", "bestseller", "best-seller"]);
const FEATURED_TAGS = new Set(["featured"]);

export type OrderableListingRecord = ProductListingRecord & {
  /** Optional membership order for Manual default sort in category/collection contexts. */
  membershipSortOrder?: number | null;
  createdAt?: string | number | Date | null;
};

type BucketAssignment = {
  ruleIndex: number;
  priorityIndex: number;
};

function tagsLower(record: OrderableListingRecord): string[] {
  return (record.tags ?? []).map((t) => t.toLowerCase());
}

function hasAnyTag(record: OrderableListingRecord, set: Set<string>): boolean {
  return tagsLower(record).some((t) => set.has(t));
}

function createdAtMs(record: OrderableListingRecord): number {
  const raw = record.createdAt;
  if (raw == null) return 0;
  if (typeof raw === "number") return raw;
  if (raw instanceof Date) return raw.getTime();
  const parsed = Date.parse(String(raw));
  return Number.isFinite(parsed) ? parsed : 0;
}

function compareDefaultSort(
  a: OrderableListingRecord,
  b: OrderableListingRecord,
  sort: ProductOrderingDefaultSort,
  originalIndex: Map<string, number>,
): number {
  switch (sort) {
    case "price-asc":
      return a.priceMin - b.priceMin || a.name.localeCompare(b.name);
    case "price-desc":
      return b.priceMax - a.priceMax || a.name.localeCompare(b.name);
    case "name-desc":
      return b.name.localeCompare(a.name);
    case "newest": {
      const byDate = createdAtMs(b) - createdAtMs(a);
      if (byDate !== 0) return byDate;
      return (b.id ?? b.slug).localeCompare(a.id ?? a.slug);
    }
    case "oldest": {
      const byDate = createdAtMs(a) - createdAtMs(b);
      if (byDate !== 0) return byDate;
      return (a.id ?? a.slug).localeCompare(b.id ?? b.slug);
    }
    case "best-selling": {
      const aHit = hasAnyTag(a, BEST_SELLING_TAGS) ? 0 : 1;
      const bHit = hasAnyTag(b, BEST_SELLING_TAGS) ? 0 : 1;
      if (aHit !== bHit) return aHit - bHit;
      return a.name.localeCompare(b.name);
    }
    case "featured": {
      const aHit = hasAnyTag(a, FEATURED_TAGS) ? 0 : 1;
      const bHit = hasAnyTag(b, FEATURED_TAGS) ? 0 : 1;
      if (aHit !== bHit) return aHit - bHit;
      return a.name.localeCompare(b.name);
    }
    case "manual": {
      const aOrder = a.membershipSortOrder;
      const bOrder = b.membershipSortOrder;
      const aHas = typeof aOrder === "number";
      const bHas = typeof bOrder === "number";
      if (aHas && bHas && aOrder !== bOrder) return aOrder! - bOrder!;
      if (aHas !== bHas) return aHas ? -1 : 1;
      const ai = originalIndex.get(a.slug) ?? 0;
      const bi = originalIndex.get(b.slug) ?? 0;
      if (ai !== bi) return ai - bi;
      return a.name.localeCompare(b.name);
    }
    case "name-asc":
    default:
      return a.name.localeCompare(b.name);
  }
}

function fieldText(
  record: OrderableListingRecord,
  field: ProductOrderingKeywordField,
): string {
  switch (field) {
    case "name":
      return record.name ?? "";
    case "sku":
      return record.mpn ?? "";
    case "tags":
      return (record.tags ?? []).join(" ");
    case "searchText":
      return record.searchText ?? "";
    default:
      return "";
  }
}

function matchesKeyword(
  record: OrderableListingRecord,
  entry: ProductOrderingKeywordPriority,
): boolean {
  const needle = entry.keyword.trim().toLowerCase();
  if (!needle) return false;
  const fields = entry.fields.length > 0 ? entry.fields : (["name", "sku", "tags", "searchText"] as const);
  for (const field of fields) {
    if (fieldText(record, field).toLowerCase().includes(needle)) return true;
  }
  return false;
}

function brandMatchIndex(record: OrderableListingRecord, brands: string[]): number {
  const brand = (record.brand ?? "").trim().toLowerCase();
  if (!brand) return -1;
  return brands.findIndex((b) => b.trim().toLowerCase() === brand);
}

function categoryMatchIndex(record: OrderableListingRecord, categories: string[]): number {
  const slugs = new Set(
    [
      ...(record.collectionSlugs ?? []),
      ...(record.categories ?? []),
      record.category ?? "",
    ]
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
  if (slugs.size === 0) return -1;
  return categories.findIndex((c) => slugs.has(c.trim().toLowerCase()));
}

function pinnedMatchIndex(record: OrderableListingRecord, pins: string[]): number {
  const slug = record.slug.trim().toLowerCase();
  return pins.findIndex((p) => p.trim().toLowerCase() === slug);
}

function assignBucket(
  record: OrderableListingRecord,
  profile: ProductOrderingProfile,
): BucketAssignment {
  const defaultIndex = profile.ruleOrder.indexOf("default");
  const fallbackRuleIndex = defaultIndex >= 0 ? defaultIndex : profile.ruleOrder.length;

  for (let ruleIndex = 0; ruleIndex < profile.ruleOrder.length; ruleIndex++) {
    const rule = profile.ruleOrder[ruleIndex] as ProductOrderingRuleId;
    if (rule === "default") continue;

    if (rule === "pinned") {
      const idx = pinnedMatchIndex(record, profile.pinnedProductSlugs);
      if (idx >= 0) return { ruleIndex, priorityIndex: idx };
      continue;
    }
    if (rule === "keywords") {
      const idx = profile.keywordPriority.findIndex((k) => matchesKeyword(record, k));
      if (idx >= 0) return { ruleIndex, priorityIndex: idx };
      continue;
    }
    if (rule === "brands") {
      const idx = brandMatchIndex(record, profile.brandPriority);
      if (idx >= 0) return { ruleIndex, priorityIndex: idx };
      continue;
    }
    if (rule === "categories") {
      const idx = categoryMatchIndex(record, profile.categoryPriority);
      if (idx >= 0) return { ruleIndex, priorityIndex: idx };
      continue;
    }
  }

  return { ruleIndex: fallbackRuleIndex, priorityIndex: Number.MAX_SAFE_INTEGER };
}

/**
 * Apply priority-bucket ordering, then Default Sort within each bucket.
 * Does not mutate the input array.
 */
export function applyProductOrdering<T extends OrderableListingRecord>(
  records: T[],
  profile: ProductOrderingProfile | null | undefined,
): T[] {
  if (!profile || records.length <= 1) return records.slice();

  const originalIndex = new Map<string, number>();
  records.forEach((r, i) => {
    if (!originalIndex.has(r.slug)) originalIndex.set(r.slug, i);
  });

  const assignments = new Map<string, BucketAssignment>();
  for (const record of records) {
    assignments.set(record.slug, assignBucket(record, profile));
  }

  const copy = records.slice();
  copy.sort((a, b) => {
    const aa = assignments.get(a.slug)!;
    const bb = assignments.get(b.slug)!;
    if (aa.ruleIndex !== bb.ruleIndex) return aa.ruleIndex - bb.ruleIndex;
    if (aa.priorityIndex !== bb.priorityIndex) return aa.priorityIndex - bb.priorityIndex;
    return compareDefaultSort(a, b, profile.defaultSort, originalIndex);
  });
  return copy;
}
