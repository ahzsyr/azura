export const SEO_PIPELINE_VERSION = "workspace-1.0.0";

export type SeoIssueSeverity = "critical" | "warn" | "info";
export type SeoIssueCategory = "content" | "metadata" | "technical" | "schema" | "other";
export type SeoIssueImpact = "high" | "medium" | "low";
export type SeoIssueFixKind = "auto" | "ai" | "manual";
export type SeoIssueStatus = "open" | "resolved";
export type SeoIssueSource = "crawl" | "validation" | "rule" | "recommendation";

export type SeoIssue = {
  id: string;
  snapshotId?: string;
  severity: SeoIssueSeverity;
  pageUrl?: string;
  entityType?: string;
  entityId?: string;
  locale?: string;
  title: string;
  message: string;
  category: SeoIssueCategory;
  impact: SeoIssueImpact;
  fixKind: SeoIssueFixKind;
  status: SeoIssueStatus;
  source: SeoIssueSource;
  scorePenalty?: number;
  ruleIds?: string[];
  analyzerIds?: string[];
  fixHref?: string;
  fixLabel?: string;
  suggestion?: string;
};

export type SeoCategoryKey = "content" | "metadata" | "technical" | "schema";

export type SeoCategoryScore = {
  key: SeoCategoryKey;
  label: string;
  score: number;
  weight: number;
  issueIds: string[];
};

export type SeoCategoryScores = Record<SeoCategoryKey, SeoCategoryScore>;

export type SeoUnifiedScore = {
  overall: number;
  grade: "good" | "fair" | "poor";
  categories: SeoCategoryScores;
};

export type SeoAuditSnapshotStatus = "completed" | "failed" | "running";

export type SeoAuditSnapshot = {
  id: string;
  status: SeoAuditSnapshotStatus;
  completedAt: string;
  durationMs: number;
  pagesCrawled?: number;
  overallScore: number;
  categoryScores: SeoCategoryScores;
  issueCounts: { critical: number; warn: number; info: number };
  correlationId: string;
  pipelineVersion: string;
  analyzerIds: string[];
  ruleIds: string[];
  errorMessage?: string;
};

/** Persisted payload including normalized issues for a site audit. */
export type SeoAuditSnapshotRecord = {
  snapshot: SeoAuditSnapshot;
  issues: SeoIssue[];
};

export type SeoDeveloperDetails = {
  correlationId?: string;
  analyzerIds: string[];
  ruleIds: string[];
  executionTimeMs?: number;
  snapshotId?: string;
  pipelineVersion: string;
};

export type AuditTargetKind =
  | "page"
  | "product"
  | "collection"
  | "post"
  | "static_page"
  | "url";

export type AuditTarget = {
  kind: AuditTargetKind;
  entityType: string;
  entityId: string;
  locale: string;
};

export type SeoIssueFilter = {
  severity?: SeoIssueSeverity;
  category?: SeoIssueCategory;
  source?: SeoIssueSource;
  status?: SeoIssueStatus;
};

export type SeoOverviewVm = {
  snapshot: SeoAuditSnapshot | null;
  score: SeoUnifiedScore | null;
  issueCounts: { critical: number; warn: number; info: number };
  developer: SeoDeveloperDetails;
};

export type SeoTechnicalCard = {
  id: string;
  label: string;
  status: "healthy" | "warn" | "fail" | "unknown";
  summary: string;
  issueCount: number;
  category: SeoIssueCategory;
};

export type SeoTechnicalAuditVm = {
  snapshot: SeoAuditSnapshot | null;
  cards: SeoTechnicalCard[];
  developer: SeoDeveloperDetails;
};

export type SeoContentStructureVm = {
  h1Count: number;
  h2Count: number;
  paragraphCount: number;
  listCount: number;
  imageCount: number;
  videoCount: number;
  tableCount: number;
  linkCount: number;
  internalLinkCount: number;
  externalLinkCount: number;
  wordCount: number;
  readingTimeMin: number;
  headings: Array<{ level: number; text: string }>;
  hasFaq: boolean;
  hasCta: boolean;
};

export type SeoMetadataPreviewVm = {
  title: string;
  description: string;
  url: string;
  canonicalUrl?: string | null;
  robots?: string | null;
  ogImageUrl?: string | null;
  ogTitle?: string | null;
  jsonLdSummary?: string | null;
  titleLength: number;
  descriptionLength: number;
};

export type SeoContentAuditVm = {
  target: AuditTarget;
  structure: SeoContentStructureVm;
  metadata: SeoMetadataPreviewVm;
  score: SeoUnifiedScore;
  issues: SeoIssue[];
  developer: SeoDeveloperDetails;
};

export type SeoSnapshotIndexEntry = {
  id: string;
  completedAt: string;
  overallScore: number;
  status: SeoAuditSnapshotStatus;
  issueCounts: { critical: number; warn: number; info: number };
  durationMs: number;
};
