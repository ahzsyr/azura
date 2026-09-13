/**
 * Sets all site image URLs in the database to DEFAULT_MEDIA_PLACEHOLDER.
 * Run: npm run db:apply-default-photo
 */
import { PrismaClient } from "@prisma/client";
import { DEFAULT_MEDIA_PLACEHOLDER } from "../src/features/media/constants";

const prisma = new PrismaClient();
const PLACEHOLDER = DEFAULT_MEDIA_PLACEHOLDER;

const IMAGE_URL_KEYS = new Set([
  "imageUrl",
  "logoUrl",
  "faviconUrl",
  "avatarUrl",
  "ogImageUrl",
  "logoImageUrl",
  "logoImageLightUrl",
  "logoImageDarkUrl",
  "backgroundImage",
  "src",
]);

function looksLikeImageUrl(value: string): boolean {
  if (!value.trim() || value === PLACEHOLDER) return false;
  if (value.startsWith("/uploads/")) return true;
  if (/\.(jpg|jpeg|png|webp|gif|svg|avif)(\?|$)/i.test(value)) return true;
  if (value.includes("unsplash.com")) return true;
  if (value.includes("uploadthing") || value.includes("utfs.io")) return true;
  if (value.includes("elementor-placeholder")) return true;
  return false;
}

function replaceImageUrlsInJson(value: unknown, key?: string): unknown {
  if (typeof value === "string") {
    if (key === "url" && looksLikeImageUrl(value)) return PLACEHOLDER;
    if (key && IMAGE_URL_KEYS.has(key) && looksLikeImageUrl(value)) return PLACEHOLDER;
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => replaceImageUrlsInJson(item));
  }

  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === "href" || k === "videoUrl" || k === "ctaHref") {
        out[k] = v;
        continue;
      }
      out[k] = replaceImageUrlsInJson(v, k);
    }
    return out;
  }

  return value;
}

function transformBlocks(blocks: unknown, placeholderMediaId: string): unknown {
  if (!Array.isArray(blocks)) return blocks;

  return blocks.map((block) => {
    if (!block || typeof block !== "object") return block;
    const node = { ...(block as Record<string, unknown>) };
    const props = { ...((node.props as Record<string, unknown>) ?? {}) };

    if (node.type === "hero" && typeof props.imageUrl === "string" && props.imageUrl.trim()) {
      props.imageUrl = PLACEHOLDER;
      props.mediaAssetId = placeholderMediaId;
    }
    if (node.type === "image" && typeof props.url === "string" && props.url.trim()) {
      props.url = PLACEHOLDER;
      props.mediaAssetId = placeholderMediaId;
    }
    if (node.type === "gallery" && Array.isArray(props.mediaIds) && props.mediaIds.length > 0) {
      props.mediaIds = [placeholderMediaId];
    }

    node.props = props;
    if (Array.isArray(node.children)) {
      node.children = transformBlocks(node.children, placeholderMediaId);
    }
    return node;
  });
}

async function ensurePlaceholderAsset() {
  const existing = await prisma.mediaAsset.findFirst({ where: { url: PLACEHOLDER } });
  if (existing) return existing;

  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  return prisma.mediaAsset.create({
    data: {
      filename: "placeholder.png",
      url: PLACEHOLDER,
      mimeType: "image/png",
      mediaType: "IMAGE",
      sizeBytes: 0,
      uploadedBy: admin ? { connect: { id: admin.id } } : undefined,
    },
  });
}

async function main() {
  console.log(`Applying default photo: ${PLACEHOLDER}`);
  const placeholderAsset = await ensurePlaceholderAsset();

  const [
    contentMedia,
    contentFeatured,
    galleries,
    galleryMedia,
    testimonials,
    mediaAssets,
    seoMeta,
    themes,
    authors,
    posts,
    cmsPages,
    revisions,
    custom404,
    jsonStores,
  ] = await Promise.all([
    prisma.contentItemMedia.updateMany({ data: { url: PLACEHOLDER } }),
    prisma.contentItem.updateMany({
      where: { featuredImageUrl: { not: null } },
      data: { featuredImageUrl: PLACEHOLDER },
    }),
    prisma.gallery.updateMany({ where: { coverUrl: { not: null } }, data: { coverUrl: PLACEHOLDER } }),
    prisma.galleryMedia.updateMany({ data: { mediaUrl: PLACEHOLDER } }),
    prisma.testimonial.updateMany({
      where: { imageUrl: { not: null } },
      data: { imageUrl: PLACEHOLDER },
    }),
    prisma.mediaAsset.updateMany({
      where: { url: { not: PLACEHOLDER } },
      data: { url: PLACEHOLDER, filename: "placeholder.png", mimeType: "image/png", mediaType: "IMAGE" },
    }),
    prisma.seoMeta.updateMany({
      where: { ogImageUrl: { not: null } },
      data: { ogImageUrl: PLACEHOLDER },
    }),
    prisma.siteTheme.updateMany({
      data: { logoUrl: PLACEHOLDER, faviconUrl: PLACEHOLDER },
    }),
    prisma.postAuthor.updateMany({
      where: { avatarUrl: { not: null } },
      data: { avatarUrl: PLACEHOLDER },
    }),
    prisma.post.updateMany({
      data: { featuredImageId: placeholderAsset.id },
    }),
    prisma.cmsPage.findMany({ select: { id: true, blocks: true } }),
    prisma.cmsPageRevision.findMany({ select: { id: true, blocks: true } }),
    prisma.custom404.findMany({ select: { id: true, blocks: true } }),
    prisma.jsonStore.findMany({ select: { id: true, data: true } }),
  ]);

  let cmsUpdated = 0;
  for (const page of cmsPages) {
    await prisma.cmsPage.update({
      where: { id: page.id },
      data: { blocks: transformBlocks(page.blocks, placeholderAsset.id) as object },
    });
    cmsUpdated++;
  }

  let revisionUpdated = 0;
  for (const rev of revisions) {
    await prisma.cmsPageRevision.update({
      where: { id: rev.id },
      data: { blocks: transformBlocks(rev.blocks, placeholderAsset.id) as object },
    });
    revisionUpdated++;
  }

  let notFoundUpdated = 0;
  for (const row of custom404) {
    await prisma.custom404.update({
      where: { id: row.id },
      data: { blocks: transformBlocks(row.blocks, placeholderAsset.id) as object },
    });
    notFoundUpdated++;
  }

  let jsonUpdated = 0;
  for (const row of jsonStores) {
    const next = replaceImageUrlsInJson(row.data);
    await prisma.jsonStore.update({ where: { id: row.id }, data: { data: next as object } });
    jsonUpdated++;
  }

  const postRows = await prisma.post.findMany({ select: { id: true, blocks: true } });
  let postBlocksUpdated = 0;
  for (const post of postRows) {
    await prisma.post.update({
      where: { id: post.id },
      data: { blocks: transformBlocks(post.blocks, placeholderAsset.id) as object },
    });
    postBlocksUpdated++;
  }

  console.log("Done:");
  console.log(`  placeholder media id: ${placeholderAsset.id}`);
  console.log(`  content media: ${contentMedia.count}, featured: ${contentFeatured.count}`);
  console.log(`  gallery covers: ${galleries.count}, gallery media: ${galleryMedia.count}`);
  console.log(`  testimonials: ${testimonials.count}`);
  console.log(`  media assets: ${mediaAssets.count}`);
  console.log(`  seo meta: ${seoMeta.count}`);
  console.log(`  themes: ${themes.count}`);
  console.log(`  post authors: ${authors.count}`);
  console.log(`  posts (featured image): ${posts.count}`);
  console.log(`  cms pages: ${cmsUpdated}`);
  console.log(`  cms revisions: ${revisionUpdated}`);
  console.log(`  custom 404 pages: ${notFoundUpdated}`);
  console.log(`  json store records: ${jsonUpdated}`);
  console.log(`  post block JSON: ${postBlocksUpdated}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
