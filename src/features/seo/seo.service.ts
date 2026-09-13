import type { Metadata } from "next";
import { JsonLd } from "@/lib/seo";
import { seoRepository } from "@/repositories/seo.repository";
import { documentToMetadata, resolveSeoDocument } from "@/features/seo/core";
import { composeDocumentTitle } from "@/lib/compose-document-title";
import { getDefaultSiteIdentity } from "@/lib/site-identity";
import { resolveSiteIdentityFromDb } from "@/lib/site-identity.server";
import { buildCanonicalUrl } from "@/i18n/seo-helpers";
import { getFallbackDefaultLocalePrefix } from "@/i18n/url-helpers";
import { resolveSiteOrigin } from "@/features/seo/resolve-site-origin";
import type { SeoResolveInput, SeoStructuredConfig } from "./types";

function toDocumentInput(params: SeoResolveInput) {
  return {
    locale: params.locale,
    path: params.path,
    pageKey: params.pageKey,
    cmsPageId:
      params.cmsPageId ?? (params.entityType === "CMS_PAGE" ? params.entityId : undefined),
    postId: params.postId ?? (params.entityType === "POST" ? params.entityId : undefined),
    packageId: params.packageId,
    contentItemId: params.entityType === "CONTENT_ITEM" ? params.entityId : undefined,
    entityType: params.entityType,
    entityId: params.entityId,
    slug: params.slug,
    status: params.status,
    ogImage: params.ogImage,
    fallback: params.fallback,
  };
}

async function resolveSafeMetadataFallback(params: SeoResolveInput): Promise<Metadata> {
  let brandName = getDefaultSiteIdentity().brandName;
  try {
    brandName = (await resolveSiteIdentityFromDb()).brandName || brandName;
  } catch {
    // keep sync default
  }

  const pageTitle =
    params.fallback?.title?.trim() ||
    (params.pageKey === "home" ? brandName : "") ||
    brandName;
  const absoluteTitle = composeDocumentTitle(pageTitle, brandName);
  const description =
    params.fallback?.description?.trim() ||
    `${brandName} — wireless, networking and smart technology solutions.`;

  let canonical: string | undefined;
  try {
    const origin = (await resolveSiteOrigin("public")).replace(/\/$/, "");
    const path =
      !params.path || params.path === "" || params.path === "/"
        ? "/"
        : params.path.startsWith("/")
          ? params.path
          : `/${params.path}`;
    const defaultPrefix = getFallbackDefaultLocalePrefix();
    canonical = buildCanonicalUrl(
      origin,
      params.locale || defaultPrefix,
      path,
      undefined,
      defaultPrefix,
    );
  } catch {
    canonical = undefined;
  }

  return {
    title: { absolute: absoluteTitle },
    description,
    ...(canonical
      ? { alternates: { canonical }, robots: { index: true, follow: true } }
      : { robots: { index: true, follow: true } }),
  };
}

export const seoService = {
  async resolveMetadata(params: SeoResolveInput): Promise<Metadata> {
    try {
      const doc = await resolveSeoDocument(toDocumentInput(params));
      const metadata = documentToMetadata(doc);
      // Never emit empty title — degrade to deterministic absolute fallback
      const titleValue = metadata.title;
      const isEmptyTitle =
        titleValue == null ||
        (typeof titleValue === "string" && !titleValue.trim()) ||
        (typeof titleValue === "object" &&
          "absolute" in titleValue &&
          !String((titleValue as { absolute?: string }).absolute ?? "").trim());
      if (isEmptyTitle) {
        return resolveSafeMetadataFallback(params);
      }
      return metadata;
    } catch (error) {
      console.error("[seoService.resolveMetadata] failed:", error);
      return resolveSafeMetadataFallback(params);
    }
  },

  async resolveJsonLd(
    params: SeoResolveInput,
  ): Promise<Record<string, unknown> | Record<string, unknown>[] | null> {
    try {
      const doc = await resolveSeoDocument(toDocumentInput(params));
      const graph = doc.schema?.["@graph"];
      if (!graph?.length) return null;
      if (graph.length === 1) return graph[0] as Record<string, unknown>;
      return graph as Record<string, unknown>[];
    } catch {
      return null;
    }
  },

  async resolveDocument(params: SeoResolveInput) {
    return resolveSeoDocument(toDocumentInput(params));
  },

  async getGlobalStructured(): Promise<SeoStructuredConfig> {
    return seoRepository.getStructuredConfig();
  },

  async getTrackingConfig() {
    return seoRepository.getTrackingConfig();
  },

  JsonLd,
};
