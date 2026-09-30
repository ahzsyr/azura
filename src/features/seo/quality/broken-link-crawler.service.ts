import "server-only";
import { generateSitemap } from "@/features/seo/sitemap.service";
import { withResolvedFix } from "@/features/seo/workspace/resolve-seo-issue-fix";
import {
  mapWithConcurrency,
  probeUrlStatus,
  resolveAuditProbeOrigin,
  resolveAuditPublicOrigin,
} from "./audit-fetch";
import type { SeoQualityIssue } from "./types";

export const brokenLinkCrawlerService = {
  async analyze(limit = 40): Promise<SeoQualityIssue[]> {
    const [entries, publicOrigin, probeOrigin] = await Promise.all([
      generateSitemap(),
      resolveAuditPublicOrigin(),
      resolveAuditProbeOrigin(),
    ]);
    const issues: SeoQualityIssue[] = [];
    const sample = entries.slice(0, limit);

    const results = await mapWithConcurrency(sample, 3, async (entry) => {
      const status = await probeUrlStatus(entry.url, {
        timeoutMs: 8_000,
        publicOrigin,
        probeOrigin,
      });
      return { url: entry.url, status };
    });

    for (const { url, status } of results) {
      if (status == null || status >= 400) {
        issues.push(
          withResolvedFix({
            id: `sitemap-url-${url}`,
            title: "Sitemap URL may be broken",
            severity: status == null ? "warn" : "critical",
            message: `${url} returned ${status ?? "no response"}.`,
            source: url,
          }),
        );
      }
    }

    return issues;
  },
};
