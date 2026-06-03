import { prisma } from "@/lib/prisma";
import type { Prisma, SeoMeta } from "@prisma/client";

export type SeoMetaWriteData = {
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  canonicalUrl?: string | null;
  robots?: string | null;
  focusKeywords?: string | null;
  ogTitleEn?: string | null;
  ogTitleAr?: string | null;
  ogImageUrl?: string | null;
  twitterCard?: string | null;
  jsonLd?: Prisma.InputJsonValue;
};
import {
  SEO_GLOBAL_NAMESPACE,
  SEO_STRUCTURED_NAMESPACE,
} from "@/features/seo/constants";
import type { SeoGlobalConfig, SeoStructuredConfig } from "@/features/seo/types";

export const seoRepository = {
  getByPageKey(pageKey: string) {
    return prisma.seoMeta.findUnique({ where: { pageKey } });
  },

  getLegacySettings(pageKey: string) {
    return prisma.seoSettings.findUnique({ where: { pageKey } });
  },

  getByEntity(entityType: string, entityId: string) {
    return prisma.seoMeta.findFirst({ where: { entityType, entityId } });
  },

  getByCmsPageId(cmsPageId: string) {
    return prisma.seoMeta.findUnique({ where: { cmsPageId } });
  },

  getByPostId(postId: string) {
    return prisma.seoMeta.findUnique({ where: { postId } });
  },

  async resolveMeta(params: {
    pageKey?: string;
    entityType?: string;
    entityId?: string;
    cmsPageId?: string;
    postId?: string;
    seoMeta?: SeoMeta | null;
  }): Promise<SeoMeta | null> {
    if (params.seoMeta) return params.seoMeta;
    if (params.cmsPageId) {
      const m = await this.getByCmsPageId(params.cmsPageId);
      if (m) return m;
    }
    if (params.postId) {
      const m = await this.getByPostId(params.postId);
      if (m) return m;
    }
    if (params.entityType && params.entityId) {
      const m = await this.getByEntity(params.entityType, params.entityId);
      if (m) return m;
    }
    if (params.pageKey) {
      const meta = await this.getByPageKey(params.pageKey);
      if (meta) return meta;
      const legacy = await this.getLegacySettings(params.pageKey);
      if (legacy) {
        return {
          id: legacy.id,
          pageKey: legacy.pageKey,
          entityType: null,
          entityId: null,
          titleEn: legacy.titleEn,
          titleAr: legacy.titleAr,
          descriptionEn: legacy.descriptionEn,
          descriptionAr: legacy.descriptionAr,
          canonicalUrl: null,
          robots: null,
          focusKeywords: null,
          ogTitleEn: null,
          ogTitleAr: null,
          ogImageUrl: legacy.ogImageUrl,
          twitterCard: null,
          jsonLd: null,
          cmsPageId: null,
          postId: null,
          createdAt: legacy.createdAt,
          updatedAt: legacy.updatedAt,
        };
      }
    }
    return null;
  },

  listAllMeta() {
    return prisma.seoMeta.findMany({ orderBy: { updatedAt: "desc" } });
  },

  listPageKeyMeta() {
    return prisma.seoMeta.findMany({
      where: { pageKey: { not: null } },
      orderBy: { pageKey: "asc" },
    });
  },

  upsertMetaByPageKey(pageKey: string, data: SeoMetaWriteData) {
    return prisma.seoMeta.upsert({
      where: { pageKey },
      create: { ...data, pageKey },
      update: data,
    });
  },

  upsertMetaByCmsPage(cmsPageId: string, data: SeoMetaWriteData) {
    return prisma.seoMeta.upsert({
      where: { cmsPageId },
      create: { ...data, cmsPageId, entityType: "CMS_PAGE", entityId: cmsPageId },
      update: { ...data, entityType: "CMS_PAGE", entityId: cmsPageId },
    });
  },

  upsertMetaByPost(postId: string, data: SeoMetaWriteData) {
    return prisma.seoMeta.upsert({
      where: { postId },
      create: { ...data, postId, entityType: "POST", entityId: postId },
      update: { ...data, entityType: "POST", entityId: postId },
    });
  },

  async upsertMetaByEntity(entityType: string, entityId: string, data: SeoMetaWriteData) {
    const existing = await prisma.seoMeta.findFirst({
      where: { entityType, entityId },
    });
    if (existing) {
      return prisma.seoMeta.update({
        where: { id: existing.id },
        data: { ...data, entityType, entityId },
      });
    }
    return prisma.seoMeta.create({ data: { ...data, entityType, entityId } });
  },

  listRedirects(activeOnly = true) {
    return prisma.seoRedirect.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { fromPath: "asc" },
    });
  },

  upsertRedirect(
    fromPath: string,
    toPath: string,
    type: "PERMANENT" | "TEMPORARY" = "PERMANENT"
  ) {
    return prisma.seoRedirect.upsert({
      where: { fromPath },
      create: { fromPath, toPath, type },
      update: { toPath, type },
    });
  },

  deleteRedirect(id: string) {
    return prisma.seoRedirect.delete({ where: { id } });
  },

  getCustom404(locale: string) {
    return prisma.custom404.findUnique({ where: { locale } });
  },

  upsertCustom404(data: Prisma.Custom404CreateInput) {
    return prisma.custom404.upsert({
      where: { locale: data.locale },
      create: data,
      update: data,
    });
  },

  async getGlobalConfig(): Promise<SeoGlobalConfig> {
    const row = await prisma.jsonStore.findUnique({
      where: {
        namespace_key: { namespace: SEO_GLOBAL_NAMESPACE, key: "config" },
      },
    });
    return (row?.data as SeoGlobalConfig) ?? {};
  },

  async upsertGlobalConfig(config: SeoGlobalConfig) {
    return prisma.jsonStore.upsert({
      where: {
        namespace_key: { namespace: SEO_GLOBAL_NAMESPACE, key: "config" },
      },
      create: {
        namespace: SEO_GLOBAL_NAMESPACE,
        key: "config",
        data: config as Prisma.InputJsonValue,
      },
      update: { data: config as Prisma.InputJsonValue },
    });
  },

  async getStructuredConfig(): Promise<SeoStructuredConfig> {
    const row = await prisma.jsonStore.findUnique({
      where: {
        namespace_key: { namespace: SEO_STRUCTURED_NAMESPACE, key: "config" },
      },
    });
    return (row?.data as SeoStructuredConfig) ?? {};
  },

  async upsertStructuredConfig(config: SeoStructuredConfig) {
    return prisma.jsonStore.upsert({
      where: {
        namespace_key: { namespace: SEO_STRUCTURED_NAMESPACE, key: "config" },
      },
      create: {
        namespace: SEO_STRUCTURED_NAMESPACE,
        key: "config",
        data: config as Prisma.InputJsonValue,
      },
      update: { data: config as Prisma.InputJsonValue },
    });
  },

  async listNoIndexPaths(): Promise<Set<string>> {
    const metas = await prisma.seoMeta.findMany({
      where: { robots: { contains: "noindex" } },
      select: { pageKey: true, entityType: true, entityId: true, cmsPage: { select: { slug: true } }, post: { select: { slug: true } } },
    });
    const paths = new Set<string>();
    for (const m of metas) {
      if (m.pageKey) {
        const staticPaths: Record<string, string> = {
          home: "",
          about: "/about",
          packages: "/packages",
          visa: "/visa",
          "hotels-transport": "/hotels-transport",
          gallery: "/gallery",
          testimonials: "/testimonials",
          contact: "/contact",
          blog: "/blog",
        };
        if (m.pageKey in staticPaths) paths.add(staticPaths[m.pageKey]);
      }
      if (m.cmsPage?.slug) paths.add(`/pages/${m.cmsPage.slug}`);
      if (m.post?.slug) paths.add(`/blog/${m.post.slug}`);
      if (m.entityType === "CONTENT_ITEM" && m.entityId) {
        const item = await prisma.contentItem.findUnique({
          where: { id: m.entityId },
          select: { slug: true, contentType: { select: { routePrefix: true } } },
        });
        const prefix = item?.contentType.routePrefix ?? "content";
        if (item?.slug) paths.add(`/${prefix}/${item.slug}`);
      }
    }
    return paths;
  },
};
