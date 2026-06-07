import { cmsRepository } from "@/repositories/cms.repository";
import { pageCache } from "@/features/storage/page-cache";
import { processDueScheduled } from "./scheduling";
import type { ContentStatus } from "@prisma/client";
import type { PageBlocks } from "@/types/builder";
import { resolveEntityByLocalizedSlug } from "@/features/translation/translation-bundle";

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

  async getPublishedPageBySlug(slug: string) {
    await processDueScheduled();
    const page = await cmsRepository.getPageBySlug(slug, true);
    if (!page) return null;

    const cached = await pageCache.get(slug);
    if (cached && cached.updatedAt === page.updatedAt.toISOString()) {
      return { ...page, blocks: cached.blocks as unknown as typeof page.blocks };
    }
    return page;
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
