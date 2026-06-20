"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/features/auth/guards";
import { prisma } from "@/lib/prisma";
import { seoRepository } from "@/repositories/seo.repository";
import { redirectSchema, seoMetaBaseSchema } from "@/schemas/seo";
import { CACHE_TAGS } from "@/services/cache";
import { localeService } from "@/features/i18n/locale.service";
import { syncEntityTranslationsFromForm } from "@/features/translation/form-sync.server";
import { seoBulkService } from "./seo-bulk.service";
import type { BulkFillMode, BulkFillScope } from "./seo-bulk.service";
import type { Prisma, SeoMeta } from "@prisma/client";
import { STATIC_SEO_PAGES } from "./constants";
import type { SeoIntegrationsConfig } from "./types";
import { mergeSecretFields } from "./integrations/config";
import { seoSubmissionRunner } from "./integrations/submission-runner.service";
import { seoTriggerService } from "./triggers/seo-trigger.service";
import { seoAnalyticsIngestionService } from "./analytics/analytics-ingestion.service";
import { richResultsMonitoringService } from "./quality/rich-results-monitoring.service";
import { refreshMiddlewareManifestBestEffort } from "@/features/setup/refresh-middleware-manifest.server";

const SEO_TRANSLATION_FIELDS = ["metaTitle", "metaDescription", "ogTitle", "ogDescription"] as const;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

function parseSeoForm(formData: FormData) {
  const jsonLdRaw = formData.get("jsonLd") as string;

  return seoMetaBaseSchema.parse({
    pageKey: (formData.get("pageKey") as string) || undefined,
    entityType: (formData.get("entityType") as string) || undefined,
    entityId: (formData.get("entityId") as string) || undefined,
    canonicalUrl: (formData.get("canonicalUrl") as string) || null,
    robots: (formData.get("robots") as string) || null,
    focusKeywords: (formData.get("focusKeywords") as string) || null,
    ogImageUrl: (formData.get("ogImageUrl") as string) || null,
    twitterCard: (formData.get("twitterCard") as string) || null,
    jsonLd: jsonLdRaw?.trim() ? jsonLdRaw : null,
  });
}

async function syncSeoMetaTranslations(formData: FormData, meta: SeoMeta) {
  const enabledLocales = await localeService.listEnabled();
  await syncEntityTranslationsFromForm(
    formData,
    "SeoMeta",
    meta.id,
    enabledLocales,
    [...SEO_TRANSLATION_FIELDS]
  );
}

function absoluteUrl(pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${siteUrl.replace(/\/$/, "")}${path}`;
}

async function localizedStaticUrls(pageKey: string) {
  const page = STATIC_SEO_PAGES.find((entry) => entry.pageKey === pageKey);
  if (!page) return [];
  const locales = await localeService.listEnabled().catch(() => []);
  const prefixes = locales.length ? locales.map((locale) => locale.urlPrefix) : ["en"];
  return prefixes.map((prefix) => absoluteUrl(`/${prefix}${page.path}`));
}

export async function upsertSeoMetaAction(formData: FormData) {
  await requireAdmin();
  const parsed = parseSeoForm(formData);
  const cmsPageId = formData.get("cmsPageId") as string | null;
  const postId = formData.get("postId") as string | null;
  const packageId = formData.get("packageId") as string | null;

  const data = {
    canonicalUrl: parsed.canonicalUrl || null,
    robots: parsed.robots,
    focusKeywords: parsed.focusKeywords,
    ogImageUrl: parsed.ogImageUrl,
    twitterCard: parsed.twitterCard,
    jsonLd: parsed.jsonLd
      ? (JSON.parse(parsed.jsonLd as string) as Prisma.InputJsonValue)
      : undefined,
  };

  let meta: SeoMeta;
  if (cmsPageId) {
    meta = await seoRepository.upsertMetaByCmsPage(cmsPageId, data);
    revalidatePath(`/admin/pages/${cmsPageId}`);
  } else if (postId) {
    meta = await seoRepository.upsertMetaByPost(postId, data);
    revalidatePath(`/admin/posts/${postId}`);
  } else if (packageId) {
    meta = await seoRepository.upsertMetaByEntity("PACKAGE", packageId, data);
    revalidatePath("/admin/packages");
  } else if (parsed.pageKey) {
    meta = await seoRepository.upsertMetaByPageKey(parsed.pageKey, data);
    await prisma.seoSettings.upsert({
      where: { pageKey: parsed.pageKey },
      create: {
        pageKey: parsed.pageKey,
        ogImageUrl: data.ogImageUrl,
      },
      update: {
        ogImageUrl: data.ogImageUrl,
      },
    });
  } else {
    throw new Error("pageKey, cmsPageId, postId, or packageId required");
  }

  await syncSeoMetaTranslations(formData, meta);
  const urls = parsed.pageKey
    ? await localizedStaticUrls(parsed.pageKey)
    : parsed.canonicalUrl
      ? [parsed.canonicalUrl]
      : [];
  await seoTriggerService.handle({
    type: "seo.metadataUpdated",
    entityType: parsed.pageKey ? "SITE" : "CONTENT_ITEM",
    entityId: parsed.entityId,
    paths: urls,
  });
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
  await seoTriggerService.handle({
    type: "seo.redirectChanged",
    entityType: "REDIRECT",
    fromPath: absoluteUrl(parsed.fromPath),
    submitFromPath: true,
  });
  revalidateTag(CACHE_TAGS.redirects, "max");
  await refreshMiddlewareManifestBestEffort("redirect upsert");
  revalidatePath("/admin/seo/redirects");
}

export async function deleteRedirectAction(id: string) {
  await requireAdmin();
  const redirects = await seoRepository.listRedirects(false);
  const existing = redirects.find((redirect) => redirect.id === id);
  await seoRepository.deleteRedirect(id);
  await seoTriggerService.handle({
    type: "seo.redirectChanged",
    entityType: "REDIRECT",
    fromPath: existing ? absoluteUrl(existing.fromPath) : undefined,
    submitFromPath: Boolean(existing),
  });
  revalidateTag(CACHE_TAGS.redirects, "max");
  await refreshMiddlewareManifestBestEffort("redirect delete");
  revalidatePath("/admin/seo/redirects");
}

export async function upsertCustom404Action(formData: FormData) {
  await requireAdmin();
  const locale = formData.get("locale") as string;
  const row = await seoRepository.upsertCustom404({
    locale,
    blocks: formData.get("blocks")
      ? (JSON.parse(formData.get("blocks") as string) as Prisma.InputJsonValue)
      : [],
  });
  const enabledLocales = await localeService.listEnabled();
  await syncEntityTranslationsFromForm(formData, "Custom404", row.id, enabledLocales, [
    "title",
    "body",
  ]);
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
  await seoTriggerService.handle({
    type: "seo.structuredDataUpdated",
    entityType: "SITE",
    paths: [absoluteUrl("/")],
  });
  revalidatePath("/admin/seo/structured-data");
}

export async function bulkFillSeoMetadataAction(formData: FormData) {
  await requireAdmin();
  const scope = (formData.get("scope") as BulkFillScope) ?? "all";
  const mode = (formData.get("mode") as BulkFillMode) ?? "empty-only";
  await seoBulkService.bulkFillMetadata(scope, mode);
  await seoTriggerService.handle({ type: "content.sitemapChanged", entityType: "SITE" });
  revalidatePath("/admin/seo");
  revalidatePath("/admin/seo/audit");
}

function providerConfigFromForm(formData: FormData, provider: keyof SeoIntegrationsConfig) {
  return {
    enabled: formData.get(`${provider}.enabled`) === "true",
    analyticsEnabled: formData.get(`${provider}.analyticsEnabled`) === "true",
    siteUrl: (formData.get(`${provider}.siteUrl`) as string) || undefined,
    apiKey: (formData.get(`${provider}.apiKey`) as string) || undefined,
    bearerToken: (formData.get(`${provider}.bearerToken`) as string) || undefined,
    refreshToken: (formData.get(`${provider}.refreshToken`) as string) || undefined,
    clientId: (formData.get(`${provider}.clientId`) as string) || undefined,
    clientSecret: (formData.get(`${provider}.clientSecret`) as string) || undefined,
    serviceAccountJson:
      (formData.get(`${provider}.serviceAccountJson`) as string) || undefined,
    endpoint: (formData.get(`${provider}.endpoint`) as string) || undefined,
    keyLocation: (formData.get(`${provider}.keyLocation`) as string) || undefined,
  };
}

export async function upsertSeoIntegrationsAction(formData: FormData) {
  await requireAdmin();
  const existing = await seoRepository.getIntegrationsConfig();
  const incoming: SeoIntegrationsConfig = {
    google: providerConfigFromForm(formData, "google"),
    bing: providerConfigFromForm(formData, "bing"),
    indexnow: providerConfigFromForm(formData, "indexnow"),
  };
  await seoRepository.upsertIntegrationsConfig(mergeSecretFields(incoming, existing));
  revalidatePath("/admin/seo/integrations");
  revalidatePath("/admin/seo");
}

export async function enqueueSitemapSubmissionAction() {
  await requireAdmin();
  await seoTriggerService.handle({ type: "content.sitemapChanged", entityType: "SITE" });
  revalidatePath("/admin/seo/integrations");
}

export async function runSeoSubmissionQueueAction() {
  await requireAdmin();
  await seoSubmissionRunner.runDue(25);
  revalidatePath("/admin/seo/integrations");
  revalidatePath("/admin/seo");
}

export async function runSeoAnalyticsIngestionAction() {
  await requireAdmin();
  await seoAnalyticsIngestionService.run(7);
  revalidatePath("/admin/seo/integrations");
  revalidatePath("/admin/seo");
}

export async function revalidateRichResultsAction() {
  await requireAdmin();
  await richResultsMonitoringService.analyzeAndPersist();
  revalidatePath("/admin/seo/audit");
  revalidatePath("/admin/seo");
}
