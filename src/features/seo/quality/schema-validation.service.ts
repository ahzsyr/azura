import "server-only";
import { seoRepository } from "@/repositories/seo.repository";
import {
  editHrefForSeoMeta,
  publicPathForPageKey,
  withResolvedFix,
} from "@/features/seo/workspace/resolve-seo-issue-fix";
import type { SeoQualityIssue } from "./types";

function asObjects(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
  if (typeof value === "object" && value !== null) return [value as Record<string, unknown>];
  return [];
}

type ValidateOptions = {
  sourceLabel: string;
  href?: string;
  publicPath?: string;
  isProductPageKey?: boolean;
};

function validateJsonLd(options: ValidateOptions, value: unknown): SeoQualityIssue[] {
  const { sourceLabel, href, publicPath, isProductPageKey } = options;
  const issues: SeoQualityIssue[] = [];
  const objects = asObjects(value);
  for (const [index, item] of objects.entries()) {
    const type = item["@type"];
    if (!item["@context"]) {
      issues.push(
        withResolvedFix({
          id: `jsonld-context-${sourceLabel}-${index}`,
          title: "JSON-LD missing @context",
          severity: "warn",
          message: `${sourceLabel} item ${index + 1} should include @context.`,
          source: publicPath ?? sourceLabel,
          href,
        }),
      );
    }
    if (!type) {
      issues.push(
        withResolvedFix({
          id: `jsonld-type-${sourceLabel}-${index}`,
          title: "JSON-LD missing @type",
          severity: "critical",
          message: `${sourceLabel} item ${index + 1} should include @type.`,
          source: publicPath ?? sourceLabel,
          href,
        }),
      );
    }
    if (type === "Product" && (!item.name || !item.offers)) {
      const productSuggestion = isProductPageKey
        ? "Remove incomplete custom JSON-LD or add name and offers. The product schema pipeline generates valid Product JSON-LD automatically when the override is cleared."
        : "Product JSON-LD should include name and offers.";
      issues.push(
        withResolvedFix({
          id: `jsonld-product-${sourceLabel}-${index}`,
          title: "Product schema is incomplete",
          severity: "critical",
          message: productSuggestion,
          source: publicPath ?? sourceLabel,
          href,
          suggestion: productSuggestion,
          fixLabel: "Fix schema",
        }),
      );
    }
    if (type === "BreadcrumbList" && !item.itemListElement) {
      issues.push(
        withResolvedFix({
          id: `jsonld-breadcrumb-${sourceLabel}-${index}`,
          title: "Breadcrumb schema is incomplete",
          severity: "warn",
          message: "BreadcrumbList JSON-LD should include itemListElement.",
          source: publicPath ?? sourceLabel,
          href,
        }),
      );
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
      issues.push(
        ...validateJsonLd(
          {
            sourceLabel: "global organization",
            href: "/admin/seo/structured-data",
            publicPath: "Global structured data",
          },
          globalStructured.organization,
        ),
      );
    }
    if (globalStructured.website) {
      issues.push(
        ...validateJsonLd(
          {
            sourceLabel: "global website",
            href: "/admin/seo/structured-data",
            publicPath: "Global structured data",
          },
          globalStructured.website,
        ),
      );
    }

    for (const meta of metas.filter((row) => row.jsonLd != null)) {
      const sourceLabel = meta.pageKey ?? meta.entityType ?? meta.id;
      const href = editHrefForSeoMeta(meta);
      const publicPath = publicPathForPageKey(meta.pageKey);
      issues.push(
        ...validateJsonLd(
          {
            sourceLabel,
            href,
            publicPath: publicPath ?? sourceLabel,
            isProductPageKey: Boolean(meta.pageKey?.startsWith("product:")),
          },
          meta.jsonLd,
        ),
      );
    }

    return issues;
  },
};
