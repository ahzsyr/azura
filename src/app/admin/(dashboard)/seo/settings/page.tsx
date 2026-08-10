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

export const dynamic = "force-dynamic";

export default async function AdminSeoSettingsPage() {
  let robotsConfig: SeoGlobalConfig = {};
  let structuredConfig: SeoStructuredConfig = {};
  let withJsonLd: { pageKey: string | null; titleEn: string; entityType: string | null }[] = [];
  let redirects: Awaited<ReturnType<typeof seoRepository.listRedirects>> = [];
  let routeCatalog: RouteCatalogEntry[] = [];
  let integrationsConfig: PublicSeoIntegrationsConfig = {};
  let integrationHealth: SeoProviderHealth[] = [];

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
      />
    </Suspense>
  );
}
