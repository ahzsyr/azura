import "server-only";

import { STATIC_SEO_PAGES } from "@/features/seo/constants";
import type { SeoEntityProvider } from "../types/entity-provider";
import type { SeoEntityDescriptor } from "../types/entity-descriptor";
import type { BulkEntityFilter } from "../types/autofill";
import { emptyDraft } from "../layers/content/snapshot-builder";
import { prisma } from "@/lib/prisma";
import { extractContentFromBlocks } from "../layers/content/block-extractor";
import type { PageBlocks } from "@/types/builder";

export const staticPageEntityProvider: SeoEntityProvider = {
  kind: "static_page",
  async buildSnapshot(descriptor) {
    const pageKey = descriptor.routingKey ?? descriptor.id;
    const staticPage = STATIC_SEO_PAGES.find((p) => p.pageKey === pageKey);
    const title = staticPage?.label ?? pageKey;

    const cmsPage = await prisma.cmsPage.findUnique({
      where: { slug: pageKey },
      select: { blocks: true },
    });
    if (cmsPage?.blocks) {
      return extractContentFromBlocks(cmsPage.blocks as PageBlocks, title);
    }

    return emptyDraft(title);
  },
  async *listEntities(_filter: BulkEntityFilter = {}) {
    for (const page of STATIC_SEO_PAGES) {
      yield Object.freeze({
        kind: "static_page" as const,
        id: page.pageKey,
        locale: "en",
        routingKey: page.pageKey,
      });
      yield Object.freeze({
        kind: "static_page" as const,
        id: page.pageKey,
        locale: "ar",
        routingKey: page.pageKey,
      });
    }
  },
  async countEntities() {
    return STATIC_SEO_PAGES.length * 2;
  },
  displayName(descriptor: SeoEntityDescriptor) {
    const page = STATIC_SEO_PAGES.find((p) => p.pageKey === (descriptor.routingKey ?? descriptor.id));
    return page?.label ?? descriptor.id;
  },
  routing(descriptor) {
    const page = STATIC_SEO_PAGES.find((p) => p.pageKey === (descriptor.routingKey ?? descriptor.id));
    return { publicPath: page?.path ?? "/" };
  },
};
