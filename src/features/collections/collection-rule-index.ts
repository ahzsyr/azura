import type { Collection, CollectionRule } from "./types";
import { normalizeForMatch } from "./normalization";

const RULE_INDEX_THRESHOLD = 50;

export function collectionRuleIndexThreshold(): number {
  const raw = process.env.COLLECTION_RULE_INDEX_THRESHOLD;
  if (raw != null && raw !== "") {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return RULE_INDEX_THRESHOLD;
}

type RuleIndex = {
  byBrand: Map<string, Set<string>>;
  byCategory: Map<string, Set<string>>;
  byTag: Map<string, Set<string>>;
  unindexed: Set<string>;
};

function addToMap(map: Map<string, Set<string>>, key: string, slug: string): void {
  const k = normalizeForMatch(key);
  if (!k) return;
  if (!map.has(k)) map.set(k, new Set());
  map.get(k)!.add(slug);
}

function indexRuleValue(index: RuleIndex, rule: CollectionRule, slug: string): void {
  const val = rule.value.trim();
  if (!val) return;

  switch (rule.field) {
    case "brand":
      addToMap(index.byBrand, val, slug);
      break;
    case "category":
    case "categories":
      addToMap(index.byCategory, val, slug);
      break;
    case "tags":
      addToMap(index.byTag, val, slug);
      break;
    default:
      index.unindexed.add(slug);
      break;
  }
}

export function buildCollectionRuleIndex(collections: Collection[]): RuleIndex {
  const index: RuleIndex = {
    byBrand: new Map(),
    byCategory: new Map(),
    byTag: new Map(),
    unindexed: new Set(),
  };

  for (const col of collections) {
    if (col.visible === false) continue;
    for (const rule of col.conditions?.rules ?? []) {
      indexRuleValue(index, rule, col.slug);
    }
    if (!col.conditions?.rules?.length) {
      index.unindexed.add(col.slug);
    }
  }

  return index;
}

export function candidateCollectionSlugsFromIndex(
  index: RuleIndex,
  product: {
    brand?: string;
    category?: string;
    categories?: string[];
    tags?: string[];
  },
): Set<string> | null {
  const candidates = new Set<string>();

  if (product.brand) {
    const k = normalizeForMatch(product.brand);
    for (const slug of index.byBrand.get(k) ?? []) candidates.add(slug);
  }

  const cats = new Set<string>();
  if (product.category) cats.add(normalizeForMatch(String(product.category)));
  for (const c of product.categories ?? []) cats.add(normalizeForMatch(c));

  for (const cat of cats) {
    if (!cat) continue;
    for (const slug of index.byCategory.get(cat) ?? []) candidates.add(slug);
    for (const [key, slugs] of index.byCategory) {
      if (key.includes(cat) || cat.includes(key)) {
        for (const s of slugs) candidates.add(s);
      }
    }
  }

  for (const tag of product.tags ?? []) {
    const k = normalizeForMatch(tag);
    for (const slug of index.byTag.get(k) ?? []) candidates.add(slug);
    for (const [key, slugs] of index.byTag) {
      if (key.includes(k) || k.includes(key)) {
        for (const s of slugs) candidates.add(s);
      }
    }
  }

  for (const slug of index.unindexed) candidates.add(slug);

  return candidates;
}

export function filterCollectionsByCandidates(
  collections: Collection[],
  candidates: Set<string> | null,
): Collection[] {
  if (!candidates) return collections;
  return collections.filter((c) => candidates.has(c.slug));
}

export function shouldUseCollectionRuleIndex(collectionCount: number): boolean {
  return collectionCount >= collectionRuleIndexThreshold();
}
