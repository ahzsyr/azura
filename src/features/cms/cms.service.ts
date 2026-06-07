import { cmsRepository } from "@/repositories/cms.repository";
import { pageCache } from "@/features/storage/page-cache";
import { processDueScheduled } from "./scheduling";
import type { CmsPage, ContentStatus } from "@prisma/client";
import type { PageBlocks } from "@/types/builder";
import { resolveBuiltinTemplate } from "@/features/builder/constants";
import { resolveEntityByLocalizedSlug } from "@/features/translation/translation-bundle";

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

  /** Resolves a wired marketing page; falls back to landing template for unpublished home. */
  async resolveMarketingPage(slug: string): Promise<CmsPage | null> {
    const published = await this.getPublishedPageBySlug(slug);
    if (published) return published;
    if (slug !== "home") return null;

    const draft = await cmsRepository.getPageBySlug("home", false);
    const templateBlocks = (resolveBuiltinTemplate("home")?.blocks ?? []) as PageBlocks;
    const blocks = pageHasBlocks(draft?.blocks) ? draft.blocks : templateBlocks;

    if (draft) {
      return { ...draft, status: "PUBLISHED", blocks };
    }

    return {
      id: "synthetic-home",
      slug: "home",
      titleEn: "Home",
      titleAr: "الرئيسية",
      excerptEn: "",
      excerptAr: "",
      templateKey: "home",
      status: "PUBLISHED",
      blocks,
      publishedAt: new Date(),
      scheduledAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      visualSettings: {},
    } as CmsPage;
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
