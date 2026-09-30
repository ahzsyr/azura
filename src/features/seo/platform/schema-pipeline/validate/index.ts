import type { SchemaGraph, SchemaContext, ValidationIssue } from "../types";
import { satisfiesOrganizationFamily } from "../type-model";
import { resolveSchemaBuilderFlags } from "../registry/feature-flags";

function nodeType(node: Record<string, unknown>): string {
  const type = node["@type"];
  if (typeof type === "string") return type;
  if (Array.isArray(type) && typeof type[0] === "string") return type[0];
  return "";
}

function hasOrganizationFamilyNode(graph: SchemaGraph): boolean {
  return graph["@graph"].some((node) => satisfiesOrganizationFamily(node["@type"]));
}

function findOrganizationFamilyNode(graph: SchemaGraph): Record<string, unknown> | undefined {
  return graph["@graph"].find((node) => satisfiesOrganizationFamily(node["@type"]));
}

function countNodeType(graph: SchemaGraph, type: string): number {
  return graph["@graph"].filter((node) => nodeType(node) === type).length;
}

function hasNodeType(graph: SchemaGraph, type: string): boolean {
  return graph["@graph"].some((node) => nodeType(node) === type);
}

/** Resolve Schema.org @id from a string URI or `{ "@id": string }` ref. */
function resolveIdRef(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (
    value &&
    typeof value === "object" &&
    "@id" in value &&
    typeof (value as { "@id": unknown })["@id"] === "string"
  ) {
    return (value as { "@id": string })["@id"];
  }
  return undefined;
}

export const structuralValidator = {
  id: "structural",
  validate(graph: SchemaGraph, _ctx: SchemaContext): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const node of graph["@graph"]) {
      const id = node["@id"];
      if (id === undefined) continue;
      if (typeof id !== "string") {
        issues.push({
          level: "ERROR",
          code: "invalid-id",
          message: "Schema node @id must be a string.",
        });
        continue;
      }
      if (!/^https?:\/\//i.test(id)) {
        issues.push({
          level: "ERROR",
          code: "relative-id",
          message: `Schema node @id "${id}" must be an absolute http(s) URL.`,
        });
      }
    }

    if (!hasOrganizationFamilyNode(graph)) {
      issues.push({
        level: "ERROR",
        code: "missing-organization",
        message: "Canonical organization/business entity is missing from the graph.",
      });
    }

    if (countNodeType(graph, "WebSite") > 1) {
      issues.push({
        level: "ERROR",
        code: "duplicate-website",
        message: "Multiple WebSite nodes detected after deduplication.",
      });
    }

    const faqPage = graph["@graph"].find((node) => nodeType(node) === "FAQPage");
    if (faqPage && !Array.isArray(faqPage.mainEntity)) {
      issues.push({
        level: "ERROR",
        code: "faq-missing-main-entity",
        message: "FAQPage requires mainEntity questions.",
      });
    }

    const org = findOrganizationFamilyNode(graph);
    if (org) {
      const sameAs = org.sameAs;
      if (!sameAs || (Array.isArray(sameAs) && sameAs.length === 0)) {
        issues.push({
          level: "WARNING",
          code: "missing-same-as",
          message: "Organization should include sameAs social profile URLs.",
        });
      }
      if (!org.logo) {
        issues.push({
          level: "WARNING",
          code: "missing-logo",
          message: "Organization should reference a logo ImageObject.",
        });
      }
    }

    const product = graph["@graph"].find((node) => nodeType(node) === "Product");
    if (product && !product.gtin && !product.mpn && !product.sku) {
      issues.push({
        level: "WARNING",
        code: "missing-product-identifiers",
        message: "Product schema is stronger with GTIN, MPN, or SKU.",
      });
    }

    if (_ctx.page.product?.media?.videos?.some((v) => v.url) && !hasNodeType(graph, "VideoObject")) {
      issues.push({
        level: "INFO",
        code: "consider-video-object",
        message: "Product has video media — VideoObject schema can improve discovery.",
      });
    }

    const webpage = graph["@graph"].find((node) => nodeType(node) === "WebPage");
    const website = graph["@graph"].find((node) => nodeType(node) === "WebSite");
    if (webpage && website) {
      const partOf = webpage.isPartOf as { "@id"?: string } | undefined;
      const websiteId = typeof website["@id"] === "string" ? website["@id"] : undefined;
      if (websiteId && partOf?.["@id"] !== websiteId) {
        issues.push({
          level: "ERROR",
          code: "webpage-missing-ispartof",
          message: "WebPage must reference WebSite via isPartOf @id.",
        });
      }
    }

    if (product && webpage) {
      const productId = resolveIdRef(product["@id"]);
      const webpageId = resolveIdRef(webpage["@id"]);
      const productMainEntityOfPage = resolveIdRef(product.mainEntityOfPage);
      const webPageMainEntity = resolveIdRef(webpage.mainEntity);
      if (
        productMainEntityOfPage !== webpageId ||
        webPageMainEntity !== productId
      ) {
        issues.push({
          level: "ERROR",
          code: "product-webpage-reciprocity",
          message: `Product and WebPage nodes must reciprocally reference each other. (Product.mainEntityOfPage: "${productMainEntityOfPage}", WebPage.@id: "${webpageId}", WebPage.mainEntity: "${webPageMainEntity}", Product.@id: "${productId}")`,
        });
      }
    }

    return issues;
  },
};

export const brandConsistencyValidator = {
  id: "brand-consistency",
  validate(graph: SchemaGraph, ctx: SchemaContext): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const company = ctx.site.company;
    if (!company) return issues;

    const org = findOrganizationFamilyNode(graph);
    if (!org) return issues;

    if (typeof org.name === "string" && org.name !== company.name) {
      issues.push({
        level: "WARNING",
        code: "brand-name-mismatch",
        message: `Organization name "${org.name}" differs from company profile "${company.name}".`,
      });
    }

    const contactPoint =
      typeof org.contactPoint === "object" && org.contactPoint !== null
        ? (org.contactPoint as Record<string, unknown>)
        : null;
    const schemaPhone =
      typeof contactPoint?.telephone === "string" ? contactPoint.telephone : "";
    if (schemaPhone && company.phone && schemaPhone !== company.phone) {
      issues.push({
        level: "WARNING",
        code: "phone-mismatch",
        message: "Organization telephone differs from company phone in admin.",
      });
    }

    return issues;
  },
};

export const googlePolicyValidator = {
  id: "google-policy",
  validate(graph: SchemaGraph, ctx: SchemaContext): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const flags = resolveSchemaBuilderFlags(ctx.site.structuredConfig);
    const org = findOrganizationFamilyNode(graph);
    const orgId = typeof org?.["@id"] === "string" ? org["@id"] : undefined;

    if (!flags.faqBuilder && hasNodeType(graph, "FAQPage")) {
      issues.push({
        level: "ERROR",
        code: "faq-disabled",
        message: "FAQPage is disabled by default for non-gov/health sites.",
      });
    }

    for (const node of graph["@graph"]) {
      if (nodeType(node) !== "Review") continue;
      const itemReviewed = node.itemReviewed as { "@id"?: string } | undefined;
      if (orgId && itemReviewed?.["@id"] === orgId) {
        issues.push({
          level: "ERROR",
          code: "self-serving-org-review",
          message: "Organization-level reviews are treated as self-serving and must not be emitted.",
        });
      }
      if (ctx.page.pageType !== "product") {
        issues.push({
          level: "ERROR",
          code: "review-not-on-product",
          message: "Review nodes are only allowed on product pages with third-party comments.",
        });
      }
    }

    return issues;
  },
};

export function validate(graph: SchemaGraph, ctx: SchemaContext): ValidationIssue[] {
  return [structuralValidator, brandConsistencyValidator, googlePolicyValidator].flatMap((validator) =>
    validator.validate(graph, ctx),
  );
}
