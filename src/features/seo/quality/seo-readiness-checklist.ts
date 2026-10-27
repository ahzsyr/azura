import "server-only";

import {
  loadPageTargetSiteConfig,
  resolveCurrentSiteKey,
} from "@/features/search-intelligence/content-intelligence/page-target-store";
import { buildOwnershipFindings } from "@/features/search-intelligence/content-intelligence/ownership-findings";
import { listUnassignedPriorityEntities } from "@/features/search-intelligence/content-intelligence/priority-entities";
import { localeService } from "@/features/i18n/locale.service";
import { seoRepository } from "@/repositories/seo.repository";
import { evaluateFacetUrlIndexability } from "./facet-url-indexability";

export type ReadinessStatus = "pass" | "warn" | "fail" | "unknown";

export type ReadinessCheckItem = {
  id: string;
  label: string;
  status: ReadinessStatus;
  detail: string;
};

export type SeoReadinessChecklist = {
  siteKey: string;
  generatedAt: string;
  items: ReadinessCheckItem[];
};

/**
 * Aggregates existing planning/SEO signals into an operator checklist.
 * Status only — not a ranking score.
 */
export async function buildSeoReadinessChecklist(): Promise<SeoReadinessChecklist> {
  const siteKey = await resolveCurrentSiteKey();
  const locales = await localeService.listEnabled();
  const config = await loadPageTargetSiteConfig(siteKey);
  const ownership = buildOwnershipFindings(config);
  const openOwnership = ownership.filter((f) => f.status === "open");
  const activeTargets = config.targets.filter((t) => t.status === "active");
  const draftTargets = config.targets.filter((t) => t.status === "draft");

  const unassignedCounts = locales.map((locale) => ({
    locale: locale.code,
    count: listUnassignedPriorityEntities(config, locale.code).length,
  }));
  const unassignedTotal = unassignedCounts.reduce((sum, row) => sum + row.count, 0);

  const integrations = await seoRepository.getIntegrationsConfig().catch(() => null);
  const google = integrations?.google as
    | { siteUrl?: string; matchedGscSiteUrl?: string; lastSyncAt?: string }
    | undefined;
  const gscConfigured = Boolean(google?.matchedGscSiteUrl || google?.siteUrl);

  let gscFreshness: string | null = null;
  try {
    const metrics = await seoRepository.listSearchMetricsForCompare({ days: 7, source: "google" });
    for (const row of metrics) {
      if (!gscFreshness || row.date.toISOString() > gscFreshness) {
        gscFreshness = row.date.toISOString();
      }
    }
  } catch {
    gscFreshness = null;
  }

  const facetSample = evaluateFacetUrlIndexability(
    "/categories/routers?brand=cisco&page=2",
  );

  const items: ReadinessCheckItem[] = [
    {
      id: "intent-mapping",
      label: "Intent mapping coverage",
      status:
        activeTargets.length === 0
          ? "fail"
          : unassignedTotal > 0
            ? "warn"
            : "pass",
      detail:
        activeTargets.length === 0
          ? "No active page search targets. Assign intents in Content Intelligence."
          : `${activeTargets.length} active · ${draftTargets.length} draft · ${unassignedTotal} unassigned priority entities`,
    },
    {
      id: "keyword-registry",
      label: "Keyword / cluster registry",
      status:
        config.clusters.length === 0
          ? "warn"
          : config.keywords.length === 0
            ? "warn"
            : "pass",
      detail: `${config.clusters.length} clusters · ${config.keywords.length} keywords`,
    },
    {
      id: "ownership-findings",
      label: "Ownership open findings",
      status: openOwnership.length === 0 ? "pass" : "warn",
      detail:
        openOwnership.length === 0
          ? "No open topic ownership overlaps"
          : `${openOwnership.length} open finding(s) awaiting review`,
    },
    {
      id: "gsc-freshness",
      label: "GSC freshness",
      status: !gscConfigured ? "warn" : gscFreshness ? "pass" : "warn",
      detail: !gscConfigured
        ? "GSC property not configured"
        : gscFreshness
          ? `Latest observation ${gscFreshness}`
          : "Property configured but no recent metrics rows",
    },
    {
      id: "facet-index-policy",
      label: "Facet URL index policy",
      status: facetSample.isPriorityIndexable ? "fail" : "pass",
      detail: facetSample.reason,
    },
    {
      id: "sitemap-expectation",
      label: "Sitemap inclusion expectation",
      status: "pass",
      detail:
        "Sitemap builds clean category/brand/product paths only — filter combinations are excluded by design.",
    },
    {
      id: "schema-sample",
      label: "Schema validity sample",
      status: "unknown",
      detail:
        "Run Structured Data audit on a category URL to validate CollectionPage/ItemList emission.",
    },
    {
      id: "metadata-uniqueness",
      label: "Metadata uniqueness sample",
      status: "unknown",
      detail:
        "Sample titles/descriptions via SEO Platform quality tools — not computed here.",
    },
  ];

  return {
    siteKey,
    generatedAt: new Date().toISOString(),
    items,
  };
}
