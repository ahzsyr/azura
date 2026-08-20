"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { after } from "next/server";
import { requireAdmin } from "@/features/auth/guards";
import { prisma } from "@/lib/prisma";
import { seoRepository } from "@/repositories/seo.repository";
import { redirectSchema } from "@/schemas/seo";
import { CACHE_TAGS, revalidateSeoMeta } from "@/services/cache";
import { localeService } from "@/features/i18n/locale.service";
import { syncEntityTranslationsFromForm } from "@/features/translation/form-sync.server";
import { translationService } from "@/features/translation/translation.service";
import { parseJsonLdForSeoColumn, parseSeoForm } from "@/features/seo/parse-seo-form";
import { BULK_SEGMENT_THRESHOLD, seoBulkService } from "./seo-bulk.service";
import type { BulkFillMode, BulkFillScope } from "./seo-bulk.service";
import { Prisma, type SeoMeta } from "@prisma/client";
import { localizedStaticUrlsFromContext } from "./resolve-page-seo-context";
import { resolveSiteOrigin } from "./resolve-site-origin";
import type { SeoIntegrationsConfig } from "./types";
import { getCmsPageSeoPageKey, SEO_TRANSLATION_FIELDS } from "./cms-page-seo-context";
import { CMS_WIRED_MARKETING_SLUGS } from "@/features/cms/cms-wired-slugs";
import { mergeSecretFields, unsealIntegrationsConfig } from "./integrations/config";
import { alignIndexNowStoredConfig } from "./integrations/indexnow-payload";
import { seoSubmissionRunner } from "./integrations/submission-runner.service";
import { enqueueSitemapSubmission } from "./integrations/enqueue";
import { sitemapEnqueueEmptyMessage } from "./integrations/enqueue-policy";
import { bingProvider, googleProvider, indexNowProvider } from "./integrations/providers";
import { seoTriggerService } from "./triggers/seo-trigger.service";
import { seoAnalyticsIngestionService } from "./analytics/analytics-ingestion.service";
import { richResultsMonitoringService } from "./quality/rich-results-monitoring.service";
import { refreshMiddlewareManifestBestEffort } from "@/features/setup/refresh-middleware-manifest.server";
import { getDatabaseHostFromUrl, getRuntimeDatabaseUrl } from "@/lib/database-url";
import { isStaticSeoPageKey } from "./constants";
import { normalizeCanonicalUrlForPageKey } from "./normalize-canonical-url";
import { resolvePageSeoContext } from "./resolve-page-seo-context";
import { toSeoMetaFormProps } from "./mappers/to-seo-meta-form-props";
import type { SeoMetaFormPropsFromContext } from "./mappers/to-seo-meta-form-props";
import type { PublicLocale } from "@/i18n/locale-config";
import {
  decodeServiceAccountTransportPayload,
  formDataHasGoogleOAuthFields,
  serializeServiceAccountJson,
  validateServiceAccountJson,
} from "@/features/seo/google-live/service-account-json";

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

async function syncSeoMetaTranslations(
  formData: FormData,
  meta: SeoMeta,
  enabledLocales: PublicLocale[],
) {
  await syncEntityTranslationsFromForm(
    formData,
    "SeoMeta",
    meta.id,
    enabledLocales,
    [...SEO_TRANSLATION_FIELDS],
    { skipCompletionSync: true },
  );
}

export type UpsertSeoMetaResult = { ok: true } | { ok: false; message: string };

export async function upsertSeoMetaAction(formData: FormData): Promise<UpsertSeoMetaResult> {
  try {
    await requireAdmin();
    const enabledLocales = await localeService.listEnabled();
    const parsed = parseSeoForm(formData, enabledLocales);
    const cmsPageId = formData.get("cmsPageId") as string | null;
    const postId = formData.get("postId") as string | null;
    const packageId = formData.get("packageId") as string | null;
    const contentItemId = formData.get("contentItemId") as string | null;
    const jsonLdValue = parseJsonLdForSeoColumn(parsed.jsonLd);

    const data = {
      canonicalUrl: normalizeCanonicalUrlForPageKey(
        parsed.pageKey ?? undefined,
        parsed.canonicalUrl || null,
      ),
      robots: parsed.robots,
      focusKeywords: parsed.focusKeywords,
      ogImageUrl: parsed.ogImageUrl,
      twitterCard: parsed.twitterCard,
      jsonLd: jsonLdValue
        ? (jsonLdValue as Prisma.InputJsonValue)
        : Prisma.DbNull,
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
    } else if (contentItemId) {
      meta = await seoRepository.upsertMetaByEntity("ContentItem", contentItemId, data);
      const item = await prisma.contentItem.findUnique({
        where: { id: contentItemId },
        select: { contentType: { select: { slug: true } } },
      });
      if (item?.contentType.slug) {
        revalidatePath(`/admin/content/${item.contentType.slug}/${contentItemId}`);
      }
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
      throw new Error("pageKey, cmsPageId, postId, packageId, or contentItemId required");
    }

    await syncSeoMetaTranslations(formData, meta, enabledLocales);
    after(async () => {
      for (const locale of enabledLocales) {
        try {
          await translationService.syncLocaleCompletionPercent(locale.code);
        } catch (error) {
          console.error("[seo-meta] completion sync failed:", error);
        }
      }
    });

    try {
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
    } catch (error) {
      console.error("[seo-meta] trigger failed after save:", error);
    }

    if (cmsPageId && !effectivePageKey) revalidateSeoMeta("CmsPage", cmsPageId);
    else if (postId) revalidateSeoMeta("Post", postId);
    else if (packageId) revalidateSeoMeta("PACKAGE", packageId);
    else if (contentItemId) revalidateSeoMeta("ContentItem", contentItemId);
    else if (effectivePageKey) revalidateSeoMeta("SITE", effectivePageKey);
    revalidatePath("/admin/seo");
    revalidatePath("/admin/seo/metadata");
    return { ok: true };
  } catch (error) {
    console.error("[seo-meta] upsert failed:", error);
    return { ok: false, message: formatSeoActionError(error) };
  }
}

export async function upsertRedirectAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const parsed = redirectSchema.parse({
    fromPath: formData.get("fromPath"),
    toPath: formData.get("toPath"),
    type: formData.get("type") ?? "PERMANENT",
    isActive: formData.get("isActive") === "true",
  });
  if (id) {
    await seoRepository.updateRedirect(id, {
      fromPath: parsed.fromPath,
      toPath: parsed.toPath,
      type: parsed.type,
      isActive: parsed.isActive,
    });
  } else {
    await seoRepository.upsertRedirect(
      parsed.fromPath,
      parsed.toPath,
      parsed.type,
      parsed.isActive,
    );
  }
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

function normalizeSitemapConfigLine(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/\/$/, "") || trimmed;
  }
  if (trimmed === "/") return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export async function upsertSeoSitemapAction(formData: FormData) {
  await requireAdmin();

  const excludeNormalized: string[] = [];
  for (const line of ((formData.get("excludePaths") as string) ?? "").split("\n")) {
    if (!line.trim()) continue;
    const normalized = normalizeSitemapConfigLine(line);
    if (!excludeNormalized.includes(normalized)) excludeNormalized.push(normalized);
  }

  const extraNormalized: string[] = [];
  for (const line of ((formData.get("extraPaths") as string) ?? "").split("\n")) {
    if (!line.trim()) continue;
    const normalized = normalizeSitemapConfigLine(line);
    if (!extraNormalized.includes(normalized)) extraNormalized.push(normalized);
  }

  await seoRepository.upsertSitemapConfig({
    excludePaths: excludeNormalized,
    extraPaths: extraNormalized,
  });
  revalidatePath("/admin/seo/sitemap");
  revalidatePath("/sitemap.xml");
  await seoTriggerService.handle({ type: "content.sitemapChanged", entityType: "SITE" });
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

/** Load SEO form props for any pageKey (e.g. product:slug, brand:slug). */
export async function loadPageKeySeoFormAction(
  pageKey: string,
): Promise<SeoMetaFormPropsFromContext> {
  await requireAdmin();
  const context = await resolvePageSeoContext({ pageKey, allowWrites: true });
  const base = toSeoMetaFormProps(context);

  if (pageKey.startsWith("product:")) {
    const slug = pageKey.slice("product:".length).trim();
    if (slug) {
      const [{ productsDataService }, { resolveProductPrimaryImageUrl }] = await Promise.all([
        import("@/features/products/products-data.service"),
        import("@/features/products/lib/product-primary-image"),
      ]);
      const loaded = await productsDataService.getProduct("en", slug);
      const fallbackOgImageUrl = loaded ? resolveProductPrimaryImageUrl(loaded.product) : "";
      return {
        ...base,
        defaultOgImageUrl: fallbackOgImageUrl || undefined,
      };
    }
  }

  return base;
}

/** Load SEO form props for a content catalog item (offerings, packages, listings, etc.). */
export async function loadContentItemSeoFormAction(
  contentItemId: string,
): Promise<SeoMetaFormPropsFromContext> {
  await requireAdmin();
  const context = await resolvePageSeoContext({ contentItemId, allowWrites: true });
  const base = toSeoMetaFormProps(context);

  const item = await prisma.contentItem.findUnique({
    where: { id: contentItemId },
    select: {
      featuredImageUrl: true,
      media: {
        where: { isPublished: true },
        orderBy: { sortOrder: "asc" },
        select: { url: true, isCover: true },
      },
    },
  });
  const coverUrl =
    item?.media.find((m) => m.isCover)?.url?.trim() ||
    item?.featuredImageUrl?.trim() ||
    item?.media[0]?.url?.trim() ||
    "";

  return {
    ...base,
    defaultOgImageUrl: coverUrl || undefined,
  };
}

export async function upsertStructuredDataAction(formData: FormData) {
  await requireAdmin();
  const organizationRaw = formData.get("organization") as string;
  const websiteRaw = formData.get("website") as string;
  const entityTypeRaw = formData.get("entityType") as string;
  const builderFlagsRaw = formData.get("builderFlags") as string;

  let builderFlags: Record<string, boolean> | undefined;
  if (builderFlagsRaw?.trim()) {
    builderFlags = JSON.parse(builderFlagsRaw) as Record<string, boolean>;
  }

  const config = {
    organization: organizationRaw?.trim()
      ? (JSON.parse(organizationRaw) as Record<string, unknown>)
      : undefined,
    website: websiteRaw?.trim()
      ? (JSON.parse(websiteRaw) as Record<string, unknown>)
      : undefined,
    entityType: entityTypeRaw?.trim() || undefined,
    builderFlags,
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
  revalidatePath("/admin/seo/autofill");
}

/** Load SEO form props for a blog post. */
export async function loadPostSeoFormAction(
  postId: string,
): Promise<SeoMetaFormPropsFromContext> {
  await requireAdmin();
  const context = await resolvePageSeoContext({
    postId,
    allowWrites: true,
    originContext: "admin-preview",
  });
  const base = toSeoMetaFormProps(context);

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      featuredImage: { select: { url: true } },
    },
  });
  const featuredUrl = post?.featuredImage?.url?.trim() || "";

  return {
    ...base,
    defaultOgImageUrl: featuredUrl || undefined,
  };
}

export async function suggestAutoFillAction(input: {
  entityType: string;
  entityId: string;
  locale: string;
  pageKey?: string;
  publicPath?: string;
  profileId?: string;
  applyMode?: import("@/features/seo/platform/types/change-set").ApplyMode;
}) {
  await requireAdmin();
  const { createExecutionContext, seoPlatform } = await import("@/features/seo/platform");
  const { descriptorFromPageKey } = await import(
    "@/features/seo/platform/types/entity-descriptor"
  );

  const descriptor = input.pageKey
    ? descriptorFromPageKey(input.pageKey, input.locale)
    : undefined;

  let publicPath = input.publicPath?.trim() || "";
  if (!publicPath) {
    const normalizedType = input.entityType.toLowerCase().replace(/_/g, "");
    if (normalizedType.includes("post")) {
      const post = await prisma.post.findUnique({
        where: { id: input.entityId },
        select: { slug: true },
      });
      if (post?.slug) publicPath = `/blog/${post.slug}`;
    }
  }

  const metadata: Record<string, string> = {};
  if (input.pageKey) metadata.routingKey = input.pageKey;
  if (publicPath) metadata.publicPath = publicPath;

  const ctx = createExecutionContext({
    entityType: input.entityType,
    entityId: input.entityId,
    locale: input.locale,
    source: "autofill",
    trigger: "autofill",
    mode: "preview",
    metadata: Object.keys(metadata).length ? metadata : undefined,
  });

  return seoPlatform.autofill.suggest(ctx, {
    profileId: input.profileId ?? "balanced",
    applyMode: input.applyMode ?? "preview",
    origin: "autofill",
    descriptor,
  });
}

export async function commitAutoFillAction(input: {
  entityType: string;
  entityId: string;
  locale: string;
  changeSetJson: string;
  fieldSelection?: string[];
}) {
  await requireAdmin();
  const { createExecutionContext, seoPlatform } = await import("@/features/seo/platform");
  const changeSet = JSON.parse(input.changeSetJson) as import("@/features/seo/platform/types/change-set").SeoChangeSet;

  const ctx = createExecutionContext({
    entityType: input.entityType,
    entityId: input.entityId,
    locale: input.locale,
    source: "autofill",
    trigger: "autofill",
    mode: "commit",
  });

  const result = await seoPlatform.autofill.commit(ctx, changeSet, {
    fieldSelection: input.fieldSelection,
  });

  revalidatePath("/admin/seo");
  revalidatePath("/admin/seo/metadata");
  return result;
}

export async function bulkAutoFillAction(formData: FormData) {
  await requireAdmin();
  const scope = (formData.get("scope") as BulkFillScope) ?? "all";
  const mode = (formData.get("mode") as BulkFillMode) ?? "empty-only";
  const dryRun = formData.get("dryRun") === "true";
  const profileId = (formData.get("profileId") as string) || "balanced";
  const skipRevalidate = formData.get("skipRevalidate") === "true";

  const offsetRaw = formData.get("offset");
  const limitRaw = formData.get("limit");
  const segmentIndexRaw = formData.get("segmentIndex");
  const segmentSizeRaw = formData.get("segmentSize");

  const hasSegment =
    offsetRaw != null && offsetRaw !== "" && limitRaw != null && limitRaw !== "";
  const offset = hasSegment ? Number(offsetRaw) : undefined;
  const limit = hasSegment ? Number(limitRaw) : undefined;
  const segmentIndex =
    segmentIndexRaw != null && segmentIndexRaw !== "" ? Number(segmentIndexRaw) : undefined;
  const segmentSize =
    segmentSizeRaw != null && segmentSizeRaw !== "" ? Number(segmentSizeRaw) : undefined;

  const total = await seoBulkService.countBulk(scope);

  if (total > BULK_SEGMENT_THRESHOLD && !hasSegment) {
    return { error: "SEGMENT_REQUIRED" as const, total };
  }

  const segment =
    hasSegment && offset != null && limit != null
      ? { offset, limit, segmentIndex, segmentSize }
      : undefined;

  const result = dryRun
    ? await seoBulkService.dryRunBulk(scope, mode, { profileId, segment })
    : await seoBulkService.bulkFillMetadata(scope, mode, { profileId, segment });

  if ("error" in result) {
    return result;
  }

  if (!dryRun && !skipRevalidate) {
    await seoTriggerService.handle({ type: "content.sitemapChanged", entityType: "SITE" });
    revalidatePath("/admin/seo");
    revalidatePath("/admin/seo/autofill");
  }

  return result;
}

export async function planBulkSegmentsAction(scope: BulkFillScope, segmentSize: number) {
  await requireAdmin();
  return seoBulkService.planBulkSegments(scope, segmentSize);
}

export async function countBulkSeoAction(scope: BulkFillScope) {
  await requireAdmin();
  return seoBulkService.countBulk(scope);
}

export type SeoChangeLogEntry = {
  id: string;
  field: string;
  entityKind: string;
  entityId: string;
  origin: string;
  createdAt: string;
};

export async function listRecentSeoChangeLogsAction(limit = 50): Promise<SeoChangeLogEntry[]> {
  await requireAdmin();
  const { listRecentChangeLogs } = await import(
    "@/features/seo/platform/services/change-log.service"
  );
  const rows = await listRecentChangeLogs(limit);
  return rows.map((row) => ({
    id: row.id,
    field: row.field,
    entityKind: row.entityKind,
    entityId: row.entityId,
    origin: row.origin,
    createdAt: row.createdAt.toISOString(),
  }));
}

function readFormString(formData: FormData, key: string): string | undefined {
  const raw = formData.get(key);
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed || undefined;
}

async function readGoogleIndexingServiceAccountJson(formData: FormData): Promise<string | undefined> {
  const encoded = readFormString(formData, "googleIndexingServiceAccountJsonB64");
  if (encoded) {
    const decoded = decodeServiceAccountTransportPayload(encoded);

    if (process.env.SEO_SA_JSON_DEBUG === "1") {
      console.log("[sa-json]", {
        source: "b64",
        length: decoded.length,
        hasEscapedNewlines: decoded.includes("\\n"),
        hasLiteralKeyNewlines: /"private_key"\s*:\s*"[\s\S]*\n/.test(decoded),
      });
    }

    return decoded;
  }

  const direct = readFormString(formData, "google_indexing.serviceAccountJson");
  if (direct) {
    if (process.env.SEO_SA_JSON_DEBUG === "1") {
      console.log("[sa-json]", {
        source: "direct",
        length: direct.length,
        hasEscapedNewlines: direct.includes("\\n"),
        hasLiteralKeyNewlines: /"private_key"\s*:\s*"[\s\S]*\n/.test(direct),
      });
    }

    return direct;
  }

  return undefined;
}

function providerConfigFromForm(formData: FormData, provider: keyof SeoIntegrationsConfig) {
  const serviceAccountRaw =
    provider === "google_indexing"
      ? undefined
      : readFormString(formData, `${provider}.serviceAccountJson`);
  return {
    enabled: formData.get(`${provider}.enabled`) === "true",
    analyticsEnabled: formData.get(`${provider}.analyticsEnabled`) === "true",
    siteUrl: readFormString(formData, `${provider}.siteUrl`),
    apiKey: readFormString(formData, `${provider}.apiKey`),
    bearerToken: readFormString(formData, `${provider}.bearerToken`),
    refreshToken: readFormString(formData, `${provider}.refreshToken`),
    clientId: readFormString(formData, `${provider}.clientId`),
    clientSecret: readFormString(formData, `${provider}.clientSecret`),
    serviceAccountJson: serviceAccountRaw,
    endpoint: readFormString(formData, `${provider}.endpoint`),
    keyLocation: readFormString(formData, `${provider}.keyLocation`),
    ga4PropertyId: readFormString(formData, `${provider}.ga4PropertyId`),
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
    const hasGoogleFields = formDataHasGoogleOAuthFields(formData.keys());
    const incoming: SeoIntegrationsConfig = {
      google: hasGoogleFields ? providerConfigFromForm(formData, "google") : existing.google,
      google_indexing: providerConfigFromForm(formData, "google_indexing"),
      bing: providerConfigFromForm(formData, "bing"),
      indexnow: providerConfigFromForm(formData, "indexnow"),
    };

    const googleIndexingJson = await readGoogleIndexingServiceAccountJson(formData);
    if (googleIndexingJson) {
      incoming.google_indexing = {
        ...incoming.google_indexing,
        serviceAccountJson: googleIndexingJson,
      };
    }

    if (hasGoogleFields && incoming.google?.serviceAccountJson?.trim()) {
      const validation = validateServiceAccountJson(incoming.google.serviceAccountJson);
      if (!validation.ok) return { ok: false, message: validation.message };
    }
    if (incoming.google_indexing?.serviceAccountJson?.trim()) {
      const validation = validateServiceAccountJson(incoming.google_indexing.serviceAccountJson);
      if (!validation.ok) return { ok: false, message: validation.message };
      try {
        incoming.google_indexing.serviceAccountJson = serializeServiceAccountJson(
          incoming.google_indexing.serviceAccountJson,
        );
      } catch (error) {
        return {
          ok: false,
          message: error instanceof Error ? error.message : "Invalid service account JSON.",
        };
      }
      incoming.google_indexing.enabled = true;
    } else if (!googleIndexingJson && incoming.google_indexing?.enabled && !existing.google_indexing?.serviceAccountJson) {
      return {
        ok: false,
        message: "Import or paste the service account JSON file before saving.",
      };
    }
    const merged = mergeSecretFields(incoming, existing, sealedExisting);
    if (merged.indexnow) {
      merged.indexnow = alignIndexNowStoredConfig(merged.indexnow);
    }
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
    if (incoming.google?.serviceAccountJson?.trim()) {
      const validation = validateServiceAccountJson(incoming.google.serviceAccountJson);
      if (!validation.ok) return { ok: false, message: validation.message };
    }
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

async function sitemapEnqueueEmptyResult(): Promise<SeoActionResult> {
  const config = await seoRepository.getIntegrationsConfig();
  return {
    ok: false,
    message: sitemapEnqueueEmptyMessage({
      indexNowConfigured: indexNowProvider.isConfigured(config.indexnow),
      bingConfigured: bingProvider.isConfigured(config.bing),
      googleConfigured: googleProvider.isConfigured(config.google),
    }),
    enqueued: 0,
  };
}

export async function enqueueSitemapSubmissionAction(): Promise<SeoActionResult> {
  await requireAdmin();
  const enqueued = await enqueueSitemapSubmission("manual");
  revalidateIntegrationsPaths();
  if (enqueued === 0) {
    return sitemapEnqueueEmptyResult();
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
  const enqueued = await enqueueSitemapSubmission("manual");
  if (enqueued === 0) {
    revalidateIntegrationsPaths();
    return sitemapEnqueueEmptyResult();
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

export async function runStructuredDataAuditAction(pathname: string) {
  await requireAdmin();
  const { buildStructuredDataAudit } = await import(
    "@/features/seo/quality/build-structured-data-audit.server"
  );
  return buildStructuredDataAudit(pathname);
}
