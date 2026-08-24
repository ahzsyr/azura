import type { Category } from "@/features/categories/types";
import type { Collection } from "@/features/collections/types";
import { emptyRuleGroup, isEmptyRuleTree, upgradeLegacyRuleSet } from "@/features/categories/matching";

/** Map Category SoT rows to the Collection view shape (preserves nested RuleGroup). */
export function categoriesToCollections(categories: Category[]): Collection[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  return categories.map((cat) => {
    const parent = cat.parentId ? byId.get(cat.parentId) : undefined;
    const meta = cat.metadata ?? {};
    const root = upgradeLegacyRuleSet(cat.conditions);
    return {
      id: cat.id,
      slug: cat.slug,
      name: meta.name || cat.slug,
      description: meta.description || "",
      badge: meta.badge,
      coverImage: meta.coverImage,
      iconImage: meta.iconImage,
      parentSlug: parent?.slug,
      seo: meta.seo,
      conditions: isEmptyRuleTree(root) ? emptyRuleGroup(root.match) : root,
      cardTemplate: meta.cardTemplate,
      sortBy: meta.sortBy as Collection["sortBy"],
      visible: cat.visible,
      showInNav: cat.showInNav,
      featured: cat.featured,
      tags: meta.tags,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
    };
  });
}
