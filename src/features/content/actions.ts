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
import {
  syncEntityTranslationsFromForm,
  syncEntitySlugsFromForm,
} from "@/features/translation/form-sync.server";
import { translationService } from "@/features/translation/translation.service";
import type { PageBlocks } from "@/types/builder";
import { prisma } from "@/lib/prisma";
import { revalidateContentList } from "@/services/cache";
import { seoTriggerService } from "@/features/seo/triggers/seo-trigger.service";
import { contentItemPaths } from "@/features/seo/triggers/path-resolver";
import { executePatch } from "@/features/save-pipeline/patch-execution";
import { hasAsyncTask, hasExecutionEffect } from "@/features/save-pipeline/execution-plan";
import { computePatch } from "@/lib/patch";
import { compareExecutionPlans } from "@/features/save-pipeline/plan-comparison";
import { agentLog } from "@/lib/debug/agent-log";
import {
  isAsyncSearchIndexingEnabled,
  isContentItemPatchSaveEnabled,
} from "@/features/save-pipeline/feature-flags";
import { enqueueSearchIndexJob } from "@/features/save-pipeline/search-index-jobs";
import {
  failSavePipelineMetrics,
  finishSavePipelineMetrics,
  incrementSavePipelineMetric,
  startSavePipelineMetrics,
  withSavePipelineStep,
} from "@/features/save-pipeline/metrics";

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

function revalidateContent(typeSlug: string, itemId?: string, routePrefix?: string | null, slug?: string | null) {
  revalidatePath("/admin/content");
  revalidatePath(`/admin/content/${typeSlug}`);
  if (itemId) revalidatePath(`/admin/content/${typeSlug}/${itemId}`);
  revalidateContentList(typeSlug);
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
  attributes: unknown;
  metadata?: unknown;
  blocks?: unknown;
  status: ContentStatus;
  isVisible: boolean;
  collection?: { id: string; slug: string } | null;
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
    attributes: item.attributes,
    metadata: item.metadata,
    blocks: item.blocks,
    status: item.status,
    isVisible: item.isVisible,
    contentType: item.contentType,
    collection: item.collection
      ? {
          id: item.collection.id,
          slug: item.collection.slug,
        }
      : null,
  });
}

export async function upsertContentItem(formData: FormData) {
  await requireAdmin();
  const idFromForm = formString(formData.get("id")) || undefined;
  const metrics = startSavePipelineMetrics({
    entityType: "CONTENT_ITEM",
    operation: formString(formData.get("status")) === "PUBLISHED" ? "publish" : "save",
    entityId: idFromForm,
  });

  try {
    const typeSlug = String(formData.get("contentTypeSlug") ?? "");
    const type = await contentRepository.getTypeBySlug(typeSlug);
    if (!type) throw new Error("Unknown content type");

    const enabledLocales = await localeService.listEnabled();

    const parsed = contentItemSchema.parse({
      id: idFromForm,
      contentTypeId: type.id,
      collectionId: formString(formData.get("collectionId")) || null,
      slug: formString(formData.get("slug")) || null,
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

    const blocksRaw = parseJson(parsed.blocks as string | undefined ?? null, []);
    const { builderService } = await import("@/features/builder/builder.service");
    const blocks = builderService.validateBlocks(blocksRaw);

    const submittedState = {
      collectionId: parsed.collectionId || null,
      slug: parsed.slug?.trim() || null,
      attributes: attributesFromForm,
      blocks,
      displaySettings: parseJson(parsed.displaySettings as string | undefined ?? null, {}),
      status: parsed.status,
      isFeatured: parsed.isFeatured,
      isVisible: parsed.isVisible,
      sortOrder: parsed.sortOrder,
    };

    const include = {
      contentType: {
        select: {
          slug: true,
          routePrefix: true,
          fieldSchema: true,
          adminConfig: true,
          isEnabled: true,
        },
      },
      collection: { select: { id: true, slug: true } },
    } as const;

    const id = parsed.id;
    let item;
    let previousBlocks: PageBlocks | undefined;
    let existingItem: {
      slug: string | null;
      status: ContentStatus;
      isVisible: boolean;
      blocks: unknown;
    } | null = null;
    let appliedPaths: string[] = [];
    let shouldSyncTranslations = true;
    let shouldRunSearch = true;
    let shouldRevalidate = true;
    let shouldRunSeo = true;
    if (id) {
      const existing = await prisma.contentItem.findUnique({
        where: { id },
        select: {
          collectionId: true,
          slug: true,
          attributes: true,
          blocks: true,
          displaySettings: true,
          status: true,
          isFeatured: true,
          isVisible: true,
          sortOrder: true,
        },
      });
      existingItem = existing
        ? {
            slug: existing.slug,
            status: existing.status,
            isVisible: existing.isVisible,
            blocks: existing.blocks,
          }
        : null;
      previousBlocks = (existing?.blocks as PageBlocks) ?? undefined;

      const baselineState = existing
        ? {
            collectionId: existing.collectionId,
            slug: existing.slug,
            attributes: existing.attributes,
            blocks: existing.blocks,
            displaySettings: existing.displaySettings,
            status: existing.status,
            isFeatured: existing.isFeatured,
            isVisible: existing.isVisible,
            sortOrder: existing.sortOrder,
          }
        : null;
      const changes = baselineState
        ? (computePatch(
            baselineState as Record<string, unknown>,
            submittedState as Record<string, unknown>,
          ) as Record<string, unknown>)
        : submittedState;
      const execution =
        existing && baselineState && isContentItemPatchSaveEnabled()
          ? executePatch({
              entityType: "CONTENT_ITEM",
              operation: submittedState.status === "PUBLISHED" ? "publish" : "save",
              baselineState,
              patchInput: changes,
            })
          : null;
      if (execution && baselineState) {
        const shadowExecution = executePatch({
          entityType: "CONTENT_ITEM",
          operation: submittedState.status === "PUBLISHED" ? "publish" : "save",
          baselineState,
          patchInput: computePatch(baselineState, execution.finalState) as Record<string, unknown>,
        });
        const comparison = compareExecutionPlans(execution, shadowExecution);
        if (!comparison.ok) {
          agentLog({
            location: "content/actions.ts:upsertContentItem:shadowPlanComparison",
            message: "content item patch/full execution plan mismatch",
            hypothesisId: "PATCH_SAVE",
            data: { itemId: id, mismatches: comparison.mismatches },
          });
        }
      }
      appliedPaths = execution ? [...execution.changeSet.paths] : Object.keys(submittedState);
      shouldSyncTranslations = execution ? hasExecutionEffect(execution, "sync_translations") : true;
      shouldRunSearch = execution ? hasAsyncTask(execution, "search_index") : true;
      shouldRevalidate = execution ? hasExecutionEffect(execution, "revalidate_paths") : true;
      shouldRunSeo = execution ? hasAsyncTask(execution, "seo_submission") : true;

      const data: Record<string, unknown> = {};
      const changed = (path: string) =>
        !execution || appliedPaths.some((p) => p === path || p.startsWith(`${path}.`));
      if (changed("collectionId")) data.collectionId = submittedState.collectionId;
      if (changed("slug")) data.slug = submittedState.slug;
      if (changed("attributes")) data.attributes = submittedState.attributes as object;
      if (changed("blocks")) data.blocks = blocks as object;
      if (changed("displaySettings")) data.displaySettings = submittedState.displaySettings;
      if (changed("status")) data.status = submittedState.status;
      if (changed("isFeatured")) data.isFeatured = submittedState.isFeatured;
      if (changed("isVisible")) data.isVisible = submittedState.isVisible;
      if (changed("sortOrder")) data.sortOrder = submittedState.sortOrder;
      if (changed("status")) data.publishedAt = submittedState.status === "PUBLISHED" ? new Date() : undefined;

      item =
        Object.keys(data).length > 0
          ? await withSavePipelineStep(metrics, "dbWrites", () =>
              prisma.contentItem.update({
                where: { id },
                data,
                include,
              }),
            )
          : await prisma.contentItem.findUniqueOrThrow({ where: { id }, include });
    } else {
      item = await withSavePipelineStep(metrics, "dbWrites", () =>
        prisma.contentItem.create({
          data: {
            contentTypeId: type.id,
            collectionId: submittedState.collectionId,
            slug: submittedState.slug,
            attributes: submittedState.attributes as object,
            blocks: blocks as object,
            displaySettings: submittedState.displaySettings,
            status: submittedState.status,
            isFeatured: submittedState.isFeatured,
            isVisible: submittedState.isVisible,
            sortOrder: submittedState.sortOrder,
            publishedAt: submittedState.status === "PUBLISHED" ? new Date() : undefined,
          },
          include,
        }),
      );
    }

    if (!id || shouldSyncTranslations) {
      await withSavePipelineStep(metrics, "translationSyncRuns", () =>
        syncEntityTranslationsFromForm(formData, "ContentItem", item.id, enabledLocales),
      );
      const itemSlug = item.slug;
      if (itemSlug) {
        await withSavePipelineStep(metrics, "translationSyncRuns", () =>
          syncEntitySlugsFromForm(formData, "ContentItem", item.id, itemSlug, enabledLocales),
        );
      }
    }

    const blocksChanged = appliedPaths.some((p) => p === "blocks" || p.startsWith("blocks."));
    if (!id || blocksChanged || formData.has("blockTranslations")) {
      await withSavePipelineStep(metrics, "translationSyncRuns", () =>
        translationService.syncBlockTranslations(
          "ContentItem",
          item.id,
          blocks,
          enabledLocales,
          formData.get("blockTranslations") as string | null,
          previousBlocks,
        ),
      );
    }

    if (!id || shouldRunSearch || submittedState.status === "PUBLISHED") {
      if (isAsyncSearchIndexingEnabled()) {
        await enqueueSearchIndexJob("CONTENT_ITEM", item.id);
      } else {
        await withSavePipelineStep(metrics, "searchRuns", () => indexItem(item));
      }
    }
    if (!id || shouldRevalidate || appliedPaths.includes("status")) {
      incrementSavePipelineMetric(metrics, "revalidationRuns");
      revalidateContent(typeSlug, item.id, item.contentType.routePrefix, item.slug);
    }
    if (item.status === "PUBLISHED" && item.isVisible && (!id || shouldRunSeo || appliedPaths.includes("status"))) {
      const paths = await contentItemPaths(item.contentType.routePrefix, item.slug);
      incrementSavePipelineMetric(metrics, "seoRuns");
      if (existingItem?.slug && existingItem.slug !== item.slug) {
        await seoTriggerService.handle({
          type: "content.slugChanged",
          entityType: "CONTENT_ITEM",
          entityId: item.id,
          oldPath: (await contentItemPaths(item.contentType.routePrefix, existingItem.slug))[0] ?? "",
          newPath: paths[0] ?? "",
        });
      } else {
        await seoTriggerService.handle({
          type:
            existingItem?.status === "PUBLISHED" && existingItem.isVisible
              ? "content.sitemapChanged"
              : "content.published",
          entityType: "CONTENT_ITEM",
          entityId: item.id,
          path: paths[0] ?? "",
        });
      }
    }

    const editorTab = formString(formData.get("editorTab")) || "details";
    const selectedBlockId = formString(formData.get("selectedBlockId"));
    const editorInspector = formString(formData.get("editorInspector"));
    const qs = new URLSearchParams({ tab: editorTab });
    if (selectedBlockId) qs.set("block", selectedBlockId);
    if (editorInspector) qs.set("inspector", editorInspector);
    finishSavePipelineMetrics(metrics, { mode: id ? "patch" : "full", appliedPaths });
    redirect(`/admin/content/${typeSlug}/${item.id}?${qs.toString()}`);
  } catch (error) {
    failSavePipelineMetrics(metrics, error);
    throw error;
  }
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
      collection: { select: { id: true, slug: true } },
    },
  });
  await indexItem(item);
  revalidateContent(item.contentType.slug, id, item.contentType.routePrefix, item.slug);
  const paths = await contentItemPaths(item.contentType.routePrefix, item.slug);
  await seoTriggerService.handle({
    type: status === "PUBLISHED" ? "content.published" : "content.unpublished",
    entityType: "CONTENT_ITEM",
    entityId: item.id,
    path: paths[0] ?? "",
  });
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
      collection: { select: { id: true, slug: true } },
    },
  });
  await indexItem(item);
  revalidateContent(item.contentType.slug, id, item.contentType.routePrefix, item.slug);
  const paths = await contentItemPaths(item.contentType.routePrefix, item.slug);
  await seoTriggerService.handle({
    type: isVisible ? "content.published" : "content.unpublished",
    entityType: "CONTENT_ITEM",
    entityId: item.id,
    path: paths[0] ?? "",
  });
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
  const paths = await contentItemPaths(item.contentType.routePrefix, item.slug);
  await seoTriggerService.handle({
    type: "content.deleted",
    entityType: "CONTENT_ITEM",
    entityId: item.id,
    path: paths[0] ?? "",
  });
}

export async function reorderContentItems(typeSlug: string, ids: string[]) {
  await requireAdmin();
  await Promise.all(
    ids.map((id, index) =>
      prisma.contentItem.update({ where: { id }, data: { sortOrder: index } })
    )
  );
  revalidateContent(typeSlug);
  await seoTriggerService.handle({ type: "content.sitemapChanged", entityType: "CONTENT_TYPE" });
}

export async function addContentItemMedia(itemId: string, url: string) {
  await requireAdmin();
  const maxOrder = await prisma.contentItemMedia.aggregate({
    where: { itemId },
    _max: { sortOrder: true },
  });
  await prisma.contentItemMedia.create({
    data: {
      itemId,
      url,
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
    isPublished: boolean;
    isCover: boolean;
    isHidden: boolean;
    altEn: string;
    altAr: string;
    captionEn: string;
    captionAr: string;
  }>
) {
  await requireAdmin();
  const { altEn, altAr, captionEn, captionAr, ...prismaData } = data;
  const media = await prisma.contentItemMedia.update({ where: { id }, data: prismaData });
  const enabledLocales = await localeService.listEnabled();
  const defaultLocaleCode =
    enabledLocales.find((locale) => locale.isDefault)?.code?.toLowerCase() ??
    enabledLocales[0]?.code?.toLowerCase() ??
    "en";
  const secondaryLocaleCode =
    enabledLocales.find((locale) => locale.code.toLowerCase() !== defaultLocaleCode)?.code?.toLowerCase() ??
    "ar";

  const translationInputs = [];
  if (altEn !== undefined) {
    translationInputs.push({
      entityType: "ContentItemMedia" as const,
      entityId: id,
      field: "alt",
      localeCode: defaultLocaleCode,
      value: altEn,
    });
  }
  if (altAr !== undefined) {
    translationInputs.push({
      entityType: "ContentItemMedia" as const,
      entityId: id,
      field: "alt",
      localeCode: secondaryLocaleCode,
      value: altAr,
    });
  }
  if (captionEn !== undefined) {
    translationInputs.push({
      entityType: "ContentItemMedia" as const,
      entityId: id,
      field: "caption",
      localeCode: defaultLocaleCode,
      value: captionEn,
    });
  }
  if (captionAr !== undefined) {
    translationInputs.push({
      entityType: "ContentItemMedia" as const,
      entityId: id,
      field: "caption",
      localeCode: secondaryLocaleCode,
      value: captionAr,
    });
  }
  if (translationInputs.length > 0) {
    await translationService.upsertMany(translationInputs);
  }
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
