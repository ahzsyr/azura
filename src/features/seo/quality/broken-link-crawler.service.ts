import "server-only";
import { generateSitemap } from "@/features/seo/sitemap.service";
import type { SeoQualityIssue } from "./types";

async function probeUrl(url: string, signal: AbortSignal) {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      cache: "no-store",
      signal,
    });
    return response.status;
  } catch {
    return null;
  }
}

export const brokenLinkCrawlerService = {
  async analyze(limit = 25): Promise<SeoQualityIssue[]> {
    const entries = await generateSitemap();
    const issues: SeoQualityIssue[] = [];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);

    try {
      for (const entry of entries.slice(0, limit)) {
        const status = await probeUrl(entry.url, controller.signal);
        if (status == null || status >= 400) {
          issues.push({
            id: `sitemap-url-${entry.url}`,
            title: "Sitemap URL may be broken",
            severity: status == null ? "warn" : "critical",
            message: `${entry.url} returned ${status ?? "no response"}.`,
            source: entry.url,
          });
        }
      }
    } finally {
      clearTimeout(timeout);
    }

    return issues;
  },
};
