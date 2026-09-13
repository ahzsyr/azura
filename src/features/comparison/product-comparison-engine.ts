import type { ProductSpecificationGroup } from "@/features/products/types";
import { rowsForGroup } from "@/features/products/lib/product-spec-rows";
import type { CompareRowEntry } from "@/features/comparison/types";
import { getCanonicalSpecsMap } from "@/features/specifications/canonical-specs-map";
import type { CanonicalSpecRecord } from "@/features/specifications/types";

const OTHER_GROUP = "Other specifications";

function canonicalIdGroup(id: string): string {
  const domain = id.split(".")[0] || "specifications";
  return domain.charAt(0).toUpperCase() + domain.slice(1);
}

function canonicalIdLabel(id: string, record?: CanonicalSpecRecord): string {
  return record?.name || id.split(".").pop()?.replace(/_/g, " ") || id;
}

function formatCellValue(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
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

type CompareProduct = {
  canonical_specs?: Record<string, CanonicalSpecRecord | string>;
  specifications?: ProductSpecificationGroup[];
  source_specifications?: ProductSpecificationGroup[];
  unmapped_specs?: Array<{
    source_group?: string;
    source_label?: string;
    value?: string;
    reason?: string;
  }>;
  ambiguous_specs?: Array<{
    source_group?: string;
    source_label?: string;
    value?: string;
    reason?: string;
  }>;
};

function legacyGroupedRows(
  product: CompareProduct,
  productIndex: number,
  productCount: number,
  rows: Map<string, { group: string; label: string; values: (string | null)[] }>,
) {
  const specs = product.specifications ?? [];
  for (const group of specs) {
    const gLabel = (group.technology || "Specifications").trim() || "Specifications";
    for (const row of rowsForGroup(group)) {
      const name = (row.name ?? "").trim() || "-";
      const key = `legacy:${gLabel}:${name}`;
      if (!rows.has(key)) {
        rows.set(key, {
          group: gLabel,
          label: name,
          values: Array(productCount).fill(null),
        });
      }
      rows.get(key)!.values[productIndex] = formatCellValue(row.value);
    }
  }
}

export function buildProductSpecCompareTable(
  products: CompareProduct[],
  mode: "all" | "differences" | "hideEqual",
): CompareRowEntry[] {
  if (products.length === 0) return [];

  const rows = new Map<string, { group: string; label: string; values: (string | null)[] }>();

  products.forEach((product, productIndex) => {
    const canonical = getCanonicalSpecsMap(product);
    for (const id of Object.keys(canonical)) {
      if (!rows.has(id)) {
        const record = canonical[id];
        rows.set(id, {
          group: canonicalIdGroup(id),
          label: canonicalIdLabel(id, record),
          values: Array(products.length).fill(null),
        });
      }
      const record = canonical[id];
      rows.get(id)!.values[productIndex] = formatCellValue(record.display || record.value);
    }

    const hasCanonical = Object.keys(canonical).length > 0;
    if (!hasCanonical) {
      legacyGroupedRows(product, productIndex, products.length, rows);
    }

    const otherSpecs = [
      ...(product.unmapped_specs || []),
      ...(product.ambiguous_specs || []),
    ];
    for (const item of otherSpecs) {
      const label = (item.source_label || "").trim() || "-";
      const key = `other:${item.source_group || ""}:${label}`;
      if (!rows.has(key)) {
        rows.set(key, {
          group: OTHER_GROUP,
          label,
          values: Array(products.length).fill(null),
        });
      }
      rows.get(key)!.values[productIndex] = formatCellValue(item.value);
    }
  });

  const sortedKeys = [...rows.keys()].sort((a, b) => {
    const aCanon = !a.startsWith("legacy:") && !a.startsWith("other:");
    const bCanon = !b.startsWith("legacy:") && !b.startsWith("other:");
    if (aCanon && bCanon) return a.localeCompare(b);
    if (aCanon) return -1;
    if (bCanon) return 1;
    return a.localeCompare(b);
  });

  const entries: CompareRowEntry[] = [];
  let currentGroup = "";

  for (const key of sortedKeys) {
    const row = rows.get(key);
    if (!row) continue;
    const differs = rowDiffers(row.values);
    if ((mode === "differences" || mode === "hideEqual") && !differs) continue;

    if (row.group !== currentGroup) {
      entries.push({ type: "group", group: row.group });
      currentGroup = row.group;
    }

    entries.push({
      type: "row",
      key,
      group: row.group,
      label: row.label,
      values: row.values,
      differs,
      highlightDifferences: true,
    });
  }

  return entries;
}
