import "server-only";
import { seoRepository } from "@/repositories/seo.repository";
import {
  editHrefForSeoMeta,
  withResolvedFix,
} from "@/features/seo/workspace/resolve-seo-issue-fix";
import {
  mapWithConcurrency,
  probeUrlStatus,
  resolveAuditProbeOrigin,
  resolveAuditPublicOrigin,
} from "./audit-fetch";
import type { SeoQualityIssue } from "./types";

export const canonicalConflictService = {
  async analyze(): Promise<SeoQualityIssue[]> {
    const [metas, publicOrigin, probeOrigin] = await Promise.all([
      seoRepository.listAllMeta(),
      resolveAuditPublicOrigin(),
      resolveAuditProbeOrigin(),
    ]);
    const issues: SeoQualityIssue[] = [];
    const byCanonical = new Map<string, typeof metas>();

    for (const meta of metas) {
      const canonical = meta.canonicalUrl?.trim();
      if (!canonical) continue;
      const key = canonical.replace(/\/$/, "").toLowerCase();
      byCanonical.set(key, [...(byCanonical.get(key) ?? []), meta]);
    }

    for (const [canonical, rows] of byCanonical) {
      if (rows.length < 2) continue;
      const primary = rows[0]!;
      issues.push(
        withResolvedFix({
          id: `canonical-duplicate-${canonical}`,
          title: "Duplicate canonical URL",
          severity: "warn",
          message: `${rows.length} SEO records point to ${canonical}.`,
          href: editHrefForSeoMeta(primary),
          source: canonical.startsWith("http") ? canonical : undefined,
        }),
      );
    }

    const absoluteMetas = metas
      .filter((row) => row.canonicalUrl?.startsWith("http"))
      .slice(0, 40);

    const probeResults = await mapWithConcurrency(absoluteMetas, 3, async (meta) => {
      const status = await probeUrlStatus(meta.canonicalUrl!, {
        timeoutMs: 8_000,
        publicOrigin,
        probeOrigin,
      });
      return { meta, status };
    });

    for (const { meta, status } of probeResults) {
      if (status == null || status >= 400) {
        issues.push(
          withResolvedFix({
            id: `canonical-target-${meta.id}`,
            title: "Canonical target may be unreachable",
            severity: status == null ? "warn" : "critical",
            message: `${meta.canonicalUrl} returned ${status ?? "no response"}.`,
            href: editHrefForSeoMeta(meta),
            source: meta.canonicalUrl ?? undefined,
          }),
        );
      }
    }

    return issues;
  },
};
