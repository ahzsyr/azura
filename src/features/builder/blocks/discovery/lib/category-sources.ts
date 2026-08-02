import "server-only";

import { prisma } from "@/lib/prisma";
import { collectionsDataService } from "@/features/collections/collections-data.service";
import { loadListingRecords } from "@/features/products/index/product-index-loader";
import { loadTranslationsMap, localizedFieldValue } from "@/features/translation/bilingual-serialize";
import type { z } from "zod";
import type { categoryExplorerPropsSchema } from "@/features/builder/blocks/discovery/schemas/discovery-blocks";

export type CategoryExplorerNode = {
  slug: string;
  name: string;
  href: string;
  imageUrl?: string;
  count?: number;
  parentSlug?: string;
  children?: CategoryExplorerNode[];
};

type ExplorerConfig = Pick<
  z.infer<typeof categoryExplorerPropsSchema>,
  "source" | "contentTypeSlug" | "featuredSlugs" | "manualNodes" | "maxDepth"
>;

export async function loadCategoryExplorerNodes(
  localePrefix: string,
  config: ExplorerConfig
): Promise<CategoryExplorerNode[]> {
  switch (config.source) {
    case "manual":
      return (config.manualNodes ?? []).map((n) => manualToNode(n, localePrefix));
    case "collections": {
      const list = await collectionsDataService.loadAll({ localePrefix });
      return list
        .filter((c: { visible?: boolean }) => c.visible !== false)
        .map((c: { slug: string; name: string; parentSlug?: string }) => ({
          slug: c.slug,
          name: c.name,
          href: `/${localePrefix}/collections/${c.slug}`,
          parentSlug: c.parentSlug,
        }));
    }
    case "productCategories": {
      const records = await loadListingRecords(localePrefix);
      const counts = new Map<string, number>();
      for (const r of records) {
        const cats = [r.category, ...(r.categories ?? [])].filter(Boolean);
        for (const cat of cats) {
          const slug = String(cat).trim().toLowerCase().replace(/\s+/g, "-");
          counts.set(slug, (counts.get(slug) ?? 0) + 1);
        }
      }
      return Array.from(counts.entries()).map(([slug, count]) => ({
        slug,
        name: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        href: `/${localePrefix}/products?category=${encodeURIComponent(slug)}`,
        count,
      }));
    }
    case "postCategories": {
      const cats = await prisma.postCategory.findMany({ orderBy: { sortOrder: "asc" } });
      const catTranslations = await loadTranslationsMap(
        "PostCategory",
        cats.map((c) => c.id)
      );
      const posts = await prisma.post.findMany({
        where: { status: "PUBLISHED" },
        include: { categories: true },
      });
      const countByCat = new Map<string, number>();
      for (const p of posts) {
        for (const { categoryId } of p.categories) {
          countByCat.set(categoryId, (countByCat.get(categoryId) ?? 0) + 1);
        }
      }
      return cats.map((cat) => {
        const name = localizedFieldValue(catTranslations.get(cat.id) ?? [], "name");
        return {
          slug: cat.slug,
          name: name || cat.slug,
          href: `/${localePrefix}/blog?category=${encodeURIComponent(cat.slug)}`,
          count: countByCat.get(cat.id),
        };
      });
    }
    case "contentCollections": {
      const slug = config.contentTypeSlug?.trim();
      const rows = await prisma.contentCollection.findMany({
        where: slug ? { contentType: { slug } } : undefined,
        orderBy: { sortOrder: "asc" },
      });
      const colTranslations = await loadTranslationsMap(
        "ContentCollection",
        rows.map((c) => c.id)
      );
      return rows.map((col) => {
        const name = localizedFieldValue(colTranslations.get(col.id) ?? [], "name");
        return {
          slug: col.slug,
          name: name || col.slug,
          href: `/${localePrefix}/content?collection=${encodeURIComponent(col.slug)}`,
        };
      });
    }
    default:
      return [];
  }
}

function manualToNode(
  n: ExplorerConfig["manualNodes"][number],
  localePrefix: string
): CategoryExplorerNode {
  const label = n.label || n.id;
  const href = n.href.startsWith("/") ? `/${localePrefix}${n.href}` : n.href;
  return {
    slug: n.id,
    name: label,
    href,
    imageUrl: n.imageUrl || undefined,
    children: n.children?.map((c) => manualToNode(c, localePrefix)),
  };
}

export function sortFeaturedFirst(
  nodes: CategoryExplorerNode[],
  featuredSlugs: string[]
): CategoryExplorerNode[] {
  if (!featuredSlugs.length) return nodes;
  const set = new Set(featuredSlugs);
  const featured = nodes.filter((n) => set.has(n.slug));
  const rest = nodes.filter((n) => !set.has(n.slug));
  return [...featured, ...rest];
}
