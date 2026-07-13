"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildEditorRedirectQuery } from "@/lib/editor-url-sync";
import type { ContentStatus, Prisma } from "@prisma/client";
import { requireAdmin } from "@/features/auth/guards";
import { contentRepository } from "@/features/content/content.repository";
import { contentItemSchema } from "@/schemas/content/item";
import { resolveFieldSchema } from "@/features/content/content-type.registry";
import { buildAttributesFromForm } from "@/features/content/attributes-helper";
import { searchIndexer } from "@/capabilities/search/search-indexer.service";
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
import { compositionService } from "@/features/layout-engine/composition.service";

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

export type UpsertContentItemResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string };

async function upsertContentItemCore(
  formData: FormData,
  clientNavigation: boolean,
): Promise<string | void> {
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
      visualSettings: formString(formData.get("visualSettings")) || null,
      status: (formString(formData.get("status")) || "DRAFT") as ContentStatus,
      isFeatured: formString(formData.get("isFeatured")),
      isVisible: formString(formData.get("isVisible")),
      sortOrder: formString(formData.get("sortOrder")),
      scheduledAt: formString(formData.get("scheduledAt")) || null,
      revisionMessage: formString(formData.get("revisionMessage")) || null,
    });

    const fields = resolveFieldSchema(type, typeSlug);
    const attributesJson = formData.get("attributesJson");
    const attributesFromForm =
      attributesJson && typeof attributesJson === "string" && attributesJson.trim()
        ? (parseJson(attributesJson, {}) as Record<string, unknown>)
        : buildAttributesFromForm(formData, fields);

    const blocksRaw = parseJson(parsed.blocks as string | undefined ?? null, []);
    const compositionRaw = parseJson(formData.get("composition"), {});
    const { builderService } = await import("@/features/builder/builder.service");
    const validatedPrimaryBlocks = builderService.validateBlocks(blocksRaw);
    const composition = compositionService.validate(
      compositionService.load({
        composition: compositionRaw,
        blocks: validatedPrimaryBlocks,
      }),
    );
    const persistedComposition = compositionService.save(composition);
    const blocks = persistedComposition.blocks as PageBlocks;

    const rawSlug = parsed.slug?.trim() || null;
    if (rawSlug && rawSlug.includes("/")) {
      throw new Error("Slug must be a single URL segment and cannot contain '/'");
    }

    const submittedState = {
      collectionId: parsed.collectionId || null,
      slug: rawSlug,
      attributes: attributesFromForm,
      blocks,
      composition: persistedComposition.composition,
      displaySettings: parseJson(parsed.displaySettings as string | undefined ?? null, {}),
      visualSettings: parseJson(parsed.visualSettings as string | null | undefined ?? null, {}),
      status: parsed.status,
      isFeatured: parsed.isFeatured,
      isVisible: parsed.isVisible,
      sortOrder: parsed.sortOrder,
      scheduledAt: parsed.scheduledAt ? new Date(parsed.scheduledAt) : null,
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
          composition: true,
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
            composition: existing.composition,
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
        compareExecutionPlans(execution, shadowExecution);
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
      if (changed("blocks") || changed("composition")) {
        data.blocks = blocks as object;
        data.composition = persistedComposition.composition as object;
      }
      if (changed("displaySettings")) data.displaySettings = submittedState.displaySettings;
      if (changed("visualSettings")) data.visualSettings = submittedState.visualSettings;
      if (changed("status")) data.status = submittedState.status;
      if (changed("isFeatured")) data.isFeatured = submittedState.isFeatured;
      if (changed("isVisible")) data.isVisible = submittedState.isVisible;
      if (changed("sortOrder")) data.sortOrder = submittedState.sortOrder;
      if (changed("scheduledAt")) data.scheduledAt = submittedState.scheduledAt;
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
            composition: persistedComposition.composition as object,
            displaySettings: submittedState.displaySettings,
            visualSettings: submittedState.visualSettings,
            status: submittedState.status,
            isFeatured: submittedState.isFeatured,
            isVisible: submittedState.isVisible,
            sortOrder: submittedState.sortOrder,
            scheduledAt: submittedState.scheduledAt,
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

    const blocksChanged = appliedPaths.some(
      (p) =>
        p === "blocks" ||
        p.startsWith("blocks.") ||
        p === "composition" ||
        p.startsWith("composition."),
    );
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

    // Save a revision snapshot on every save of an existing item when blocks changed
    if (id && blocksChanged) {
      const revisionCount = await prisma.contentItemRevision.count({ where: { itemId: item.id } });
      await prisma.contentItemRevision.create({
        data: {
          itemId: item.id,
          version: revisionCount + 1,
          blocks: blocks as object,
          composition: persistedComposition.composition as object,
          message: parsed.revisionMessage ?? null,
          status: submittedState.status,
        },
      });
      // Keep only the last 20 revisions
      const oldRevisions = await prisma.contentItemRevision.findMany({
        where: { itemId: item.id },
        orderBy: { createdAt: "desc" },
        skip: 20,
        select: { id: true },
      });
      if (oldRevisions.length > 0) {
        await prisma.contentItemRevision.deleteMany({
          where: { id: { in: oldRevisions.map((r: { id: string }) => r.id) } },
        });
      }
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
    const editorRegion = formString(formData.get("editorRegion"));
    const qs = buildEditorRedirectQuery({
      tab: editorTab,
      block: selectedBlockId,
      inspector: editorInspector,
      region: editorRegion,
    });
    finishSavePipelineMetrics(metrics, { mode: id ? "patch" : "full", appliedPaths });
    const redirectTo = `/admin/content/${typeSlug}/${item.id}?${qs}`;
    if (clientNavigation) return redirectTo;
    redirect(redirectTo);
  } catch (error) {
    failSavePipelineMetrics(metrics, error);
    throw error;
  }
}

/** Form action — redirects server-side after save. */
export async function upsertContentItem(formData: FormData) {
  await upsertContentItemCore(formData, false);
}

/** Editor toolbar save — returns redirect URL for client-side navigation. */
export async function saveContentItemFromEditor(
  formData: FormData,
): Promise<UpsertContentItemResult> {
  try {
    const redirectTo = await upsertContentItemCore(formData, true);
    return { ok: true, redirectTo: redirectTo as string };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "Save failed";
    return { ok: false, error: message };
  }
}

export async function patchCmsPageBlocksFromContentEditor(formData: FormData) {
  const session = await requireAdmin();
  const cmsPageId = formString(formData.get("cmsPageId"));
  const returnTypeSlug = formString(formData.get("returnTypeSlug"));
  const returnItemId = formString(formData.get("returnItemId"));
  if (!cmsPageId) throw new Error("cmsPageId required");
  if (!returnTypeSlug || !returnItemId) throw new Error("returnTypeSlug and returnItemId required");

  const blocksRaw = parseJson(formData.get("blocks"), []);
  const { builderService } = await import("@/features/builder/builder.service");
  const blocks = builderService.validateBlocks(blocksRaw);

  const { patchCmsPageRecord } = await import("@/features/cms/cms-page-patch.server");
  const result = await patchCmsPageRecord({
    pageId: cmsPageId,
    changes: { blocks },
    blockTranslationsRaw: (formData.get("blockTranslations") as string | null) ?? null,
    userId: String((session.user as { id?: string }).id ?? ""),
  });
  if (!result.ok) throw new Error(result.error);

  revalidatePath(`/admin/content/${returnTypeSlug}/${returnItemId}`);
  const editorTab = formString(formData.get("editorTab")) || "blocks";
  const selectedBlockId = formString(formData.get("selectedBlockId"));
  const editorInspector = formString(formData.get("editorInspector"));
  const editorRegion = formString(formData.get("editorRegion"));
  const qs = buildEditorRedirectQuery({
    tab: editorTab,
    block: selectedBlockId,
    inspector: editorInspector,
    region: editorRegion,
  });
  redirect(`/admin/content/${returnTypeSlug}/${returnItemId}?${qs}`);
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
      composition:
        ("composition" in source
          ? (source as { composition?: Prisma.InputJsonValue }).composition
          : undefined) ?? ({} as Prisma.InputJsonValue),
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

export async function restoreContentItemRevision(itemId: string, revisionId: string) {
  await requireAdmin();
  const rev = await prisma.contentItemRevision.findUnique({ where: { id: revisionId } });
  if (!rev || rev.itemId !== itemId) throw new Error("Revision not found");
  const restoredComposition = compositionService.save(
    compositionService.load({
      composition: "composition" in rev ? rev.composition : undefined,
      blocks: (rev.blocks ?? []) as PageBlocks,
    }),
  );
  const item = await prisma.contentItem.update({
    where: { id: itemId },
    data: {
      blocks: restoredComposition.blocks as Prisma.InputJsonValue,
      composition: restoredComposition.composition as Prisma.InputJsonValue,
    },
    include: { contentType: true },
  });
  revalidateContent(item.contentType.slug, item.id, item.contentType.routePrefix, item.slug);
  revalidatePath(`/admin/content/${item.contentType.slug}/${itemId}`);
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
