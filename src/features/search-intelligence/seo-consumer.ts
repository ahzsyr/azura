import "server-only";

import { getCompanyInfo } from "@/lib/data";
import { resolveSiteOrigin } from "@/features/seo/resolve-site-origin";
import {
  createSearchIntelligencePlatform,
  getSearchIntelligencePlatform,
  type SearchIntelligencePlatform,
} from "./platform";
import { buildGraphSchemaShadow, compareSchemaParity } from "./schema/seo-bridge";
import type { SchemaContext } from "@/features/seo/platform/schema-pipeline/types";
import { SchemaPipeline } from "@/features/seo/platform/schema-pipeline";

/**
 * SEO consumer of the Search Intelligence Platform.
 * Keeps production schema emission in the SEO pipeline while syncing the shared graph.
 */
export async function syncOrganizationGraphFromCompany(
  platform?: SearchIntelligencePlatform,
): Promise<SearchIntelligencePlatform> {
  const si = platform ?? getSearchIntelligencePlatform({
    siteOrigin: await resolveSiteOrigin("public"),
  });
  const company = await getCompanyInfo().catch(() => null);
  await si.ingestCompanyProfile(company);
  return si;
}

export async function runSeoSchemaShadowParity(ctx: SchemaContext) {
  const siteOrigin = ctx.runtime.siteOrigin;
  const platform = createSearchIntelligencePlatform({ siteOrigin });
  await platform.ingestCompanyProfile(ctx.site.company);

  const legacy = SchemaPipeline.build(ctx);
  const graphResult = await buildGraphSchemaShadow({
    store: platform.store,
    query: platform.query,
    siteOrigin,
    pageUrl: ctx.runtime.canonicalUrl,
    pageTitle: ctx.page.title || "Page",
    pageDescription: ctx.page.description,
    locale: ctx.runtime.locale,
  });

  return compareSchemaParity(legacy.graph, graphResult);
}

export async function getSearchIntelligenceOverview() {
  const siteOrigin = await resolveSiteOrigin("public");
  const platform = getSearchIntelligencePlatform({ siteOrigin });
  await syncOrganizationGraphFromCompany(platform);

  const entities = await platform.store.entities.list();
  const relationships = await platform.store.relationships.list();
  const content = await platform.contentIntelligence();
  const dashboard = platform.dashboard();

  return {
    siteOrigin,
    entityCount: entities.length,
    relationshipCount: relationships.length,
    entityTypes: [...new Set(entities.map((e: { type: string }) => e.type))].sort(),
    contentGaps: content.gaps.slice(0, 10),
    cannibalization: content.cannibalization.slice(0, 10),
    dashboard,
    connectors: platform.connectors.listHealth(),
    auditEvents: platform.auditLog.list().slice(-20).reverse(),
    organizations: entities.filter((e: { type: string }) => e.type === "Organization"),
  };
}
