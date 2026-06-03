import type { ContentFieldDefinition } from "@/features/content/types";
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
  locale: string,
  attributes?: Record<string, unknown>
): string | null {
  if (value == null) return null;

  if (field.type === "boolean") {
    const yes = locale.startsWith("ar") ? "نعم" : "Yes";
    const no = locale.startsWith("ar") ? "لا" : "No";
    return value ? yes : no;
  }

  if (field.type === "select" && field.options?.length) {
    const str = String(value);
    const opt = field.options.find((o) => o.value === str);
    if (opt) return locale.startsWith("ar") && opt.labelAr ? opt.labelAr : opt.labelEn;
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
    return formatPrice(n, currency, locale);
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
  locale: string
): unknown {
  if (field.localized) {
    const suffix = locale.startsWith("ar") ? "Ar" : "En";
    const localized = attributes[`${field.key}${suffix}`];
    if (localized != null && String(localized).trim() !== "") return localized;
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
  locale: string
): (string | null)[] {
  return items.map((item) =>
    formatCellValue(
      readAttributeValue(item.attributes, meta.field, locale),
      meta.field,
      locale,
      item.attributes
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
  locale: string,
  mode: CompareViewMode
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
      const values = extractFieldValues(items, meta, locale);
      const differs = rowDiffers(values);
      if ((mode === "differences" || mode === "hideEqual") && !differs) continue;

      const label = locale.startsWith("ar") && meta.labelAr ? meta.labelAr : meta.labelEn;
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
  locale: string
): CompareItemSnapshot[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => {
    const title = locale.startsWith("ar") ? item.titleAr : item.titleEn;
    return title.toLowerCase().includes(q) || (item.slug?.toLowerCase().includes(q) ?? false);
  });
}
