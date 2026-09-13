import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { seoRepository } from "@/repositories/seo.repository";
import { seoIntegrationRegistry } from "@/features/seo/integrations/registry";
import { getServerDefaultSitemapUrl } from "@/features/seo/integrations/enqueue";
import { getServerAppOrigin } from "@/lib/oauth-redirect-origin";
import { SeoSettingsClient } from "@/features/seo/admin/seo-settings-client";
import { listPublicRouteCatalog } from "@/features/seo/admin/route-catalog.service";
import { loadTranslationsMap, localizedFieldValue } from "@/features/translation/bilingual-serialize";
import type { SeoGlobalConfig, SeoStructuredConfig, SeoProviderHealth } from "@/features/seo/types";
import type { PublicSeoIntegrationsConfig } from "@/features/seo/types";
import type { RouteCatalogEntry } from "@/features/seo/admin/route-catalog.types";
import type { StructuredDataAuditBundle } from "@/features/seo/quality/schema-graph-audit.types";
import { buildStructuredDataAudit } from "@/features/seo/quality/build-structured-data-audit.server";
import { getCompanyInfo } from "@/lib/data";
import { loadSiteBrandContext } from "@/lib/load-site-brand-context";
import { STATIC_SEO_PAGES } from "@/features/seo/constants";
import { resolveSiteOrigin } from "@/features/seo/resolve-site-origin";

export const dynamic = "force-dynamic";

export default async function AdminSeoSettingsPage() {
  let robotsConfig: SeoGlobalConfig = {};
  let structuredConfig: SeoStructuredConfig = {};
  let withJsonLd: { pageKey: string | null; titleEn: string; entityType: string | null }[] = [];
  let redirects: Awaited<ReturnType<typeof seoRepository.listRedirects>> = [];
  let routeCatalog: RouteCatalogEntry[] = [];
  let integrationsConfig: PublicSeoIntegrationsConfig = {};
  let integrationHealth: SeoProviderHealth[] = [];
  let structuredDataAudit: StructuredDataAuditBundle | null = null;

  try {
    [robotsConfig, structuredConfig, redirects, routeCatalog] = await Promise.all([
      seoRepository.getGlobalConfig(),
      seoRepository.getStructuredConfig(),
      seoRepository.listRedirects(false),
      listPublicRouteCatalog().catch(() => []),
    ]);
  } catch {
    // DB unavailable
  }

  try {
    integrationsConfig = await seoRepository.getPublicIntegrationsConfig();
  } catch {
    // DB unavailable
  }

  try {
    integrationHealth = await seoIntegrationRegistry.health({ liveGoogle: false });
  } catch {
    // DB unavailable
  }

  try {
    const rows = await prisma.seoMeta.findMany({
      select: { id: true, pageKey: true, entityType: true, jsonLd: true },
      take: 50,
    });
    const withLd = rows.filter((r) => r.jsonLd != null);
    const translations = await loadTranslationsMap(
      "SeoMeta",
      withLd.map((r) => r.id),
    );
    withJsonLd = withLd.map((row) => ({
      pageKey: row.pageKey,
      entityType: row.entityType,
      titleEn:
        localizedFieldValue(translations.get(row.id) ?? [], "metaTitle") || row.pageKey || "",
    }));
  } catch {
    // DB unavailable
  }

  const siteUrl = (await getServerAppOrigin()).replace(/\/$/, "");
  const sitemapUrl = await getServerDefaultSitemapUrl();

  try {
    structuredDataAudit = await buildStructuredDataAudit("/");
  } catch {
    // audit unavailable
  }

  const [company, brand, siteOrigin] = await Promise.all([
    getCompanyInfo().catch(() => null),
    loadSiteBrandContext().catch(() => null),
    resolveSiteOrigin("public").catch(() => siteUrl),
  ]);

  const sitelinkCandidates = STATIC_SEO_PAGES.filter((page) =>
    ["about", "contact", "products", "services"].includes(page.pageKey),
  ).map((page) => ({
    title: page.label,
    description: `/${page.path.replace(/^\//, "")}`,
  }));

  return (
    <Suspense fallback={null}>
      <SeoSettingsClient
        robotsConfig={robotsConfig}
        structuredConfig={structuredConfig}
        withJsonLd={withJsonLd}
        redirects={redirects}
        routeCatalog={routeCatalog}
        integrationsConfig={integrationsConfig}
        integrationHealth={integrationHealth}
        siteUrl={siteUrl}
        sitemapUrl={sitemapUrl}
        structuredDataAudit={structuredDataAudit}
        structuredPreviewTitle={brand?.brandName ?? company?.name ?? "Site"}
        structuredPreviewDescription={
          (company as { localizedLegacy?: Record<string, string> } | null)?.localizedLegacy
            ?.schemaDescriptionEn ?? ""
        }
        structuredPreviewUrl={structuredDataAudit?.canonicalUrl ?? `${siteOrigin.replace(/\/$/, "")}/`}
        structuredFaviconUrl={brand?.logoUrl ?? null}
        structuredSiteName={brand?.brandName ?? company?.name}
        structuredKnowledgePanel={{
          name: company?.name ?? brand?.brandName,
          phone: company?.phone,
          address: (company as { localizedLegacy?: Record<string, string> } | null)?.localizedLegacy
            ?.addressEn,
          description: (company as { localizedLegacy?: Record<string, string> } | null)?.localizedLegacy
            ?.schemaDescriptionEn,
          logoUrl: brand?.logoUrl ?? null,
          foundingDate: (company as { localizedLegacy?: Record<string, string> } | null)?.localizedLegacy
            ?.foundingDateEn,
          socialCount: company?.socialLinks
            ? Object.values(company.socialLinks as Record<string, string>).filter(Boolean).length
            : 0,
        }}
        structuredSitelinkCandidates={sitelinkCandidates}
      />
    </Suspense>
  );
}
