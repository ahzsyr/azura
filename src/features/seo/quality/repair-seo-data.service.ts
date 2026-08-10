import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { seoRepository } from "@/repositories/seo.repository";
import {
  isLocaleLessProductCanonical,
  normalizeCanonicalUrlForPageKey,
} from "@/features/seo/normalize-canonical-url";
import { getStaticSeoPage, isStaticSeoPageKey } from "@/features/seo/constants";
import { routing } from "@/i18n/routing";

function asObjects(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
  }
  if (typeof value === "object" && value !== null) return [value as Record<string, unknown>];
  return [];
}

function isIncompleteProductJsonLd(value: unknown): boolean {
  return asObjects(value).some((item) => item["@type"] === "Product" && (!item.name || !item.offers));
}

export type SeoDataRepairReport = {
  productCanonicalsFixed: number;
  staticCanonicalsFixed: number;
  duplicateCanonicalsCleared: number;
  incompleteProductJsonLdCleared: number;
  utilityNoIndexApplied: number;
};

const UTILITY_NOINDEX_KEYS = new Set(["compare", "favorites", "account"]);

/**
 * Repair common SEO data issues before/alongside site audit:
 * - locale-less product/static canonicals
 * - duplicate absolute canonicals (keep primary pageKey's expected path)
 * - incomplete Product JSON-LD overrides on product:* keys
 * - noindex on utility pages that should not be sitemap orphans
 */
export async function repairSeoDataIssues(): Promise<SeoDataRepairReport> {
  const metas = await seoRepository.listAllMeta();
  const report: SeoDataRepairReport = {
    productCanonicalsFixed: 0,
    staticCanonicalsFixed: 0,
    duplicateCanonicalsCleared: 0,
    incompleteProductJsonLdCleared: 0,
    utilityNoIndexApplied: 0,
  };

  for (const meta of metas) {
    const pageKey = meta.pageKey;
    if (!pageKey) continue;

    // Fix locale-less product canonicals
    if (meta.canonicalUrl && isLocaleLessProductCanonical(pageKey, meta.canonicalUrl)) {
      const next = normalizeCanonicalUrlForPageKey(pageKey, meta.canonicalUrl);
      if (next && next !== meta.canonicalUrl) {
        await prisma.seoMeta.update({
          where: { id: meta.id },
          data: { canonicalUrl: next },
        });
        report.productCanonicalsFixed += 1;
        meta.canonicalUrl = next;
      }
    } else if (meta.canonicalUrl && isStaticSeoPageKey(pageKey)) {
      const next = normalizeCanonicalUrlForPageKey(pageKey, meta.canonicalUrl);
      if (next && next !== meta.canonicalUrl) {
        await prisma.seoMeta.update({
          where: { id: meta.id },
          data: { canonicalUrl: next },
        });
        report.staticCanonicalsFixed += 1;
        meta.canonicalUrl = next;
      }
    }

    // Clear incomplete Product JSON-LD overrides (pipeline generates valid schema)
    if (pageKey.startsWith("product:") && meta.jsonLd != null && isIncompleteProductJsonLd(meta.jsonLd)) {
      await prisma.seoMeta.update({
        where: { id: meta.id },
        data: { jsonLd: Prisma.DbNull },
      });
      report.incompleteProductJsonLdCleared += 1;
    }

    // Utility pages: prefer noindex so they drop out of sitemap when empty/partial
    if (UTILITY_NOINDEX_KEYS.has(pageKey)) {
      const robots = (meta.robots ?? "").toLowerCase();
      if (!robots.includes("noindex")) {
        await prisma.seoMeta.update({
          where: { id: meta.id },
          data: { robots: "noindex, follow" },
        });
        report.utilityNoIndexApplied += 1;
      }
    }
  }

  // Resolve duplicate absolute canonicals: keep expected path for static pageKey, clear others
  const refreshed = await seoRepository.listAllMeta();
  const byCanonical = new Map<string, typeof refreshed>();
  for (const meta of refreshed) {
    const canonical = meta.canonicalUrl?.trim();
    if (!canonical?.startsWith("http")) continue;
    const key = canonical.replace(/\/$/, "").toLowerCase();
    byCanonical.set(key, [...(byCanonical.get(key) ?? []), meta]);
  }

  for (const [, rows] of byCanonical) {
    if (rows.length < 2) continue;

    // Prefer the row whose pageKey path matches the canonical path
    let keeper = rows.find((row) => {
      if (!row.pageKey || !isStaticSeoPageKey(row.pageKey)) return false;
      const page = getStaticSeoPage(row.pageKey);
      const expected = `/${routing.defaultLocale}${page?.path || ""}`.replace(/\/$/, "") || `/${routing.defaultLocale}`;
      try {
        const path = new URL(row.canonicalUrl!).pathname.replace(/\/$/, "") || "/";
        return path === expected || path === `${expected}/`;
      } catch {
        return false;
      }
    });
    if (!keeper) keeper = rows.find((row) => row.pageKey === "services") ?? rows[0];

    for (const row of rows) {
      if (row.id === keeper!.id) continue;
      // Clear conflicting canonical so only one record owns it
      await prisma.seoMeta.update({
        where: { id: row.id },
        data: { canonicalUrl: null },
      });
      report.duplicateCanonicalsCleared += 1;
    }
  }

  return report;
}
