import "server-only";

import type { ContentStatus, CmsPage, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import type { PageBlocks } from "@/types/builder";
import type { PageVisualSettings } from "@/schemas/visual-settings";
import {
  computePatch,
  isEmptyPatch,
} from "@/lib/patch";
import { cmsRepository } from "@/repositories/cms.repository";
import { searchIndexer } from "@/capabilities/search/search-indexer.service";
import {
  revalidateCmsPage,
  revalidateMarketingHome,
} from "@/services/cache";
import { revalidateCmsPagePublicPaths } from "@/features/cms/revalidate-wired-marketing";
import { syncCmsPageCache } from "@/features/cms/page-cache-sync";
import {
  buildPageEditorFormData,
  type PageEditorFormState,
} from "@/features/cms/lib/page-editor-form-data";
import { seoTriggerService } from "@/features/seo/triggers/seo-trigger.service";
import { cmsPagePaths } from "@/features/seo/triggers/path-resolver";
import { executePatch } from "@/features/save-pipeline/patch-execution";
import { hasAsyncTask, hasExecutionEffect } from "@/features/save-pipeline/execution-plan";
import { localeService } from "@/features/i18n/locale.service";
import {
  syncEntitySlugsFromForm,
  syncEntityTranslationsFromForm,
} from "@/features/translation/form-sync.server";
import { translationService } from "@/features/translation/translation.service";
import {
  incrementSavePipelineMetric,
  type SavePipelineMetrics,
  withSavePipelineStep,
} from "@/features/save-pipeline/metrics";
import { enqueueSearchIndexJob } from "@/features/save-pipeline/search-index-jobs";
import { isAsyncSearchIndexingEnabled } from "@/features/save-pipeline/feature-flags";
import { compareExecutionPlans } from "@/features/save-pipeline/plan-comparison";
export type CmsPagePatchInput = {
  pageId: string;
  changes: Record<string, unknown>;
  baselineState?: Record<string, unknown>;
  currentState?: Record<string, unknown>;
  blockTranslationsRaw?: string | null;
  statusOverride?: ContentStatus;
  revisionMessage?: string;
  userId: string;
  metrics?: SavePipelineMetrics;
};

export type CmsPagePatchResult =
  | { ok: true; noop?: boolean; page: CmsPage; appliedPaths: string[] }
  | { ok: false; error: string };

function buildExistingState(page: CmsPage): PageEditorFormState {
  return {
    slug: page.slug,
    status: page.status,
    templateKey: page.templateKey ?? "",
    scheduledAt: page.scheduledAt?.toISOString() ?? "",
    revisionMessage: "",
    blocks: (page.blocks as PageBlocks) ?? [],
    visualSettings: (page.visualSettings as PageVisualSettings) ?? {},
    localeFields: { title: {}, excerpt: {} },
  };
}

function pathChanged(paths: readonly string[], prefix: string): boolean {
  return paths.some((path) => path === prefix || path.startsWith(`${prefix}.`));
}

function validateMergedPageState(
  state: PageEditorFormState,
  status: ContentStatus,
): string | null {
  if (!state.slug?.trim()) return "Slug is required";
  if (!/^[a-z0-9-]+$/.test(state.slug)) return "Slug must contain lowercase letters, numbers, and hyphens only";
  if (!["DRAFT", "PUBLISHED", "SCHEDULED", "ARCHIVED"].includes(status)) {
    return "Invalid status";
  }
  if (status === "SCHEDULED" && state.scheduledAt) {
    const scheduledAt = new Date(state.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) return "Invalid scheduled publish date";
  }
  return null;
}

async function assertUniquePageSlug(slug: string, excludeId: string) {
  const existing = await cmsRepository.slugExistsPage(slug, excludeId);
  if (existing) throw new Error(`Page slug "${slug}" already exists`);
}

async function trackPageBlocksMedia(blocks: PageBlocks, pageId: string) {
  const { mediaRepository } = await import("@/repositories/media.repository");
  for (const block of blocks) {
    const mediaAssetId = block.props.mediaAssetId as string | undefined;
    if (!mediaAssetId) continue;
    if (block.type === "hero" || block.type === "image") {
      await mediaRepository.trackUsage(mediaAssetId, "CMS_PAGE", pageId, block.type);
    }
  }
}

export async function patchCmsPageRecord(
  input: CmsPagePatchInput,
): Promise<CmsPagePatchResult> {
  const {
    pageId,
    changes,
    baselineState,
    currentState,
    blockTranslationsRaw,
    statusOverride,
    revisionMessage,
    userId,
    metrics,
  } = input;

  if (isEmptyPatch(changes) && !statusOverride) {
    const existing = await cmsRepository.getPageById(pageId);
    if (!existing) return { ok: false, error: "Page not found" };
    return { ok: true, noop: true, page: existing, appliedPaths: [] };
  }

  const existing = await cmsRepository.getPageById(pageId);
  if (!existing) return { ok: false, error: "Page not found" };

  const baseline = (baselineState as PageEditorFormState | undefined) ?? buildExistingState(existing);
  const execution = executePatch({
    entityType: "CMS_PAGE",
    operation: statusOverride === "PUBLISHED" ? "publish" : "save",
    baselineState: baseline as unknown as Record<string, unknown>,
    patchInput: changes,
    forcePaths: statusOverride ? ["status"] : undefined,
  });
  const merged = ((currentState as PageEditorFormState | undefined) ??
    (execution.finalState as unknown as PageEditorFormState));
  const status = statusOverride ?? merged.status;
  const appliedPaths = [...execution.changeSet.paths];
  const shadowPatch = computePatch(
    baseline as unknown as Record<string, unknown>,
    merged as unknown as Record<string, unknown>,
  ) as Record<string, unknown>;
  const shadowExecution = executePatch({
    entityType: "CMS_PAGE",
    operation: statusOverride === "PUBLISHED" ? "publish" : "save",
    baselineState: baseline as unknown as Record<string, unknown>,
    patchInput: shadowPatch,
    forcePaths: statusOverride ? ["status"] : undefined,
  });
  compareExecutionPlans(execution, shadowExecution);

  const validationError = validateMergedPageState(merged, status);
  if (validationError) return { ok: false, error: validationError };
  if (merged.slug !== existing.slug) {
    await assertUniquePageSlug(merged.slug, pageId);
  }

  const { builderService } = await import("@/features/builder/builder.service");
  const blocks = builderService.validateBlocks(merged.blocks);

  const data: Prisma.CmsPageUpdateInput = {};
  if (pathChanged(appliedPaths, "slug")) data.slug = merged.slug;
  if (pathChanged(appliedPaths, "templateKey")) data.templateKey = merged.templateKey;
  if (pathChanged(appliedPaths, "status") || statusOverride) data.status = status;
  if (pathChanged(appliedPaths, "blocks")) data.blocks = blocks as Prisma.InputJsonValue;
  if (pathChanged(appliedPaths, "visualSettings")) {
    data.visualSettings = merged.visualSettings as Prisma.InputJsonValue;
  }
  if (pathChanged(appliedPaths, "scheduledAt") || statusOverride) {
    data.scheduledAt = statusOverride === "PUBLISHED" ? null : merged.scheduledAt ? new Date(merged.scheduledAt) : null;
  }
  if (pathChanged(appliedPaths, "status") || statusOverride) {
    data.publishedAt =
      status === "PUBLISHED" ? new Date() : status === "DRAFT" ? null : undefined;
  }

  const page =
    Object.keys(data).length > 0
      ? await withSavePipelineStep(metrics, "dbWrites", () => cmsRepository.updatePage(pageId, data))
      : existing;

  const blocksChanged = pathChanged(appliedPaths, "blocks");
  const translationsChanged = hasExecutionEffect(execution, "sync_translations");

  if (hasExecutionEffect(execution, "save_revision")) {
    await withSavePipelineStep(metrics, "revisions", () => cmsRepository.saveRevision(
      pageId,
      blocks,
      userId,
      revisionMessage || "Saved",
    ));
  }

  const enabledLocales = await localeService.listEnabled();
  const formData = buildPageEditorFormData(
    merged,
    {
      pageId,
      editorTab: "general",
      selectedBlockId: null,
      editorInspector: "",
      statusOverride,
    },
    {
      locales: enabledLocales,
      blocks,
      blockTranslations: null,
    },
  );
  if (blockTranslationsRaw != null) {
    formData.set("blockTranslations", blockTranslationsRaw);
  }

  if (translationsChanged) {
    await withSavePipelineStep(metrics, "translationSyncRuns", () =>
      syncEntityTranslationsFromForm(formData, "CmsPage", page.id, enabledLocales, [
        "title",
        "excerpt",
      ]),
    );
    await withSavePipelineStep(metrics, "translationSyncRuns", () =>
      syncEntitySlugsFromForm(formData, "CmsPage", page.id, page.slug, enabledLocales),
    );
  }

  if (blocksChanged || blockTranslationsRaw != null) {
    await withSavePipelineStep(metrics, "translationSyncRuns", () =>
      translationService.syncBlockTranslations(
        "CmsPage",
        page.id,
        blocks,
        enabledLocales,
        blockTranslationsRaw ?? null,
        (existing.blocks as PageBlocks) ?? undefined,
      ),
    );
    await trackPageBlocksMedia(blocks, page.id);
  }

  if (page.status === "PUBLISHED") {
    if (hasAsyncTask(execution, "search_index") || statusOverride === "PUBLISHED") {
      if (isAsyncSearchIndexingEnabled()) {
        await enqueueSearchIndexJob("CMS_PAGE", page.id);
      } else {
        await withSavePipelineStep(metrics, "searchRuns", () =>
          searchIndexer.indexCmsPage({
            id: page.id,
            slug: page.slug,
            status: page.status,
          }),
        );
      }
    }
    if (hasExecutionEffect(execution, "revalidate_paths") || statusOverride === "PUBLISHED") {
      incrementSavePipelineMetric(metrics, "revalidationRuns", existing.slug !== page.slug ? 4 : 3);
      if (existing.slug !== page.slug) revalidateCmsPage(existing.slug);
      revalidateCmsPage(page.slug);
      revalidateMarketingHome();
      revalidateCmsPagePublicPaths(page.slug);
      incrementSavePipelineMetric(metrics, "seoRuns");
      if (existing.slug !== page.slug) {
        await seoTriggerService.handle({
          type: "content.slugChanged",
          entityType: "CMS_PAGE",
          entityId: page.id,
          oldPath: (await cmsPagePaths(existing.slug))[0] ?? `/pages/${existing.slug}`,
          newPath: (await cmsPagePaths(page.slug))[0] ?? `/pages/${page.slug}`,
        });
      } else {
        await seoTriggerService.handle({
          type: existing.status === "PUBLISHED" ? "content.sitemapChanged" : "content.published",
          entityType: "CMS_PAGE",
          entityId: page.id,
          path: (await cmsPagePaths(page.slug))[0] ?? `/pages/${page.slug}`,
        });
      }
    }
    await syncCmsPageCache(page);
  } else {
    if (hasExecutionEffect(execution, "revalidate_paths") || pathChanged(appliedPaths, "status")) {
      await syncCmsPageCache(page);
    }
  }

  incrementSavePipelineMetric(metrics, "revalidationRuns", 2);
  revalidatePath("/admin/pages");
  revalidatePath(`/admin/pages/${pageId}`);

  return { ok: true, page, appliedPaths };
}
