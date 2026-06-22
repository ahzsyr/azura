import { prisma } from "@/lib/prisma";
import { jsonStoreService } from "@/features/storage/json-store.service";
import type { HeaderWorkspace, MenuItem } from "@/features/navigation/types";
import { mediaRepository } from "@/repositories/media.repository";

const HEADER_NAMESPACE = "header-workspace";
const HEADER_KEY = "default";

type UsageRef = {
  mediaId: string;
  entityType: string;
  entityId: string;
  field: string;
};

function collectStrings(value: unknown, out: Set<string>) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("http") || trimmed.startsWith("/")) out.add(trimmed);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
    return;
  }
  if (value && typeof value === "object") {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      collectStrings(nested, out);
    }
  }
}

function walkMenuItems(items: MenuItem[], entityId: string, refs: UsageRef[], urlToId: Map<string, string>) {
  for (const item of items) {
    if (item.imageUrl) {
      const mediaId = urlToId.get(item.imageUrl);
      if (mediaId) {
        refs.push({ mediaId, entityType: "HEADER", entityId, field: `menu:${item.id}:image` });
      }
    }
    if (item.children?.length) walkMenuItems(item.children, entityId, refs, urlToId);
  }
}

async function buildUrlIndex() {
  const assets = await prisma.mediaAsset.findMany({ select: { id: true, url: true } });
  return new Map(assets.map((a) => [a.url, a.id]));
}

function refsFromJson(
  json: unknown,
  entityType: string,
  entityId: string,
  urlToId: Map<string, string>,
  fieldPrefix = "content"
): UsageRef[] {
  const urls = new Set<string>();
  collectStrings(json, urls);
  const refs: UsageRef[] = [];
  for (const url of urls) {
    const mediaId = urlToId.get(url);
    if (mediaId) refs.push({ mediaId, entityType, entityId, field: fieldPrefix });
  }
  return refs;
}

export const mediaUsageScanner = {
  async scanHeaderWorkspace(urlToId: Map<string, string>): Promise<UsageRef[]> {
    const workspace = await jsonStoreService.get<HeaderWorkspace>(HEADER_NAMESPACE, HEADER_KEY);
    if (!workspace) return [];

    const refs: UsageRef[] = [];
    const brandingUrls = [
      workspace.branding.logoImageUrl,
      workspace.branding.logoImageLightUrl,
      workspace.branding.logoImageDarkUrl,
    ];
    for (const url of brandingUrls) {
      if (!url) continue;
      const mediaId = urlToId.get(url);
      if (mediaId) {
        refs.push({ mediaId, entityType: "HEADER", entityId: HEADER_KEY, field: "branding:logo" });
      }
    }

    for (const [menuKey, menu] of Object.entries(workspace.menusDatabase)) {
      walkMenuItems(menu.items ?? [], menuKey, refs, urlToId);
    }

    return refs;
  },

  async scanAll(): Promise<{ tracked: number }> {
    const urlToId = await buildUrlIndex();
    const refs: UsageRef[] = [];

    const [contentMedia, galleryAlbums, galleryMedia, testimonials, themes, cmsPages, posts, headerRefs] =
      await Promise.all([
        prisma.contentItemMedia.findMany({ select: { itemId: true, url: true } }),
        prisma.gallery.findMany({ select: { id: true, coverUrl: true } }),
        prisma.galleryMedia.findMany({ select: { id: true, mediaUrl: true } }),
        prisma.testimonial.findMany({ select: { id: true, imageUrl: true, videoUrl: true } }),
        prisma.siteTheme.findMany({ select: { id: true, logoUrl: true, faviconUrl: true } }),
        prisma.cmsPage.findMany({ select: { id: true, blocks: true } }),
        prisma.post.findMany({
          select: { id: true, blocks: true, featuredImageId: true },
        }),
        this.scanHeaderWorkspace(urlToId),
      ]);

    refs.push(...headerRefs);

    for (const img of contentMedia) {
      const mediaId = urlToId.get(img.url);
      if (mediaId) refs.push({ mediaId, entityType: "CONTENT_ITEM", entityId: img.itemId, field: "image" });
    }

    for (const row of galleryAlbums) {
      if (!row.coverUrl) continue;
      const mediaId = urlToId.get(row.coverUrl);
      if (mediaId) refs.push({ mediaId, entityType: "GALLERY", entityId: row.id, field: "coverUrl" });
    }

    for (const row of galleryMedia) {
      if (!row.mediaUrl) continue;
      const mediaId = urlToId.get(row.mediaUrl);
      if (mediaId) refs.push({ mediaId, entityType: "GALLERY", entityId: row.id, field: "mediaUrl" });
    }

    for (const row of testimonials) {
      for (const [field, url] of [
        ["imageUrl", row.imageUrl],
        ["videoUrl", row.videoUrl],
      ] as const) {
        if (!url) continue;
        const mediaId = urlToId.get(url);
        if (mediaId) refs.push({ mediaId, entityType: "TESTIMONIAL", entityId: row.id, field });
      }
    }

    for (const theme of themes) {
      for (const [field, url] of [
        ["logoUrl", theme.logoUrl],
        ["faviconUrl", theme.faviconUrl],
      ] as const) {
        if (!url) continue;
        const mediaId = urlToId.get(url);
        if (mediaId) refs.push({ mediaId, entityType: "THEME", entityId: theme.id, field });
      }
    }

    for (const page of cmsPages) {
      refs.push(...refsFromJson(page.blocks, "CMS_PAGE", page.id, urlToId, "blocks"));
    }

    for (const post of posts) {
      refs.push(...refsFromJson(post.blocks, "POST", post.id, urlToId, "blocks"));
      if (post.featuredImageId) {
        refs.push({
          mediaId: post.featuredImageId,
          entityType: "POST",
          entityId: post.id,
          field: "featuredImage",
        });
      }
    }

    await prisma.mediaUsage.deleteMany({});
    const unique = new Map<string, UsageRef>();
    for (const ref of refs) {
      unique.set(`${ref.mediaId}:${ref.entityType}:${ref.entityId}:${ref.field}`, ref);
    }

    for (const ref of unique.values()) {
      await mediaRepository.trackUsage(ref.mediaId, ref.entityType, ref.entityId, ref.field);
    }

    return { tracked: unique.size };
  },
};
