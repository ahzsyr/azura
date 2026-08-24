import "server-only";
import { generateSitemap } from "@/features/seo/sitemap.service";
import { withResolvedFix } from "@/features/seo/workspace/resolve-seo-issue-fix";
import {
  mapWithConcurrency,
  normalizeAuditUrl,
  probeHtml,
  resolveAuditProbeOrigin,
  resolveAuditPublicOrigin,
} from "./audit-fetch";
import type { SeoQualityIssue } from "./types";

function extractLinks(html: string, baseUrl: string, siteUrl: string) {
  const links = new Set<string>();
  for (const match of html.matchAll(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    const href = match[1];
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    const url = normalizeAuditUrl(new URL(href, baseUrl).href, siteUrl);
    if (url.startsWith(siteUrl)) links.add(url);
  }
  return links;
}

function extractCanonical(html: string, baseUrl: string, siteUrl: string) {
  const match = html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i);
  if (!match?.[1]) return null;
  return normalizeAuditUrl(new URL(match[1], baseUrl).href, siteUrl);
}

function extractHreflangs(html: string) {
  return [...html.matchAll(/<link\s+[^>]*rel=["']alternate["'][^>]*hreflang=["']([^"']+)["'][^>]*href=["']([^"']+)["'][^>]*>/gi)]
    .map((match) => ({ lang: match[1], href: match[2] }))
    .filter((entry): entry is { lang: string; href: string } => Boolean(entry.lang && entry.href));
}

export const crawlDiagnosticsService = {
  async analyze(limit = 50): Promise<SeoQualityIssue[]> {
    const [sitemap, publicOrigin, probeOrigin] = await Promise.all([
      generateSitemap(),
      resolveAuditPublicOrigin(),
      resolveAuditProbeOrigin(),
    ]);
    const siteUrl = publicOrigin;
    const sitemapUrls = sitemap.map((entry) => normalizeAuditUrl(entry.url, siteUrl));
    const crawledUrls = sitemapUrls.slice(0, limit);
    const linked = new Set<string>();
    const issues: SeoQualityIssue[] = [];

    const crawlResults = await mapWithConcurrency(crawledUrls, 3, async (url) => {
      const result = await probeHtml(url, {
        timeoutMs: 8_000,
        publicOrigin: siteUrl,
        probeOrigin,
      });
      return { url, result };
    });

    for (const { url, result } of crawlResults) {
      if (result.status == null || result.status >= 500 || result.status === 404 || result.status === 410) {
        issues.push(
          withResolvedFix({
            id: `crawl-status-${url}`,
            title: "Crawl failure detected",
            severity: result.status == null ? "warn" : "critical",
            message: `${url} returned ${result.status ?? "no response"} during internal crawl.`,
            source: url,
          }),
        );
        continue;
      }
      if (!result.html) continue;
      for (const href of extractLinks(result.html, url, siteUrl)) linked.add(href);

      const canonical = extractCanonical(result.html, url, siteUrl);
      if (canonical && !sitemapUrls.includes(canonical) && canonical.startsWith(siteUrl)) {
        issues.push(
          withResolvedFix({
            id: `crawl-canonical-mismatch-${url}`,
            title: "Canonical target is not in sitemap",
            severity: "warn",
            message: `${url} canonical points to ${canonical}, which was not found in the sitemap.`,
            source: url,
          }),
        );
      }

      const hreflangs = extractHreflangs(result.html);
      if (hreflangs.length === 0) {
        issues.push(
          withResolvedFix({
            id: `crawl-hreflang-missing-${url}`,
            title: "Missing hreflang alternates",
            severity: "info",
            message: `${url} does not expose alternate hreflang links in rendered HTML.`,
            source: url,
          }),
        );
      }
    }

    for (const url of sitemapUrls.slice(0, limit)) {
      if (url === siteUrl || linked.has(url)) continue;
      issues.push(
        withResolvedFix({
          id: `crawl-orphan-${url}`,
          title: "Potential orphan page",
          severity: "warn",
          message: `${url} is in the sitemap but was not linked from crawled internal pages.`,
          source: url,
        }),
      );
    }

    return issues;
  },
};
