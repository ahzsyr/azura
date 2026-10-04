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
import { localeService } from "@/features/i18n/locale.service";
import { isCmsDraftModeEnabled } from "@/features/cms/draft-mode";
import {
  applyAstToEntityFields,
  loadAstFromSnapshot,
  loadCmsPageRevision,
  loadPostRevision,
  selectCmsPageRevisionId,
  selectPostRevisionId,
} from "@/features/cms/revision-selection";

export type CmsPageWithSeo = Prisma.CmsPageGetPayload<{ include: { seoMeta: true; author: true } }>;

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

function emptyLegacyFields(page: CmsPageWithSeo, titleFallback = ""): CmsPagePublicView {
  return {
    ...page,
    title: titleFallback,
    excerpt: "",
    description: "",
    titleEn: titleFallback,
    titleAr: "",
    excerptEn: "",
    excerptAr: "",
    descriptionEn: "",
    descriptionAr: "",
  };
}

async function withLegacyFields(page: CmsPageWithSeo): Promise<CmsPagePublicView> {
  if (page.id === "synthetic-home") {
    return emptyLegacyFields(page, "Home");
  }
  try {
    const draft = await isCmsDraftModeEnabled();
    const enabledLocales = await localeService.listEnabled().catch(() => FALLBACK_LOCALES);
    const defaultCode =
      enabledLocales.find((locale) => locale.isDefault)?.code ??
      FALLBACK_LOCALES.find((locale) => locale.isDefault)?.code ??
      "en";
    const translations = await translationService.getForEntity("CmsPage", page.id);
    const ctx = {
      translations,
      enabledLocales,
      defaultCode,
      includeUnpublished: draft,
    };
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
  } catch (error) {
    console.warn(
      `[cmsService.withLegacyFields] translation load failed for ${page.slug}:`,
      error instanceof Error ? error.message : error,
    );
    return emptyLegacyFields(page);
  }
}

function pageHasBlocks(blocks: unknown): blocks is PageBlocks {
  return Array.isArray(blocks) && blocks.length > 0;
}

export const cmsService = {
  processDueScheduled,

  async resolvePublishedPage(slug: string, languageCode: string) {
    await processDueScheduled();
    const draft = await isCmsDraftModeEnabled();
    const localized = await resolveEntityByLocalizedSlug("CmsPage", slug, languageCode);
    if (localized) {
      const page = await cmsRepository.getPageById(localized.entityId);
      if (page && (draft || page.status === "PUBLISHED")) {
        return this.applyPageRevisionSelection(page, { allowCache: !draft });
      }
    }
    return this.getPublishedPageBySlug(slug);
  },

  async resolvePublishedPost(slug: string, languageCode: string) {
    await processDueScheduled();
    const draft = await isCmsDraftModeEnabled();
    const localized = await resolveEntityByLocalizedSlug("Post", slug, languageCode);
    if (localized) {
      const post = await cmsRepository.getPostById(localized.entityId);
      if (post && (draft || post.status === "PUBLISHED")) {
        return this.applyPostRevisionSelection(post);
      }
    }
    return this.getPublishedPostBySlug(slug);
  },

  async applyPageRevisionSelection(
    page: CmsPageWithSeo,
    options?: { allowCache?: boolean },
  ): Promise<CmsPagePublicView> {
    const { revisionId, isDraftPreview } = await selectCmsPageRevisionId(page);
    const allowCache = options?.allowCache !== false && !isDraftPreview;

    if (allowCache && page.status === "PUBLISHED") {
      const cached = await pageCache.get(page.slug);
      if (cached && cached.updatedAt === page.updatedAt.toISOString()) {
        return withLegacyFields({
          ...page,
          blocks: cached.blocks as unknown as typeof page.blocks,
        });
      }
    }

    if (revisionId) {
      const revision = await loadCmsPageRevision(revisionId);
      if (revision) {
        const ast = loadAstFromSnapshot(revision, page);
        return withLegacyFields(applyAstToEntityFields(page, ast));
      }
    }

    // Draft preview without a pointer yet: serve the working entity document.
    if (isDraftPreview) {
      return withLegacyFields(page);
    }

    return withLegacyFields(page);
  },

  async applyPostRevisionSelection<T extends { workingRevisionId?: string | null; publishedRevisionId?: string | null; blocks: unknown; composition: unknown }>(
    post: T,
  ): Promise<T> {
    const { revisionId, isDraftPreview } = await selectPostRevisionId(post);
    if (revisionId) {
      const revision = await loadPostRevision(revisionId);
      if (revision) {
        const ast = loadAstFromSnapshot(revision, post);
        return applyAstToEntityFields(post, ast);
      }
    }
    if (isDraftPreview) return post;
    return post;
  },

  async getPublishedPageBySlug(slug: string): Promise<CmsPagePublicView | null> {
    await processDueScheduled();
    const draft = await isCmsDraftModeEnabled();
    const page = await cmsRepository.getPageBySlug(slug, !draft);
    if (!page) return null;
    if (!draft && page.status !== "PUBLISHED") return null;
    return this.applyPageRevisionSelection(page, { allowCache: !draft });
  },

  /**
   * Resolves a wired marketing page by locale-aware slug when languageCode is provided.
   * Falls back to landing template for unpublished home.
   */
  async resolveMarketingPage(
    slug: string,
    languageCode?: string,
  ): Promise<CmsPagePublicView | null> {
    const published = languageCode
      ? await this.resolvePublishedPage(slug, languageCode)
      : await this.getPublishedPageBySlug(slug);
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
      composition: {},
      workingRevisionId: null,
      publishedRevisionId: null,
      publishedAt: new Date(),
      scheduledAt: null,
      authorId: null,
      author: null,
      sources: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      visualSettings: {},
      seoMeta: null,
    } as CmsPageWithSeo);
  },

  async getPublishedPostBySlug(slug: string) {
    await processDueScheduled();
    const draft = await isCmsDraftModeEnabled();
    const post = await cmsRepository.getPostBySlug(slug, !draft);
    if (!post) return null;
    if (!draft && post.status !== "PUBLISHED") return null;
    return this.applyPostRevisionSelection(post);
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
