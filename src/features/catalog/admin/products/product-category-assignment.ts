export type ProductCategoryOption = {
  id: string;
  slug: string;
  name: string;
};

export type ProductCategoryAssignment = {
  categoryIds: string[];
  categories: string[];
  category: string;
};

/** Derive durable ids + display labels from a multi-select of PRODUCT categories. */
export function assignmentFromCategoryIds(
  selectedIds: readonly unknown[],
  options: readonly ProductCategoryOption[],
): ProductCategoryAssignment {
  const byId = new Map(options.map((opt) => [opt.id, opt]));
  const categoryIds = [
    ...new Set(
      selectedIds.filter((id): id is string => typeof id === "string" && Boolean(id.trim())),
    ),
  ].filter((id) => byId.has(id));
  const categories = categoryIds.map((id) => {
    const opt = byId.get(id)!;
    return opt.name || opt.slug;
  });
  return {
    categoryIds,
    categories,
    category: categories[0] ?? "",
  };
}
