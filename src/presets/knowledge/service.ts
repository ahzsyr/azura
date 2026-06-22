import { prisma } from "@/lib/prisma";
import {
  loadBundleForRefs,
  localizedField,
  type EntityRef,
} from "@/features/portal/lib/portal-translation";
import type { KnowledgeBaseAdmin, KnowledgeBaseBlockInput, KnowledgeBasePublic } from "./types";

function collectKnowledgeBaseRefs(row: {
  id: string;
  categories: { id: string }[];
  articles: { id: string }[];
}): EntityRef[] {
  return [
    { entityType: "KnowledgeBase", entityId: row.id },
    ...row.categories.map((c) => ({ entityType: "KnowledgeCategory", entityId: c.id })),
    ...row.articles.map((a) => ({ entityType: "KnowledgeArticle", entityId: a.id })),
  ];
}

export const knowledgeBaseService = {
  async getBySlug(
    slug: string,
    opts?: Pick<KnowledgeBaseBlockInput, "categorySlug" | "limit">
  ): Promise<KnowledgeBasePublic | null> {
    const row = await prisma.knowledgeBase.findFirst({
      where: { slug, isPublished: true },
      include: {
        categories: {
          where: { isPublished: true },
          orderBy: { sortOrder: "asc" },
          include: {
            _count: { select: { articles: { where: { isPublished: true } } } },
          },
        },
        articles: {
          where: {
            isPublished: true,
            ...(opts?.categorySlug
              ? { category: { slug: opts.categorySlug, isPublished: true } }
              : {}),
          },
          orderBy: { sortOrder: "asc" },
          take: opts?.limit && opts.limit > 0 ? opts.limit : undefined,
          include: { category: { select: { slug: true } } },
        },
      },
    });
    if (!row) return null;

    const bundle = await loadBundleForRefs(collectKnowledgeBaseRefs(row));

    return {
      id: row.id,
      slug: row.slug,
      title: localizedField(bundle, "KnowledgeBase", row.id, "title"),
      description: localizedField(bundle, "KnowledgeBase", row.id, "description"),
      categories: row.categories.map((c) => ({
        id: c.id,
        slug: c.slug,
        parentId: c.parentId,
        title: localizedField(bundle, "KnowledgeCategory", c.id, "title"),
        articleCount: c._count.articles,
      })),
      articles: row.articles.map((a) => ({
        id: a.id,
        slug: a.slug,
        title: localizedField(bundle, "KnowledgeArticle", a.id, "title"),
        excerpt: localizedField(bundle, "KnowledgeArticle", a.id, "excerpt"),
        body: localizedField(bundle, "KnowledgeArticle", a.id, "body"),
        categoryId: a.categoryId,
        categorySlug: a.category?.slug ?? null,
        ratingSum: a.ratingSum,
        ratingCount: a.ratingCount,
      })),
    };
  },

  async listForAdmin(): Promise<KnowledgeBaseAdmin[]> {
    const rows = await prisma.knowledgeBase.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { categories: true, articles: true } } },
    });
    const bundle = await loadBundleForRefs(
      rows.map((row) => ({ entityType: "KnowledgeBase", entityId: row.id }))
    );
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: localizedField(bundle, "KnowledgeBase", row.id, "title"),
      description: localizedField(bundle, "KnowledgeBase", row.id, "description"),
      sortOrder: row.sortOrder,
      isPublished: row.isPublished,
      categoryCount: row._count.categories,
      articleCount: row._count.articles,
    }));
  },

  async getByIdForAdmin(id: string) {
    return prisma.knowledgeBase.findUnique({
      where: { id },
      include: {
        categories: { orderBy: { sortOrder: "asc" } },
        articles: { orderBy: { sortOrder: "asc" } },
      },
    });
  },
};
