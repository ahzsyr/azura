import type { ContentSnapshot, SeoSuggestion } from "@/features/seo/platform/types";
import type {
  AuditTarget,
  SeoContentAuditVm,
  SeoContentStructureVm,
  SeoDeveloperDetails,
  SeoIssue,
  SeoMetadataPreviewVm,
} from "../types";
import { SEO_PIPELINE_VERSION } from "../types";
import { buildUnifiedScore } from "./score-builder";

function jsonLdSummary(jsonLd: unknown): string | null {
  if (jsonLd == null || jsonLd === "" || jsonLd === "{}") return null;
  if (typeof jsonLd === "string") {
    try {
      const parsed = JSON.parse(jsonLd) as { "@type"?: string };
      return parsed["@type"] ?? "JSON-LD";
    } catch {
      return "JSON-LD";
    }
  }
  if (typeof jsonLd === "object" && jsonLd !== null && "@type" in jsonLd) {
    return String((jsonLd as { "@type"?: string })["@type"] ?? "JSON-LD");
  }
  return "JSON-LD";
}

export function buildContentStructure(snapshot: ContentSnapshot): SeoContentStructureVm {
  const readingTimeMin = Math.max(1, Math.ceil(snapshot.signals.wordCount / 200));
  return {
    h1Count: snapshot.signals.h1Count,
    h2Count: snapshot.signals.h2Count,
    paragraphCount: snapshot.signals.paragraphCount,
    listCount: snapshot.signals.hasList ? 1 : 0,
    imageCount: snapshot.signals.imageCount,
    videoCount: 0,
    tableCount: snapshot.tables.length,
    linkCount: snapshot.signals.internalLinkCount + snapshot.signals.externalLinkCount,
    internalLinkCount: snapshot.signals.internalLinkCount,
    externalLinkCount: snapshot.signals.externalLinkCount,
    wordCount: snapshot.signals.wordCount,
    readingTimeMin,
    headings: snapshot.headings.map((h) => ({ level: h.level, text: h.text })),
    hasFaq: snapshot.signals.hasFaq,
    hasCta: snapshot.signals.hasCta,
  };
}

export function buildMetadataPreview(input: {
  snapshot: ContentSnapshot;
  suggestion?: SeoSuggestion | null;
  canonicalUrl?: string | null;
  robots?: string | null;
  ogImageUrl?: string | null;
  pageUrl?: string;
}): SeoMetadataPreviewVm {
  const title =
    input.suggestion?.metaTitle?.trim() ||
    input.snapshot.title ||
    "";
  const description = input.suggestion?.metaDescription?.trim() || "";
  return {
    title,
    description,
    url: input.pageUrl ?? `/${input.snapshot.entityType}/${input.snapshot.entityId}`,
    canonicalUrl: input.suggestion?.canonicalUrl ?? input.canonicalUrl,
    robots: input.suggestion?.robots ?? input.robots,
    ogImageUrl: input.suggestion?.ogImageUrl ?? input.ogImageUrl,
    ogTitle: input.suggestion?.ogTitle,
    jsonLdSummary: jsonLdSummary(input.suggestion?.jsonLd),
    titleLength: title.length,
    descriptionLength: description.length,
  };
}

export function buildContentAuditVm(input: {
  target: AuditTarget;
  snapshot: ContentSnapshot;
  suggestion: SeoSuggestion;
  issues: SeoIssue[];
  correlationId: string;
  analyzerIds: string[];
  ruleIds: string[];
  siteSnapshotId?: string;
}): SeoContentAuditVm {
  const developer: SeoDeveloperDetails = {
    correlationId: input.correlationId,
    analyzerIds: input.analyzerIds,
    ruleIds: input.ruleIds,
    snapshotId: input.siteSnapshotId,
    pipelineVersion: SEO_PIPELINE_VERSION,
  };

  return {
    target: input.target,
    structure: buildContentStructure(input.snapshot),
    metadata: buildMetadataPreview({
      snapshot: input.snapshot,
      suggestion: input.suggestion,
    }),
    score: buildUnifiedScore(input.issues),
    issues: input.issues,
    developer,
  };
}
