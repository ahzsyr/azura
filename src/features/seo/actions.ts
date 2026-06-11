"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/features/auth/guards";
import { prisma } from "@/lib/prisma";
import { seoRepository } from "@/repositories/seo.repository";
import { redirectSchema, seoMetaSchema } from "@/schemas/seo";
import { CACHE_TAGS } from "@/services/cache";
import { seoBulkService } from "./seo-bulk.service";
import type { BulkFillMode, BulkFillScope } from "./seo-bulk.service";
import type { Prisma } from "@prisma/client";

function parseSeoForm(formData: FormData) {
  const jsonLdRaw = formData.get("jsonLd") as string;
  let jsonLd: Prisma.InputJsonValue | undefined;
  if (jsonLdRaw?.trim()) {
    jsonLd = JSON.parse(jsonLdRaw) as Prisma.InputJsonValue;
  }

  return seoMetaSchema.parse({
    pageKey: (formData.get("pageKey") as string) || undefined,
    entityType: (formData.get("entityType") as string) || undefined,
    entityId: (formData.get("entityId") as string) || undefined,
    titleEn: formData.get("titleEn"),
    titleAr: formData.get("titleAr"),
    descriptionEn: formData.get("descriptionEn"),
    descriptionAr: formData.get("descriptionAr"),
    canonicalUrl: (formData.get("canonicalUrl") as string) || null,
    robots: (formData.get("robots") as string) || null,
    focusKeywords: (formData.get("focusKeywords") as string) || null,
    ogTitleEn: (formData.get("ogTitleEn") as string) || null,
    ogTitleAr: (formData.get("ogTitleAr") as string) || null,
    ogImageUrl: (formData.get("ogImageUrl") as string) || null,
    twitterCard: (formData.get("twitterCard") as string) || null,
    jsonLd: jsonLdRaw?.trim() ? jsonLdRaw : null,
  });
}

export async function upsertSeoMetaAction(formData: FormData) {
  await requireAdmin();
  const parsed = parseSeoForm(formData);
  const cmsPageId = formData.get("cmsPageId") as string | null;
  const postId = formData.get("postId") as string | null;
  const packageId = formData.get("packageId") as string | null;

  const data = {
    titleEn: parsed.titleEn,
    titleAr: parsed.titleAr,
    descriptionEn: parsed.descriptionEn,
    descriptionAr: parsed.descriptionAr,
    canonicalUrl: parsed.canonicalUrl || null,
    robots: parsed.robots,
    focusKeywords: parsed.focusKeywords,
    ogTitleEn: parsed.ogTitleEn,
    ogTitleAr: parsed.ogTitleAr,
    ogImageUrl: parsed.ogImageUrl,
    twitterCard: parsed.twitterCard,
    jsonLd: parsed.jsonLd
      ? (JSON.parse(parsed.jsonLd as string) as Prisma.InputJsonValue)
      : undefined,
  };

  if (cmsPageId) {
    await seoRepository.upsertMetaByCmsPage(cmsPageId, data);
    revalidatePath(`/admin/pages/${cmsPageId}`);
  } else if (postId) {
    await seoRepository.upsertMetaByPost(postId, data);
    revalidatePath(`/admin/posts/${postId}`);
  } else if (packageId) {
    await seoRepository.upsertMetaByEntity("PACKAGE", packageId, data);
    revalidatePath("/admin/packages");
  } else if (parsed.pageKey) {
    await seoRepository.upsertMetaByPageKey(parsed.pageKey, data);
    await prisma.seoSettings.upsert({
      where: { pageKey: parsed.pageKey },
      create: {
        pageKey: parsed.pageKey,
        titleEn: data.titleEn,
        titleAr: data.titleAr,
        descriptionEn: data.descriptionEn,
        descriptionAr: data.descriptionAr,
        ogImageUrl: data.ogImageUrl,
      },
      update: {
        titleEn: data.titleEn,
        titleAr: data.titleAr,
        descriptionEn: data.descriptionEn,
        descriptionAr: data.descriptionAr,
        ogImageUrl: data.ogImageUrl,
      },
    });
  } else {
    throw new Error("pageKey, cmsPageId, postId, or packageId required");
  }

  revalidatePath("/admin/seo");
}

export async function upsertRedirectAction(formData: FormData) {
  await requireAdmin();
  const parsed = redirectSchema.parse({
    fromPath: formData.get("fromPath"),
    toPath: formData.get("toPath"),
    type: formData.get("type") ?? "PERMANENT",
    isActive: formData.get("isActive") === "true",
  });
  await seoRepository.upsertRedirect(parsed.fromPath, parsed.toPath, parsed.type);
  revalidateTag(CACHE_TAGS.redirects, "max");
  revalidatePath("/admin/seo/redirects");
}

export async function deleteRedirectAction(id: string) {
  await requireAdmin();
  await seoRepository.deleteRedirect(id);
  revalidateTag(CACHE_TAGS.redirects, "max");
  revalidatePath("/admin/seo/redirects");
}

export async function upsertCustom404Action(formData: FormData) {
  await requireAdmin();
  await seoRepository.upsertCustom404({
    locale: formData.get("locale") as string,
    titleEn: formData.get("titleEn") as string,
    titleAr: formData.get("titleAr") as string,
    bodyEn: formData.get("bodyEn") as string,
    bodyAr: formData.get("bodyAr") as string,
    blocks: formData.get("blocks")
      ? (JSON.parse(formData.get("blocks") as string) as Prisma.InputJsonValue)
      : [],
  });
  revalidatePath("/admin/seo/404");
}

export async function upsertSeoGlobalAction(formData: FormData) {
  await requireAdmin();
  const additionalDisallow = (formData.get("additionalDisallow") as string)
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const additionalAllow = (formData.get("additionalAllow") as string)
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const host = (formData.get("host") as string) || undefined;

  await seoRepository.upsertGlobalConfig({
    additionalDisallow,
    additionalAllow,
    host,
  });
  revalidatePath("/admin/seo/robots");
}

export async function upsertStructuredDataAction(formData: FormData) {
  await requireAdmin();
  const organizationRaw = formData.get("organization") as string;
  const websiteRaw = formData.get("website") as string;

  const config = {
    organization: organizationRaw?.trim()
      ? (JSON.parse(organizationRaw) as Record<string, unknown>)
      : undefined,
    website: websiteRaw?.trim()
      ? (JSON.parse(websiteRaw) as Record<string, unknown>)
      : undefined,
  };

  await seoRepository.upsertStructuredConfig(config);
  revalidatePath("/admin/seo/structured-data");
}

export async function bulkFillSeoMetadataAction(formData: FormData) {
  await requireAdmin();
  const scope = (formData.get("scope") as BulkFillScope) ?? "all";
  const mode = (formData.get("mode") as BulkFillMode) ?? "empty-only";
  await seoBulkService.bulkFillMetadata(scope, mode);
  revalidatePath("/admin/seo");
  revalidatePath("/admin/seo/audit");
}
