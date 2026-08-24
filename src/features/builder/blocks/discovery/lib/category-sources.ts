import "server-only";

import { prisma } from "@/lib/prisma";
import { collectionsDataService } from "@/features/collections/collections-data.service";
import { categoryRepository } from "@/repositories/category.repository";
import { loadTranslationsMap, localizedFieldValue } from "@/features/translation/bilingual-serialize";
import type { z } from "zod";
import type { categoryExplorerPropsSchema } from "@/features/builder/blocks/discovery/schemas/discovery-blocks";
import type { CategoryScope } from "@/features/categories/types";

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
  "source" | "scope" | "contentTypeSlug" | "featuredSlugs" | "manualNodes" | "maxDepth"
>;

async function loadScopedCategoryNodes(
  localePrefix: string,
  scope: CategoryScope,
  contentTypeSlug?: string
): Promise<CategoryExplorerNode[]> {
  if (scope === "PRODUCT") {
    const list = await collectionsDataService.loadAll({ localePrefix });
    return list
      .filter((c) => c.visible !== false)
      .map((c) => ({
        slug: c.slug,
        name: c.name,
        href: `/${localePrefix}/categories/${c.slug}`,
        parentSlug: c.parentSlug,
        imageUrl: c.coverImage,
      }));
  }

  if (scope === "POST") {
    try {
      const cats = await categoryRepository.findAll("POST", null);
      if (cats.length > 0) {
        return cats.map((cat) => ({
          slug: cat.slug,
          name: cat.metadata?.name || cat.slug,
          href: `/${localePrefix}/blog?category=${encodeURIComponent(cat.slug)}`,
        }));
      }
    } catch {
      /* fall through to PostCategory */
    }
    const cats = await prisma.postCategory.findMany({ orderBy: { sortOrder: "asc" } });
    return cats.map((cat) => ({
      slug: cat.slug,
      name: cat.slug,
      href: `/${localePrefix}/blog?category=${encodeURIComponent(cat.slug)}`,
    }));
  }

  if (scope === "CONTENT") {
    const slug = contentTypeSlug?.trim();
    let ownerId: string | null = null;
    if (slug) {
      const ct = await prisma.contentType.findUnique({ where: { slug } });
      ownerId = ct?.id ?? null;
    }
    try {
      if (ownerId) {
        const cats = await categoryRepository.findAll("CONTENT", ownerId);
        if (cats.length > 0) {
          return cats.map((cat) => ({
            slug: cat.slug,
            name: cat.metadata?.name || cat.slug,
            href: `/${localePrefix}/content?collection=${encodeURIComponent(cat.slug)}`,
          }));
        }
      }
    } catch {
      /* fall through */
    }
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

  return [];
}

export async function loadCategoryExplorerNodes(
  localePrefix: string,
  config: ExplorerConfig
): Promise<CategoryExplorerNode[]> {
  const source = config.source as string;
  switch (source) {
    case "manual":
      return (config.manualNodes ?? []).map((n) => manualToNode(n, localePrefix));
    case "categories":
    case "collections":
    case "productCategories":
      return loadScopedCategoryNodes(
        localePrefix,
        (config.scope as CategoryScope) || "PRODUCT",
        config.contentTypeSlug
      );
    case "postCategories":
      return loadScopedCategoryNodes(localePrefix, "POST");
    case "contentCollections":
      return loadScopedCategoryNodes(localePrefix, "CONTENT", config.contentTypeSlug);
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
