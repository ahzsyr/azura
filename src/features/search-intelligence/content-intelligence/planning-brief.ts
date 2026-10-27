import "server-only";

import { buildOwnershipFindings } from "./ownership-findings";
import type { ClusterContentType } from "./keyword-registry";
import type { SearchIntent } from "./page-search-target";
import {
  upsertKeywordCluster,
  upsertKeywordRecord,
  upsertPageSearchTarget,
} from "./page-target-store";

export type PlanningBriefResult = {
  ok: true;
  brief: {
    primaryTopic: string;
    pageType: ClusterContentType;
    locale: string;
    requiredH1: string;
    introGuidance: string;
    internalLinks: string[];
    schemaType: string;
    sitemapExpectation: string;
    ownershipWarnings: string[];
  };
  clusterId: string;
  targetId?: string;
  keywordIds: string[];
};

const SCHEMA_BY_TYPE: Record<ClusterContentType, string> = {
  category: "CollectionPage + ItemList + BreadcrumbList",
  product: "Product + Offer + BreadcrumbList",
  article: "Article + BreadcrumbList",
  brand: "CollectionPage (brand) + BreadcrumbList",
  page: "WebPage + BreadcrumbList",
};

function entityTypeForPageType(pageType: ClusterContentType): string {
  switch (pageType) {
    case "category":
      return "CATEGORY";
    case "brand":
      return "BRAND";
    case "product":
      return "PRODUCT";
    case "article":
      return "POST";
    default:
      return "pageKey";
  }
}

/**
 * Creates draft cluster + optional page target + draft keywords.
 * Does not publish CMS pages or commit live SeoMeta.
 */
export async function createPlanningBrief(input: {
  siteKey: string;
  currentSiteKey: string;
  enabledLocales: string[];
  primaryTopic: string;
  pageType: ClusterContentType;
  locale: string;
  relatedKeywords?: string[];
  audience?: string;
  location?: string;
  entityType?: string;
  entityId?: string;
  intent: SearchIntent;
  updatedBy?: string;
}): Promise<PlanningBriefResult | { ok: false; message: string }> {
  const topic = input.primaryTopic.trim();
  if (!topic) return { ok: false, message: "primaryTopic is required" };

  const entityType = input.entityType?.trim() || entityTypeForPageType(input.pageType);
  const entityId = input.entityId?.trim();

  const clusterResult = await upsertKeywordCluster({
    currentSiteKey: input.currentSiteKey,
    cluster: {
      siteKey: input.siteKey,
      name: topic,
      primaryTopic: topic,
      synonyms: input.relatedKeywords ?? [],
      audience: input.audience,
      location: input.location,
      contentType: input.pageType,
      primaryEntity: entityId ? { type: entityType, id: entityId } : undefined,
      updatedBy: input.updatedBy,
    },
  });
  if (!clusterResult.ok) {
    return { ok: false, message: clusterResult.errors.map((e) => e.message).join("; ") };
  }

  const keywordIds: string[] = [];
  const related = [topic, ...(input.relatedKeywords ?? [])]
    .map((k) => k.trim())
    .filter(Boolean);
  const unique = [...new Set(related)];

  for (const keyword of unique) {
    const kw = await upsertKeywordRecord({
      currentSiteKey: input.currentSiteKey,
      enabledLocales: input.enabledLocales,
      keyword: {
        siteKey: input.siteKey,
        keyword,
        locale: input.locale,
        intent: input.intent,
        clusterId: clusterResult.cluster.id,
        assignedEntity: entityId ? { type: entityType, id: entityId } : undefined,
        status: entityId ? "assigned" : "draft",
        updatedBy: input.updatedBy,
      },
    });
    if (kw.ok) keywordIds.push(kw.keyword.id);
  }

  let targetId: string | undefined;
  const ownershipWarnings: string[] = [];
  if (entityId) {
    const target = await upsertPageSearchTarget({
      currentSiteKey: input.currentSiteKey,
      enabledLocales: input.enabledLocales,
      target: {
        siteKey: input.siteKey,
        entity: { type: entityType, id: entityId },
        locale: input.locale,
        primaryTopic: topic,
        supportingTopics: (input.relatedKeywords ?? []).slice(0, 5),
        intent: input.intent,
        clusterId: clusterResult.cluster.id,
        status: "draft",
        updatedBy: input.updatedBy,
      },
    });
    if (target.ok) {
      targetId = target.target.id;
      const findings = buildOwnershipFindings(target.config).filter((f) => f.status === "open");
      for (const f of findings) {
        if (f.normalizedTopic === topic.toLowerCase() || f.locale === input.locale) {
          ownershipWarnings.push(
            `Possible topic overlap for “${f.primaryTopicSample}” (${f.targets.length} pages)`,
          );
        }
      }
    } else {
      return { ok: false, message: target.errors.map((e) => e.message).join("; ") };
    }
  }

  return {
    ok: true,
    clusterId: clusterResult.cluster.id,
    targetId,
    keywordIds,
    brief: {
      primaryTopic: topic,
      pageType: input.pageType,
      locale: input.locale,
      requiredH1: `Clear H1 reflecting “${topic}” for ${input.pageType} intent`,
      introGuidance:
        "Write a unique introduction that explains what this page covers and who it helps. Do not keyword-stuff.",
      internalLinks: [
        "Link to parent category or hub",
        "Link to relevant products or subcategories with descriptive anchors",
        "Link to a related buying guide when available",
      ],
      schemaType: SCHEMA_BY_TYPE[input.pageType],
      sitemapExpectation:
        "Page must be indexable, canonical, and included in sitemap after publish — not filter/facet URLs.",
      ownershipWarnings,
    },
  };
}
