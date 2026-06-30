"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { after } from "next/server";
import { requireAdmin } from "@/features/auth/guards";
import { prisma } from "@/lib/prisma";
import { seoRepository } from "@/repositories/seo.repository";
import { redirectSchema, seoMetaBaseSchema } from "@/schemas/seo";
import { CACHE_TAGS, revalidateSeoMeta } from "@/services/cache";
import { localeService } from "@/features/i18n/locale.service";
import { syncEntityTranslationsFromForm } from "@/features/translation/form-sync.server";
import { seoBulkService } from "./seo-bulk.service";
import type { BulkFillMode, BulkFillScope } from "./seo-bulk.service";
import type { Prisma, SeoMeta } from "@prisma/client";
import { localizedStaticUrlsFromContext } from "./resolve-page-seo-context";
import { resolveSiteOrigin } from "./resolve-site-origin";
import type { SeoIntegrationsConfig } from "./types";
import { getCmsPageSeoPageKey } from "./cms-page-seo-context";
import { CMS_WIRED_MARKETING_SLUGS } from "@/features/cms/cms-wired-slugs";
import { mergeSecretFields, unsealIntegrationsConfig } from "./integrations/config";
import { seoSubmissionRunner } from "./integrations/submission-runner.service";
import { enqueueSitemapSubmission } from "./integrations/enqueue";
import { getServerAppOrigin } from "@/lib/oauth-redirect-origin";
import { seoTriggerService } from "./triggers/seo-trigger.service";
import { seoAnalyticsIngestionService } from "./analytics/analytics-ingestion.service";
import { richResultsMonitoringService } from "./quality/rich-results-monitoring.service";
import { refreshMiddlewareManifestBestEffort } from "@/features/setup/refresh-middleware-manifest.server";
import { getDatabaseHostFromUrl, getRuntimeDatabaseUrl } from "@/lib/database-url";
import { isStaticSeoPageKey } from "./constants";
import { resolvePageSeoContext } from "./resolve-page-seo-context";
import { toSeoMetaFormProps } from "./mappers/to-seo-meta-form-props";
import type { SeoMetaFormPropsFromContext } from "./mappers/to-seo-meta-form-props";

const SEO_TRANSLATION_FIELDS = ["metaTitle", "metaDescription", "ogTitle", "ogDescription"] as const;

async function absoluteUrl(pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const siteUrl = await resolveSiteOrigin("background");
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${siteUrl.replace(/\/$/, "")}${path}`;
}

async function localizedStaticUrls(pageKey: string) {
  const { isStaticSeoPageKey } = await import("./constants");
  if (!isStaticSeoPageKey(pageKey)) return [];
  return localizedStaticUrlsFromContext(pageKey);
}

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
    [...SEO_TRANSLATION_FIELDS],
  );
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
  let effectivePageKey = parsed.pageKey;
  if (cmsPageId) {
    const cmsPage = await prisma.cmsPage.findUnique({ where: { id: cmsPageId } });
    const wiredPageKey = cmsPage ? getCmsPageSeoPageKey(cmsPage.slug) : undefined;
    if (wiredPageKey) {
      effectivePageKey = wiredPageKey;
      meta = await seoRepository.upsertMetaByPageKey(wiredPageKey, data);
      await prisma.seoMeta.deleteMany({
        where: {
          cmsPageId,
          NOT: { pageKey: wiredPageKey },
        },
      });
    } else {
      meta = await seoRepository.upsertMetaByCmsPage(cmsPageId, data);
    }
    revalidatePath(`/admin/pages/${cmsPageId}`);
  } else if (postId) {
    meta = await seoRepository.upsertMetaByPost(postId, data);
    revalidatePath(`/admin/posts/${postId}`);
  } else if (packageId) {
    meta = await seoRepository.upsertMetaByEntity("PACKAGE", packageId, data);
    revalidatePath("/admin/packages");
  } else if (parsed.pageKey) {
    meta = await seoRepository.upsertMetaByPageKey(parsed.pageKey, data);

    if (parsed.pageKey in CMS_WIRED_MARKETING_SLUGS && getCmsPageSeoPageKey(parsed.pageKey)) {
      const cmsPage = await prisma.cmsPage.findUnique({ where: { slug: parsed.pageKey } });
      if (cmsPage) {
        await prisma.seoMeta.deleteMany({
          where: {
            cmsPageId: cmsPage.id,
            NOT: { pageKey: parsed.pageKey },
          },
        });
        revalidatePath(`/admin/pages/${cmsPage.id}`);
      }
    }
  } else {
    throw new Error("pageKey, cmsPageId, postId, or packageId required");
  }

  await syncSeoMetaTranslations(formData, meta);
  const urls = effectivePageKey
    ? await localizedStaticUrls(effectivePageKey)
    : parsed.canonicalUrl
      ? [parsed.canonicalUrl]
      : [];
  await seoTriggerService.handle({
    type: "seo.metadataUpdated",
    entityType: effectivePageKey ? "SITE" : "CONTENT_ITEM",
    entityId: parsed.entityId,
    paths: urls,
  });
  if (cmsPageId && !effectivePageKey) revalidateSeoMeta("CmsPage", cmsPageId);
  else if (postId) revalidateSeoMeta("Post", postId);
  else if (packageId) revalidateSeoMeta("PACKAGE", packageId);
  else if (effectivePageKey) revalidateSeoMeta("SITE", effectivePageKey);
  revalidatePath("/admin/seo");
  revalidatePath("/admin/seo/metadata");
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
    fromPath: await absoluteUrl(parsed.fromPath),
    submitFromPath: true,
  });
  revalidateTag(CACHE_TAGS.redirects, "max");
  await refreshMiddlewareManifestBestEffort("redirect upsert");
  revalidatePath("/admin/seo/redirects");
  revalidatePath("/admin/seo/settings");
}

export async function deleteRedirectAction(id: string) {
  await requireAdmin();
  const redirects = await seoRepository.listRedirects(false);
  const existing = redirects.find((redirect) => redirect.id === id);
  await seoRepository.deleteRedirect(id);
  await seoTriggerService.handle({
    type: "seo.redirectChanged",
    entityType: "REDIRECT",
    fromPath: existing ? await absoluteUrl(existing.fromPath) : undefined,
    submitFromPath: Boolean(existing),
  });
  revalidateTag(CACHE_TAGS.redirects, "max");
  await refreshMiddlewareManifestBestEffort("redirect delete");
  revalidatePath("/admin/seo/redirects");
  revalidatePath("/admin/seo/settings");
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
  revalidatePath("/admin/seo/settings");
}

export async function upsertSeoTrackingAction(formData: FormData) {
  await requireAdmin();
  const { upsertSeoTrackingConfig, seoTrackingInputFromFormData } = await import(
    "@/features/seo/tracking/upsert-tracking.server"
  );
  await upsertSeoTrackingConfig(seoTrackingInputFromFormData(formData));
}

/** Load SEO form props for a static marketing page (admin fallback when batch context is missing). */
export async function loadStaticPageSeoFormAction(
  pageKey: string,
): Promise<SeoMetaFormPropsFromContext> {
  await requireAdmin();
  if (!isStaticSeoPageKey(pageKey)) {
    throw new Error("Invalid static page key.");
  }
  const context = await resolvePageSeoContext({ pageKey, allowWrites: true });
  return toSeoMetaFormProps(context);
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
    paths: [await absoluteUrl("/")],
  });
  revalidatePath("/admin/seo/structured-data");
  revalidatePath("/admin/seo/settings");
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
    ga4PropertyId: (formData.get(`${provider}.ga4PropertyId`) as string) || undefined,
  };
}

export type SeoActionResult = {
  ok: boolean;
  message: string;
  enqueued?: number;
  processed?: number;
};

function formatSeoActionError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (
    message.includes("ECHECKOUTTIMEOUT") ||
    message.includes("connection pool") ||
    message.includes("P2024") ||
    message.includes("Timed out fetching")
  ) {
    return "Database connection pool is busy. Wait a moment and try again.";
  }
  if (message.includes("Can't reach database server")) {
    const host = getDatabaseHostFromUrl(getRuntimeDatabaseUrl());
    if (host?.includes("hstgr.io")) {
      return `Cannot reach MySQL at ${host}. On Hostinger Node.js hosting, add HOSTINGER_MYSQL_LOCALHOST=1 (or DATABASE_MYSQL_HOST=localhost) in hPanel environment variables, then restart the app.`;
    }
  }
  return message || "Failed to save integrations.";
}

export async function upsertSeoIntegrationsAction(
  _prevState: SeoActionResult | null,
  formData: FormData,
): Promise<SeoActionResult> {
  try {
    await requireAdmin();
    const sealedExisting = await seoRepository.getSealedIntegrationsConfig();
    const existing = unsealIntegrationsConfig(sealedExisting);
    const hasGoogleFields = Array.from(formData.keys()).some((key) => key.startsWith("google."));
    const incoming: SeoIntegrationsConfig = {
      google: hasGoogleFields ? providerConfigFromForm(formData, "google") : existing.google,
      bing: providerConfigFromForm(formData, "bing"),
      indexnow: providerConfigFromForm(formData, "indexnow"),
    };
    const merged = mergeSecretFields(incoming, existing, sealedExisting);
    await seoRepository.upsertIntegrationsConfig(merged);
    revalidatePath("/admin/seo/integrations");
    revalidatePath("/admin/seo/google");
    revalidatePath("/admin/seo/settings");
    revalidatePath("/admin/seo");
    return { ok: true, message: "Integrations saved successfully." };
  } catch (error) {
    console.error("[seo-integrations] upsert failed:", error);
    return { ok: false, message: formatSeoActionError(error) };
  }
}

export async function upsertGoogleIntegrationAction(
  _prevState: SeoActionResult | null,
  formData: FormData,
): Promise<SeoActionResult> {
  try {
    await requireAdmin();
    const sealedExisting = await seoRepository.getSealedIntegrationsConfig();
    const existing = unsealIntegrationsConfig(sealedExisting);
    const incoming: SeoIntegrationsConfig = {
      ...existing,
      google: providerConfigFromForm(formData, "google"),
    };
    const merged = mergeSecretFields(incoming, existing, sealedExisting);
    await seoRepository.upsertIntegrationsConfig(merged);
    revalidatePath("/admin/seo/google");
    revalidatePath("/admin/seo/integrations");
    revalidatePath("/admin/seo/settings");
    revalidatePath("/admin/seo");
    return { ok: true, message: "Google settings saved successfully." };
  } catch (error) {
    console.error("[seo-google] upsert failed:", error);
    return { ok: false, message: formatSeoActionError(error) };
  }
}

function revalidateIntegrationsPaths() {
  revalidatePath("/admin/seo/integrations");
  revalidatePath("/admin/seo/google");
  revalidatePath("/admin/seo");
  revalidatePath("/admin/seo/settings");
}

export async function enqueueSitemapSubmissionAction(): Promise<SeoActionResult> {
  await requireAdmin();
  const siteOrigin = await getServerAppOrigin();
  const enqueued = await enqueueSitemapSubmission("manual", siteOrigin);
  revalidateIntegrationsPaths();
  if (enqueued === 0) {
    return {
      ok: false,
      message:
        "No sitemap jobs were queued. Enable and configure at least one provider on the Configure tab.",
      enqueued: 0,
    };
  }
  return {
    ok: true,
    message: `Queued ${enqueued} sitemap job(s). Click Run queue now to process them.`,
    enqueued,
  };
}

export async function runSeoSubmissionQueueAction(): Promise<SeoActionResult> {
  await requireAdmin();
  const result = await seoSubmissionRunner.runDue(25);
  revalidateIntegrationsPaths();
  if (result.skipped) {
    return {
      ok: false,
      message: "Queue runner is already active. Try again in a moment.",
      processed: 0,
    };
  }
  if (result.processed === 0) {
    return { ok: true, message: "No pending jobs to process.", processed: 0 };
  }
  const failed = result.results.filter((item) => !item.ok).length;
  if (failed > 0) {
    return {
      ok: false,
      message: `Processed ${result.processed} job(s); ${failed} failed. Check Recent jobs for details.`,
      processed: result.processed,
    };
  }
  return {
    ok: true,
    message: `Processed ${result.processed} job(s) successfully.`,
    processed: result.processed,
  };
}

export async function submitSitemapAndRunAction(): Promise<SeoActionResult> {
  await requireAdmin();
  const siteOrigin = await getServerAppOrigin();
  const enqueued = await enqueueSitemapSubmission("manual", siteOrigin);
  if (enqueued === 0) {
    revalidateIntegrationsPaths();
    return {
      ok: false,
      message:
        "No sitemap jobs were queued. Enable and configure at least one provider on the Configure tab.",
      enqueued: 0,
    };
  }
  const result = await seoSubmissionRunner.runDue(25);
  revalidateIntegrationsPaths();
  if (result.skipped) {
    return {
      ok: false,
      message: `Queued ${enqueued} job(s), but the runner is busy. Try Run queue now shortly.`,
      enqueued,
      processed: 0,
    };
  }
  const failed = result.results.filter((item) => !item.ok).length;
  if (failed > 0) {
    return {
      ok: false,
      message: `Queued ${enqueued} and processed ${result.processed} job(s); ${failed} failed.`,
      enqueued,
      processed: result.processed,
    };
  }
  return {
    ok: true,
    message: `Submitted sitemap to ${enqueued} provider(s) and processed ${result.processed} job(s).`,
    enqueued,
    processed: result.processed,
  };
}

export async function runSeoAnalyticsIngestionAction(): Promise<SeoActionResult> {
  await requireAdmin();
  after(async () => {
    try {
      const result = await seoAnalyticsIngestionService.run(3, { includeRichResults: false });
      revalidateIntegrationsPaths();
      if (result.processed === 0) {
        console.warn("[seo-analytics-ingestion] No analytics providers ran.");
        return;
      }
      const failures = result.results.filter((item) => !item.ok);
      if (failures.length > 0) {
        console.warn(
          "[seo-analytics-ingestion] Completed with errors:",
          failures.map((item) => `${item.provider}: ${item.error}`).join("; "),
        );
        return;
      }
      console.info(
        `[seo-analytics-ingestion] Imported ${result.imported} search metrics from ${result.processed} provider(s).`,
      );
    } catch (error) {
      console.error("[seo-analytics-ingestion] Background sync failed:", error);
    }
  });

  return {
    ok: true,
    message:
      "Analytics sync started in the background. Refresh this page in about a minute to see updated monitoring metrics.",
    processed: 0,
  };
}

export async function revalidateRichResultsAction() {
  await requireAdmin();
  await richResultsMonitoringService.analyzeAndPersist();
  revalidatePath("/admin/seo/audit");
  revalidatePath("/admin/seo");
}
