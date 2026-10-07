import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonStoreService } from "@/features/storage/json-store.service";
import type { HeaderWorkspace } from "@/features/navigation/types";

const HEADER_NAMESPACE = "header-workspace";
const HEADER_KEY = "default";

function replaceUrlInJsonValue<T>(value: T, oldUrl: string, newUrl: string): { next: T; changed: boolean } {
  const raw = JSON.stringify(value ?? null);
  if (!raw.includes(oldUrl)) return { next: value, changed: false };
  return { next: JSON.parse(raw.replaceAll(oldUrl, newUrl)) as T, changed: true };
}

async function updateManyUrlField(
  model: {
    updateMany: (args: {
      where: Record<string, string>;
      data: Record<string, string>;
    }) => Promise<{ count: number }>;
  },
  field: string,
  oldUrl: string,
  newUrl: string,
): Promise<number> {
  const result = await model.updateMany({
    where: { [field]: oldUrl },
    data: { [field]: newUrl },
  });
  return result.count;
}

async function rewriteJsonRows<T extends { id: string }>(
  rows: T[],
  pickJson: (row: T) => Record<string, unknown>,
  update: (id: string, data: Record<string, Prisma.InputJsonValue>) => Promise<unknown>,
  oldUrl: string,
  newUrl: string,
): Promise<number> {
  let updated = 0;
  for (const row of rows) {
    const fields = pickJson(row);
    const nextData: Record<string, Prisma.InputJsonValue> = {};
    let changed = false;
    for (const [key, value] of Object.entries(fields)) {
      const result = replaceUrlInJsonValue(value, oldUrl, newUrl);
      if (result.changed) {
        nextData[key] = result.next as Prisma.InputJsonValue;
        changed = true;
      }
    }
    if (!changed) continue;
    await update(row.id, nextData);
    updated += 1;
  }
  return updated;
}

/**
 * Rewrite every denormalized CMS placement that stored `oldUrl` as a string
 * so replace-by-id updates the website without manual re-picking.
 */
export async function updateAllCmsMediaReferences(oldUrl: string, newUrl: string) {
  if (!oldUrl || !newUrl || oldUrl === newUrl) {
    return {
      contentItemMedia: 0,
      contentItems: 0,
      contentRevisions: 0,
      galleries: 0,
      galleryMedia: 0,
      faqSets: 0,
      testimonials: 0,
      themes: 0,
      cmsPages: 0,
      posts: 0,
      seoMeta: 0,
      authors: 0,
      teamMembers: 0,
      partners: 0,
      header: 0,
      catalog: { updatedProducts: 0, updatedCollections: 0 },
    };
  }

  const [
    contentItemMedia,
    featuredImages,
    galleries,
    galleryMedia,
    faqSets,
    testimonialImages,
    testimonialVideos,
    themeLogos,
    themeFavicons,
    seoMeta,
    authors,
    teamMembers,
    partners,
  ] = await Promise.all([
    updateManyUrlField(prisma.contentItemMedia, "url", oldUrl, newUrl),
    updateManyUrlField(prisma.contentItem, "featuredImageUrl", oldUrl, newUrl),
    updateManyUrlField(prisma.gallery, "coverUrl", oldUrl, newUrl),
    updateManyUrlField(prisma.galleryMedia, "mediaUrl", oldUrl, newUrl),
    updateManyUrlField(prisma.faqSet, "coverUrl", oldUrl, newUrl),
    updateManyUrlField(prisma.testimonial, "imageUrl", oldUrl, newUrl),
    updateManyUrlField(prisma.testimonial, "videoUrl", oldUrl, newUrl),
    updateManyUrlField(prisma.siteTheme, "logoUrl", oldUrl, newUrl),
    updateManyUrlField(prisma.siteTheme, "faviconUrl", oldUrl, newUrl),
    updateManyUrlField(prisma.seoMeta, "ogImageUrl", oldUrl, newUrl),
    updateManyUrlField(prisma.postAuthor, "avatarUrl", oldUrl, newUrl),
    updateManyUrlField(prisma.teamMember, "imageUrl", oldUrl, newUrl),
    updateManyUrlField(prisma.partner, "logoUrl", oldUrl, newUrl),
  ]);

  const contentItemRows = await prisma.contentItem.findMany({
    select: {
      id: true,
      blocks: true,
      composition: true,
      attributes: true,
      metadata: true,
      displaySettings: true,
      visualSettings: true,
      sources: true,
    },
  });
  const contentItemJson = await rewriteJsonRows(
    contentItemRows,
    (row) => ({
      blocks: row.blocks,
      composition: row.composition,
      attributes: row.attributes,
      metadata: row.metadata,
      displaySettings: row.displaySettings,
      visualSettings: row.visualSettings,
      sources: row.sources,
    }),
    (id, data) => prisma.contentItem.update({ where: { id }, data }),
    oldUrl,
    newUrl,
  );
  const contentItems = featuredImages + contentItemJson;

  const revisionRows = await prisma.contentItemRevision.findMany({
    select: { id: true, blocks: true, composition: true, translations: true },
  });
  const contentRevisions = await rewriteJsonRows(
    revisionRows,
    (row) => ({
      blocks: row.blocks,
      composition: row.composition,
      translations: row.translations,
    }),
    (id, data) => prisma.contentItemRevision.update({ where: { id }, data }),
    oldUrl,
    newUrl,
  );

  const cmsPageRows = await prisma.cmsPage.findMany({
    select: {
      id: true,
      blocks: true,
      composition: true,
      visualSettings: true,
      sources: true,
    },
  });
  const cmsPagesLive = await rewriteJsonRows(
    cmsPageRows,
    (row) => ({
      blocks: row.blocks,
      composition: row.composition,
      visualSettings: row.visualSettings,
      sources: row.sources,
    }),
    (id, data) => prisma.cmsPage.update({ where: { id }, data }),
    oldUrl,
    newUrl,
  );

  const cmsPageRevisionRows = await prisma.cmsPageRevision.findMany({
    select: { id: true, blocks: true, composition: true, translations: true },
  });
  const cmsPageRevisions = await rewriteJsonRows(
    cmsPageRevisionRows,
    (row) => ({
      blocks: row.blocks,
      composition: row.composition,
      translations: row.translations,
    }),
    (id, data) => prisma.cmsPageRevision.update({ where: { id }, data }),
    oldUrl,
    newUrl,
  );
  const cmsPages = cmsPagesLive + cmsPageRevisions;

  const postRows = await prisma.post.findMany({
    select: {
      id: true,
      blocks: true,
      composition: true,
      sources: true,
      featuredImageSettings: true,
    },
  });
  const postsLive = await rewriteJsonRows(
    postRows,
    (row) => ({
      blocks: row.blocks,
      composition: row.composition,
      sources: row.sources,
      featuredImageSettings: row.featuredImageSettings,
    }),
    (id, data) => prisma.post.update({ where: { id }, data }),
    oldUrl,
    newUrl,
  );

  const postRevisionRows = await prisma.postRevision.findMany({
    select: { id: true, blocks: true, composition: true, translations: true },
  });
  const postRevisions = await rewriteJsonRows(
    postRevisionRows,
    (row) => ({
      blocks: row.blocks,
      composition: row.composition,
      translations: row.translations,
    }),
    (id, data) => prisma.postRevision.update({ where: { id }, data }),
    oldUrl,
    newUrl,
  );
  const posts = postsLive + postRevisions;

  let header = 0;
  const workspace = await jsonStoreService.get<HeaderWorkspace>(HEADER_NAMESPACE, HEADER_KEY);
  if (workspace) {
    const rewritten = replaceUrlInJsonValue(workspace, oldUrl, newUrl);
    if (rewritten.changed) {
      await jsonStoreService.set(
        HEADER_NAMESPACE,
        HEADER_KEY,
        rewritten.next as unknown as Prisma.InputJsonValue,
        { revalidate: true },
      );
      header = 1;
    }
  }

  let catalog = { updatedProducts: 0, updatedCollections: 0 };
  try {
    const { updateAllCatalogReferences } = await import(
      "@/features/media/fs/catalog-media-references"
    );
    catalog = await updateAllCatalogReferences(oldUrl, newUrl);
  } catch (error) {
    console.error("[media] catalog reference rewrite failed:", error);
  }

  return {
    contentItemMedia,
    contentItems,
    contentRevisions,
    galleries,
    galleryMedia,
    faqSets,
    testimonials: testimonialImages + testimonialVideos,
    themes: themeLogos + themeFavicons,
    cmsPages,
    posts,
    seoMeta,
    authors,
    teamMembers,
    partners,
    header,
    catalog,
  };
}
