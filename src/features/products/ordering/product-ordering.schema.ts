import { z } from "zod";

export const PRODUCT_ORDERING_SCOPE_TYPES = [
  "GLOBAL",
  "PRODUCT_LIST",
  "BRAND",
  "CATEGORY",
  "COLLECTION",
  "SEARCH",
] as const;

export type ProductOrderingScopeType = (typeof PRODUCT_ORDERING_SCOPE_TYPES)[number];

export const PRODUCT_ORDERING_DEFAULT_SORTS = [
  "newest",
  "oldest",
  "price-asc",
  "price-desc",
  "name-asc",
  "name-desc",
  "best-selling",
  "featured",
  "manual",
] as const;

export type ProductOrderingDefaultSort = (typeof PRODUCT_ORDERING_DEFAULT_SORTS)[number];

export const PRODUCT_ORDERING_DEFAULT_SORT_LABELS: Record<ProductOrderingDefaultSort, string> = {
  newest: "Newest",
  oldest: "Oldest",
  "price-asc": "Price: Low → High",
  "price-desc": "Price: High → Low",
  "name-asc": "Name: A → Z",
  "name-desc": "Name: Z → A",
  "best-selling": "Best Selling",
  featured: "Featured",
  manual: "Manual",
};

export const PRODUCT_ORDERING_RULE_IDS = [
  "pinned",
  "keywords",
  "brands",
  "categories",
  "default",
] as const;

export type ProductOrderingRuleId = (typeof PRODUCT_ORDERING_RULE_IDS)[number];

export const PRODUCT_ORDERING_RULE_LABELS: Record<ProductOrderingRuleId, string> = {
  pinned: "Specific Products",
  keywords: "Keywords",
  brands: "Brands",
  categories: "Categories",
  default: "Default Sort",
};

export const PRODUCT_ORDERING_KEYWORD_FIELDS = ["name", "sku", "tags", "searchText"] as const;

export type ProductOrderingKeywordField = (typeof PRODUCT_ORDERING_KEYWORD_FIELDS)[number];

export const PRODUCT_ORDERING_KEYWORD_FIELD_LABELS: Record<ProductOrderingKeywordField, string> = {
  name: "Name",
  sku: "SKU",
  tags: "Tags",
  searchText: "Search Text",
};

export const DEFAULT_PRODUCT_ORDERING_RULE_ORDER: ProductOrderingRuleId[] = [
  ...PRODUCT_ORDERING_RULE_IDS,
];

export const DEFAULT_KEYWORD_FIELDS: ProductOrderingKeywordField[] = [
  ...PRODUCT_ORDERING_KEYWORD_FIELDS,
];

export type ProductOrderingKeywordPriority = {
  id: string;
  keyword: string;
  fields: ProductOrderingKeywordField[];
};

export type ProductOrderingScope = {
  type: ProductOrderingScopeType;
  targetId?: string;
};

export type ProductOrderingProfile = {
  id: string;
  name: string;
  enabled: boolean;
  scope: ProductOrderingScope;
  defaultSort: ProductOrderingDefaultSort;
  brandPriority: string[];
  categoryPriority: string[];
  keywordPriority: ProductOrderingKeywordPriority[];
  pinnedProductSlugs: string[];
  ruleOrder: ProductOrderingRuleId[];
};

export type ProductOrderingSettings = {
  profiles: ProductOrderingProfile[];
};

const scopeTypeSchema = z.enum(PRODUCT_ORDERING_SCOPE_TYPES);
const defaultSortSchema = z.enum(PRODUCT_ORDERING_DEFAULT_SORTS);
const ruleIdSchema = z.enum(PRODUCT_ORDERING_RULE_IDS);
const keywordFieldSchema = z.enum(PRODUCT_ORDERING_KEYWORD_FIELDS);

function newId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createDefaultGlobalProfile(): ProductOrderingProfile {
  return {
    id: newId("po"),
    name: "Global Ordering",
    enabled: true,
    scope: { type: "GLOBAL" },
    defaultSort: "name-asc",
    brandPriority: [],
    categoryPriority: [],
    keywordPriority: [],
    pinnedProductSlugs: [],
    ruleOrder: [...DEFAULT_PRODUCT_ORDERING_RULE_ORDER],
  };
}

export const DEFAULT_PRODUCT_ORDERING_SETTINGS: ProductOrderingSettings = {
  profiles: [createDefaultGlobalProfile()],
};

export function normalizeRuleOrder(order: string[] | undefined): ProductOrderingRuleId[] {
  const seen = new Set<ProductOrderingRuleId>();
  const result: ProductOrderingRuleId[] = [];
  for (const id of order ?? []) {
    if (!ruleIdSchema.safeParse(id).success) continue;
    const rid = id as ProductOrderingRuleId;
    if (seen.has(rid)) continue;
    seen.add(rid);
    result.push(rid);
  }
  for (const id of PRODUCT_ORDERING_RULE_IDS) {
    if (!seen.has(id)) result.push(id);
  }
  return result;
}

export function normalizeKeywordFields(fields: unknown): ProductOrderingKeywordField[] {
  if (!Array.isArray(fields)) return [...DEFAULT_KEYWORD_FIELDS];
  const seen = new Set<ProductOrderingKeywordField>();
  const result: ProductOrderingKeywordField[] = [];
  for (const f of fields) {
    if (!keywordFieldSchema.safeParse(f).success) continue;
    const field = f as ProductOrderingKeywordField;
    if (seen.has(field)) continue;
    seen.add(field);
    result.push(field);
  }
  return result.length > 0 ? result : [...DEFAULT_KEYWORD_FIELDS];
}

function dedupeStrings(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    if (typeof raw !== "string") continue;
    const value = raw.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

function scopeKey(scope: ProductOrderingScope): string {
  const target = (scope.targetId ?? "").trim().toLowerCase();
  if (scope.type === "GLOBAL" || scope.type === "PRODUCT_LIST" || scope.type === "SEARCH") {
    return scope.type;
  }
  return `${scope.type}:${target}`;
}

function normalizeKeywordPriority(raw: unknown): ProductOrderingKeywordPriority[] {
  if (!Array.isArray(raw)) return [];
  const result: ProductOrderingKeywordPriority[] = [];
  const seenKeywords = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    const keyword = typeof obj.keyword === "string" ? obj.keyword.trim() : "";
    if (!keyword) continue;
    const key = keyword.toLowerCase();
    if (seenKeywords.has(key)) continue;
    seenKeywords.add(key);
    const id =
      typeof obj.id === "string" && obj.id.trim() ? obj.id.trim() : newId("kw");
    result.push({
      id,
      keyword,
      fields: normalizeKeywordFields(obj.fields),
    });
  }
  return result;
}

function normalizeScope(raw: unknown): ProductOrderingScope {
  if (!raw || typeof raw !== "object") return { type: "GLOBAL" };
  const obj = raw as Record<string, unknown>;
  const typeParse = scopeTypeSchema.safeParse(obj.type);
  const type: ProductOrderingScopeType = typeParse.success ? typeParse.data : "GLOBAL";
  if (type === "GLOBAL" || type === "PRODUCT_LIST" || type === "SEARCH") {
    return { type };
  }
  const targetId =
    typeof obj.targetId === "string" && obj.targetId.trim() ? obj.targetId.trim() : undefined;
  return { type, targetId };
}

function normalizeDefaultSort(raw: unknown): ProductOrderingDefaultSort {
  const parsed = defaultSortSchema.safeParse(raw);
  return parsed.success ? parsed.data : "name-asc";
}

function normalizeProfile(raw: unknown, index: number): ProductOrderingProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const id =
    typeof obj.id === "string" && obj.id.trim() ? obj.id.trim() : newId("po");
  const name =
    typeof obj.name === "string" && obj.name.trim()
      ? obj.name.trim()
      : `Ordering Profile ${index + 1}`;
  const enabled = obj.enabled !== false;
  const scope = normalizeScope(obj.scope);
  return {
    id,
    name,
    enabled,
    scope,
    defaultSort: normalizeDefaultSort(obj.defaultSort),
    brandPriority: dedupeStrings(obj.brandPriority),
    categoryPriority: dedupeStrings(obj.categoryPriority),
    keywordPriority: normalizeKeywordPriority(obj.keywordPriority),
    pinnedProductSlugs: dedupeStrings(obj.pinnedProductSlugs),
    ruleOrder: normalizeRuleOrder(
      Array.isArray(obj.ruleOrder) ? (obj.ruleOrder as string[]) : undefined,
    ),
  };
}

/** Normalize raw SiteSettings.productOrdering into a guaranteed-safe structure. */
export function parseProductOrderingSettings(raw: unknown): ProductOrderingSettings {
  const profiles: ProductOrderingProfile[] = [];
  const seenScopeKeys = new Set<string>();

  const rawProfiles =
    raw && typeof raw === "object" && Array.isArray((raw as { profiles?: unknown }).profiles)
      ? ((raw as { profiles: unknown[] }).profiles)
      : [];

  for (let i = 0; i < rawProfiles.length; i++) {
    const profile = normalizeProfile(rawProfiles[i], i);
    if (!profile) continue;
    const key = scopeKey(profile.scope);
    if (seenScopeKeys.has(key)) continue;
    if (
      (profile.scope.type === "BRAND" ||
        profile.scope.type === "CATEGORY" ||
        profile.scope.type === "COLLECTION") &&
      !profile.scope.targetId
    ) {
      continue;
    }
    seenScopeKeys.add(key);
    profiles.push(profile);
  }

  if (!seenScopeKeys.has("GLOBAL")) {
    profiles.unshift(createDefaultGlobalProfile());
  }

  if (profiles.length === 0) {
    return { profiles: [createDefaultGlobalProfile()] };
  }

  return { profiles };
}

export function serializeProductOrderingForSite(
  settings: ProductOrderingSettings,
): ProductOrderingSettings {
  return parseProductOrderingSettings(settings);
}

export function createEmptyProfile(
  partial?: Partial<Pick<ProductOrderingProfile, "name" | "scope">>,
): ProductOrderingProfile {
  const scope = partial?.scope ?? { type: "PRODUCT_LIST" as const };
  return {
    id: newId("po"),
    name: partial?.name?.trim() || "New Ordering Profile",
    enabled: true,
    scope:
      scope.type === "GLOBAL" || scope.type === "PRODUCT_LIST" || scope.type === "SEARCH"
        ? { type: scope.type }
        : { type: scope.type, targetId: scope.targetId },
    defaultSort: "name-asc",
    brandPriority: [],
    categoryPriority: [],
    keywordPriority: [],
    pinnedProductSlugs: [],
    ruleOrder: [...DEFAULT_PRODUCT_ORDERING_RULE_ORDER],
  };
}

export const productOrderingSettingsSchema = z.object({
  profiles: z.array(z.object({
    id: z.string(),
    name: z.string(),
    enabled: z.boolean(),
    scope: z.object({
      type: scopeTypeSchema,
      targetId: z.string().optional(),
    }),
    defaultSort: defaultSortSchema,
    brandPriority: z.array(z.string()),
    categoryPriority: z.array(z.string()),
    keywordPriority: z.array(
      z.object({
        id: z.string(),
        keyword: z.string(),
        fields: z.array(keywordFieldSchema),
      }),
    ),
    pinnedProductSlugs: z.array(z.string()),
    ruleOrder: z.array(ruleIdSchema),
  })),
});
