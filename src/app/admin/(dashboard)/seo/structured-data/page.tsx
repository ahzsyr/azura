import { seoRepository } from "@/repositories/seo.repository";
import type { SeoStructuredConfig } from "@/features/seo/types";
import { StructuredDataSettingsClient } from "@/features/seo/admin/structured-data-settings-client";
import { prisma } from "@/lib/prisma";
import { loadTranslationsMap, localizedFieldValue } from "@/features/translation/bilingual-serialize";
import { buildStructuredDataAudit } from "@/features/seo/quality/build-structured-data-audit.server";
import { getCompanyInfo } from "@/lib/data";
import { loadSiteBrandContext } from "@/lib/load-site-brand-context";
import { STATIC_SEO_PAGES } from "@/features/seo/constants";
import { resolveSiteOrigin } from "@/features/seo/resolve-site-origin";

export default async function AdminStructuredDataPage() {
  let config: SeoStructuredConfig = {};
  let withJsonLd: { pageKey: string | null; titleEn: string; entityType: string | null }[] = [];
  let initialAudit = null;

  try {
    config = await seoRepository.getStructuredConfig();
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
    initialAudit = await buildStructuredDataAudit("/en");
  } catch {
    // DB unavailable
  }

  const [company, brand, siteOrigin] = await Promise.all([
    getCompanyInfo().catch(() => null),
    loadSiteBrandContext().catch(() => null),
    resolveSiteOrigin("public").catch(() => "https://brt-me.com"),
  ]);

  const sitelinkCandidates = STATIC_SEO_PAGES.filter((page) =>
    ["about", "contact", "products", "services"].includes(page.pageKey),
  ).map((page) => ({
    title: page.label,
    description: `/${page.path.replace(/^\//, "")}`,
  }));

  return (
    <StructuredDataSettingsClient
      config={config}
      withJsonLd={withJsonLd}
      initialAudit={initialAudit}
      sitemapUrl={`${siteOrigin.replace(/\/$/, "")}/sitemap.xml`}
      previewTitle={brand?.brandName ?? company?.name ?? "BRT Trading"}
      previewDescription={
        (company as { localizedLegacy?: Record<string, string> } | null)?.localizedLegacy
          ?.schemaDescriptionEn ?? ""
      }
      previewUrl={initialAudit?.canonicalUrl ?? `${siteOrigin.replace(/\/$/, "")}/en`}
      faviconUrl={brand?.logoUrl ?? null}
      siteName={brand?.brandName ?? company?.name}
      knowledgePanel={{
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
      sitelinkCandidates={sitelinkCandidates}
    />
  );
}
