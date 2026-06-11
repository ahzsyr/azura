import { isBuildWithoutDb } from "@/lib/build-db";
import { prisma } from "@/lib/prisma";
import { searchIndexer } from "@/features/search/search-indexer.service";
import { syncCmsPageCache } from "./page-cache-sync";
import { revalidateCmsPage, revalidatePost } from "@/services/cache";
import { revalidateCmsPagePublicPaths } from "@/features/cms/revalidate-wired-marketing";

export { parseScheduledAt, formatScheduledInput } from "./scheduling-utils";

const SCHEDULED_CHECK_MS = 60_000;
let lastScheduledCheckAt = 0;
let scheduledCheckInflight: Promise<{ pages: number; posts: number }> | null = null;

/** Promote scheduled pages/posts whose time has passed to PUBLISHED. */
export async function processDueScheduled() {
  if (isBuildWithoutDb()) {
    return { pages: 0, posts: 0 };
  }

  const nowMs = Date.now();
  if (nowMs - lastScheduledCheckAt < SCHEDULED_CHECK_MS) {
    return { pages: 0, posts: 0 };
  }

  if (scheduledCheckInflight) {
    return scheduledCheckInflight;
  }

  scheduledCheckInflight = runDueScheduled().finally(() => {
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

  if (duePages.length > 0) {
    await prisma.cmsPage.updateMany({
      where: { id: { in: duePages.map((p) => p.id) } },
      data: { status: "PUBLISHED", publishedAt: now },
    });
    for (const page of duePages) {
      const full = await prisma.cmsPage.findUnique({ where: { id: page.id } });
      if (full) {
        await searchIndexer.indexCmsPage(full);
        await syncCmsPageCache(full);
      }
      revalidateCmsPage(page.slug);
      revalidateCmsPagePublicPaths(page.slug);
    }
  }

  const duePosts = await prisma.post.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: now } },
    select: { id: true, slug: true },
  });

  if (duePosts.length > 0) {
    await prisma.post.updateMany({
      where: { id: { in: duePosts.map((p) => p.id) } },
      data: { status: "PUBLISHED", publishedAt: now },
    });
    for (const post of duePosts) {
      const full = await prisma.post.findUnique({ where: { id: post.id } });
      if (full) await searchIndexer.indexPost(full);
      revalidatePost(post.slug);
    }
  }

  return { pages: duePages.length, posts: duePosts.length };
}
