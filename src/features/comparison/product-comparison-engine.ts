import type { ProductSpecificationGroup } from "@/features/products/types";
import { rowsForGroup } from "@/features/products/lib/product-spec-rows";
import type { CompareRowEntry } from "@/features/comparison/types";

function groupLabel(group: { technology?: string; name?: string }): string {
  return (group.technology || group.name || "Specifications").trim() || "Specifications";
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

export function buildProductSpecCompareTable(
  products: { specifications?: ProductSpecificationGroup[] }[],
  mode: "all" | "differences" | "hideEqual"
): CompareRowEntry[] {
  if (products.length === 0) return [];

  const groupOrder: string[] = [];
  const groupRows = new Map<string, Map<string, (string | null)[]>>();

  products.forEach((product, productIndex) => {
    const specs = product.specifications ?? [];
    for (const group of specs) {
      const gLabel = groupLabel(group);
      if (!groupRows.has(gLabel)) {
        groupRows.set(gLabel, new Map());
        groupOrder.push(gLabel);
      }
      const rows = groupRows.get(gLabel)!;
      for (const row of rowsForGroup(group)) {
        const name = (row.name ?? "").trim() || "-";
        if (!rows.has(name)) {
          rows.set(name, Array(products.length).fill(null));
        }
        const arr = rows.get(name)!;
        arr[productIndex] = formatCellValue(row.value);
      }
    }
  });

  const entries: CompareRowEntry[] = [];

  for (const gLabel of groupOrder) {
    const rows = groupRows.get(gLabel);
    if (!rows) continue;

    const dataRows: CompareRowEntry[] = [];
    for (const [name, values] of rows) {
      const differs = rowDiffers(values);
      if ((mode === "differences" || mode === "hideEqual") && !differs) continue;
      dataRows.push({
        type: "row",
        key: name,
        group: gLabel,
        label: name,
        values,
        differs,
        highlightDifferences: true,
      });
    }

    if (dataRows.length === 0) continue;
    entries.push({ type: "group", group: gLabel });
    entries.push(...dataRows);
  }

  return entries;
}
