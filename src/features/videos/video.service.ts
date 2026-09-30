import type { Prisma, VideoStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { forceApexOrigin } from "@/lib/preferred-host";
import { sanitizeMetadataAbsoluteUrl } from "@/lib/metadata/absolute-url";
import { resolveSeoOgImageUrl } from "@/features/seo/seo-image-url";
import { resolveSiteOrigin } from "@/features/seo/resolve-site-origin";
import { isJpgOrPngThumbnail, isVideoPublishReady } from "./video-validation";
import type {
  VideoAdmin,
  VideoCreateInput,
  VideoPublic,
  VideoUpdateInput,
} from "./types";

const mediaSelect = {
  id: true,
  url: true,
  mimeType: true,
  mediaType: true,
  filename: true,
} as const;

const videoInclude = {
  contentMedia: { select: mediaSelect },
  thumbnailMedia: { select: mediaSelect },
} as const;

type VideoRow = Prisma.VideoGetPayload<{ include: typeof videoInclude }>;

async function siteOrigin(): Promise<string> {
  const raw = await resolveSiteOrigin("public").catch(() => process.env.NEXT_PUBLIC_SITE_URL ?? "");
  return (forceApexOrigin(raw) ?? raw).replace(/\/$/, "") || "https://brt-me.com";
}

function absoluteMediaUrl(raw: string | null | undefined, origin: string): string {
  if (!raw?.trim()) return "";
  return (
    sanitizeMetadataAbsoluteUrl(raw, origin) ??
    resolveSeoOgImageUrl(raw, origin) ??
    raw.trim()
  );
}

function toAdmin(row: VideoRow): VideoAdmin {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    locale: row.locale,
    status: row.status,
    contentMediaId: row.contentMediaId,
    thumbnailMediaId: row.thumbnailMediaId,
    uploadDate: row.uploadDate,
    duration: row.duration,
    embedUrl: row.embedUrl,
    contentMedia: row.contentMedia,
    thumbnailMedia: row.thumbnailMedia,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toPublic(row: VideoRow, origin: string): VideoPublic {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    locale: row.locale,
    uploadDate: row.uploadDate,
    duration: row.duration,
    embedUrl: row.embedUrl,
    contentUrl: absoluteMediaUrl(row.contentMedia.url, origin),
    thumbnailUrl: absoluteMediaUrl(row.thumbnailMedia.url, origin),
    contentMimeType: row.contentMedia.mimeType,
    thumbnailMimeType: row.thumbnailMedia.mimeType,
  };
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  let slug = slugify(base) || "video";
  let candidate = slug;
  let n = 1;
  while (true) {
    const existing = await prisma.video.findFirst({
      where: { slug: candidate, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });
    if (!existing) return candidate;
    n += 1;
    candidate = `${slug}-${n}`;
  }
}

async function assertThumbnailAllowed(thumbnailMediaId: string): Promise<void> {
  const thumb = await prisma.mediaAsset.findUnique({
    where: { id: thumbnailMediaId },
    select: mediaSelect,
  });
  if (!thumb) throw new Error("Thumbnail media not found");
  if (thumb.mediaType === "SVG" || !isJpgOrPngThumbnail(thumb.mimeType, thumb.url)) {
    throw new Error("Thumbnail must be JPG or PNG (SVG is not allowed)");
  }
}

async function assertContentMedia(contentMediaId: string): Promise<void> {
  const content = await prisma.mediaAsset.findUnique({
    where: { id: contentMediaId },
    select: { id: true },
  });
  if (!content) throw new Error("Content media not found");
}

export const videoService = {
  async listPublished(locale?: string): Promise<VideoPublic[]> {
    const origin = await siteOrigin();
    const rows = await prisma.video.findMany({
      where: {
        status: "PUBLISHED",
        ...(locale ? { locale } : {}),
      },
      include: videoInclude,
      orderBy: { uploadDate: "desc" },
    });
    return rows
      .filter((row) => isVideoPublishReady(row))
      .map((row) => toPublic(row, origin));
  },

  async getBySlug(slug: string, opts?: { publishedOnly?: boolean }): Promise<VideoPublic | null> {
    const origin = await siteOrigin();
    const row = await prisma.video.findUnique({
      where: { slug },
      include: videoInclude,
    });
    if (!row) return null;
    if (opts?.publishedOnly !== false) {
      if (row.status !== "PUBLISHED" || !isVideoPublishReady(row)) return null;
    }
    return toPublic(row, origin);
  },

  async getAdminById(id: string): Promise<VideoAdmin | null> {
    const row = await prisma.video.findUnique({
      where: { id },
      include: videoInclude,
    });
    return row ? toAdmin(row) : null;
  },

  async listAdmin(): Promise<VideoAdmin[]> {
    const rows = await prisma.video.findMany({
      include: videoInclude,
      orderBy: { updatedAt: "desc" },
    });
    return rows.map(toAdmin);
  },

  async create(input: VideoCreateInput): Promise<VideoAdmin> {
    await assertContentMedia(input.contentMediaId);
    await assertThumbnailAllowed(input.thumbnailMediaId);

    const slug = await uniqueSlug(input.slug?.trim() || input.title);
    let status: VideoStatus = input.status ?? "DRAFT";

    const content = await prisma.mediaAsset.findUnique({
      where: { id: input.contentMediaId },
      select: mediaSelect,
    });
    const thumb = await prisma.mediaAsset.findUnique({
      where: { id: input.thumbnailMediaId },
      select: mediaSelect,
    });
    if (
      status === "PUBLISHED" &&
      !isVideoPublishReady({
        title: input.title,
        description: input.description,
        contentMedia: content,
        thumbnailMedia: thumb,
      })
    ) {
      status = "DRAFT";
    }

    const row = await prisma.video.create({
      data: {
        slug,
        title: input.title.trim(),
        description: input.description.trim(),
        locale: input.locale?.trim() || "en",
        status,
        contentMediaId: input.contentMediaId,
        thumbnailMediaId: input.thumbnailMediaId,
        uploadDate: input.uploadDate,
        duration: input.duration?.trim() || null,
        embedUrl: input.embedUrl?.trim() || null,
      },
      include: videoInclude,
    });
    return toAdmin(row);
  },

  async update(id: string, input: VideoUpdateInput): Promise<VideoAdmin> {
    const existing = await prisma.video.findUnique({ where: { id } });
    if (!existing) throw new Error("Video not found");

    if (input.contentMediaId) await assertContentMedia(input.contentMediaId);
    if (input.thumbnailMediaId) await assertThumbnailAllowed(input.thumbnailMediaId);

    const contentMediaId = input.contentMediaId ?? existing.contentMediaId;
    const thumbnailMediaId = input.thumbnailMediaId ?? existing.thumbnailMediaId;
    const title = input.title?.trim() ?? existing.title;
    const description = input.description?.trim() ?? existing.description;
    let status = input.status ?? existing.status;

    const content = await prisma.mediaAsset.findUnique({
      where: { id: contentMediaId },
      select: mediaSelect,
    });
    const thumb = await prisma.mediaAsset.findUnique({
      where: { id: thumbnailMediaId },
      select: mediaSelect,
    });
    if (
      status === "PUBLISHED" &&
      !isVideoPublishReady({
        title,
        description,
        contentMedia: content,
        thumbnailMedia: thumb,
      })
    ) {
      status = "DRAFT";
    }

    const slug =
      input.slug !== undefined
        ? await uniqueSlug(input.slug.trim() || title, id)
        : existing.slug;

    const row = await prisma.video.update({
      where: { id },
      data: {
        slug,
        title,
        description,
        locale: input.locale?.trim() ?? existing.locale,
        status,
        contentMediaId,
        thumbnailMediaId,
        uploadDate: input.uploadDate ?? existing.uploadDate,
        duration:
          input.duration !== undefined ? input.duration?.trim() || null : existing.duration,
        embedUrl:
          input.embedUrl !== undefined ? input.embedUrl?.trim() || null : existing.embedUrl,
      },
      include: videoInclude,
    });
    return toAdmin(row);
  },

  async delete(id: string): Promise<void> {
    await prisma.video.delete({ where: { id } });
  },

  /**
   * Seed helper for UniFi Show: if a MediaAsset exists for the UniFi MP4
   * (url contains UniFi_Show) and a JPG/PNG thumbnail is available, upsert
   * published Video slug `unifi-show`. If no JPG/PNG thumb exists, leave DRAFT
   * or skip — never invent an SVG poster.
   */
  async ensureUnifiShowVideo(): Promise<VideoAdmin | null> {
    const content = await prisma.mediaAsset.findFirst({
      where: {
        OR: [
          { url: { contains: "UniFi_Show" } },
          { filename: { contains: "UniFi_Show" } },
        ],
        mediaType: "VIDEO",
      },
      select: { ...mediaSelect, createdAt: true },
      orderBy: { updatedAt: "desc" },
    });
    if (!content) return null;

    const thumbCandidates = await prisma.mediaAsset.findMany({
      where: {
        mediaType: "IMAGE",
        OR: [
          { url: { contains: "UniFi_Show" } },
          { filename: { contains: "UniFi_Show" } },
          { url: { contains: "unifi-show" } },
          { filename: { contains: "unifi-show" } },
        ],
      },
      select: mediaSelect,
      orderBy: { updatedAt: "desc" },
      take: 10,
    });
    const thumb = thumbCandidates.find((m) => isJpgOrPngThumbnail(m.mimeType, m.url));

    const existing = await prisma.video.findUnique({
      where: { slug: "unifi-show" },
      include: videoInclude,
    });

    if (!thumb) {
      // No JPG/PNG thumbnail — do not invent SVG; keep or create DRAFT only if video row exists.
      if (existing) {
        if (existing.status === "PUBLISHED") {
          return toAdmin(
            await prisma.video.update({
              where: { id: existing.id },
              data: { status: "DRAFT", contentMediaId: content.id },
              include: videoInclude,
            }),
          );
        }
        return toAdmin(existing);
      }
      return null;
    }

    // uploadDate from existing record or content MediaAsset.createdAt — never Date.now() invent
    const payload = {
      title: existing?.title ?? "UniFi Show",
      description:
        existing?.description ??
        "Watch the UniFi Show video covering UniFi networking solutions.",
      locale: existing?.locale ?? "en",
      contentMediaId: content.id,
      thumbnailMediaId: thumb.id,
      uploadDate: existing?.uploadDate ?? content.createdAt,
      duration: existing?.duration ?? null,
      embedUrl: existing?.embedUrl ?? null,
      status: "PUBLISHED" as const,
    };

    if (existing) {
      return this.update(existing.id, payload);
    }
    return this.create({ ...payload, slug: "unifi-show" });
  },
};