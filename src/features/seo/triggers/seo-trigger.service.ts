import "server-only";
import {
  enqueueSeoSubmissionsForPath,
  enqueueSitemapSubmission,
} from "@/features/seo/integrations/enqueue";
import { revalidateSeoDocument, revalidateSitemap } from "@/services/cache";
import { revalidatePath } from "next/cache";
import type { SeoContentEvent } from "./events";
import { SEO_EVENT_REASON } from "./events";

function compact(paths: Array<string | undefined>) {
  return [...new Set(paths.map((path) => path?.trim()).filter((path): path is string => Boolean(path)))];
}

function toRevalidatePath(raw: string): string {
  if (/^https?:\/\//i.test(raw)) {
    try {
      return new URL(raw).pathname;
    } catch {
      return raw;
    }
  }
  return raw.startsWith("/") ? raw : `/${raw}`;
}

async function enqueueUrlJobs(reason: SeoContentEvent["type"], paths: Array<string | undefined>) {
  const compacted = compact(paths);
  if (compacted.length === 0) return;
  await enqueueSeoSubmissionsForPath({
    kind: "URL",
    reason: SEO_EVENT_REASON[reason],
    paths: compacted,
  });
}

async function enqueueSitemap(reason: SeoContentEvent["type"]) {
  revalidateSitemap();
  await enqueueSitemapSubmission(SEO_EVENT_REASON[reason]);
}

function invalidateDocumentCache(paths: Array<string | undefined>) {
  for (const path of compact(paths)) {
    revalidateSeoDocument(`url:${path}`);
    revalidateSeoDocument(path);
  }
  revalidateSeoDocument("seo-document");
}

function revalidatePublicPaths(paths: Array<string | undefined>) {
  for (const path of compact(paths)) {
    try {
      revalidatePath(toRevalidatePath(path));
    } catch {
      // No-op outside Next.js request/static generation context (e.g. unit tests).
    }
  }
}

export const seoTriggerService = {
  async handle(event: SeoContentEvent) {
    switch (event.type) {
      case "content.published":
      case "content.unpublished":
      case "content.deleted":
        invalidateDocumentCache([event.path]);
        revalidatePublicPaths([event.path]);
        await enqueueUrlJobs(event.type, [event.path]);
        await enqueueSitemap(event.type);
        return;

      case "content.slugChanged":
        invalidateDocumentCache([event.oldPath, event.newPath]);
        revalidatePublicPaths([event.oldPath, event.newPath]);
        await enqueueUrlJobs(event.type, [event.oldPath, event.newPath]);
        await enqueueSitemap(event.type);
        return;

      case "content.localizedSlugChanged":
        invalidateDocumentCache([event.oldPath, event.path]);
        revalidatePublicPaths([event.oldPath, event.path]);
        await enqueueUrlJobs(event.type, [event.oldPath, event.path]);
        await enqueueSitemap(event.type);
        return;

      case "content.sitemapChanged":
        if (event.path) invalidateDocumentCache([event.path]);
        if (event.path) revalidatePublicPaths([event.path]);
        if (event.path) await enqueueUrlJobs(event.type, [event.path]);
        await enqueueSitemap(event.type);
        return;

      case "seo.metadataUpdated":
      case "seo.structuredDataUpdated":
        invalidateDocumentCache(event.paths);
        revalidatePublicPaths(event.paths);
        await enqueueUrlJobs(event.type, event.paths);
        await enqueueSitemap(event.type);
        return;

      case "seo.redirectChanged":
        if (event.submitFromPath && event.fromPath) {
          invalidateDocumentCache([event.fromPath]);
          revalidatePublicPaths([event.fromPath]);
          await enqueueUrlJobs(event.type, [event.fromPath]);
        }
        await enqueueSitemap(event.type);
        return;
    }
  },

  async handleMany(events: SeoContentEvent[]) {
    for (const event of events) {
      await this.handle(event);
    }
  },
};
