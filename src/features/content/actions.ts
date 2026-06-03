"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ContentStatus } from "@prisma/client";
import { requireAdmin } from "@/features/auth/guards";
import { contentRepository } from "@/features/content/content.repository";
import { contentItemSchema } from "@/schemas/content/item";
import { resolveFieldSchema } from "@/features/content/content-type.registry";
import { buildAttributesFromForm } from "@/features/content/attributes-helper";
import { searchIndexer } from "@/features/search/search-indexer.service";
import { localeService } from "@/features/i18n/locale.service";
import { syncEntityTranslationsFromForm, extractLegacyColumns } from "@/features/translation/form-sync";
import { translationService } from "@/features/translation/translation.service";
import type { PageBlocks } from "@/types/builder";
import { prisma } from "@/lib/prisma";

function parseJson(raw: FormDataEntryValue | null, fallback: unknown) {
  if (!raw || typeof raw !== "string" || !raw.trim()) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function formString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

function checkbox(raw: FormDataEntryValue | null) {
  return raw === "true" || raw === "on" || raw === "1";
}

function revalidateContent(typeSlug: string, itemId?: string, routePrefix?: string | null, slug?: string | null) {
  revalidatePath("/admin/content");
  revalidatePath(`/admin/content/${typeSlug}`);
  if (itemId) revalidatePath(`/admin/content/${typeSlug}/${itemId}`);
  if (routePrefix) {
    revalidatePath(`/${routePrefix}`);
    if (slug) revalidatePath(`/${routePrefix}/${slug}`);
  }
  if (typeSlug === "catalog-items") {
    revalidatePath("/packages");
    if (slug) revalidatePath(`/packages/${slug}`);
  }
}

async function indexItem(item: {
  id: string;
  slug: string | null;
  titleEn: string;
  titleAr: string;
  excerptEn: string;
  excerptAr: string;
  descriptionEn: string;
  descriptionAr: string;
  attributes: unknown;
  metadata?: unknown;
  blocks?: unknown;
  status: ContentStatus;
  isVisible: boolean;
  collection?: { id: string; slug: string; nameEn: string; nameAr: string } | null;
  contentType: {
    slug: string;
    routePrefix: string | null;
    fieldSchema: unknown;
    adminConfig: unknown;
    isEnabled: boolean;
  };
}) {
  await searchIndexer.indexContentItem({
    id: item.id,
    slug: item.slug,
    titleEn: item.titleEn,
    titleAr: item.titleAr,
    excerptEn: item.excerptEn,
    excerptAr: item.excerptAr,
    descriptionEn: item.descriptionEn,
    descriptionAr: item.descriptionAr,
    attributes: item.attributes,
    metadata: item.metadata,
    blocks: item.blocks,
    status: item.status,
    isVisible: item.isVisible,
    contentType: item.contentType,
    collection: item.collection ?? null,
  });
}

export async function upsertContentItem(formData: FormData) {
  await requireAdmin();

  const typeSlug = String(formData.get("contentTypeSlug") ?? "");
  const type = await contentRepository.getTypeBySlug(typeSlug);
  if (!type) throw new Error("Unknown content type");

  const enabledLocales = await localeService.listEnabled();

  const titleLegacy = extractLegacyColumns(formData, enabledLocales, "title");
  const excerptLegacy = extractLegacyColumns(formData, enabledLocales, "excerpt");
  const descriptionLegacy = extractLegacyColumns(formData, enabledLocales, "description");

  const titleEn = titleLegacy.titleEn ?? formString(formData.get("titleEn"));
  const titleArRaw = titleLegacy.titleAr ?? formString(formData.get("titleAr"));
  const titleAr = titleArRaw.trim() ? titleArRaw : titleEn;

  const parsed = contentItemSchema.parse({
    id: formString(formData.get("id")) || undefined,
    contentTypeId: type.id,
    collectionId: formString(formData.get("collectionId")) || null,
    slug: formString(formData.get("slug")) || null,
    titleEn,
    titleAr,
    excerptEn: excerptLegacy.excerptEn ?? formString(formData.get("excerptEn")),
    excerptAr: excerptLegacy.excerptAr ?? formString(formData.get("excerptAr")),
    descriptionEn: descriptionLegacy.descriptionEn ?? formString(formData.get("descriptionEn")),
    descriptionAr: descriptionLegacy.descriptionAr ?? formString(formData.get("descriptionAr")),
    attributes: formString(formData.get("attributes")),
    blocks: formString(formData.get("blocks")),
    displaySettings: formString(formData.get("displaySettings")),
    status: (formString(formData.get("status")) || "DRAFT") as ContentStatus,
    isFeatured: formString(formData.get("isFeatured")),
    isVisible: formString(formData.get("isVisible")),
    sortOrder: formString(formData.get("sortOrder")),
  });

  const fields = resolveFieldSchema(type, typeSlug);
  const attributesJson = formData.get("attributesJson");
  const attributesFromForm =
    attributesJson && typeof attributesJson === "string" && attributesJson.trim()
      ? (parseJson(attributesJson, {}) as Record<string, unknown>)
      : buildAttributesFromForm(formData, fields);

  const data = {
    contentTypeId: type.id,
    collectionId: parsed.collectionId || null,
    slug: parsed.slug?.trim() || null,
    titleEn: parsed.titleEn,
    titleAr: parsed.titleAr,
    excerptEn: parsed.excerptEn,
    excerptAr: parsed.excerptAr,
    descriptionEn: parsed.descriptionEn,
    descriptionAr: parsed.descriptionAr,
    attributes: attributesFromForm as object,
    blocks: parseJson(parsed.blocks as string | undefined ?? null, []) as object,
    displaySettings: parseJson(parsed.displaySettings as string | undefined ?? null, {}) as object,
    status: parsed.status as ContentStatus,
    isFeatured: checkbox(formData.get("isFeatured")),
    isVisible: formData.has("isVisible") ? checkbox(formData.get("isVisible")) : true,
    sortOrder: parsed.sortOrder,
    publishedAt: parsed.status === "PUBLISHED" ? new Date() : undefined,
  };

  let item;
  let previousBlocks: PageBlocks | undefined;
  if (parsed.id) {
    const existing = await prisma.contentItem.findUnique({
      where: { id: parsed.id },
      select: { blocks: true },
    });
    previousBlocks = (existing?.blocks as PageBlocks) ?? undefined;
    item = await prisma.contentItem.update({
      where: { id: parsed.id },
      data,
      include: {
        contentType: {
          select: {
            slug: true,
            routePrefix: true,
            fieldSchema: true,
            adminConfig: true,
            isEnabled: true,
          },
        },
        collection: { select: { id: true, slug: true, nameEn: true, nameAr: true } },
      },
    });
  } else {
    item = await prisma.contentItem.create({
      data,
      include: {
        contentType: {
          select: {
            slug: true,
            routePrefix: true,
            fieldSchema: true,
            adminConfig: true,
            isEnabled: true,
          },
        },
        collection: { select: { id: true, slug: true, nameEn: true, nameAr: true } },
      },
    });
  }

  await syncEntityTranslationsFromForm(formData, "ContentItem", item.id, enabledLocales);

  const pageBlocks = (data.blocks ?? []) as PageBlocks;
  await translationService.syncBlockTranslations(
    "ContentItem",
    item.id,
    pageBlocks,
    enabledLocales,
    formData.get("blockTranslations") as string | null,
    previousBlocks
  );

  await indexItem(item);
  revalidateContent(typeSlug, item.id, item.contentType.routePrefix, item.slug);
  redirect(`/admin/content/${typeSlug}/${item.id}`);
}

export async function duplicateContentItem(id: string) {
  await requireAdmin();
  const source = await contentRepository.getItemById(id);
  if (!source) throw new Error("Item not found");

  const copy = await prisma.contentItem.create({
    data: {
      contentTypeId: source.contentTypeId,
      collectionId: source.collectionId,
      slug: source.slug ? `${source.slug}-copy-${Date.now()}` : null,
      titleEn: `${source.titleEn} (copy)`,
      titleAr: `${source.titleAr} (copy)`,
      excerptEn: source.excerptEn,
      excerptAr: source.excerptAr,
      descriptionEn: source.descriptionEn,
      descriptionAr: source.descriptionAr,
      attributes: source.attributes ?? {},
      blocks: source.blocks ?? [],
      displaySettings: source.displaySettings ?? {},
      metadata: source.metadata ?? {},
      status: "DRAFT",
      isFeatured: false,
      isVisible: false,
      sortOrder: source.sortOrder + 1,
      featuredImageUrl: source.featuredImageUrl,
    },
  });

  const media = source.media ?? [];
  if (media.length) {
    await prisma.contentItemMedia.createMany({
      data: media.map((m: (typeof media)[number]) => ({
        itemId: copy.id,
        url: m.url,
        altEn: m.altEn,
        altAr: m.altAr,
        captionEn: m.captionEn,
        captionAr: m.captionAr,
        sortOrder: m.sortOrder,
        isPublished: m.isPublished,
        isCover: m.isCover,
        isHidden: m.isHidden,
      })),
    });
  }

  const typeSlug = source.contentType.slug;
  revalidateContent(typeSlug);
  redirect(`/admin/content/${typeSlug}/${copy.id}`);
}

export async function setContentItemStatus(id: string, status: ContentStatus) {
  await requireAdmin();
  const item = await prisma.contentItem.update({
    where: { id },
    data: {
      status,
      archivedAt: status === "ARCHIVED" ? new Date() : null,
      publishedAt: status === "PUBLISHED" ? new Date() : undefined,
    },
    include: {
      contentType: {
        select: {
          slug: true,
          routePrefix: true,
          fieldSchema: true,
          adminConfig: true,
          isEnabled: true,
        },
      },
      collection: { select: { id: true, slug: true, nameEn: true, nameAr: true } },
    },
  });
  await indexItem(item);
  revalidateContent(item.contentType.slug, id, item.contentType.routePrefix, item.slug);
}

export async function toggleContentItemVisibility(id: string, isVisible: boolean) {
  await requireAdmin();
  const item = await prisma.contentItem.update({
    where: { id },
    data: { isVisible },
    include: {
      contentType: {
        select: {
          slug: true,
          routePrefix: true,
          fieldSchema: true,
          adminConfig: true,
          isEnabled: true,
        },
      },
      collection: { select: { id: true, slug: true, nameEn: true, nameAr: true } },
    },
  });
  await indexItem(item);
  revalidateContent(item.contentType.slug, id, item.contentType.routePrefix, item.slug);
}

export async function softDeleteContentItem(id: string) {
  await requireAdmin();
  const item = await prisma.contentItem.update({
    where: { id },
    data: { deletedAt: new Date(), isVisible: false, status: "ARCHIVED" },
    include: { contentType: { select: { slug: true, routePrefix: true } } },
  });
  await searchIndexer.remove("CONTENT_ITEM", id);
  revalidateContent(item.contentType.slug, undefined, item.contentType.routePrefix, item.slug);
}

export async function reorderContentItems(typeSlug: string, ids: string[]) {
  await requireAdmin();
  await Promise.all(
    ids.map((id, index) =>
      prisma.contentItem.update({ where: { id }, data: { sortOrder: index } })
    )
  );
  revalidateContent(typeSlug);
}

export async function addContentItemMedia(itemId: string, url: string, altEn = "", altAr = "") {
  await requireAdmin();
  const maxOrder = await prisma.contentItemMedia.aggregate({
    where: { itemId },
    _max: { sortOrder: true },
  });
  await prisma.contentItemMedia.create({
    data: {
      itemId,
      url,
      altEn,
      altAr,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });
  const item = await prisma.contentItem.findUnique({
    where: { id: itemId },
    include: { contentType: true },
  });
  if (item) revalidateContent(item.contentType.slug, itemId);
}

export async function updateContentItemMedia(
  id: string,
  data: Partial<{
    altEn: string;
    altAr: string;
    captionEn: string;
    captionAr: string;
    isPublished: boolean;
    isCover: boolean;
    isHidden: boolean;
  }>
) {
  await requireAdmin();
  const media = await prisma.contentItemMedia.update({ where: { id }, data });
  if (data.isCover) {
    await prisma.contentItemMedia.updateMany({
      where: { itemId: media.itemId, id: { not: id } },
      data: { isCover: false },
    });
    await prisma.contentItem.update({
      where: { id: media.itemId },
      data: { featuredImageUrl: media.url },
    });
  }
  const item = await prisma.contentItem.findUnique({
    where: { id: media.itemId },
    include: { contentType: true },
  });
  if (item) revalidateContent(item.contentType.slug, item.id);
}

export async function deleteContentItemMedia(id: string) {
  await requireAdmin();
  const media = await prisma.contentItemMedia.delete({ where: { id } });
  const item = await prisma.contentItem.findUnique({
    where: { id: media.itemId },
    include: { contentType: true },
  });
  if (item) revalidateContent(item.contentType.slug, item.id);
}

export async function reorderContentItemMedia(itemId: string, ids: string[]) {
  await requireAdmin();
  await Promise.all(
    ids.map((id, index) =>
      prisma.contentItemMedia.update({ where: { id }, data: { sortOrder: index } })
    )
  );
  const item = await prisma.contentItem.findUnique({
    where: { id: itemId },
    include: { contentType: true },
  });
  if (item) revalidateContent(item.contentType.slug, itemId);
}
