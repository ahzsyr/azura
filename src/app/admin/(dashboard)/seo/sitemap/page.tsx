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
import { SeoHealthLayout } from "@/features/seo/operator/components/seo-health-layout";
import { SitemapQuickActions } from "@/features/seo/operator/components/sitemap-quick-actions";
import { classifySitemapUrl, SITEMAP_CHUNK_SIZE } from "@/features/seo/sitemap-index.service";

export default async function AdminSitemapPage() {
  let config: SeoSitemapConfig = {};
  let entries: SeoSitemapPreviewEntry[] = [];
  let sitemapXml = "";
  let localePrefixes = FALLBACK_LOCALES.map((l) => l.urlPrefix);

  const siteUrl = (await resolveSiteOrigin("admin-preview")).replace(/\/$/, "");
  const sitemapUrl = `${siteUrl}/sitemap_index.xml`;

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

  const bucketLabels: Record<string, string> = {
    product: "Products",
    page: "Pages",
    post: "Blog",
    category: "Categories",
    brand: "Brands",
  };
  const bucketCounts: Record<string, number> = {
    product: 0,
    page: 0,
    post: 0,
    category: 0,
    brand: 0,
  };
  for (const entry of entries) {
    bucketCounts[classifySitemapUrl(entry.url)] += 1;
  }
  const typedFiles = Object.values(bucketCounts).reduce((sum, count) => {
    if (count === 0) return sum;
    return sum + Math.max(1, Math.ceil(count / SITEMAP_CHUNK_SIZE));
  }, 0);
  const fileCount = Math.max(1, typedFiles);

  return (
    <SeoHealthLayout
      title="Sitemap"
      status={entries.length > 0 ? "healthy" : "attention"}
      stats={[
        { label: "URLs", value: entries.length.toLocaleString() },
        { label: "Sitemap files", value: String(fileCount) },
        { label: "Sitemap index", value: sitemapUrl },
        { label: "Last generated", value: "Just now (on this page)" },
        ...Object.entries(bucketCounts).map(([type, count]) => ({
          label: bucketLabels[type] ?? type,
          value: count.toLocaleString(),
        })),
      ]}
      attention={entries.length === 0 ? ["The sitemap currently has no URLs."] : []}
      immediate={<SitemapQuickActions sitemapUrl={sitemapUrl} />}
      advanced={
        <SitemapSettingsClient
            config={config}
            sitemapUrl={sitemapUrl}
            siteOrigin={siteUrl}
            localePrefixes={localePrefixes}
            entries={entries}
            sitemapXml={sitemapXml}
            staticPages={staticPages}
            embedded
          />
      }
    />
  );
}
