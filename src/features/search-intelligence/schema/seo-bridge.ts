/**
 * Compatibility bridge: SEO schema pipeline remains the production emitter while
 * Search Intelligence schema can run in shadow mode for parity checks.
 */
import { SchemaPipeline } from "@/features/seo/platform/schema-pipeline";
import type { SchemaContext } from "@/features/seo/platform/schema-pipeline/types";
import {
  createSchemaPipeline,
  schemaGraphFingerprint,
  type SchemaBuildResult,
  type SchemaGraph,
} from "../schema";
import type { EntityStore, GraphQueryService } from "../entity-graph";

export type SchemaParityResult = {
  legacyFingerprint: string;
  graphFingerprint: string;
  match: boolean;
  legacyTypes: string[];
  graphTypes: string[];
  graphResult: SchemaBuildResult;
};

export function buildLegacySeoSchema(ctx: SchemaContext) {
  return SchemaPipeline.build(ctx);
}

export async function buildGraphSchemaShadow(input: {
  store: EntityStore;
  query: GraphQueryService;
  siteOrigin: string;
  pageUrl: string;
  pageTitle: string;
  pageDescription?: string;
  locale?: string;
}): Promise<SchemaBuildResult> {
  const pipeline = createSchemaPipeline({
    store: input.store,
    query: input.query,
    siteOrigin: input.siteOrigin,
    versionFlags: [{ version: 1, enabled: true, shadowMode: true }],
  });

  return pipeline.buildFromGraph({
    pageUrl: input.pageUrl,
    pageTitle: input.pageTitle,
    pageDescription: input.pageDescription,
    locale: input.locale,
  });
}

export function compareSchemaParity(
  legacyGraph: { "@graph": Array<Record<string, unknown>> },
  graphResult: SchemaBuildResult,
): SchemaParityResult {
  const legacyTypes = (legacyGraph["@graph"] ?? [])
    .map((n) => String(n["@type"] ?? ""))
    .filter(Boolean)
    .sort();
  const graphTypes = (graphResult.graph["@graph"] ?? [])
    .map((n) => String(n["@type"] ?? ""))
    .filter(Boolean)
    .sort();

  const legacyFingerprint = schemaGraphFingerprint(legacyGraph as SchemaGraph);
  const graphFingerprint = schemaGraphFingerprint(graphResult.graph);

  // Soft parity: shared core types rather than exact node equality during migration.
  const core = ["Organization", "WebSite", "WebPage"];
  const match = core.every((t) => legacyTypes.includes(t) === graphTypes.includes(t));

  return {
    legacyFingerprint,
    graphFingerprint,
    match,
    legacyTypes,
    graphTypes,
    graphResult,
  };
}
