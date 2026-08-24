import type { SchemaGraph, SchemaContext, ValidationIssue } from "../types";

function nodeType(node: Record<string, unknown>): string {
  const type = node["@type"];
  if (typeof type === "string") return type;
  if (Array.isArray(type) && typeof type[0] === "string") return type[0];
  return "";
}

function hasNodeType(graph: SchemaGraph, type: string): boolean {
  return graph["@graph"].some((node) => nodeType(node) === type);
}

function countNodeType(graph: SchemaGraph, type: string): number {
  return graph["@graph"].filter((node) => nodeType(node) === type).length;
}

export const structuralValidator = {
  id: "structural",
  validate(graph: SchemaGraph, _ctx: SchemaContext): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const node of graph["@graph"]) {
      const id = node["@id"];
      if (id !== undefined && typeof id !== "string") {
        issues.push({
          level: "ERROR",
          code: "invalid-id",
          message: "Schema node @id must be a string.",
        });
      }
    }

    if (!hasNodeType(graph, "Organization")) {
      issues.push({
        level: "ERROR",
        code: "missing-organization",
        message: "Organization schema node is missing from the graph.",
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

    const org = graph["@graph"].find((node) => nodeType(node) === "Organization");
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

    const imageCount = countNodeType(graph, "ImageObject");
    if (imageCount < 2) {
      issues.push({
        level: "INFO",
        code: "add-business-photos",
        message: "Consider adding more business photos as ImageObject nodes.",
      });
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

    return issues;
  },
};

export const brandConsistencyValidator = {
  id: "brand-consistency",
  validate(graph: SchemaGraph, ctx: SchemaContext): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const company = ctx.site.company;
    if (!company) return issues;

    const org = graph["@graph"].find((node) => nodeType(node) === "Organization");
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

export function validate(graph: SchemaGraph, ctx: SchemaContext): ValidationIssue[] {
  return [structuralValidator, brandConsistencyValidator].flatMap((validator) =>
    validator.validate(graph, ctx),
  );
}
