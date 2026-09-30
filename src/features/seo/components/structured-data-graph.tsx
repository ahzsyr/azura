import "server-only";

import { headers } from "next/headers";
import { StructuredDataRenderer } from "./structured-data-renderer";
import { syncOrganizationGraphFromCompany } from "@/features/search-intelligence/seo-consumer";
import type { SchemaPageOverrides } from "@/features/seo/platform/schema-pipeline/context/schema-page-overrides";
import { buildSchemaContext } from "@/features/seo/platform/schema-pipeline/context/build-schema-context.server";
import { SchemaPipeline } from "@/features/seo/platform/schema-pipeline";

type Props = {
  overrides?: SchemaPageOverrides;
};

/**
 * Production JSON-LD via SchemaPipeline.
 * Must never throw — schema failures must not take down marketing pages.
 * Does not call resolveSeoDocument (cached) to avoid headers()-inside-cache crashes.
 */
export async function StructuredDataGraph({ overrides }: Props = {}) {
  try {
    let pathname = overrides?.pathname;
    if (!pathname) {
      try {
        const headerStore = await headers();
        pathname = headerStore.get("x-pathname") ?? "/";
      } catch {
        pathname = "/";
      }
    }

    const result = await buildStructuredDataResult({
      ...overrides,
      pathname,
    });

    void syncOrganizationGraphFromCompany().catch(() => {
      // Graph sync must not block public rendering.
    });

    const graph = result?.graph;
    if (!graph?.["@graph"]?.length) return null;

    return <StructuredDataRenderer graph={graph} />;
  } catch (error) {
    console.error("[StructuredDataGraph] failed; omitting JSON-LD:", error);
    return null;
  }
}

/** Builds schema graph using document canonical — called from SeoResolver only. */
export async function buildStructuredDataResult(overrides?: SchemaPageOverrides) {
  try {
    const ctx = await buildSchemaContext(overrides);
    if (!ctx) return null;

    const { graph, issues, diagnostics } = SchemaPipeline.build(ctx);
    return { graph, context: ctx, issues, diagnostics };
  } catch (error) {
    console.error("[buildStructuredDataResult] failed:", error);
    return null;
  }
}
