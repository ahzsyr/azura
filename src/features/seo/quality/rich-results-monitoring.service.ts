import "server-only";
import { seoRepository } from "@/repositories/seo.repository";
import { seoObservabilityFlags } from "@/features/seo/observability-flags";

function asObjects(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
  }
  if (typeof value === "object" && value !== null) return [value as Record<string, unknown>];
  return [];
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function inspectJsonLd(source: string, url: string, value: unknown) {
  const issues: Parameters<typeof seoRepository.replaceRichResultIssues>[0] = [];
  for (const [index, item] of asObjects(value).entries()) {
    const type = stringValue(item["@type"]);
    if (!type) continue;
    const issuePrefix = `${source}-${type}-${index}`.replace(/[^a-zA-Z0-9_-]/g, "-");

    if (type === "Product") {
      const offers = typeof item.offers === "object" && item.offers !== null ? (item.offers as Record<string, unknown>) : null;
      if (!item.name) {
        issues.push({
          issueKey: `${issuePrefix}-missing-name`,
          type,
          category: "ERROR",
          url,
          eligibility: "NOT_ELIGIBLE",
          details: { message: "Product rich result requires name." },
        });
      }
      if (!offers) {
        issues.push({
          issueKey: `${issuePrefix}-missing-offers`,
          type,
          category: "ERROR",
          url,
          eligibility: "NOT_ELIGIBLE",
          details: { message: "Product rich result requires offers." },
        });
      } else if (!offers.price && !offers.priceSpecification) {
        issues.push({
          issueKey: `${issuePrefix}-missing-price`,
          type,
          category: "ERROR",
          url,
          eligibility: "NOT_ELIGIBLE",
          details: { message: "Product offers should include price or priceSpecification." },
        });
      }
      if (!item.aggregateRating && !item.review) {
        issues.push({
          issueKey: `${issuePrefix}-missing-rating`,
          type,
          category: "WARNING",
          url,
          eligibility: "ELIGIBLE_WITH_WARNINGS",
          details: { message: "Product rich result is stronger with aggregateRating or review." },
        });
      }
      if (!item.image) {
        issues.push({
          issueKey: `${issuePrefix}-missing-image`,
          type,
          category: "WARNING",
          url,
          eligibility: "ELIGIBLE_WITH_WARNINGS",
          details: { message: "Product rich result should include image." },
        });
      }
    }

    if (type === "FAQPage" && !item.mainEntity) {
      issues.push({
        issueKey: `${issuePrefix}-missing-main-entity`,
        type,
        category: "ERROR",
        url,
        eligibility: "NOT_ELIGIBLE",
        details: { message: "FAQPage rich result requires mainEntity questions." },
      });
    }

    if (type === "Article" && (!item.headline || !item.datePublished)) {
      issues.push({
        issueKey: `${issuePrefix}-missing-article-fields`,
        type,
        category: "WARNING",
        url,
        eligibility: "ELIGIBLE_WITH_WARNINGS",
        details: { message: "Article rich result should include headline and datePublished." },
      });
    }
  }
  return issues;
}

export const richResultsMonitoringService = {
  async analyzeAndPersist() {
    if (!seoObservabilityFlags.seoRichResults) return [];
    const [metas, structured] = await Promise.all([
      seoRepository.listAllMeta(),
      seoRepository.getStructuredConfig(),
    ]);
    const issues: Parameters<typeof seoRepository.replaceRichResultIssues>[0] = [];
    if (structured.organization) {
      issues.push(...inspectJsonLd("global-organization", "/", structured.organization));
    }
    if (structured.website) {
      issues.push(...inspectJsonLd("global-website", "/", structured.website));
    }
    for (const meta of metas.filter((item) => item.jsonLd != null)) {
      const url = meta.canonicalUrl || meta.pageKey || meta.entityId || meta.id;
      issues.push(...inspectJsonLd(meta.id, url, meta.jsonLd));
    }
    await seoRepository.replaceRichResultIssues(issues);
    return issues;
  },
};
