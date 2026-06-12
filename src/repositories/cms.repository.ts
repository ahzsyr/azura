import { isBuildWithoutDb } from "@/lib/build-db";
import { prisma } from "@/lib/prisma";
import type { ContentStatus, Prisma } from "@prisma/client";
import type { PageBlocks } from "@/types/builder";

export const cmsRepository = {
  listPages(status?: ContentStatus) {
    return prisma.cmsPage.findMany({
      where: status ? { status } : undefined,
      orderBy: { updatedAt: "desc" },
    });
  },

  getPageBySlug(slug: string, publishedOnly = false) {
    return prisma.cmsPage.findFirst({
      where: {
        slug,
        ...(publishedOnly ? { status: "PUBLISHED" } : {}),
      },
      include: { seoMeta: true },
    });
  },

  getPageById(id: string) {
    return prisma.cmsPage.findUnique({
      where: { id },
      include: { seoMeta: true, revisions: { orderBy: { version: "desc" }, take: 15 } },
    });
  },

  slugExistsPage(slug: string, excludeId?: string) {
    return prisma.cmsPage.findFirst({
      where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
  },

  createPage(data: Prisma.CmsPageCreateInput) {
    return prisma.cmsPage.create({ data });
  },

  updatePage(id: string, data: Prisma.CmsPageUpdateInput) {
    return prisma.cmsPage.update({ where: { id }, data });
  },

  deletePage(id: string) {
    return prisma.cmsPage.delete({ where: { id } });
  },

  async saveRevision(pageId: string, blocks: PageBlocks, createdById?: string, message?: string) {
    const last = await prisma.cmsPageRevision.findFirst({
      where: { pageId },
      orderBy: { version: "desc" },
    });
    const version = (last?.version ?? 0) + 1;

    let revisionAuthorId: string | undefined;
    if (createdById) {
      const author = await prisma.user.findUnique({
        where: { id: createdById },
        select: { id: true },
      });
      revisionAuthorId = author?.id;
    }

    return prisma.cmsPageRevision.create({
      data: {
        pageId,
        version,
        blocks: blocks as Prisma.InputJsonValue,
        createdById: revisionAuthorId,
        message,
      },
    });
  },

  listPosts(status?: ContentStatus) {
    return prisma.post.findMany({
      where: status ? { status } : undefined,
      orderBy: { updatedAt: "desc" },
      include: {
        author: true,
        featuredImage: true,
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
      },
    });
  },

  listPublishedPosts(categorySlug?: string) {
    return prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        ...(categorySlug
          ? { categories: { some: { category: { slug: categorySlug } } } }
          : {}),
      },
      orderBy: { publishedAt: "desc" },
      include: {
        author: true,
        featuredImage: true,
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
      },
    });
  },

  getPostBySlug(slug: string, publishedOnly = false) {
    return prisma.post.findFirst({
      where: { slug, ...(publishedOnly ? { status: "PUBLISHED" } : {}) },
      include: {
        author: true,
        featuredImage: true,
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
        seoMeta: true,
      },
    });
  },

  getPostById(id: string) {
    return prisma.post.findUnique({
      where: { id },
      include: {
        author: true,
        featuredImage: true,
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
        seoMeta: true,
      },
    });
  },

  slugExistsPost(slug: string, excludeId?: string) {
    return prisma.post.findFirst({
      where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
  },

  async getRelatedPosts(postId: string, limit = 4) {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { relatedPostIds: true },
    });
    const ids = Array.isArray(post?.relatedPostIds)
      ? (post.relatedPostIds as string[]).filter(Boolean)
      : [];
    if (!ids.length) return [];
    return prisma.post.findMany({
      where: { id: { in: ids }, status: "PUBLISHED" },
      take: limit,
      include: { featuredImage: true, author: true, categories: { include: { category: true } } },
      orderBy: { publishedAt: "desc" },
    });
  },

  listPostsForPicker(excludeId?: string) {
    return prisma.post.findMany({
      where: excludeId ? { id: { not: excludeId } } : undefined,
      orderBy: { titleEn: "asc" },
      select: { id: true, slug: true, titleEn: true, titleAr: true, status: true },
    });
  },

  createPost(data: Prisma.PostCreateInput) {
    return prisma.post.create({ data });
  },

  updatePost(id: string, data: Prisma.PostUpdateInput) {
    return prisma.post.update({ where: { id }, data });
  },

  deletePost(id: string) {
    return prisma.post.delete({ where: { id } });
  },

  listCategories() {
    return prisma.postCategory.findMany({ orderBy: { sortOrder: "asc" } });
  },

  deleteCategory(id: string) {
    return prisma.postCategory.delete({ where: { id } });
  },

  listTags() {
    return prisma.postTag.findMany({ orderBy: { nameEn: "asc" } });
  },

  deleteTag(id: string) {
    return prisma.postTag.delete({ where: { id } });
  },

  listAuthors() {
    return prisma.postAuthor.findMany({ orderBy: { name: "asc" } });
  },

  createAuthor(data: Prisma.PostAuthorCreateInput) {
    return prisma.postAuthor.create({ data });
  },

  updateAuthor(id: string, data: Prisma.PostAuthorUpdateInput) {
    return prisma.postAuthor.update({ where: { id }, data });
  },

  deleteAuthor(id: string) {
    return prisma.postAuthor.delete({ where: { id } });
  },

  async publishedPageSlugs() {
    if (isBuildWithoutDb()) return [];
    try {
      return await prisma.cmsPage.findMany({
        where: { status: "PUBLISHED" },
        select: { slug: true },
      });
    } catch {
      return [];
    }
  },

  async publishedPostSlugs() {
    if (isBuildWithoutDb()) return [];
    try {
      return await prisma.post.findMany({
        where: { status: "PUBLISHED" },
        select: { slug: true },
      });
    } catch {
      return [];
    }
  },
};
