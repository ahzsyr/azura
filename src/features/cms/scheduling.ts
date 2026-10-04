import { isBuildWithoutDb } from "@/lib/build-db";
import { prisma } from "@/lib/prisma";
import { searchIndexer } from "@/capabilities/search/search-indexer.service";
import { syncCmsPageCache } from "./page-cache-sync";
import { revalidateCmsEntity } from "@/features/cms/publish-revalidate";
import { seoTriggerService } from "@/features/seo/triggers/seo-trigger.service";
import { cmsPagePaths, postPaths } from "@/features/seo/triggers/path-resolver";

export { parseScheduledAt, formatScheduledInput } from "./scheduling-utils";

const SCHEDULED_CHECK_MS = 60_000;
let lastScheduledCheckAt = 0;
let scheduledCheckInflight: Promise<{ pages: number; posts: number }> | null = null;

/** Promote scheduled pages/posts whose time has passed to PUBLISHED. */
export async function processDueScheduled(options?: { force?: boolean }) {
  if (isBuildWithoutDb()) {
    return { pages: 0, posts: 0 };
  }

  const nowMs = Date.now();
  if (!options?.force && nowMs - lastScheduledCheckAt < SCHEDULED_CHECK_MS) {
    return { pages: 0, posts: 0 };
  }

  if (scheduledCheckInflight) {
    return scheduledCheckInflight;
  }

  scheduledCheckInflight = runDueScheduled()
    .catch((error) => {
      console.warn(
        "[cms/schedule] processDueScheduled failed:",
        error instanceof Error ? error.message : error,
      );
      return { pages: 0, posts: 0 };
    })
    .finally(() => {
      scheduledCheckInflight = null;
      lastScheduledCheckAt = Date.now();
    });

  return scheduledCheckInflight;
}

async function runDueScheduled() {
  const now = new Date();

  const duePages = await prisma.cmsPage.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: now } },
    select: { id: true, slug: true },
  });

  let publishedPages = 0;
  let publishedPosts = 0;

  if (duePages.length > 0) {
    const { publishCmsPageAtomically } = await import("@/features/cms/revision-selection");
    for (const page of duePages) {
      // Atomic claim: only one runner can transition SCHEDULED → PUBLISHED.
      const claimed = await prisma.cmsPage.updateMany({
        where: { id: page.id, status: "SCHEDULED", scheduledAt: { lte: now } },
        data: { status: "PUBLISHED", publishedAt: now, scheduledAt: null },
      });
      if (claimed.count === 0) continue;

      const { page: full } = await publishCmsPageAtomically(page.id, {
        message: "Scheduled publish",
      });
      await searchIndexer.indexCmsPage(full);
      await syncCmsPageCache(full);
      await revalidateCmsEntity({ type: "page", slug: page.slug });
      await seoTriggerService.handle({
        type: "content.published",
        entityType: "CMS_PAGE",
        entityId: page.id,
        path: (await cmsPagePaths(page.slug))[0] ?? `/pages/${page.slug}`,
      });
      publishedPages += 1;
    }
  }

  const duePosts = await prisma.post.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: now } },
    select: { id: true, slug: true },
  });

  if (duePosts.length > 0) {
    const { publishPostAtomically } = await import("@/features/cms/revision-selection");
    for (const post of duePosts) {
      const claimed = await prisma.post.updateMany({
        where: { id: post.id, status: "SCHEDULED", scheduledAt: { lte: now } },
        data: { status: "PUBLISHED", publishedAt: now, scheduledAt: null },
      });
      if (claimed.count === 0) continue;

      const { post: full } = await publishPostAtomically(post.id, {
        message: "Scheduled publish",
      });
      await searchIndexer.indexPost(full);
      await revalidateCmsEntity({ type: "post", slug: post.slug });
      await seoTriggerService.handle({
        type: "content.published",
        entityType: "POST",
        entityId: post.id,
        path: (await postPaths(post.slug))[0] ?? `/blog/${post.slug}`,
      });
      publishedPosts += 1;
    }
  }

  return { pages: publishedPages, posts: publishedPosts };
}
