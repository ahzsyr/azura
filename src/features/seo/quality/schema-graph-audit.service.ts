import type { SchemaGraph, SchemaContext, SchemaNode } from "@/features/seo/platform/schema-pipeline/types";
import { getGoogleFeatureRelevanceMap } from "./schema-graph-audit.constants";
import type {
  AuditStatus,
  EntityReadinessSection,
  SchemaGoogleRelevanceRow,
  SchemaGraphAuditResult,
} from "./schema-graph-audit.types";
import { nodePrimaryType } from "./extract-jsonld-from-html";

export type {
  AuditStatus,
  EntityReadinessSection,
  SchemaGoogleRelevanceRow,
  SchemaGraphAuditResult,
} from "./schema-graph-audit.types";

function nodeId(node: SchemaNode): string | undefined {
  const id = node["@id"];
  return typeof id === "string" ? id : undefined;
}

function refId(value: unknown): string | undefined {
  if (value && typeof value === "object" && "@id" in (value as object)) {
    const id = (value as { "@id"?: unknown })["@id"];
    return typeof id === "string" ? id : undefined;
  }
  return undefined;
}

function countDuplicateIds(nodes: SchemaNode[]): number {
  const seen = new Set<string>();
  let duplicates = 0;
  for (const node of nodes) {
    const id = nodeId(node);
    if (!id) continue;
    if (seen.has(id)) duplicates += 1;
    else seen.add(id);
  }
  return duplicates;
}

function findOrganizationId(nodes: SchemaNode[]): string | undefined {
  for (const node of nodes) {
    const type = nodePrimaryType(node);
    if (type === "Organization" || type === "Corporation") return nodeId(node);
    const multi = node["@type"];
    if (Array.isArray(multi) && multi.includes("Organization")) return nodeId(node);
  }
  return undefined;
}

function validateRelationships(
  graph: SchemaGraph,
): SchemaGraphAuditResult["relationshipIssues"] {
  const issues: SchemaGraphAuditResult["relationshipIssues"] = [];
  const nodes = graph["@graph"];
  const byId = new Map<string, SchemaNode>();
  for (const node of nodes) {
    const id = nodeId(node);
    if (id) byId.set(id, node);
  }

  const orgId = findOrganizationId(nodes);

  const website = nodes.find((n) => nodePrimaryType(n) === "WebSite");
  if (website) {
    const pubRef = refId(website.publisher);
    if (orgId && pubRef && pubRef !== orgId) {
      issues.push({
        level: "WARNING",
        message: `WebSite.publisher (${pubRef}) does not reference canonical Organization (${orgId}).`,
      });
    }
    if (orgId && !pubRef) {
      issues.push({ level: "WARNING", message: "WebSite missing publisher → Organization." });
    }
  }

  const webpage = nodes.find((n) => nodePrimaryType(n) === "WebPage");
  if (webpage) {
    const aboutRef = refId(webpage.about);
    if (orgId && aboutRef && aboutRef !== orgId) {
      issues.push({
        level: "WARNING",
        message: `WebPage.about (${aboutRef}) does not reference canonical Organization (${orgId}).`,
      });
    }
    const isPartOfRef = refId(webpage.isPartOf);
    const websiteId = website ? nodeId(website) : undefined;
    if (websiteId && isPartOfRef && isPartOfRef !== websiteId) {
      issues.push({
        level: "WARNING",
        message: "WebPage.isPartOf does not reference WebSite @id.",
      });
    }
  }

  const orgNodes = nodes.filter((n) => {
    const t = nodePrimaryType(n);
    return t === "Organization" || t === "Corporation";
  });
  if (orgNodes.length > 1) {
    issues.push({
      level: "ERROR",
      message: `Multiple Organization nodes detected (${orgNodes.length}). One canonical entity required.`,
    });
  }

  for (const [id, count] of countIds(nodes)) {
    if (count > 1) {
      issues.push({ level: "ERROR", message: `Duplicate @id: ${id} (${count} nodes).` });
    }
  }

  return issues;
}

function countIds(nodes: SchemaNode[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const node of nodes) {
    const id = nodeId(node);
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

function pageExpectedTypes(ctx: SchemaContext): string[] {
  const base = ["Organization", "WebSite", "WebPage", "ImageObject"];
  if (ctx.page.breadcrumbItems.length) base.push("BreadcrumbList");
  if (ctx.page.product) base.push("Product");
  if (ctx.page.article) base.push("Article");
  if (ctx.page.faqItems.length) base.push("FAQPage");
  return base;
}

export function auditSchemaGraph(
  graph: SchemaGraph,
  ctx: SchemaContext,
): SchemaGraphAuditResult {
  const GOOGLE_RELEVANCE = getGoogleFeatureRelevanceMap();
  const nodes = graph["@graph"];
  const byType = new Map<string, SchemaNode[]>();
  for (const node of nodes) {
    const type = nodePrimaryType(node);
    if (!type) continue;
    const list = byType.get(type) ?? [];
    list.push(node);
    byType.set(type, list);
  }

  const expectedTypes = pageExpectedTypes(ctx);
  const allTypes = new Set([...byType.keys(), ...expectedTypes]);

  const schemaRelevance: SchemaGoogleRelevanceRow[] = [...allTypes]
    .sort()
    .map((schemaType) => {
      const present = (byType.get(schemaType)?.length ?? 0) > 0;
      const expected = expectedTypes.includes(schemaType);
      return {
        schemaType,
        valid: present,
        googleFeatureRelevance: GOOGLE_RELEVANCE[schemaType] ?? "General structured-data signal",
        status: (present ? "valid" : expected ? "missing" : "eligible") as AuditStatus,
      };
    });

  const company = ctx.site.company;
  const orgNode = nodes.find((n) => {
    const t = nodePrimaryType(n);
    return t === "Organization" || t === "Corporation";
  });

  const sections: EntityReadinessSection[] = [
    {
      id: "identity",
      title: "Identity",
      items: [
        { label: "Organization name", status: company?.name ? "provided" : "missing" },
        {
          label: "Legal name",
          status: readSchemaField(company, "legalName") ? "provided" : "missing",
        },
        {
          label: "Canonical URL",
          status: ctx.runtime.canonicalUrl ? "valid" : "missing",
          detail: ctx.runtime.canonicalUrl,
        },
        { label: "Logo", status: ctx.site.logoUrl ? "provided" : "missing" },
        {
          label: "Description",
          status: readSchemaField(company, "schemaDescription") || orgNode?.description
            ? "provided"
            : "missing",
        },
        {
          label: "Business type",
          status: ctx.site.structuredConfig.entityType ? "provided" : "missing",
          detail: ctx.site.structuredConfig.entityType,
        },
      ],
    },
    {
      id: "contact",
      title: "Contact / Location",
      items: [
        {
          label: "Address",
          status: orgNode?.address ? "provided" : "missing",
        },
        { label: "Telephone", status: company?.phone ? "provided" : "missing" },
        { label: "Email", status: company?.email ? "provided" : "missing" },
        {
          label: "Geo coordinates",
          status: readSchemaField(company, "latitude") && readSchemaField(company, "longitude")
            ? "provided"
            : "missing",
        },
        {
          label: "Area served",
          status: readSchemaField(company, "areaServed") ? "provided" : "missing",
        },
      ],
    },
    {
      id: "connections",
      title: "Entity connections",
      items: [
        {
          label: "sameAs social URLs",
          status:
            Array.isArray(orgNode?.sameAs) && (orgNode.sameAs as unknown[]).length
              ? "provided"
              : "missing",
        },
        {
          label: "Organization @id",
          status: orgNode && nodeId(orgNode) ? "valid" : "missing",
          detail: orgNode ? nodeId(orgNode) : undefined,
        },
        {
          label: "WebSite → Organization",
          status: byType.has("WebSite") && orgNode ? "valid" : "missing",
        },
        {
          label: "WebPage → Organization",
          status: byType.has("WebPage") && orgNode ? "valid" : "missing",
        },
      ],
    },
    {
      id: "google-controlled",
      title: "Google-controlled features",
      items: [
        { label: "Sitelinks", status: "google-controlled" },
        { label: "Knowledge Panel", status: "google-controlled" },
        { label: "Search title", status: "google-controlled" },
        { label: "Search description", status: "google-controlled" },
        { label: "Rich-result appearance", status: "google-controlled" },
      ],
    },
  ];

  return {
    schemaRelevance,
    sections,
    relationshipIssues: validateRelationships(graph),
    duplicateIdCount: countDuplicateIds(nodes),
    graphSummary: nodes.map((node) => ({
      type: nodePrimaryType(node) || "Unknown",
      id: nodeId(node),
      propertyCount: Object.keys(node).length,
    })),
  };
}

function readSchemaField(
  company: SchemaContext["site"]["company"],
  field: string,
): string {
  const legacy = company?.localizedLegacy;
  if (!legacy) return "";
  return (legacy[`${field}En`] ?? legacy[field] ?? "").trim();
}

/** Page-specific eligible schema types for Tier B preview. */
export function eligibleSchemaTypesForPage(ctx: SchemaContext): string[] {
  const types: string[] = ["Organization", "WebSite", "WebPage"];
  if (ctx.page.breadcrumbItems.length) types.push("BreadcrumbList");
  if (ctx.page.product) types.push("Product");
  if (ctx.page.article) types.push("Article");
  if (ctx.page.faqItems.length) types.push("FAQPage");
  if (ctx.page.pageType === "collection") types.push("CollectionPage");
  return types;
}

