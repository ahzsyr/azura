import { getPublicBrandName } from "@/config/site";
import { prisma } from "@/lib/prisma";
import { seoRepository } from "@/repositories/seo.repository";
import { STATIC_SEO_PAGES } from "@/features/seo/constants";
import type { SeoMetaWriteData } from "@/repositories/seo.repository";
import { translationService } from "@/features/translation/translation.service";
import type { EntityTranslationInput } from "@/features/translation/types";
import { createExecutionContext } from "@/features/seo/platform/execution-context";
import { seoPlatform } from "@/features/seo/platform/seo-platform.impl";

export type BulkFillScope = "all" | "static" | "cms" | "posts";
export type BulkFillMode = "empty-only" | "always";

function isEmpty(value: string | null | undefined): boolean {
  return !value?.trim();
}

function mergeMeta(
  existing: Partial<SeoMetaWriteData> | null | Record<string, unknown>,
  incoming: SeoMetaWriteData,
  mode: BulkFillMode
): SeoMetaWriteData {
  const base = existing as Partial<SeoMetaWriteData> | null;
  const pick = (key: keyof SeoMetaWriteData): string | null | undefined => {
    const next = incoming[key];
    const cur = base?.[key];
    if (mode === "always") return typeof next === "string" ? next : null;
    if (typeof next === "string" && isEmpty(cur as string)) return next;
    return typeof cur === "string" ? cur : typeof next === "string" ? next : null;
  };

  return {
    canonicalUrl: pick("canonicalUrl") ?? null,
    robots: pick("robots") ?? "index, follow",
    focusKeywords: pick("focusKeywords") ?? null,
    ogImageUrl: pick("ogImageUrl") ?? null,
    twitterCard: pick("twitterCard") ?? "summary_large_image",
  };
}

function buildTranslationInputs(
  seoMetaId: string,
  titleEn: string,
  titleAr: string,
  excerptEn?: string | null,
  excerptAr?: string | null,
  mode: BulkFillMode = "empty-only",
  existing: EntityTranslationInput[] = []
): EntityTranslationInput[] {
  const brand = getPublicBrandName();
  const existingByKey = new Map(
    existing.map((row) => [`${row.field}:${row.localeCode}`, row.value])
  );
  const pick = (field: string, localeCode: string, next: string): string | null => {
    const key = `${field}:${localeCode}`;
    const cur = existingByKey.get(key);
    if (mode === "always") return next.trim() || null;
    if (isEmpty(cur) && next.trim()) return next.trim();
    return cur?.trim() ? cur : next.trim() || null;
  };

  const metaTitleEn = pick("metaTitle", "en", titleEn) ?? "";
  const metaTitleAr = pick("metaTitle", "ar", titleAr) ?? "";
  const metaDescEn =
    pick("metaDescription", "en", excerptEn?.trim() || `${titleEn} — ${brand} premium Umrah and Islamic travel.`) ??
    "";
  const metaDescAr =
    pick(
      "metaDescription",
      "ar",
      excerptAr?.trim() || `${titleAr} — ${brand} للعمرة والسفر الإسلامي الفاخر.`
    ) ?? "";

  const inputs: EntityTranslationInput[] = [];
  for (const [field, localeCode, value] of [
    ["metaTitle", "en", metaTitleEn],
    ["metaTitle", "ar", metaTitleAr],
    ["metaDescription", "en", metaDescEn],
    ["metaDescription", "ar", metaDescAr],
    ["ogTitle", "en", metaTitleEn.slice(0, 70)],
    ["ogTitle", "ar", metaTitleAr.slice(0, 70)],
    ["ogDescription", "en", metaDescEn.slice(0, 200)],
    ["ogDescription", "ar", metaDescAr.slice(0, 200)],
  ] as const) {
    if (!value.trim()) continue;
    inputs.push({
      entityType: "SeoMeta",
      entityId: seoMetaId,
      field,
      localeCode,
      value,
      status: "PUBLISHED",
    });
  }
  return inputs;
}

async function resolveSeoMetaId(
  entityType: string,
  entityId: string
): Promise<string | undefined> {
  if (entityType === "CmsPage") {
    return (await seoRepository.getByCmsPageId(entityId))?.id;
  }
  if (entityType === "Post") {
    return (await seoRepository.getByPostId(entityId))?.id;
  }
  return (await seoRepository.getByEntity(entityType, entityId))?.id;
}

async function runPlatformBulkForEntity(
  entityType: string,
  entityId: string,
  mode: BulkFillMode
): Promise<void> {
  const seoMetaId = await resolveSeoMetaId(entityType, entityId);
  const existingTranslations = seoMetaId
    ? await translationService.getForEntity("SeoMeta", seoMetaId)
    : [];

  for (const locale of ["en", "ar"] as const) {
    if (mode === "empty-only" && seoMetaId) {
      const title = existingTranslations.find(
        (t) => t.field === "metaTitle" && t.localeCode === locale
      )?.value;
      const desc = existingTranslations.find(
        (t) => t.field === "metaDescription" && t.localeCode === locale
      )?.value;
      if (title?.trim() && desc?.trim()) continue;
    }

    const ctx = createExecutionContext({
      entityType,
      entityId,
      locale,
      source: "bulk",
      trigger: "bulk_fill",
      mode: "commit",
    });
    await seoPlatform.automation.run(ctx, "standard-bulk");
  }
}

async function platformBulkFillCms(mode: BulkFillMode): Promise<number> {
  const pages = await prisma.cmsPage.findMany({ select: { id: true } });
  let updated = 0;
  for (const page of pages) {
    await runPlatformBulkForEntity("CmsPage", page.id, mode);
    updated++;
  }
  return updated;
}

async function platformBulkFillPosts(mode: BulkFillMode): Promise<number> {
  const posts = await prisma.post.findMany({ select: { id: true } });
  let updated = 0;
  for (const post of posts) {
    await runPlatformBulkForEntity("Post", post.id, mode);
    updated++;
  }
  return updated;
}

export const seoBulkService = {
  async bulkFillMetadata(scope: BulkFillScope, mode: BulkFillMode) {
    let updated = 0;

    if (scope === "all" || scope === "static") {
      for (const page of STATIC_SEO_PAGES) {
        const existing = await seoRepository.getByPageKey(page.pageKey);
        const incoming = mergeMeta(
          existing,
          {
            canonicalUrl: null,
            robots: "index, follow",
            focusKeywords: null,
            ogImageUrl: null,
            twitterCard: "summary_large_image",
          },
          mode
        );
        const meta = await seoRepository.upsertMetaByPageKey(page.pageKey, incoming);
        const existingTranslations = await translationService.getForEntity("SeoMeta", meta.id);
        const inputs = buildTranslationInputs(
          meta.id,
          page.label,
          page.label,
          undefined,
          undefined,
          mode,
          existingTranslations
        );
        if (inputs.length) await translationService.upsertMany(inputs);
        updated++;
      }
    }

    if (scope === "all" || scope === "cms") {
      updated += await platformBulkFillCms(mode);
    }

    if (scope === "all" || scope === "posts") {
      updated += await platformBulkFillPosts(mode);
    }

    return { updated };
  },
};
