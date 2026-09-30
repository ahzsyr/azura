import type { GraphEntity, PublicEntityId } from "../types";
import type { EntityStore, GraphQueryService } from "../entity-graph";
import { readPropertyValue } from "../entity-graph";
import { createSchemaPipeline, type SchemaBuildResult } from "./index";
import { createSchemaVersionRegistry } from "./version-registry";

/**
 * Graph-backed schema consumer.
 * Builders stay small: they receive already-normalized entity values.
 */
export type GraphSchemaBuilderInput = {
  organization?: GraphEntity | null;
  page: {
    url: string;
    title: string;
    description?: string;
    locale?: string;
  };
  siteOrigin: string;
};

export async function resolveOrganizationFromGraph(
  query: GraphQueryService,
  preferredPublicId?: PublicEntityId,
): Promise<GraphEntity | null> {
  if (preferredPublicId) {
    const preferred = await query.getEntity(preferredPublicId);
    if (preferred) return preferred;
  }
  const orgs = await query.findByType("Organization");
  return orgs[0] ?? null;
}

export async function buildGraphBackedSchema(input: {
  store: EntityStore;
  query: GraphQueryService;
  siteOrigin: string;
  pageUrl: string;
  pageTitle: string;
  pageDescription?: string;
  locale?: string;
  enableProduction?: boolean;
}): Promise<SchemaBuildResult> {
  const versions = createSchemaVersionRegistry([
    {
      version: 1,
      enabled: true,
      shadowMode: !input.enableProduction,
    },
  ]);

  const pipeline = createSchemaPipeline({
    store: input.store,
    query: input.query,
    siteOrigin: input.siteOrigin,
    versionFlags: versions.list(),
  });

  return pipeline.buildFromGraph({
    pageUrl: input.pageUrl,
    pageTitle: input.pageTitle,
    pageDescription: input.pageDescription,
    locale: input.locale,
  });
}

/** Extract stable schema-facing fields from an organization entity (no DB ids). */
export function organizationSchemaFields(entity: GraphEntity) {
  return {
    publicId: entity.publicId,
    name: readPropertyValue<string>(entity, "name"),
    legalName: readPropertyValue<string>(entity, "legalName"),
    logo: readPropertyValue<string>(entity, "logo"),
    phone: readPropertyValue<string>(entity, "phone"),
    email: readPropertyValue<string>(entity, "email"),
    address: readPropertyValue<string>(entity, "address"),
    sameAs: readPropertyValue<string[]>(entity, "sameAs") ?? [],
    geo: readPropertyValue<{ latitude: number; longitude: number }>(entity, "geo"),
  };
}
