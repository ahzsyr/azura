import { cmsRepository } from "@/repositories/cms.repository";
import { pageCache } from "@/features/storage/page-cache";
import { processDueScheduled } from "./scheduling";
import type { CmsPage, ContentStatus, Prisma } from "@prisma/client";
import type { PageBlocks } from "@/types/builder";
import { resolveBuiltinTemplate } from "@/features/builder/constants";
import { resolveEntityByLocalizedSlug } from "@/features/translation/translation-bundle";
import { translationService } from "@/features/translation/translation.service";
import { resolveTranslation } from "@/features/translation/translation-resolver";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";

export type CmsPageWithSeo = Prisma.CmsPageGetPayload<{ include: { seoMeta: true } }>;

export type CmsPagePublicView = CmsPageWithSeo & {
  title: string;
  excerpt: string;
  description: string;
  titleEn: string;
  titleAr: string;
  excerptEn: string;
  excerptAr: string;
  descriptionEn: string;
  descriptionAr: string;
};

async function withLegacyFields(page: CmsPageWithSeo): Promise<CmsPagePublicView> {
  const defaultCode = FALLBACK_LOCALES.find((locale) => locale.isDefault)?.code ?? "en";
  if (page.id === "synthetic-home") {
    return {
      ...page,
      title: "Home",
      excerpt: "",
      description: "",
      titleEn: "Home",
      titleAr: "",
      excerptEn: "",
      excerptAr: "",
      descriptionEn: "",
      descriptionAr: "",
    };
  }
  const translations = await translationService.getForEntity("CmsPage", page.id);
  const ctx = { translations, enabledLocales: FALLBACK_LOCALES, defaultCode };
  const titleEn = resolveTranslation("title", "en", ctx);
  const titleAr = resolveTranslation("title", "ar", ctx);
  const excerptEn = resolveTranslation("excerpt", "en", ctx);
  const excerptAr = resolveTranslation("excerpt", "ar", ctx);
  const descriptionEn = resolveTranslation("description", "en", ctx);
  const descriptionAr = resolveTranslation("description", "ar", ctx);
  return {
    ...page,
    title: resolveTranslation("title", defaultCode, ctx) || titleEn || titleAr || "",
    excerpt: resolveTranslation("excerpt", defaultCode, ctx) || excerptEn || excerptAr || "",
    description:
      resolveTranslation("description", defaultCode, ctx) ||
      descriptionEn ||
      descriptionAr ||
      "",
    titleEn,
    titleAr,
    excerptEn,
    excerptAr,
    descriptionEn,
    descriptionAr,
  };
}

function pageHasBlocks(blocks: unknown): blocks is PageBlocks {
  return Array.isArray(blocks) && blocks.length > 0;
}

export const cmsService = {
  processDueScheduled,

  async resolvePublishedPage(slug: string, languageCode: string) {
    await processDueScheduled();
    const localized = await resolveEntityByLocalizedSlug("CmsPage", slug, languageCode);
    if (localized) {
      const page = await cmsRepository.getPageById(localized.entityId);
      if (page?.status === "PUBLISHED") {
        const cached = await pageCache.get(page.slug);
        if (cached && cached.updatedAt === page.updatedAt.toISOString()) {
          return { ...page, blocks: cached.blocks as unknown as typeof page.blocks };
        }
        return page;
      }
    }
    return this.getPublishedPageBySlug(slug);
  },

  async resolvePublishedPost(slug: string, languageCode: string) {
    await processDueScheduled();
    const localized = await resolveEntityByLocalizedSlug("Post", slug, languageCode);
    if (localized) {
      const post = await cmsRepository.getPostById(localized.entityId);
      if (post?.status === "PUBLISHED") return post;
    }
    return this.getPublishedPostBySlug(slug);
  },

  async getPublishedPageBySlug(slug: string): Promise<CmsPagePublicView | null> {
    await processDueScheduled();
    const page = await cmsRepository.getPageBySlug(slug, true);
    if (!page) return null;

    const cached = await pageCache.get(slug);
    const resolved =
      cached && cached.updatedAt === page.updatedAt.toISOString()
        ? { ...page, blocks: cached.blocks as unknown as typeof page.blocks }
        : page;
    return withLegacyFields(resolved);
  },

  /** Resolves a wired marketing page; falls back to landing template for unpublished home. */
  async resolveMarketingPage(slug: string): Promise<CmsPagePublicView | null> {
    const published = await this.getPublishedPageBySlug(slug);
    if (published) return published;
    if (slug !== "home") return null;

    const draft = await cmsRepository.getPageBySlug("home", false);
    const templateBlocks = (resolveBuiltinTemplate("home")?.blocks ?? []) as PageBlocks;
    const resolvedBlocks = (pageHasBlocks(draft?.blocks) ? draft.blocks : templateBlocks) as CmsPage["blocks"];

    if (draft) {
      return withLegacyFields({ ...draft, status: "PUBLISHED", blocks: resolvedBlocks });
    }

    return withLegacyFields({
      id: "synthetic-home",
      slug: "home",
      templateKey: "home",
      status: "PUBLISHED",
      blocks: resolvedBlocks,
      publishedAt: new Date(),
      scheduledAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      visualSettings: {},
      seoMeta: null,
    } as CmsPageWithSeo);
  },

  async getPublishedPostBySlug(slug: string) {
    await processDueScheduled();
    return cmsRepository.getPostBySlug(slug, true);
  },

  async listPublishedPosts(categorySlug?: string) {
    await processDueScheduled();
    return cmsRepository.listPublishedPosts(categorySlug);
  },

  statusLabel(status: ContentStatus, scheduledAt?: Date | null): string {
    if (status === "SCHEDULED" && scheduledAt) {
      return `Scheduled ${scheduledAt.toLocaleString()}`;
    }
    return status;
  },
};
