import type { ProductSpecificationGroup, ProductSpecEntry } from "@/features/products/types";

/** Legacy JSON often has `items` as real rows and `features` as parallel string labels — do not merge both. */
export function rowsForGroup(group: ProductSpecificationGroup): ProductSpecEntry[] {
  const items = group.items ?? [];
  const hasItemObjects = items.some(
    (r) => r && typeof r === "object" && ((r.name ?? "").trim() !== "" || (r.value ?? "").toString().trim() !== ""),
  );
  if (hasItemObjects) {
    return items.filter(
      (r) => r && typeof r === "object" && ((r.name ?? "").trim() !== "" || (r.value ?? "").toString().trim() !== ""),
    );
  }
  const feats = group.features ?? [];
  if (!feats.length) return [];
  const first = feats[0];
  if (typeof first === "string") return [];
  return feats.filter(
    (r) =>
      r &&
      typeof r === "object" &&
      ((r as ProductSpecEntry).name?.trim() || (r as ProductSpecEntry).value?.toString().trim()),
  ) as ProductSpecEntry[];
}

export type NestedSpecRow = {
  item: ProductSpecEntry;
  depth: number;
  isGroup: boolean;
};

/** Build parent/child rows from UniFi `is_group` + `parent` flags. */
export function nestedSpecRows(group: ProductSpecificationGroup): NestedSpecRow[] {
  return rowsForGroup(group).map((item) => ({
    item,
    isGroup: Boolean(item.is_group),
    depth: item.parent || item.is_group ? (item.is_group ? 0 : 1) : 0,
  }));
}
