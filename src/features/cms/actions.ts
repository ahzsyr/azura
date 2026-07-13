"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/features/auth/guards";
import { cmsRepository } from "@/repositories/cms.repository";
import { postSchema, postCategorySchema, postTagSchema, postAuthorSchema } from "@/schemas/cms";
import { parsePostFeaturedImageSettings } from "@/schemas/featured-image-settings";
import { searchIndexer } from "@/capabilities/search/search-indexer.service";
import { revalidateCmsPage, revalidatePost, revalidateMarketingHome } from "@/services/cache";
import { revalidateCmsPagePublicPaths } from "@/features/cms/revalidate-wired-marketing";
import { parseScheduledAt } from "./scheduling-utils";
import { processDueScheduled } from "./scheduling";
import { syncCmsPageCache } from "./page-cache-sync";
import { parseCmsPageFormData } from "./page-form-validation";
import type { PageBlocks } from "@/types/builder";
import type { CmsPage, ContentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { localeService } from "@/features/i18n/locale.service";
import { syncEntityTranslationsFromForm, syncEntitySlugsFromForm } from "@/features/translation/form-sync.server";
import { translationService } from "@/features/translation/translation.service";
import { patchCmsPageRecord } from "@/features/cms/cms-page-patch.server";
import { computePatch, applyPatch, isEmptyPatch } from "@/lib/patch";
import { seoTriggerService } from "@/features/seo/triggers/seo-trigger.service";
import { runSeoOnCmsPagePublish, runSeoOnPostPublish } from "@/features/seo/platform/automation-hooks";
import { cmsPagePaths, postPaths } from "@/features/seo/triggers/path-resolver";
import {
  isAsyncSearchIndexingEnabled,
  isCmsPagePatchSaveEnabled,
  isPostPatchShadowModeEnabled,
} from "@/features/save-pipeline/feature-flags";
import {
  failSavePipelineMetrics,
  finishSavePipelineMetrics,
  incrementSavePipelineMetric,
  startSavePipelineMetrics,
} from "@/features/save-pipeline/metrics";
import { executePatch } from "@/features/save-pipeline/patch-execution";
import { enqueueSearchIndexJob } from "@/features/save-pipeline/search-index-jobs";
import { hasAsyncTask, hasExecutionEffect } from "@/features/save-pipeline/execution-plan";
import { compareExecutionPlans } from "@/features/save-pipeline/plan-comparison";
import { buildPostEditorRedirectPath, buildEditorRedirectQuery } from "@/lib/editor-url-sync";
import { compositionService } from "@/features/layout-engine/composition.service";

function parseStatus(s: string | null): ContentStatus {
  return (s as ContentStatus) ?? "DRAFT";
}

async function assertUniquePageSlug(slug: string, excludeId?: string) {
  const existing = await cmsRepository.slugExistsPage(slug, excludeId);
  if (existing) throw new Error(`Page slug "${slug}" already exists`);
}

async function assertUniquePostSlug(slug: string, excludeId?: string) {
  const existing = await cmsRepository.slugExistsPost(slug, excludeId);
  if (existing) throw new Error(`Post slug "${slug}" already exists`);
}

export type UpsertCmsPageResult =
  | { ok: true; redirectTo: string }
  | { ok: false; step: string; error: string };

export type UpsertPostResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string };

type UpsertCmsPageFailure = { ok: false; step: string; error: string };

class CmsPageSaveStepError extends Error {
  readonly step: string;

  constructor(step: string, cause: unknown) {
    const message =
      cause instanceof Error ? cause.message : typeof cause === "string" ? cause : "Save failed";
    super(message);
    this.name = "CmsPageSaveStepError";
    this.step = step;
  }
}

async function runCmsPageStep<T>(
  step: string,
  pageId: string | null,
  fn: () => Promise<T> | T,
): Promise<T> {
  const startedAt = Date.now();
  try {
    const result = await fn();
    return result;
  } catch (error) {
    throw new CmsPageSaveStepError(step, error);
  }
}

async function upsertCmsPageCore(
  formData: FormData,
  clientNavigation: boolean,
): Promise<string> {
  const session = await requireAdmin();
  const id = formData.get("id") as string | null;
  const blocksRaw = formData.get("blocks") as string | null;
  const compositionRaw = formData.get("composition") as string | null;
  const metrics = startSavePipelineMetrics({
    entityType: "CMS_PAGE",
    operation: formData.get("status") === "PUBLISHED" ? "publish" : "save",
    entityId: id,
  });


  try {
    let blocksParsed: unknown[] = [];
    try {
      blocksParsed = blocksRaw ? JSON.parse(blocksRaw) : [];
    } catch (parseErr) {
      throw parseErr;
    }

    let parsedComposition: unknown = {};
    try {
      parsedComposition = compositionRaw ? JSON.parse(compositionRaw) : {};
    } catch (parseErr) {
      throw parseErr;
    }

    const { builderService } = await import("@/features/builder/builder.service");
    let blocks: PageBlocks;
    try {
      blocks = builderService.validateBlocks(blocksParsed);
    } catch (validateErr) {
      throw validateErr;
    }
    const composition = compositionService.validate(
      compositionService.load({
        composition: parsedComposition,
        blocks,
      }),
    );
    const persistedComposition = compositionService.save(composition);


    const scheduledAt = parseScheduledAt(formData.get("scheduledAt"));

    const enabledLocales = await localeService.listEnabled();

    const parsed = parseCmsPageFormData(formData, enabledLocales);
    const visualSettingsRaw = formData.get("visualSettings") as string | null;
    let visualSettings: Prisma.InputJsonValue = {};
    if (visualSettingsRaw) {
      try {
        visualSettings = JSON.parse(visualSettingsRaw) as Prisma.InputJsonValue;
      } catch {
        visualSettings = {};
      }
    }

    await runCmsPageStep("assertUniquePageSlug", id, () =>
      assertUniquePageSlug(parsed.slug, id ?? undefined),
    );

    const status = parseStatus(parsed.status);
    const data: Prisma.CmsPageUpdateInput = {
      slug: parsed.slug,
      status,
      blocks: persistedComposition.blocks,
      composition: persistedComposition.composition,
      visualSettings,
      scheduledAt,
      publishedAt:
        status === "PUBLISHED" ? new Date() : status === "DRAFT" ? null : undefined,
    };

    let page: CmsPage;
    let previousBlocks: PageBlocks | undefined;
    let existingPage: CmsPage | null = null;
    if (id) {
      const existing = await runCmsPageStep("getPageById", id, () => cmsRepository.getPageById(id));
      existingPage = existing;
      previousBlocks = (existing?.blocks as PageBlocks) ?? undefined;
      page = await runCmsPageStep("updatePage", id, () => cmsRepository.updatePage(id, data));
      incrementSavePipelineMetric(metrics, "dbWrites");
      await runCmsPageStep("saveRevision", id, () =>
        cmsRepository.saveRevision(
          id,
          blocks,
          composition,
          session.user.id,
          (formData.get("revisionMessage") as string) || "Saved",
        ),
      );
      incrementSavePipelineMetric(metrics, "revisions");
    } else {
      page = await runCmsPageStep("createPage", null, () =>
        cmsRepository.createPage(data as Prisma.CmsPageCreateInput),
      );
      incrementSavePipelineMetric(metrics, "dbWrites");
      await runCmsPageStep("saveRevision", page.id, () =>
        cmsRepository.saveRevision(page.id, blocks, composition, session.user.id, "Initial"),
      );
      incrementSavePipelineMetric(metrics, "revisions");
    }

    if (page.status === "PUBLISHED") {
      await runCmsPageStep("indexCmsPage", page.id, () =>
        searchIndexer.indexCmsPage({
          id: page.id,
          slug: page.slug,
          status: page.status,
        }),
      );
      incrementSavePipelineMetric(metrics, "searchRuns");
      await runCmsPageStep("syncCmsPageCache", page.id, () => syncCmsPageCache(page));
    } else {
      await runCmsPageStep("syncCmsPageCache", page.id, () => syncCmsPageCache(page));
    }


    await runCmsPageStep("syncEntityTranslations", page.id, () =>
      syncEntityTranslationsFromForm(formData, "CmsPage", page.id, enabledLocales, [
        "title",
        "excerpt",
      ]),
    );
    incrementSavePipelineMetric(metrics, "translationSyncRuns");

    await runCmsPageStep("syncEntitySlugs", page.id, () =>
      syncEntitySlugsFromForm(formData, "CmsPage", page.id, page.slug, enabledLocales),
    );
    incrementSavePipelineMetric(metrics, "translationSyncRuns");


    const blockTranslationsRaw = formData.get("blockTranslations") as string | null;

    await runCmsPageStep("syncBlockTranslations", page.id, () =>
      translationService.syncBlockTranslations(
        "CmsPage",
        page.id,
        blocks,
        enabledLocales,
        blockTranslationsRaw,
        previousBlocks,
      ),
    );
    incrementSavePipelineMetric(metrics, "translationSyncRuns");


    await runCmsPageStep("trackPageBlocksMedia", page.id, () =>
      trackPageBlocksMedia(blocks, page.id),
    );

    if (page.status === "PUBLISHED") {
      revalidateCmsPage(page.slug);
      revalidateMarketingHome();
      revalidateCmsPagePublicPaths(page.slug);
      incrementSavePipelineMetric(metrics, "revalidationRuns", 3);
      if (existingPage?.slug && existingPage.slug !== page.slug) {
        await seoTriggerService.handle({
          type: "content.slugChanged",
          entityType: "CMS_PAGE",
          entityId: page.id,
          oldPath: (await cmsPagePaths(existingPage.slug))[0] ?? `/pages/${existingPage.slug}`,
          newPath: (await cmsPagePaths(page.slug))[0] ?? `/pages/${page.slug}`,
        });
        incrementSavePipelineMetric(metrics, "seoRuns");
      } else {
        await seoTriggerService.handle({
          type: existingPage?.status === "PUBLISHED" ? "content.sitemapChanged" : "content.published",
          entityType: "CMS_PAGE",
          entityId: page.id,
          path: (await cmsPagePaths(page.slug))[0] ?? `/pages/${page.slug}`,
        });
        incrementSavePipelineMetric(metrics, "seoRuns");
      }
    }

    revalidatePath("/admin/pages");
    incrementSavePipelineMetric(metrics, "revalidationRuns");

    const editorTab = (formData.get("editorTab") as string | null)?.trim() || "general";
    const selectedBlockId = (formData.get("selectedBlockId") as string | null)?.trim();
    const editorInspector = (formData.get("editorInspector") as string | null)?.trim();
    const editorRegion = (formData.get("editorRegion") as string | null)?.trim();
    const qs = buildEditorRedirectQuery({
      tab: editorTab,
      block: selectedBlockId,
      inspector: editorInspector,
      region: editorRegion,
    });
    const redirectTo = `/admin/pages/${page.id}?${qs}`;

    finishSavePipelineMetrics(metrics, { redirectTo, mode: "full" });

    if (clientNavigation) {
      return redirectTo;
    }

    redirect(redirectTo);
  } catch (error) {
    failSavePipelineMetrics(metrics, error, { mode: "full" });
    throw error;
  }
}

/** Form action — redirects server-side after save. */
export async function upsertCmsPage(formData: FormData): Promise<void> {
  await upsertCmsPageCore(formData, false);
}

function toUpsertFailure(error: unknown, step = "unknown"): UpsertCmsPageFailure {
  if (error instanceof CmsPageSaveStepError) {
    return { ok: false, step: error.step, error: error.message };
  }
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Save failed";
  return { ok: false, step, error: message };
}

/** Editor toolbar save — returns redirect URL for client-side navigation. */
export async function saveCmsPageFromEditor(
  formData: FormData,
): Promise<UpsertCmsPageResult> {
  try {
    const redirectTo = await upsertCmsPageCore(formData, true);
    return { ok: true, redirectTo };
  } catch (error) {
    const err =
      error instanceof Error
        ? { name: error.name, message: error.message }
        : { value: String(error) };
    return toUpsertFailure(error);
  }
}

export type PatchCmsPageEditorInput = {
  pageId: string;
  baseline: Record<string, unknown>;
  current: Record<string, unknown>;
  blockTranslationsRaw?: string | null;
  statusOverride?: ContentStatus;
  revisionMessage?: string;
  editorTab: string;
  selectedBlockId: string | null;
  editorInspector: string;
  editorRegion?: string | null;
};

/** Patch-based page save from editor toolbar. */
export async function patchCmsPageFromEditor(
  input: PatchCmsPageEditorInput,
): Promise<UpsertCmsPageResult> {
  const session = await requireAdmin();
  const metrics = startSavePipelineMetrics({
    entityType: "CMS_PAGE",
    operation: input.statusOverride === "PUBLISHED" ? "publish" : "save",
    entityId: input.pageId,
  });
  try {
    if (!isCmsPagePatchSaveEnabled()) {
      return { ok: false, step: "patch_disabled", error: "Patch save is disabled" };
    }
    const changes = computePatch(
      input.baseline as Record<string, unknown>,
      input.current as Record<string, unknown>,
    ) as Record<string, unknown>;

    if (isEmptyPatch(changes) && !input.statusOverride) {
      const qs = buildEditorRedirectQuery({
        tab: input.editorTab,
        block: input.selectedBlockId,
        inspector: input.editorInspector,
        region: input.editorRegion,
      });
      return { ok: true, redirectTo: `/admin/pages/${input.pageId}?${qs}` };
    }

    const result = await patchCmsPageRecord({
      pageId: input.pageId,
      changes,
      baselineState: input.baseline,
      currentState: input.current,
      blockTranslationsRaw: input.blockTranslationsRaw,
      statusOverride: input.statusOverride,
      revisionMessage: input.revisionMessage,
      userId: session.user.id,
      metrics,
    });

    if (!result.ok) {
      return { ok: false, step: "patch", error: result.error };
    }

    const qs = buildEditorRedirectQuery({
      tab: input.editorTab,
      block: input.selectedBlockId,
      inspector: input.editorInspector,
      region: input.editorRegion,
    });
    finishSavePipelineMetrics(metrics, {
      mode: "patch",
      appliedPaths: result.appliedPaths,
    });
    return { ok: true, redirectTo: `/admin/pages/${input.pageId}?${qs}` };
  } catch (error) {
    failSavePipelineMetrics(metrics, error, { mode: "patch" });
    return toUpsertFailure(error, "patchCmsPageFromEditor");
  }
}

export type PatchPostEditorInput = {
  postId: string;
  baseline: Record<string, unknown>;
  current: Record<string, unknown>;
  statusOverride?: ContentStatus;
};

/** Patch-based post save — falls back to status-only publish path when empty. */
export async function patchPostFromEditor(input: PatchPostEditorInput): Promise<void> {
  await requireAdmin();
  const changes = computePatch(
    input.baseline as Record<string, unknown>,
    input.current as Record<string, unknown>,
  ) as Record<string, unknown>;

  if (isEmptyPatch(changes) && input.statusOverride) {
    if (input.statusOverride === "PUBLISHED") {
      await publishPost(input.postId);
    }
    return;
  }

  if (isEmptyPatch(changes)) return;

  const post = await cmsRepository.getPostById(input.postId);
  if (!post) throw new Error("Post not found");

  const merged = applyPatch(
    {
      slug: post.slug,
      status: post.status,
      authorId: post.authorId,
      featuredImageId: post.featuredImageId,
      featuredImageSettings: post.featuredImageSettings,
      scheduledAt: post.scheduledAt?.toISOString() ?? "",
      categoryIds: post.categories.map((c) => c.categoryId),
      tagIds: post.tags.map((t) => t.tagId),
      relatedPostIds: Array.isArray(post.relatedPostIds)
        ? (post.relatedPostIds as string[])
        : [],
      blocks: post.blocks,
    },
    changes,
  ) as Record<string, unknown>;

  const formData = new FormData();
  formData.set("id", input.postId);
  formData.set("slug", String(merged.slug ?? post.slug));
  formData.set("status", String(input.statusOverride ?? merged.status ?? post.status));
  formData.set("authorId", String(merged.authorId ?? ""));
  formData.set("featuredImageId", String(merged.featuredImageId ?? ""));
  formData.set(
    "featuredImageSettings",
    JSON.stringify(merged.featuredImageSettings ?? post.featuredImageSettings ?? {}),
  );
  formData.set("scheduledAt", String(merged.scheduledAt ?? ""));
  formData.set("blocks", JSON.stringify(merged.blocks ?? post.blocks));
  formData.set("categoryIds", JSON.stringify(merged.categoryIds ?? []));
  formData.set("tagIds", JSON.stringify(merged.tagIds ?? []));
  formData.set("relatedPostIds", JSON.stringify(merged.relatedPostIds ?? []));

  await upsertPost(formData);
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

export async function publishCmsPage(id: string) {
  await requireAdmin();
  const metrics = startSavePipelineMetrics({ entityType: "CMS_PAGE", operation: "publish", entityId: id });
  const page = await cmsRepository.updatePage(id, {
    status: "PUBLISHED",
    publishedAt: new Date(),
    scheduledAt: null,
  });
  incrementSavePipelineMetric(metrics, "dbWrites");
  if (isAsyncSearchIndexingEnabled()) {
    await enqueueSearchIndexJob("CMS_PAGE", page.id);
  } else {
    await searchIndexer.indexCmsPage({
      id: page.id,
      slug: page.slug,
      status: page.status,
    });
    incrementSavePipelineMetric(metrics, "searchRuns");
  }
  await syncCmsPageCache(page);
  revalidateCmsPage(page.slug);
  revalidateMarketingHome();
  revalidateCmsPagePublicPaths(page.slug);
  incrementSavePipelineMetric(metrics, "revalidationRuns", 3);
  await seoTriggerService.handle({
    type: "content.published",
    entityType: "CMS_PAGE",
    entityId: page.id,
    path: (await cmsPagePaths(page.slug))[0] ?? `/pages/${page.slug}`,
  });
  try {
    await runSeoOnCmsPagePublish(page.id);
  } catch {
    // SEO platform pipeline is best-effort on publish
  }
  incrementSavePipelineMetric(metrics, "seoRuns");
  revalidatePath("/admin/pages");
  revalidatePath(`/admin/pages/${id}`);
  incrementSavePipelineMetric(metrics, "revalidationRuns", 2);
  finishSavePipelineMetrics(metrics, { mode: "publishContent" });
}

export async function scheduleCmsPage(id: string, scheduledAtIso: string) {
  await requireAdmin();
  const scheduledAt = new Date(scheduledAtIso);
  if (Number.isNaN(scheduledAt.getTime())) throw new Error("Invalid date");
  await cmsRepository.updatePage(id, { status: "SCHEDULED", scheduledAt });
  revalidatePath(`/admin/pages/${id}`);
  revalidatePath("/admin/pages");
}

export async function unpublishCmsPage(id: string) {
  await requireAdmin();
  const page = await cmsRepository.getPageById(id);
  await cmsRepository.updatePage(id, { status: "DRAFT" });
  if (page) {
    await searchIndexer.remove("CMS_PAGE", id);
    await syncCmsPageCache({ ...page, status: "DRAFT" });
    revalidateCmsPage(page.slug);
    revalidateCmsPagePublicPaths(page.slug);
    await seoTriggerService.handle({
      type: "content.unpublished",
      entityType: "CMS_PAGE",
      entityId: id,
      path: (await cmsPagePaths(page.slug))[0] ?? `/pages/${page.slug}`,
    });
  }
  revalidatePath("/admin/pages");
}

export async function duplicateCmsPage(id: string) {
  await requireAdmin();
  const source = await cmsRepository.getPageById(id);
  if (!source) throw new Error("Page not found");
  const page = await cmsRepository.createPage({
    slug: `${source.slug}-copy-${Date.now()}`,
    status: "DRAFT",
    blocks: source.blocks as Prisma.InputJsonValue,
    composition:
      ("composition" in source
        ? (source as CmsPage & { composition?: Prisma.InputJsonValue }).composition
        : undefined) ?? {},
  });
  await cmsRepository.saveRevision(
    page.id,
    (source.blocks as PageBlocks) ?? [],
    compositionService.load({
      composition: "composition" in source ? (source as CmsPage & { composition?: unknown }).composition : undefined,
      blocks: (source.blocks as PageBlocks) ?? [],
    }),
    undefined,
    "Duplicated",
  );
  revalidatePath("/admin/pages");
  redirect(`/admin/pages/${page.id}`);
}

export async function deleteCmsPage(id: string) {
  await requireAdmin();
  const page = await cmsRepository.getPageById(id);
  if (page) await searchIndexer.remove("CMS_PAGE", id);
  await cmsRepository.deletePage(id);
  if (page) {
    await seoTriggerService.handle({
      type: "content.deleted",
      entityType: "CMS_PAGE",
      entityId: id,
      path: (await cmsPagePaths(page.slug))[0] ?? `/pages/${page.slug}`,
    });
  }
  revalidatePath("/admin/pages");
  redirect("/admin/pages");
}

export async function restorePageRevision(pageId: string, revisionId: string) {
  await requireAdmin();
  const rev = await prisma.cmsPageRevision.findUnique({ where: { id: revisionId } });
  if (!rev || rev.pageId !== pageId) throw new Error("Revision not found");
  const page = await cmsRepository.updatePage(pageId, {
    blocks: rev.blocks as Prisma.InputJsonValue,
  });
  if (page.status === "PUBLISHED") {
    await syncCmsPageCache(page);
    revalidateCmsPage(page.slug);
    revalidateMarketingHome();
    revalidateCmsPagePublicPaths(page.slug);
  }
  revalidatePath(`/admin/pages/${pageId}`);
}

async function upsertPostCore(formData: FormData, clientNavigation: boolean): Promise<string | void> {
  await requireAdmin();
  const id = formData.get("id") as string | null;
  const metrics = startSavePipelineMetrics({
    entityType: "POST",
    operation: formData.get("status") === "PUBLISHED" ? "publish" : "save",
    entityId: id,
  });
  const blocksRaw = formData.get("blocks") as string | null;
  const blocksParsed = blocksRaw ? JSON.parse(blocksRaw) : [];
  const compositionRaw = formData.get("composition") as string | null;
  let parsedComposition: unknown = {};
  if (compositionRaw) {
    try {
      parsedComposition = JSON.parse(compositionRaw);
    } catch {
      parsedComposition = {};
    }
  }
  const { builderService } = await import("@/features/builder/builder.service");
  const validatedPrimaryBlocks = builderService.validateBlocks(blocksParsed);
  const composition = compositionService.validate(
    compositionService.load({
      composition: parsedComposition,
      blocks: validatedPrimaryBlocks,
    }),
  );
  const persistedComposition = compositionService.save(composition);
  const blocks = persistedComposition.blocks as PageBlocks;
  const scheduledAt = parseScheduledAt(formData.get("scheduledAt"));
  const enabledLocales = await localeService.listEnabled();

  const featuredImageSettingsRaw = formData.get("featuredImageSettings") as string | null;
  let featuredImageSettings: Prisma.InputJsonValue = {};
  if (featuredImageSettingsRaw) {
    try {
      featuredImageSettings = parsePostFeaturedImageSettings(
        JSON.parse(featuredImageSettingsRaw),
      ) as Prisma.InputJsonValue;
    } catch {
      featuredImageSettings = {};
    }
  }

  const parsed = postSchema.parse({
    slug: String(formData.get("slug") ?? ""),
    authorId: formData.get("authorId") || null,
    featuredImageId: formData.get("featuredImageId") || null,
    featuredImageSettings: parsePostFeaturedImageSettings(featuredImageSettings),
    status: (formData.get("status") as string | null) ?? "DRAFT",
  });

  await assertUniquePostSlug(parsed.slug, id ?? undefined);

  const categoryIds = JSON.parse((formData.get("categoryIds") as string) || "[]") as string[];
  const tagIds = JSON.parse((formData.get("tagIds") as string) || "[]") as string[];
  const relatedPostIds = JSON.parse((formData.get("relatedPostIds") as string) || "[]") as string[];

  const status = parseStatus(parsed.status);

  const shared = {
    slug: parsed.slug,
    status,
    blocks: persistedComposition.blocks as Prisma.InputJsonValue,
    composition: persistedComposition.composition as Prisma.InputJsonValue,
    scheduledAt,
    relatedPostIds: relatedPostIds as Prisma.InputJsonValue,
    featuredImageSettings,
    publishedAt: status === "PUBLISHED" ? new Date() : status === "DRAFT" ? null : undefined,
  };

  let post;
  let previousBlocks: PageBlocks | undefined;
  let existingPost: { slug: string; status: ContentStatus } | null = null;
  let shouldSyncTranslations = true;
  let shouldRunSearch = true;
  let shouldRevalidate = true;
  let shouldRunSeo = true;
  let appliedPaths: string[] = [];
  if (id) {
    const existing = await prisma.post.findUnique({
      where: { id },
      select: {
        blocks: true,
        composition: true,
        slug: true,
        status: true,
        authorId: true,
        featuredImageId: true,
        featuredImageSettings: true,
        scheduledAt: true,
        relatedPostIds: true,
        categories: { select: { categoryId: true } },
        tags: { select: { tagId: true } },
      },
    });
    existingPost = existing ? { slug: existing.slug, status: existing.status } : null;
    previousBlocks = (existing?.blocks as PageBlocks) ?? undefined;
    if (existing && isPostPatchShadowModeEnabled()) {
      const baseline = {
        slug: existing.slug,
        status: existing.status,
        authorId: existing.authorId,
        featuredImageId: existing.featuredImageId,
        featuredImageSettings: existing.featuredImageSettings,
        scheduledAt: existing.scheduledAt?.toISOString() ?? "",
        categoryIds: existing.categories.map((c) => c.categoryId),
        tagIds: existing.tags.map((t) => t.tagId),
        relatedPostIds: Array.isArray(existing.relatedPostIds)
          ? (existing.relatedPostIds as string[])
          : [],
        blocks: existing.blocks,
        composition: existing.composition,
      };
      const current = {
        slug: parsed.slug,
        status,
        authorId: parsed.authorId ?? null,
        featuredImageId: parsed.featuredImageId ?? null,
        featuredImageSettings,
        scheduledAt: scheduledAt?.toISOString() ?? "",
        categoryIds,
        tagIds,
        relatedPostIds,
        blocks,
        composition: persistedComposition.composition,
      };
      const changes = computePatch(
        baseline as Record<string, unknown>,
        current as Record<string, unknown>,
      ) as Record<string, unknown>;
      const execution = executePatch({
        entityType: "POST",
        operation: status === "PUBLISHED" ? "publish" : "save",
        baselineState: baseline,
        patchInput: changes,
      });
      const shadowExecution = executePatch({
        entityType: "POST",
        operation: status === "PUBLISHED" ? "publish" : "save",
        baselineState: baseline,
        patchInput: computePatch(
          baseline as Record<string, unknown>,
          execution.finalState as Record<string, unknown>,
        ) as Record<string, unknown>,
      });
      compareExecutionPlans(execution, shadowExecution);
      shouldSyncTranslations = hasExecutionEffect(execution, "sync_translations");
      shouldRunSearch = hasAsyncTask(execution, "search_index");
      shouldRevalidate = hasExecutionEffect(execution, "revalidate_paths");
      shouldRunSeo = hasAsyncTask(execution, "seo_submission");
      appliedPaths = [...execution.changeSet.paths];
    }
    post = await prisma.post.update({
      where: { id },
      data: {
        ...shared,
        featuredImage: parsed.featuredImageId
          ? { connect: { id: parsed.featuredImageId } }
          : { disconnect: true },
        author: parsed.authorId ? { connect: { id: parsed.authorId } } : { disconnect: true },
        categories: {
          deleteMany: {},
          create: categoryIds.map((categoryId) => ({ categoryId })),
        },
        tags: {
          deleteMany: {},
          create: tagIds.map((tagId) => ({ tagId })),
        },
      },
    });
    incrementSavePipelineMetric(metrics, "dbWrites");
  } else {
    post = await prisma.post.create({
      data: {
        ...shared,
        featuredImage: parsed.featuredImageId ? { connect: { id: parsed.featuredImageId } } : undefined,
        author: parsed.authorId ? { connect: { id: parsed.authorId } } : undefined,
        categories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
      },
    });
    incrementSavePipelineMetric(metrics, "dbWrites");
  }

  if (parsed.featuredImageId) {
    const { mediaRepository } = await import("@/repositories/media.repository");
    await mediaRepository.trackUsage(parsed.featuredImageId, "POST", post.id, "featuredImage");
  }

  if (!id || shouldSyncTranslations) {
    await syncEntityTranslationsFromForm(formData, "Post", post.id, enabledLocales, [
      "title",
      "excerpt",
      "featuredImageAlt",
      "featuredImageCaption",
    ]);
    incrementSavePipelineMetric(metrics, "translationSyncRuns");
    await syncEntitySlugsFromForm(formData, "Post", post.id, post.slug, enabledLocales);
    incrementSavePipelineMetric(metrics, "translationSyncRuns");
  }
  if (!id || appliedPaths.some((p) => p === "blocks" || p.startsWith("blocks.") || p === "composition" || p.startsWith("composition.")) || formData.has("blockTranslations")) {
    await translationService.syncBlockTranslations(
      "Post",
      post.id,
      blocks,
      enabledLocales,
      formData.get("blockTranslations") as string | null,
      previousBlocks
    );
    incrementSavePipelineMetric(metrics, "translationSyncRuns");
  }

  if (post.status === "PUBLISHED") {
    if (!id || shouldRunSearch || status === "PUBLISHED") {
      if (isAsyncSearchIndexingEnabled()) {
        await enqueueSearchIndexJob("POST", post.id);
      } else {
        await searchIndexer.indexPost({
          id: post.id,
          slug: post.slug,
          status: post.status,
        });
        incrementSavePipelineMetric(metrics, "searchRuns");
      }
    }
    if (!id || shouldRevalidate || status === "PUBLISHED") {
      revalidatePost(post.slug);
      incrementSavePipelineMetric(metrics, "revalidationRuns");
    }
    if (!id || shouldRunSeo || status === "PUBLISHED") {
      incrementSavePipelineMetric(metrics, "seoRuns");
    if (existingPost?.slug && existingPost.slug !== post.slug) {
      await seoTriggerService.handle({
        type: "content.slugChanged",
        entityType: "POST",
        entityId: post.id,
        oldPath: (await postPaths(existingPost.slug))[0] ?? `/blog/${existingPost.slug}`,
        newPath: (await postPaths(post.slug))[0] ?? `/blog/${post.slug}`,
      });
    } else {
      await seoTriggerService.handle({
        type: existingPost?.status === "PUBLISHED" ? "content.sitemapChanged" : "content.published",
        entityType: "POST",
        entityId: post.id,
        path: (await postPaths(post.slug))[0] ?? `/blog/${post.slug}`,
      });
    }
    }
  }

  revalidatePath("/admin/posts");
  incrementSavePipelineMetric(metrics, "revalidationRuns");

  const editorTab = (formData.get("editorTab") as string | null)?.trim() || "general";
  const selectedBlockId = (formData.get("selectedBlockId") as string | null)?.trim() || null;
  const editorInspector = (formData.get("editorInspector") as string | null)?.trim() || null;
  const editorRegion = (formData.get("editorRegion") as string | null)?.trim() || null;
  const redirectTo = buildPostEditorRedirectPath(
    post.id,
    editorTab,
    selectedBlockId,
    editorInspector,
    editorRegion,
  );

  finishSavePipelineMetrics(metrics, { redirectTo, mode: "legacy-shadow", appliedPaths });

  if (clientNavigation) {
    return redirectTo;
  }

  redirect(redirectTo);
}

/** Form action — redirects server-side after save. */
export async function upsertPost(formData: FormData): Promise<void> {
  await upsertPostCore(formData, false);
}

/** Editor client submit — returns redirect URL for client-side navigation. */
export async function savePostFromEditor(formData: FormData): Promise<UpsertPostResult> {
  try {
    const redirectTo = await upsertPostCore(formData, true);
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

export async function publishPost(id: string) {
  await requireAdmin();
  const metrics = startSavePipelineMetrics({ entityType: "POST", operation: "publish", entityId: id });
  const post = await cmsRepository.updatePost(id, {
    status: "PUBLISHED",
    publishedAt: new Date(),
    scheduledAt: null,
  });
  incrementSavePipelineMetric(metrics, "dbWrites");
  if (isAsyncSearchIndexingEnabled()) {
    await enqueueSearchIndexJob("POST", post.id);
  } else {
    await searchIndexer.indexPost({
      id: post.id,
      slug: post.slug,
      status: post.status,
    });
    incrementSavePipelineMetric(metrics, "searchRuns");
  }
  revalidatePost(post.slug);
  incrementSavePipelineMetric(metrics, "revalidationRuns");
  await seoTriggerService.handle({
    type: "content.published",
    entityType: "POST",
    entityId: post.id,
    path: (await postPaths(post.slug))[0] ?? `/blog/${post.slug}`,
  });
  try {
    await runSeoOnPostPublish(post.id);
  } catch {
    // SEO platform pipeline is best-effort on publish
  }
  incrementSavePipelineMetric(metrics, "seoRuns");
  revalidatePath("/admin/posts");
  revalidatePath(`/admin/posts/${id}`);
  incrementSavePipelineMetric(metrics, "revalidationRuns", 2);
  finishSavePipelineMetrics(metrics, { mode: "publishContent" });
}

export async function schedulePost(id: string, scheduledAtIso: string) {
  await requireAdmin();
  const scheduledAt = new Date(scheduledAtIso);
  if (Number.isNaN(scheduledAt.getTime())) throw new Error("Invalid date");
  await cmsRepository.updatePost(id, { status: "SCHEDULED", scheduledAt });
  revalidatePath(`/admin/posts/${id}`);
  revalidatePath("/admin/posts");
}

export async function unpublishPost(id: string) {
  await requireAdmin();
  const post = await cmsRepository.getPostById(id);
  await cmsRepository.updatePost(id, { status: "DRAFT" });
  if (post) {
    await searchIndexer.remove("POST", id);
    revalidatePost(post.slug);
    await seoTriggerService.handle({
      type: "content.unpublished",
      entityType: "POST",
      entityId: id,
      path: (await postPaths(post.slug))[0] ?? `/blog/${post.slug}`,
    });
  }
  revalidatePath("/admin/posts");
}

export async function duplicatePost(id: string) {
  await requireAdmin();
  const source = await cmsRepository.getPostById(id);
  if (!source) throw new Error("Post not found");
  const post = await cmsRepository.createPost({
    slug: `${source.slug}-copy-${Date.now()}`,
    status: "DRAFT",
    blocks: source.blocks as Prisma.InputJsonValue,
    composition:
      ("composition" in source
        ? (source as { composition?: Prisma.InputJsonValue }).composition
        : undefined) ?? ({} as Prisma.InputJsonValue),
    relatedPostIds: source.relatedPostIds as Prisma.InputJsonValue,
    featuredImageSettings: source.featuredImageSettings as Prisma.InputJsonValue,
    featuredImage: source.featuredImageId ? { connect: { id: source.featuredImageId } } : undefined,
    author: source.authorId ? { connect: { id: source.authorId } } : undefined,
    categories: {
      create: source.categories.map((c) => ({ categoryId: c.categoryId })),
    },
    tags: {
      create: source.tags.map((t) => ({ tagId: t.tagId })),
    },
  });
  revalidatePath("/admin/posts");
  redirect(`/admin/posts/${post.id}`);
}

export async function deletePost(id: string) {
  await requireAdmin();
  const post = await cmsRepository.getPostById(id);
  if (post) await searchIndexer.remove("POST", id);
  await cmsRepository.deletePost(id);
  if (post) {
    await seoTriggerService.handle({
      type: "content.deleted",
      entityType: "POST",
      entityId: id,
      path: (await postPaths(post.slug))[0] ?? `/blog/${post.slug}`,
    });
  }
  revalidatePath("/admin/posts");
  redirect("/admin/posts");
}

export async function upsertPostCategory(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string | null;
  const parsed = postCategorySchema.parse({
    slug: formData.get("slug"),

    sortOrder: Number(formData.get("sortOrder") ?? 0),
  });
  if (id) await prisma.postCategory.update({ where: { id }, data: parsed });
  else await prisma.postCategory.create({ data: parsed });
  revalidatePath("/admin/posts/categories");
}

export async function deletePostCategory(id: string) {
  await requireAdmin();
  await cmsRepository.deleteCategory(id);
  revalidatePath("/admin/posts/categories");
}

export async function upsertPostTag(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string | null;
  const parsed = postTagSchema.parse({
    slug: formData.get("slug"),

  });
  if (id) await prisma.postTag.update({ where: { id }, data: parsed });
  else await prisma.postTag.create({ data: parsed });
  revalidatePath("/admin/posts/tags");
}

export async function deletePostTag(id: string) {
  await requireAdmin();
  await cmsRepository.deleteTag(id);
  revalidatePath("/admin/posts/tags");
}

export async function upsertPostAuthor(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string | null;
  const parsed = postAuthorSchema.parse({
    name: formData.get("name"),

    avatarUrl: (formData.get("avatarUrl") as string) || null,
  });
  if (id) await cmsRepository.updateAuthor(id, parsed);
  else await cmsRepository.createAuthor(parsed);
  revalidatePath("/admin/posts/authors");
}

export async function deletePostAuthor(id: string) {
  await requireAdmin();
  await cmsRepository.deleteAuthor(id);
  revalidatePath("/admin/posts/authors");
}

export async function runScheduledPublishCheck() {
  await requireAdmin();
  return processDueScheduled();
}
