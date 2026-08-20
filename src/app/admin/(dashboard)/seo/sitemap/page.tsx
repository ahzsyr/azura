import { seoRepository } from "@/repositories/seo.repository";
import type { SeoSitemapConfig, SeoSitemapPreviewEntry } from "@/features/seo/types";
import { SitemapSettingsClient } from "@/features/seo/admin/sitemap-settings-client";
import { resolveSiteOrigin } from "@/features/seo/resolve-site-origin";
import {
  formatSitemapXml,
  generateSitemap,
} from "@/features/seo/sitemap.service";
import { getEnabledUrlPrefixes } from "@/i18n/locale-registry.server";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";
import { STATIC_SEO_PAGES } from "@/features/seo/constants";

export default async function AdminSitemapPage() {
  let config: SeoSitemapConfig = {};
  let entries: SeoSitemapPreviewEntry[] = [];
  let sitemapXml = "";
  let localePrefixes = FALLBACK_LOCALES.map((l) => l.urlPrefix);

  const siteUrl = (await resolveSiteOrigin("admin-preview")).replace(/\/$/, "");
  const sitemapUrl = `${siteUrl}/sitemap.xml`;

  try {
    config = await seoRepository.getSitemapConfig();
  } catch {
    // DB unavailable
  }

  try {
    localePrefixes = await getEnabledUrlPrefixes();
    if (localePrefixes.length === 0) {
      localePrefixes = FALLBACK_LOCALES.map((l) => l.urlPrefix);
    }
  } catch {
    // keep fallbacks
  }

  try {
    const generated = await generateSitemap(siteUrl);
    entries = generated.map((entry) => ({
      url: entry.url,
      lastModified:
        entry.lastModified instanceof Date
          ? entry.lastModified.toISOString()
          : entry.lastModified
            ? String(entry.lastModified)
            : undefined,
      changeFrequency: entry.changeFrequency ? String(entry.changeFrequency) : undefined,
      priority: typeof entry.priority === "number" ? entry.priority : undefined,
    }));
    sitemapXml = formatSitemapXml(generated);
  } catch {
    sitemapXml = "<!-- Failed to generate sitemap preview -->\n";
  }

  const staticPages = STATIC_SEO_PAGES.map((p) => ({
    pageKey: p.pageKey,
    label: p.label,
    path: p.path === "" ? "/" : p.path,
  }));

  return (
    <SitemapSettingsClient
      config={config}
      sitemapUrl={sitemapUrl}
      siteOrigin={siteUrl}
      localePrefixes={localePrefixes}
      entries={entries}
      sitemapXml={sitemapXml}
      staticPages={staticPages}
    />
  );
}
