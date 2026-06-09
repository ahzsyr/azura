"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/features/auth/guards";
import { cmsRepository } from "@/repositories/cms.repository";
import { cmsPageSchema, postSchema, postCategorySchema, postTagSchema, postAuthorSchema } from "@/schemas/cms";
import { searchIndexer } from "@/features/search/search-indexer.service";
import { revalidateCmsPage, revalidatePost, revalidateMarketingHome } from "@/services/cache";
import { revalidateCmsPagePublicPaths } from "@/features/cms/revalidate-wired-marketing";
import { parseScheduledAt } from "./scheduling-utils";
import { processDueScheduled } from "./scheduling";
import { syncCmsPageCache } from "./page-cache-sync";
import { parseCmsPageFormData } from "./page-form-validation";
import type { PageBlocks } from "@/types/builder";
import type { ContentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { localeService } from "@/features/i18n/locale.service";
import { syncEntityTranslationsFromForm, extractLegacyColumns } from "@/features/translation/form-sync";
import { applyLegacyWritePolicy } from "@/features/translation/legacy-adapter";
import { applyBilingualLegacyFallbacks } from "@/features/translation/bilingual-form-fallback";
import { translationService } from "@/features/translation/translation.service";

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

export async function upsertCmsPage(formData: FormData) {
  const session = await requireAdmin();
  const id = formData.get("id") as string | null;
  const blocksRaw = formData.get("blocks") as string | null;
  const blocksParsed = blocksRaw ? JSON.parse(blocksRaw) : [];
  const { builderService } = await import("@/features/builder/builder.service");
  const blocks = builderService.validateBlocks(blocksParsed);
  const scheduledAt = parseScheduledAt(formData.get("scheduledAt"));

  const enabledLocales = await localeService.listEnabled();
  const titleLegacy = extractLegacyColumns(formData, enabledLocales, "title");
  const excerptLegacy = extractLegacyColumns(formData, enabledLocales, "excerpt");

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

  await assertUniquePageSlug(parsed.slug, id ?? undefined);

  const status = parseStatus(parsed.status);
  const data: Prisma.CmsPageUpdateInput = applyLegacyWritePolicy({
    slug: parsed.slug,
    titleEn: titleLegacy.titleEn ?? parsed.titleEn,
    titleAr: titleLegacy.titleAr ?? parsed.titleAr,
    excerptEn: excerptLegacy.excerptEn ?? parsed.excerptEn,
    excerptAr: excerptLegacy.excerptAr ?? parsed.excerptAr,
    templateKey: parsed.templateKey,
    status,
    blocks: blocks as Prisma.InputJsonValue,
    visualSettings,
    scheduledAt,
    publishedAt:
      status === "PUBLISHED" ? new Date() : status === "DRAFT" ? null : undefined,
  }) as Prisma.CmsPageUpdateInput;

  let page;
  let previousBlocks: PageBlocks | undefined;
  if (id) {
    const existing = await cmsRepository.getPageById(id);
    previousBlocks = (existing?.blocks as PageBlocks) ?? undefined;
    page = await cmsRepository.updatePage(id, data);
    await cmsRepository.saveRevision(
      id,
      blocks,
      session.user.id,
      (formData.get("revisionMessage") as string) || "Saved"
    );
  } else {
    page = await cmsRepository.createPage(data as Prisma.CmsPageCreateInput);
    await cmsRepository.saveRevision(page.id, blocks, session.user.id, "Initial");
  }

  if (page.status === "PUBLISHED") {
    await searchIndexer.indexCmsPage(page);
    await syncCmsPageCache(page);
    revalidateCmsPage(page.slug);
    revalidateMarketingHome();
    revalidateCmsPagePublicPaths(page.slug);
  } else {
    await syncCmsPageCache(page);
  }

  await syncEntityTranslationsFromForm(formData, "CmsPage", page.id, enabledLocales, [
    "title",
    "excerpt",
  ]);
  await translationService.syncBlockTranslations(
    "CmsPage",
    page.id,
    blocks,
    enabledLocales,
    formData.get("blockTranslations") as string | null,
    previousBlocks
  );

  await trackPageBlocksMedia(blocks, page.id);
  revalidatePath("/admin/pages");

  const editorTab = (formData.get("editorTab") as string | null)?.trim() || "general";
  const selectedBlockId = (formData.get("selectedBlockId") as string | null)?.trim();
  const editorInspector = (formData.get("editorInspector") as string | null)?.trim();
  const qs = new URLSearchParams({ tab: editorTab });
  if (selectedBlockId) qs.set("block", selectedBlockId);
  if (editorInspector) qs.set("inspector", editorInspector);
  redirect(`/admin/pages/${page.id}?${qs.toString()}`);
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
  const page = await cmsRepository.updatePage(id, {
    status: "PUBLISHED",
    publishedAt: new Date(),
    scheduledAt: null,
  });
  await searchIndexer.indexCmsPage(page);
  await syncCmsPageCache(page);
  revalidateCmsPage(page.slug);
  revalidateMarketingHome();
  revalidateCmsPagePublicPaths(page.slug);
  revalidatePath("/admin/pages");
  revalidatePath(`/admin/pages/${id}`);
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
  }
  revalidatePath("/admin/pages");
}

export async function duplicateCmsPage(id: string) {
  await requireAdmin();
  const source = await cmsRepository.getPageById(id);
  if (!source) throw new Error("Page not found");
  const page = await cmsRepository.createPage({
    slug: `${source.slug}-copy-${Date.now()}`,
    titleEn: `${source.titleEn} (Copy)`,
    titleAr: `${source.titleAr} (نسخة)`,
    excerptEn: source.excerptEn,
    excerptAr: source.excerptAr,
    templateKey: source.templateKey,
    status: "DRAFT",
    blocks: source.blocks as Prisma.InputJsonValue,
  });
  await cmsRepository.saveRevision(page.id, (source.blocks as PageBlocks) ?? [], undefined, "Duplicated");
  revalidatePath("/admin/pages");
  redirect(`/admin/pages/${page.id}`);
}

export async function deleteCmsPage(id: string) {
  await requireAdmin();
  const page = await cmsRepository.getPageById(id);
  if (page) await searchIndexer.remove("CMS_PAGE", id);
  await cmsRepository.deletePage(id);
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

export async function upsertPost(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string | null;
  const blocksRaw = formData.get("blocks") as string | null;
  const blocksParsed = blocksRaw ? JSON.parse(blocksRaw) : [];
  const { builderService } = await import("@/features/builder/builder.service");
  const blocks = builderService.validateBlocks(blocksParsed);
  const scheduledAt = parseScheduledAt(formData.get("scheduledAt"));
  const enabledLocales = await localeService.listEnabled();
  const titleLegacy = extractLegacyColumns(formData, enabledLocales, "title");
  const excerptLegacy = extractLegacyColumns(formData, enabledLocales, "excerpt");
  const contentLegacy = extractLegacyColumns(formData, enabledLocales, "content");

  const parsed = postSchema.parse(
    applyBilingualLegacyFallbacks(
      {
        slug: String(formData.get("slug") ?? ""),
        titleEn: String(titleLegacy.titleEn ?? formData.get("titleEn") ?? ""),
        titleAr: String(titleLegacy.titleAr ?? formData.get("titleAr") ?? ""),
        excerptEn: String(excerptLegacy.excerptEn ?? formData.get("excerptEn") ?? ""),
        excerptAr: String(excerptLegacy.excerptAr ?? formData.get("excerptAr") ?? ""),
        contentEn: String(contentLegacy.contentEn ?? formData.get("contentEn") ?? ""),
        contentAr: String(contentLegacy.contentAr ?? formData.get("contentAr") ?? ""),
        authorId: formData.get("authorId") || null,
        featuredImageId: formData.get("featuredImageId") || null,
        status: (formData.get("status") as string | null) ?? "DRAFT",
      },
      enabledLocales
    )
  );

  await assertUniquePostSlug(parsed.slug, id ?? undefined);

  const categoryIds = JSON.parse((formData.get("categoryIds") as string) || "[]") as string[];
  const tagIds = JSON.parse((formData.get("tagIds") as string) || "[]") as string[];
  const relatedPostIds = JSON.parse((formData.get("relatedPostIds") as string) || "[]") as string[];

  const status = parseStatus(parsed.status);

  const shared = {
    slug: parsed.slug,
    titleEn: parsed.titleEn,
    titleAr: parsed.titleAr,
    excerptEn: parsed.excerptEn,
    excerptAr: parsed.excerptAr,
    contentEn: parsed.contentEn,
    contentAr: parsed.contentAr,
    status,
    blocks: blocks as Prisma.InputJsonValue,
    scheduledAt,
    relatedPostIds: relatedPostIds as Prisma.InputJsonValue,
    publishedAt: status === "PUBLISHED" ? new Date() : status === "DRAFT" ? null : undefined,
  };

  let post;
  let previousBlocks: PageBlocks | undefined;
  if (id) {
    const existing = await prisma.post.findUnique({
      where: { id },
      select: { blocks: true },
    });
    previousBlocks = (existing?.blocks as PageBlocks) ?? undefined;
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
  }

  if (parsed.featuredImageId) {
    const { mediaRepository } = await import("@/repositories/media.repository");
    await mediaRepository.trackUsage(parsed.featuredImageId, "POST", post.id, "featuredImage");
  }

  await syncEntityTranslationsFromForm(formData, "Post", post.id, enabledLocales, [
    "title",
    "excerpt",
    "content",
  ]);
  await translationService.syncBlockTranslations(
    "Post",
    post.id,
    blocks,
    enabledLocales,
    formData.get("blockTranslations") as string | null,
    previousBlocks
  );

  if (post.status === "PUBLISHED") {
    await searchIndexer.indexPost(post);
    revalidatePost(post.slug);
  }

  revalidatePath("/admin/posts");
  redirect(`/admin/posts/${post.id}`);
}

export async function publishPost(id: string) {
  await requireAdmin();
  const post = await cmsRepository.updatePost(id, {
    status: "PUBLISHED",
    publishedAt: new Date(),
    scheduledAt: null,
  });
  await searchIndexer.indexPost(post);
  revalidatePost(post.slug);
  revalidatePath("/admin/posts");
  revalidatePath(`/admin/posts/${id}`);
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
  }
  revalidatePath("/admin/posts");
}

export async function duplicatePost(id: string) {
  await requireAdmin();
  const source = await cmsRepository.getPostById(id);
  if (!source) throw new Error("Post not found");
  const post = await cmsRepository.createPost({
    slug: `${source.slug}-copy-${Date.now()}`,
    titleEn: `${source.titleEn} (Copy)`,
    titleAr: `${source.titleAr} (نسخة)`,
    excerptEn: source.excerptEn,
    excerptAr: source.excerptAr,
    contentEn: source.contentEn,
    contentAr: source.contentAr,
    status: "DRAFT",
    blocks: source.blocks as Prisma.InputJsonValue,
    relatedPostIds: source.relatedPostIds as Prisma.InputJsonValue,
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
  revalidatePath("/admin/posts");
  redirect("/admin/posts");
}

export async function upsertPostCategory(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string | null;
  const parsed = postCategorySchema.parse({
    slug: formData.get("slug"),
    nameEn: formData.get("nameEn"),
    nameAr: formData.get("nameAr"),
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
    nameEn: formData.get("nameEn"),
    nameAr: formData.get("nameAr"),
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
    bioEn: formData.get("bioEn") || undefined,
    bioAr: formData.get("bioAr") || undefined,
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
