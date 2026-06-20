import "server-only";

import { collectionsDataService } from "@/features/collections/collections-data.service";
import { loadListingRecords } from "@/features/products/index/product-index-loader";
import {
  loadCategoryExplorerNodes,
  sortFeaturedFirst,
  type CategoryExplorerNode,
} from "@/features/discovery-blocks/lib/category-sources";
import type { z } from "zod";
import type { categoryShowcasePropsSchema } from "@/features/commerce-showcase/schemas/showcase-blocks";

export type CategoryShowcaseNode = CategoryExplorerNode & {
  iconUrl?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  children?: CategoryShowcaseNode[];
};

type CategoryShowcaseConfig = Pick<
  z.infer<typeof categoryShowcasePropsSchema>,
  | "source"
  | "selection"
  | "manualSlugs"
  | "featuredSlugs"
  | "manualNodes"
  | "maxDepth"
  | "limit"
  | "sort"
>;

function manualToShowcaseNode(
  n: CategoryShowcaseConfig["manualNodes"][number],
  localePrefix: string,
): CategoryShowcaseNode {
  const label = n.label || n.id;
  const href = n.href.startsWith("/") ? `/${localePrefix}${n.href}` : n.href;
  return {
    slug: n.id,
    name: label,
    href,
    imageUrl: n.imageUrl || undefined,
    iconUrl: n.iconUrl || undefined,
    descriptionEn: n.description,
    descriptionAr: n.description,
    children: (n.children ?? []).map((c) => manualToShowcaseNode(c, localePrefix)),
  };
}

function enrichFromCollections(
  nodes: CategoryShowcaseNode[],
  collections: Awaited<ReturnType<typeof collectionsDataService.loadAll>>,
): CategoryShowcaseNode[] {
  const bySlug = new Map(collections.map((c) => [c.slug, c]));
  return nodes.map((n) => {
    const col = bySlug.get(n.slug);
    if (!col) return n;
    return {
      ...n,
      imageUrl: n.imageUrl || col.coverImage || undefined,
      iconUrl: col.iconImage || undefined,
      name: n.name || col.name,
    };
  });
}

function sortNodes(nodes: CategoryShowcaseNode[], sort: CategoryShowcaseConfig["sort"]): CategoryShowcaseNode[] {
  const sorted = [...nodes];
  if (sort === "count") {
    sorted.sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
  } else if (sort === "name") {
    sorted.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }
  return sorted;
}

export async function resolveCategoryShowcaseNodes(
  localePrefix: string,
  config: CategoryShowcaseConfig,
): Promise<CategoryShowcaseNode[]> {
  if (config.source === "manual") {
    let nodes = (config.manualNodes ?? []).map((n) => manualToShowcaseNode(n, localePrefix));
    nodes = sortFeaturedFirst(nodes, config.featuredSlugs) as CategoryShowcaseNode[];
    return sortNodes(nodes, config.sort).slice(0, config.limit ?? 12);
  }

  const explorerConfig = {
    source: config.source === "productCategories" ? ("productCategories" as const) : ("collections" as const),
    contentTypeSlug: "",
    featuredSlugs: config.featuredSlugs,
    manualNodes: [],
    maxDepth: config.maxDepth,
  };

  let nodes = (await loadCategoryExplorerNodes(localePrefix, explorerConfig)) as CategoryShowcaseNode[];

  if (config.source === "collections") {
    const collections = await collectionsDataService.loadAll({ localePrefix });
    nodes = enrichFromCollections(nodes, collections);
  }

  if (config.selection === "manual" && config.manualSlugs.length > 0) {
    const allowed = new Set(config.manualSlugs.map((s) => s.toLowerCase()));
    nodes = nodes.filter((n) => allowed.has(n.slug.toLowerCase()));
  }

  nodes = sortFeaturedFirst(nodes, config.featuredSlugs) as CategoryShowcaseNode[];
  nodes = sortNodes(nodes, config.sort);

  const limit = Math.min(48, Math.max(1, config.limit ?? 12));
  return nodes.slice(0, limit);
}

export async function resolveAutoTaxonomyTabs(
  localePrefix: string,
  taxonomy: "category" | "brand",
  limit: number,
): Promise<Array<{ slug: string; label: string; count?: number; iconUrl?: string }>> {
  if (taxonomy === "brand") {
    const { resolveBrandShowcaseNodes } = await import(
      "@/features/commerce-showcase/lib/resolve-brand-profiles"
    );
    const nodes = await resolveBrandShowcaseNodes(localePrefix, {
      source: "catalogProfiles",
      manualBrands: [],
      featuredSlugs: [],
      manualSlugs: [],
      sort: "productCount",
      limit,
    });
    return nodes.map((n) => ({
      slug: n.slug,
      label: n.name,
      count: n.count,
      iconUrl: n.logoUrl,
    }));
  }

  const records = await loadListingRecords(localePrefix);
  const counts = new Map<string, number>();
  for (const r of records) {
    const cats = [r.category, ...(r.categories ?? [])].filter(Boolean);
    for (const cat of cats) {
      const slug = String(cat).trim().toLowerCase().replace(/\s+/g, "-");
      counts.set(slug, (counts.get(slug) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([slug, count]) => ({
      slug,
      label: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      count,
    }))
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
    .slice(0, limit);
}
