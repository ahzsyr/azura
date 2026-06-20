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
