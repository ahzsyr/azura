import "server-only";
import {
  enqueueSeoSubmissionsForPath,
  enqueueSitemapSubmission,
} from "@/features/seo/integrations/enqueue";
import type { SeoContentEvent } from "./events";
import { SEO_EVENT_REASON } from "./events";

function compact(paths: Array<string | undefined>) {
  return [...new Set(paths.map((path) => path?.trim()).filter((path): path is string => Boolean(path)))];
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
  await enqueueSitemapSubmission(SEO_EVENT_REASON[reason]);
}

export const seoTriggerService = {
  async handle(event: SeoContentEvent) {
    switch (event.type) {
      case "content.published":
      case "content.unpublished":
      case "content.deleted":
        await enqueueUrlJobs(event.type, [event.path]);
        await enqueueSitemap(event.type);
        return;

      case "content.slugChanged":
        await enqueueUrlJobs(event.type, [event.oldPath, event.newPath]);
        await enqueueSitemap(event.type);
        return;

      case "content.localizedSlugChanged":
        await enqueueUrlJobs(event.type, [event.oldPath, event.path]);
        await enqueueSitemap(event.type);
        return;

      case "content.sitemapChanged":
        if (event.path) await enqueueUrlJobs(event.type, [event.path]);
        await enqueueSitemap(event.type);
        return;

      case "seo.metadataUpdated":
      case "seo.structuredDataUpdated":
        await enqueueUrlJobs(event.type, event.paths);
        return;

      case "seo.redirectChanged":
        if (event.submitFromPath && event.fromPath) {
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
