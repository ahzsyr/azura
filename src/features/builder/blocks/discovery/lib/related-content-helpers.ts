import { contentItemPublicPath } from "@/features/content/content-admin-paths";
import type { ContentCardData } from "@/features/content/types";
import type { DiscoveryAnchorContext } from "./recently-viewed.types";

export function attrValues(
  attributes: Record<string, unknown> | undefined,
  keys: string[],
): string[] {
  if (!attributes) return [];
  const out: string[] = [];
  for (const key of keys) {
    const raw = attributes[key];
    if (Array.isArray(raw)) {
      for (const value of raw) out.push(String(value).toLowerCase());
    } else if (raw != null && String(raw).trim()) {
      out.push(String(raw).toLowerCase());
    }
  }
  return out;
}

export function matchesAny(values: string[], allowed: Set<string>): boolean {
  if (allowed.size === 0) return true;
  return values.some((value) => allowed.has(value));
}

export function filterRelatedContentByTaxonomy(
  items: ContentCardData[],
  categorySlugs: string[],
  tags: string[],
): ContentCardData[] {
  const categorySet = new Set(categorySlugs.map((c) => c.toLowerCase()));
  const tagSet = new Set(tags.map((t) => t.toLowerCase()));
  return items.filter((item) => {
    const categories = attrValues(item.attributes, ["categories", "category", "mainCategory"]);
    const itemTags = attrValues(item.attributes, ["tags", "tag"]);
    return matchesAny(categories, categorySet) && matchesAny(itemTags, tagSet);
  });
}

export function excludeCurrentRelatedContentItem(
  items: ContentCardData[],
  excludeCurrentItem: boolean,
  anchor?: DiscoveryAnchorContext | null,
): ContentCardData[] {
  if (!excludeCurrentItem || !anchor || anchor.context !== "contentItem") {
    return items;
  }
  return items.filter(
    (item) =>
      item.id !== anchor.id &&
      item.slug !== anchor.slug &&
      item.id !== anchor.slug,
  );
}

/** Build a content-item public path from type route metadata and item slug. */
export function relatedContentItemPath(
  routePrefix: string | null | undefined,
  typeSlug: string | null | undefined,
  itemSlug: string | null | undefined,
): string | null {
  return contentItemPublicPath(routePrefix, typeSlug, itemSlug);
}
