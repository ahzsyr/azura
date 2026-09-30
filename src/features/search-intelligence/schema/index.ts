import type { GraphEntity, GraphRelationship, PublicEntityId, SchemaVersionFlag } from "../types";
import type { EntityStore, GraphQueryService } from "../entity-graph";
import { readPropertyValue } from "../entity-graph";
import { ORGANIZATION_CORE_PROPERTIES } from "../entity-graph";

export type SchemaNode = Record<string, unknown>;

export type SchemaGraph = {
  "@context": "https://schema.org";
  "@graph": SchemaNode[];
};

export type SchemaValidationIssue = {
  level: "ERROR" | "WARNING" | "INFO";
  code: string;
  message: string;
};

export type SchemaBuildInput = {
  organizationPublicId?: PublicEntityId;
  pageUrl: string;
  pageTitle: string;
  pageDescription?: string;
  locale?: string;
  includeTypes?: string[];
};

export type SchemaBuildResult = {
  graph: SchemaGraph;
  issues: SchemaValidationIssue[];
  version: number;
  shadowMode: boolean;
};

function absoluteRef(publicId: PublicEntityId, siteOrigin: string): string {
  return `${siteOrigin.replace(/\/$/, "")}/#${publicId.replace("entity://", "").replace(/\//g, "-")}`;
}

function collectSameAs(entity: GraphEntity, neighbors: GraphEntity[]): string[] {
  const fromProp = readPropertyValue<string[]>(entity, "sameAs") ?? [];
  const fromProfiles = neighbors
    .filter((n) => n.type === "ExternalProfile")
    .map((n) => readPropertyValue<string>(n, "url"))
    .filter((v): v is string => Boolean(v));
  return [...new Set([...fromProp, ...fromProfiles])];
}

export function validateSchemaGraph(
  graph: SchemaGraph,
  ctx?: { pageUrl?: string; locale?: string },
): SchemaValidationIssue[] {
  const issues: SchemaValidationIssue[] = [];
  const nodes = graph["@graph"] ?? [];
  const ids = new Map<string, number>();

  for (const node of nodes) {
    const id = typeof node["@id"] === "string" ? node["@id"] : null;
    if (id) {
      ids.set(id, (ids.get(id) ?? 0) + 1);
    }
  }

  for (const [id, count] of ids) {
    if (count > 1) {
      issues.push({
        level: "ERROR",
        code: "duplicate-id",
        message: `Duplicate @id detected: ${id}`,
      });
    }
  }

  for (const node of nodes) {
    for (const [key, value] of Object.entries(node)) {
      if (
        value &&
        typeof value === "object" &&
        "@id" in (value as object) &&
        typeof (value as { "@id"?: unknown })["@id"] === "string"
      ) {
        const ref = (value as { "@id": string })["@id"];
        if (!ids.has(ref) && !ref.startsWith("http")) {
          issues.push({
            level: "WARNING",
            code: "broken-reference",
            message: `Broken @id reference on ${key}: ${ref}`,
          });
        }
      }
    }
  }

  const org = nodes.find((n) => n["@type"] === "Organization" || n["@type"] === "Corporation");
  if (!org) {
    issues.push({
      level: "ERROR",
      code: "missing-organization",
      message: "Organization schema node is missing from the graph.",
    });
  } else {
    if (!org.logo) {
      issues.push({
        level: "WARNING",
        code: "missing-logo",
        message: "Organization should reference a logo ImageObject.",
      });
    }
    if (!org.sameAs || (Array.isArray(org.sameAs) && org.sameAs.length === 0)) {
      issues.push({
        level: "WARNING",
        code: "missing-sameAs",
        message: "Organization should include sameAs social profile URLs.",
      });
    }
    if (org.url && typeof org.url === "string") {
      try {
        new URL(org.url);
      } catch {
        issues.push({
          level: "ERROR",
          code: "invalid-url",
          message: `Organization url is invalid: ${org.url}`,
        });
      }
    }
    if (org.geo && typeof org.geo === "object") {
      const geo = org.geo as { latitude?: unknown; longitude?: unknown };
      if (typeof geo.latitude !== "number" || typeof geo.longitude !== "number") {
        issues.push({
          level: "WARNING",
          code: "invalid-geo",
          message: "GeoCoordinates must include numeric latitude and longitude.",
        });
      }
    }
  }

  const breadcrumbs = nodes.filter((n) => n["@type"] === "BreadcrumbList");
  if (breadcrumbs.length > 1) {
    issues.push({
      level: "WARNING",
      code: "duplicate-breadcrumbs",
      message: "Multiple BreadcrumbList nodes detected.",
    });
  }

  if (ctx?.pageUrl) {
    const webpage = nodes.find((n) => n["@type"] === "WebPage");
    if (webpage?.url && webpage.url !== ctx.pageUrl) {
      issues.push({
        level: "WARNING",
        code: "canonical-mismatch",
        message: `WebPage url ${String(webpage.url)} does not match canonical ${ctx.pageUrl}`,
      });
    }
  }

  if (ctx?.locale && org && !org.inLanguage && !nodes.some((n) => n.inLanguage)) {
    issues.push({
      level: "INFO",
      code: "missing-language",
      message: "Schema graph does not declare inLanguage.",
    });
  }

  return issues;
}

export function createSchemaPipeline(options: {
  store: EntityStore;
  query: GraphQueryService;
  siteOrigin: string;
  versionFlags?: SchemaVersionFlag[];
}) {
  const activeVersion =
    options.versionFlags?.find((f) => f.enabled)?.version ??
    options.versionFlags?.[0]?.version ??
    1;
  const shadowMode = Boolean(options.versionFlags?.find((f) => f.enabled)?.shadowMode);

  async function buildFromGraph(input: SchemaBuildInput): Promise<SchemaBuildResult> {
    const issues: SchemaValidationIssue[] = [];
    const nodes: SchemaNode[] = [];

    const orgs = await options.query.findByType("Organization");
    const organization =
      (input.organizationPublicId
        ? await options.query.getEntity(input.organizationPublicId)
        : null) ??
      orgs[0] ??
      null;

    if (!organization) {
      issues.push({
        level: "ERROR",
        code: "missing-organization-entity",
        message: "No Organization entity found in the graph.",
      });
    } else {
      const neighbors = await options.query.getNeighbors(organization.publicId, {
        types: ["SAME_AS", "HAS_MEDIA", "HAS_LOCATION"],
      });
      const neighborEntities = neighbors.map((n) => n.entity);
      const sameAs = collectSameAs(organization, neighborEntities);
      const logo = readPropertyValue<string>(organization, "logo");
      const phone = readPropertyValue<string>(organization, "phone");
      const email = readPropertyValue<string>(organization, "email");
      const address = readPropertyValue<string>(organization, "address");
      const geo = readPropertyValue<{ latitude: number; longitude: number }>(organization, "geo");
      const orgId = absoluteRef(organization.publicId, options.siteOrigin);

      if (logo) {
        nodes.push({
          "@type": "ImageObject",
          "@id": `${orgId}-logo`,
          url: logo,
          caption: `${readPropertyValue<string>(organization, "name") ?? "Organization"} logo`,
        });
      }

      const orgNode: SchemaNode = {
        "@type": "Organization",
        "@id": orgId,
        name: readPropertyValue(organization, "name"),
        legalName: readPropertyValue(organization, "legalName"),
        url: options.siteOrigin,
        sameAs,
        ...(logo ? { logo: { "@id": `${orgId}-logo` } } : {}),
        ...(phone || email
          ? {
              contactPoint: {
                "@type": "ContactPoint",
                telephone: phone,
                email,
                contactType: "customer service",
              },
            }
          : {}),
        ...(address
          ? {
              address: {
                "@type": "PostalAddress",
                streetAddress: address,
              },
            }
          : {}),
        ...(geo
          ? {
              geo: {
                "@type": "GeoCoordinates",
                latitude: geo.latitude,
                longitude: geo.longitude,
              },
            }
          : {}),
      };

      for (const key of ORGANIZATION_CORE_PROPERTIES) {
        if (readPropertyValue(organization, key) == null) {
          issues.push({
            level: "INFO",
            code: "incomplete-organization",
            message: `Organization property "${key}" is missing.`,
          });
        }
      }

      nodes.push(orgNode);

      nodes.push({
        "@type": "WebSite",
        "@id": `${options.siteOrigin.replace(/\/$/, "")}/#website`,
        url: options.siteOrigin,
        name: readPropertyValue(organization, "name"),
        publisher: { "@id": orgId },
        inLanguage: input.locale,
      });
    }

    nodes.push({
      "@type": "WebPage",
      "@id": `${input.pageUrl}#webpage`,
      url: input.pageUrl,
      name: input.pageTitle,
      description: input.pageDescription,
      isPartOf: { "@id": `${options.siteOrigin.replace(/\/$/, "")}/#website` },
      inLanguage: input.locale,
    });

    const graph: SchemaGraph = {
      "@context": "https://schema.org",
      "@graph": nodes,
    };

    const validationIssues = validateSchemaGraph(graph, {
      pageUrl: input.pageUrl,
      locale: input.locale,
    });

    return {
      graph,
      issues: [...issues, ...validationIssues],
      version: activeVersion,
      shadowMode,
    };
  }

  return {
    buildFromGraph,
    validateSchemaGraph,
    activeVersion,
    shadowMode,
  };
}

export type SchemaPipeline = ReturnType<typeof createSchemaPipeline>;

/** Compare two graphs for shadow-mode parity testing. */
export function schemaGraphFingerprint(graph: SchemaGraph): string {
  const types = (graph["@graph"] ?? [])
    .map((n) => String(n["@type"] ?? ""))
    .filter(Boolean)
    .sort();
  return types.join("|");
}

export function listRelationshipsForEntity(
  relationships: GraphRelationship[],
  publicId: PublicEntityId,
): GraphRelationship[] {
  return relationships.filter(
    (r) => r.fromPublicId === publicId || r.toPublicId === publicId,
  );
}
