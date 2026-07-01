import "server-only";
import { generateSitemap } from "@/features/seo/sitemap.service";
import type { SeoQualityIssue } from "./types";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

function normalizeUrl(raw: string) {
  try {
    return new URL(raw, siteUrl).href.replace(/\/$/, "");
  } catch {
    return raw.replace(/\/$/, "");
  }
}

function extractLinks(html: string, baseUrl: string) {
  const links = new Set<string>();
  for (const match of html.matchAll(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    const href = match[1];
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    const url = normalizeUrl(new URL(href, baseUrl).href);
    if (url.startsWith(siteUrl)) links.add(url);
  }
  return links;
}

function extractCanonical(html: string, baseUrl: string) {
  const match = html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i);
  if (!match?.[1]) return null;
  return normalizeUrl(new URL(match[1], baseUrl).href);
}

function extractHreflangs(html: string) {
  return [...html.matchAll(/<link\s+[^>]*rel=["']alternate["'][^>]*hreflang=["']([^"']+)["'][^>]*href=["']([^"']+)["'][^>]*>/gi)]
    .map((match) => ({ lang: match[1], href: match[2] }))
    .filter((entry): entry is { lang: string; href: string } => Boolean(entry.lang && entry.href));
}

async function fetchHtml(url: string, signal: AbortSignal) {
  try {
    const response = await fetch(url, { cache: "no-store", signal });
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok) return { status: response.status, html: "" };
    if (!contentType.includes("text/html")) return { status: response.status, html: "" };
    return { status: response.status, html: await response.text() };
  } catch {
    return { status: null, html: "" };
  }
}

export const crawlDiagnosticsService = {
  async analyze(limit = 20): Promise<SeoQualityIssue[]> {
    const sitemap = await generateSitemap();
    const sitemapUrls = sitemap.map((entry) => normalizeUrl(entry.url));
    const crawledUrls = sitemapUrls.slice(0, limit);
    const linked = new Set<string>();
    const issues: SeoQualityIssue[] = [];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);

    try {
      for (const url of crawledUrls) {
        const result = await fetchHtml(url, controller.signal);
        if (result.status == null || result.status >= 500 || result.status === 404 || result.status === 410) {
          issues.push({
            id: `crawl-status-${url}`,
            title: "Crawl failure detected",
            severity: result.status == null ? "warn" : "critical",
            message: `${url} returned ${result.status ?? "no response"} during internal crawl.`,
            source: url,
          });
          continue;
        }
        if (!result.html) continue;
        for (const href of extractLinks(result.html, url)) linked.add(href);

        const canonical = extractCanonical(result.html, url);
        if (canonical && !sitemapUrls.includes(canonical) && canonical.startsWith(siteUrl)) {
          issues.push({
            id: `crawl-canonical-mismatch-${url}`,
            title: "Canonical target is not in sitemap",
            severity: "warn",
            message: `${url} canonical points to ${canonical}, which was not found in the sitemap.`,
            source: url,
          });
        }

        const hreflangs = extractHreflangs(result.html);
        if (hreflangs.length === 0) {
          issues.push({
            id: `crawl-hreflang-missing-${url}`,
            title: "Missing hreflang alternates",
            severity: "info",
            message: `${url} does not expose alternate hreflang links in rendered HTML.`,
            source: url,
          });
        }
      }
    } finally {
      clearTimeout(timeout);
    }

    for (const url of sitemapUrls.slice(0, limit)) {
      if (url === siteUrl || linked.has(url)) continue;
      issues.push({
        id: `crawl-orphan-${url}`,
        title: "Potential orphan page",
        severity: "warn",
        message: `${url} is in the sitemap but was not linked from crawled internal pages.`,
        source: url,
      });
    }

    return issues;
  },
};
