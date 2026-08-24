import "server-only";

import { SchemaPipeline } from "@/features/seo/platform/schema-pipeline";
import { buildSchemaContext } from "@/features/seo/platform/schema-pipeline/context/build-schema-context.server";
import type { SchemaPageOverrides } from "@/features/seo/platform/schema-pipeline/context/schema-page-overrides";
import { StructuredDataRenderer } from "./structured-data-renderer";
import { syncOrganizationGraphFromCompany } from "@/features/search-intelligence/seo-consumer";

type Props = {
  overrides?: SchemaPageOverrides;
};

/**
 * Production JSON-LD still comes from the SEO SchemaPipeline.
 * Search Intelligence syncs the shared entity graph in the background for
 * schema shadow parity, linking, and future graph-backed builders.
 */
export async function StructuredDataGraph({ overrides }: Props = {}) {
  const ctx = await buildSchemaContext(overrides);
  if (!ctx) return null;

  void syncOrganizationGraphFromCompany().catch(() => {
    // Graph sync must not block public rendering.
  });

  const { graph } = SchemaPipeline.build(ctx);
  if (!graph["@graph"].length) return null;

  return <StructuredDataRenderer graph={graph} />;
}

export async function buildStructuredDataResult(overrides?: SchemaPageOverrides) {
  const ctx = await buildSchemaContext(overrides);
  if (!ctx) return null;
  const result = SchemaPipeline.build(ctx);
  return { ...result, context: ctx };
}
