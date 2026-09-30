import "server-only";

import { prisma } from "@/lib/prisma";

export const knowledgeRepository = {
  findKnowledgeBase(slug: string, publishedOnly: boolean) {
    return prisma.knowledgeBase.findFirst({
      where: {
        slug,
        ...(publishedOnly ? { isPublished: true } : {}),
      },
      select: { id: true, slug: true },
    });
  },

  findArticles(input: {
    knowledgeBaseId: string;
    publishedOnly: boolean;
    collectionSlug?: string;
    limit?: number;
  }) {
    return prisma.knowledgeArticle.findMany({
      where: {
        knowledgeBaseId: input.knowledgeBaseId,
        ...(input.publishedOnly ? { isPublished: true } : {}),
        ...(input.collectionSlug
          ? { category: { slug: input.collectionSlug, isPublished: true } }
          : {}),
      },
      orderBy: { sortOrder: "asc" },
      take: input.limit && input.limit > 0 ? input.limit : undefined,
      include: { category: { select: { slug: true } } },
    });
  },

  findArticleById(id: string) {
    return prisma.knowledgeArticle.findUnique({
      where: { id },
      include: {
        category: { select: { slug: true } },
        knowledgeBase: { select: { slug: true, isPublished: true } },
      },
    });
  },

  findArticleBySlug(input: {
    knowledgeBaseId: string;
    slug: string;
    publishedOnly: boolean;
  }) {
    return prisma.knowledgeArticle.findFirst({
      where: {
        knowledgeBaseId: input.knowledgeBaseId,
        slug: input.slug,
        ...(input.publishedOnly ? { isPublished: true } : {}),
      },
      include: { category: { select: { slug: true } } },
    });
  },

  findArticleBySlugGlobal(slug: string, publishedOnly: boolean) {
    return prisma.knowledgeArticle.findFirst({
      where: {
        slug,
        ...(publishedOnly ? { isPublished: true, knowledgeBase: { isPublished: true } } : {}),
      },
      include: {
        category: { select: { slug: true } },
        knowledgeBase: { select: { slug: true, isPublished: true } },
      },
    });
  },

  findCategories(knowledgeBaseId: string, publishedOnly: boolean) {
    return prisma.knowledgeCategory.findMany({
      where: {
        knowledgeBaseId,
        ...(publishedOnly ? { isPublished: true } : {}),
      },
      orderBy: { sortOrder: "asc" },
    });
  },
};
