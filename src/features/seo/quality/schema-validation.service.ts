import "server-only";
import { seoRepository } from "@/repositories/seo.repository";
import type { SeoQualityIssue } from "./types";

function asObjects(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
  if (typeof value === "object" && value !== null) return [value as Record<string, unknown>];
  return [];
}

function validateJsonLd(source: string, value: unknown): SeoQualityIssue[] {
  const issues: SeoQualityIssue[] = [];
  const objects = asObjects(value);
  for (const [index, item] of objects.entries()) {
    const type = item["@type"];
    if (!item["@context"]) {
      issues.push({
        id: `jsonld-context-${source}-${index}`,
        title: "JSON-LD missing @context",
        severity: "warn",
        message: `${source} item ${index + 1} should include @context.`,
      });
    }
    if (!type) {
      issues.push({
        id: `jsonld-type-${source}-${index}`,
        title: "JSON-LD missing @type",
        severity: "critical",
        message: `${source} item ${index + 1} should include @type.`,
      });
    }
    if (type === "Product" && (!item.name || !item.offers)) {
      issues.push({
        id: `jsonld-product-${source}-${index}`,
        title: "Product schema is incomplete",
        severity: "critical",
        message: "Product JSON-LD should include name and offers.",
      });
    }
    if (type === "BreadcrumbList" && !item.itemListElement) {
      issues.push({
        id: `jsonld-breadcrumb-${source}-${index}`,
        title: "Breadcrumb schema is incomplete",
        severity: "warn",
        message: "BreadcrumbList JSON-LD should include itemListElement.",
      });
    }
  }
  return issues;
}

export const schemaValidationService = {
  async analyze(): Promise<SeoQualityIssue[]> {
    const [metas, globalStructured] = await Promise.all([
      seoRepository.listAllMeta(),
      seoRepository.getStructuredConfig(),
    ]);
    const issues: SeoQualityIssue[] = [];

    if (globalStructured.organization) {
      issues.push(...validateJsonLd("global organization", globalStructured.organization));
    }
    if (globalStructured.website) {
      issues.push(...validateJsonLd("global website", globalStructured.website));
    }

    for (const meta of metas.filter((row) => row.jsonLd != null)) {
      issues.push(...validateJsonLd(meta.pageKey ?? meta.entityType ?? meta.id, meta.jsonLd));
    }

    return issues;
  },
};
