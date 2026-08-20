import "server-only";

import { buildSchemaContext } from "@/features/seo/platform/schema-pipeline/context/build-schema-context.server";
import { SchemaPipeline } from "@/features/seo/platform/schema-pipeline";
import { auditSchemaGraph } from "@/features/seo/quality/schema-graph-audit.service";
import { auditPublicHtml } from "@/features/seo/quality/public-schema-audit.service";
import type {
  PublicHtmlAuditResult,
  StructuredDataAuditBundle,
} from "@/features/seo/quality/schema-graph-audit.types";

export type { StructuredDataAuditBundle } from "@/features/seo/quality/schema-graph-audit.types";

export async function buildStructuredDataAudit(
  pathname = "/en",
): Promise<StructuredDataAuditBundle | null> {
  const ctx = await buildSchemaContext({ pathname });
  if (!ctx) return null;

  const { graph } = SchemaPipeline.build(ctx);
  const graphAudit = auditSchemaGraph(graph, ctx);

  let publicAudit: PublicHtmlAuditResult | null = null;
  try {
    publicAudit = await auditPublicHtml({
      urlOrPath: ctx.runtime.canonicalUrl,
      generatedGraph: graph,
      seoMetaJsonLdInDatabase: ctx.page.seoMetaJsonLdInDatabase,
      canonicalExpected: ctx.runtime.canonicalUrl,
    });
  } catch {
    publicAudit = null;
  }

  return {
    pathname,
    canonicalUrl: ctx.runtime.canonicalUrl,
    graphJson: JSON.stringify(graph, null, 2),
    graphAudit,
    publicAudit,
  };
}
