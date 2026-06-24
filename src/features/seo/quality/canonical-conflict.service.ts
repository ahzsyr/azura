import "server-only";
import { seoRepository } from "@/repositories/seo.repository";
import type { SeoQualityIssue } from "./types";

function editHref(meta: { pageKey: string | null; cmsPageId: string | null; postId: string | null }) {
  if (meta.pageKey) return `/admin/seo?tab=pages&page=${meta.pageKey}`;
  if (meta.cmsPageId) return `/admin/pages/${meta.cmsPageId}`;
  if (meta.postId) return `/admin/posts/${meta.postId}`;
  return "/admin/seo";
}

async function checkCanonicalTarget(url: string, signal: AbortSignal) {
  try {
    const response = await fetch(url, { method: "HEAD", signal, cache: "no-store" });
    return response.status;
  } catch {
    return null;
  }
}

export const canonicalConflictService = {
  async analyze(): Promise<SeoQualityIssue[]> {
    const metas = await seoRepository.listAllMeta();
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
      issues.push({
        id: `canonical-duplicate-${canonical}`,
        title: "Duplicate canonical URL",
        severity: "warn",
        message: `${rows.length} SEO records point to ${canonical}.`,
        href: editHref(rows[0]!),
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    try {
      for (const meta of metas.filter((row) => row.canonicalUrl?.startsWith("http")).slice(0, 20)) {
        const status = await checkCanonicalTarget(meta.canonicalUrl!, controller.signal);
        if (status == null || status >= 400) {
          issues.push({
            id: `canonical-target-${meta.id}`,
            title: "Canonical target may be unreachable",
            severity: status == null ? "warn" : "critical",
            message: `${meta.canonicalUrl} returned ${status ?? "no response"}.`,
            href: editHref(meta),
          });
        }
      }
    } finally {
      clearTimeout(timeout);
    }

    return issues;
  },
};
