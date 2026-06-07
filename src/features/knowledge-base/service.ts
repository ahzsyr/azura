import { prisma } from "@/lib/prisma";
import type { KnowledgeBaseAdmin, KnowledgeBaseBlockInput, KnowledgeBasePublic } from "./types";

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
    return {
      id: row.id,
      slug: row.slug,
      titleEn: row.titleEn,
      titleAr: row.titleAr,
      descriptionEn: row.descriptionEn,
      descriptionAr: row.descriptionAr,
      categories: row.categories.map((c) => ({
        id: c.id,
        slug: c.slug,
        parentId: c.parentId,
        titleEn: c.titleEn,
        titleAr: c.titleAr,
        articleCount: c._count.articles,
      })),
      articles: row.articles.map((a) => ({
        id: a.id,
        slug: a.slug,
        titleEn: a.titleEn,
        titleAr: a.titleAr,
        excerptEn: a.excerptEn,
        excerptAr: a.excerptAr,
        bodyEn: a.bodyEn,
        bodyAr: a.bodyAr,
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
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      titleEn: row.titleEn,
      titleAr: row.titleAr,
      descriptionEn: row.descriptionEn,
      descriptionAr: row.descriptionAr,
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
