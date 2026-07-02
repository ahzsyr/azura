import {
  STANDARD_SEARCH_INDEX_FIELDS,
  type SearchIndexFieldKey,
  type StandardSearchIndexFieldKey,
  isCustomFieldKey,
  customFieldKeyFromSchema,
} from "@/capabilities/search/engine/indexing/search-index-field-keys";
import type { SearchableFieldDefinition } from "@/capabilities/search/engine/schema/search-field-schema";
import { isFieldSearchable } from "@/capabilities/search/engine/schema/search-field-schema";

export type SearchIndexFieldRule = {
  enabled?: boolean;
  weight?: number;
  facet?: boolean;
};

export type ResolvedSearchIndexProfile = {
  /** Field key → rule (enabled fields only in `activeKeys`). */
  fields: Map<SearchIndexFieldKey, SearchIndexFieldRule & { enabled: true }>;
  activeKeys: SearchIndexFieldKey[];
  defaultWeight: number;
};

const DEFAULT_RULE: SearchIndexFieldRule = { enabled: true, weight: 1 };

function defaultStandardProfile(): Map<SearchIndexFieldKey, SearchIndexFieldRule & { enabled: true }> {
  const map = new Map<SearchIndexFieldKey, SearchIndexFieldRule & { enabled: true }>();
  for (const key of STANDARD_SEARCH_INDEX_FIELDS) {
    map.set(key, { enabled: true, weight: defaultWeightFor(key), facet: facetDefaultFor(key) });
  }
  return map;
}

function defaultWeightFor(key: StandardSearchIndexFieldKey): number {
  switch (key) {
    case "title":
    case "name":
      return 3;
    case "slug":
      return 2;
    case "summary":
    case "description":
      return 2;
    case "seo_fields":
      return 2;
    case "tags":
    case "categories":
    case "collections":
      return 1.5;
    default:
      return 1;
  }
}

function facetDefaultFor(key: StandardSearchIndexFieldKey): boolean {
  return key === "tags" || key === "categories" || key === "collections";
}

function parseFieldRule(raw: unknown): SearchIndexFieldRule | null {
  if (raw === false) return { enabled: false };
  if (raw === true) return { enabled: true };
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    return {
      enabled: o.enabled !== false,
      weight: typeof o.weight === "number" ? o.weight : undefined,
      facet: o.facet === true,
    };
  }
  return null;
}

/**
 * Resolve per–content-type index profile from ContentType.adminConfig.search.
 */
export function resolveSearchIndexProfile(
  adminConfig: unknown,
  fieldSchema: SearchableFieldDefinition[] = []
): ResolvedSearchIndexProfile {
  const raw =
    adminConfig && typeof adminConfig === "object" && !Array.isArray(adminConfig)
      ? (adminConfig as Record<string, unknown>)
      : {};
  const searchRaw = raw.search;
  const s =
    searchRaw && typeof searchRaw === "object" && !Array.isArray(searchRaw)
      ? (searchRaw as Record<string, unknown>)
      : {};

  const fields = defaultStandardProfile();
  let customFieldsDisabled = false;

  const indexRaw = s.index;
  const legacyFields = s.fields;
  if (indexRaw && typeof indexRaw === "object" && !Array.isArray(indexRaw)) {
    const indexObj = indexRaw as Record<string, unknown>;
    const fieldOverrides = indexObj.fields ?? legacyFields;
    if (fieldOverrides && typeof fieldOverrides === "object" && !Array.isArray(fieldOverrides)) {
      for (const [key, ruleRaw] of Object.entries(fieldOverrides as Record<string, unknown>)) {
        const rule = parseFieldRule(ruleRaw);
        if (!rule || rule.enabled === false) {
          if (key === "custom_fields") customFieldsDisabled = true;
          fields.delete(key as SearchIndexFieldKey);
          continue;
        }
        const prev = fields.get(key as SearchIndexFieldKey);
        fields.set(key as SearchIndexFieldKey, {
          enabled: true,
          weight: rule.weight ?? prev?.weight ?? 1,
          facet:
            rule.facet !== undefined
              ? rule.facet
              : prev?.facet ?? facetDefaultFor(key as StandardSearchIndexFieldKey),
        });
      }
    }
    if (Array.isArray(indexObj.include)) {
      const allowed = new Set(indexObj.include.map(String));
      for (const key of [...fields.keys()]) {
        if (!allowed.has(key) && !String(key).startsWith("custom:")) fields.delete(key);
      }
    }
    if (Array.isArray(indexObj.exclude)) {
      for (const key of indexObj.exclude) fields.delete(String(key) as SearchIndexFieldKey);
    }
  } else if (
    legacyFields &&
    typeof legacyFields === "object" &&
    !Array.isArray(legacyFields)
  ) {
    for (const [key, ruleRaw] of Object.entries(legacyFields as Record<string, unknown>)) {
      const rule = parseFieldRule(ruleRaw);
      if (!rule || rule.enabled === false) {
        if (key === "custom_fields") customFieldsDisabled = true;
        fields.delete(key as SearchIndexFieldKey);
        continue;
      }
      const prev = fields.get(key as SearchIndexFieldKey);
      fields.set(key as SearchIndexFieldKey, {
        enabled: true,
        weight: rule.weight ?? prev?.weight ?? 1,
        facet:
          rule.facet !== undefined
            ? rule.facet
            : prev?.facet ?? facetDefaultFor(key as StandardSearchIndexFieldKey),
      });
    }
  }

  for (const field of fieldSchema) {
    if (!isFieldSearchable(field)) continue;
    const customKey = customFieldKeyFromSchema(field.key);
    if (!fields.has(customKey)) {
      const cfg = field.search;
      fields.set(customKey, {
        enabled: true,
        weight:
          cfg && typeof cfg === "object" && typeof cfg.weight === "number" ? cfg.weight : 1,
        facet: cfg === true || (cfg && typeof cfg === "object" && cfg.facet === true),
      });
    }
    if (!customFieldsDisabled && !fields.has("custom_fields")) {
      fields.set("custom_fields", { enabled: true, weight: 1, facet: false });
    }
  }

  const activeKeys = [...fields.keys()].filter((k) => fields.get(k)?.enabled);
  return {
    fields,
    activeKeys,
    defaultWeight: 1,
  };
}

export function isFieldActive(profile: ResolvedSearchIndexProfile, key: SearchIndexFieldKey): boolean {
  return profile.fields.get(key)?.enabled === true;
}

export function fieldWeight(profile: ResolvedSearchIndexProfile, key: SearchIndexFieldKey): number {
  return profile.fields.get(key)?.weight ?? profile.defaultWeight;
}

export function fieldFacetEnabled(profile: ResolvedSearchIndexProfile, key: SearchIndexFieldKey): boolean {
  return profile.fields.get(key)?.facet === true;
}

export function activeCustomFieldKeys(profile: ResolvedSearchIndexProfile): string[] {
  return profile.activeKeys
    .filter(isCustomFieldKey)
    .map((k) => k.slice("custom:".length));
}
