import type { ContentFieldDefinition } from "@/features/content/types";
import { FALLBACK_LOCALES, getContentFieldSuffix, resolvePrefixToCode } from "@/i18n/locale-config";
import { resolveLocaleCandidates } from "@/i18n/locale-resolution";
import {
  compareBooleanLabel,
  compareFieldLabel,
  compareItemTitle,
  compareSelectOptionLabel,
  type CompareLocaleOptions,
} from "@/features/comparison/lib/compare-locale";
import type {
  CompareFieldMeta,
  CompareItemSnapshot,
  CompareRowEntry,
  CompareViewMode,
} from "@/features/comparison/types";
import { formatPrice } from "@/lib/utils";

function formatCellValue(
  value: unknown,
  field: ContentFieldDefinition,
  localePrefix: string,
  attributes?: Record<string, unknown>,
  options?: CompareLocaleOptions
): string | null {
  if (value == null) return null;

  if (field.type === "boolean") {
    return compareBooleanLabel(Boolean(value), localePrefix, options);
  }

  if (field.type === "select" && field.options?.length) {
    const str = String(value);
    const opt = field.options.find((o) => o.value === str);
    if (opt) {
      return compareSelectOptionLabel(opt as Record<string, unknown>, localePrefix, options);
    }
  }

  if (field.type === "json") {
    try {
      const s = typeof value === "string" ? value : JSON.stringify(value);
      return s.length > 120 ? `${s.slice(0, 117)}…` : s;
    } catch {
      return String(value);
    }
  }

  if (field.type === "price") {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    const currency = (attributes?.currency as string) ?? "USD";
    return formatPrice(n, currency, localePrefix);
  }

  if (field.type === "number") {
    const n = Number(value);
    return Number.isFinite(n) ? String(n) : null;
  }

  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

function readAttributeValue(
  attributes: Record<string, unknown>,
  field: ContentFieldDefinition,
  localePrefix: string,
  options?: CompareLocaleOptions
): unknown {
  if (field.localized) {
    const enabled = options?.enabledLocales ?? FALLBACK_LOCALES;
    const defaultCode =
      options?.defaultCode ?? enabled.find((l) => l.isDefault)?.code ?? "en";
    const code = resolvePrefixToCode(localePrefix, enabled);
    for (const candidate of resolveLocaleCandidates(code, enabled, defaultCode)) {
      const suffix = getContentFieldSuffix(candidate);
      const localized = attributes[`${field.key}${suffix}`];
      if (localized != null && String(localized).trim() !== "") return localized;
    }
    return attributes[`${field.key}En`] ?? attributes[`${field.key}Ar`];
  }
  return attributes[field.key];
}

function normalizeForCompare(value: string | null): string {
  if (value == null) return "";
  return value.trim().toLowerCase();
}

function rowDiffers(values: (string | null)[]): boolean {
  const filled = values.map(normalizeForCompare).filter((v) => v.length > 0);
  if (filled.length < 2) return false;
  const first = filled[0];
  return filled.some((v) => v !== first);
}

export function extractFieldValues(
  items: CompareItemSnapshot[],
  meta: CompareFieldMeta,
  localePrefix: string,
  options?: CompareLocaleOptions
): (string | null)[] {
  return items.map((item) =>
    formatCellValue(
      readAttributeValue(item.attributes, meta.field, localePrefix, options),
      meta.field,
      localePrefix,
      item.attributes,
      options
    )
  );
}

export function getCompareGroupsFromFields(fields: CompareFieldMeta[]): string[] {
  const groups: string[] = [];
  for (const f of fields) {
    if (!groups.includes(f.compareGroup)) groups.push(f.compareGroup);
  }
  return groups;
}

export function filterCompareEntriesByGroups(
  entries: CompareRowEntry[],
  activeGroups: Set<string> | null
): CompareRowEntry[] {
  if (!activeGroups || activeGroups.size === 0) return entries;

  const out: CompareRowEntry[] = [];
  let includeSection = false;

  for (const entry of entries) {
    if (entry.type === "group") {
      includeSection = activeGroups.has(entry.group);
      if (includeSection) out.push(entry);
    } else if (includeSection) {
      out.push(entry);
    }
  }

  return out;
}

export function buildCompareTable(
  items: CompareItemSnapshot[],
  fields: CompareFieldMeta[],
  localePrefix: string,
  mode: CompareViewMode,
  options?: CompareLocaleOptions
): CompareRowEntry[] {
  if (items.length === 0 || fields.length === 0) return [];

  const groupOrder: string[] = [];
  const groupFields = new Map<string, CompareFieldMeta[]>();

  for (const meta of fields) {
    if (!groupFields.has(meta.compareGroup)) {
      groupFields.set(meta.compareGroup, []);
      groupOrder.push(meta.compareGroup);
    }
    groupFields.get(meta.compareGroup)!.push(meta);
  }

  const entries: CompareRowEntry[] = [];

  for (const group of groupOrder) {
    const metas = groupFields.get(group) ?? [];
    const dataRows: CompareRowEntry[] = [];

    for (const meta of metas) {
      const values = extractFieldValues(items, meta, localePrefix, options);
      const differs = rowDiffers(values);
      if ((mode === "differences" || mode === "hideEqual") && !differs) continue;

      const label = compareFieldLabel(meta, localePrefix, options);
      dataRows.push({
        type: "row",
        key: meta.key,
        group,
        label,
        values,
        differs,
        highlightDifferences: meta.highlightDifferences,
      });
    }

    if (dataRows.length === 0) continue;
    entries.push({ type: "group", group });
    entries.push(...dataRows);
  }

  return entries;
}

export function filterCompareItemsBySearch(
  items: CompareItemSnapshot[],
  query: string,
  localePrefix: string,
  options?: CompareLocaleOptions
): CompareItemSnapshot[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => {
    const title = compareItemTitle(item, localePrefix, options);
    return title.toLowerCase().includes(q) || (item.slug?.toLowerCase().includes(q) ?? false);
  });
}
