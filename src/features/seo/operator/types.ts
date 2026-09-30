export type SeoTaskSeverity = "critical" | "important" | "recommended";
export type SeoTaskStatus = "open" | "deferred" | "ignored" | "completed";
export type SeoTaskType =
  | "critical-issue"
  | "metadata"
  | "indexing"
  | "sitemap"
  | "schema"
  | "audit"
  | "content"
  | "technical"
  | "scheduled";

export type SeoTaskSource =
  | "workspace-issue"
  | "crawl-check"
  | "recommendation"
  | "submission"
  | "metadata"
  | "sitemap"
  | "schema"
  | "audit"
  | "scheduled";

export type SeoTask = {
  id: string;
  type: SeoTaskType;
  severity: SeoTaskSeverity;
  title: string;
  description: string;
  whyItMatters?: string;
  source: SeoTaskSource;
  entity?: {
    type: string;
    id?: string;
    url?: string;
  };
  action?: {
    label: string;
    href?: string;
    actionId?: string;
  };
  status: SeoTaskStatus;
  dueAt?: string;
  createdAt: string;
  issueId?: string;
  category?: "content" | "metadata" | "technical" | "schema" | "other";
};

export type SeoTaskStateRecord = {
  statuses: Record<string, SeoTaskStatus>;
};

export type SeoSetupStepId =
  | "site-information"
  | "search-appearance"
  | "search-engines"
  | "seo-defaults";

export type SeoSetupState = {
  complete: boolean;
  completedAt?: string;
  skipped?: boolean;
  steps: Record<SeoSetupStepId, boolean>;
};

export const SEO_SETUP_STEPS: Array<{ id: SeoSetupStepId; label: string }> = [
  { id: "site-information", label: "Site Information" },
  { id: "search-appearance", label: "Search Appearance" },
  { id: "search-engines", label: "Search Engines" },
  { id: "seo-defaults", label: "SEO Defaults" },
];

export type SeoMetadataAttentionKind =
  | "missing-title"
  | "missing-description"
  | "title-too-long"
  | "description-too-long";

export type SeoMetadataAttentionItem = {
  pageKey: string;
  label: string;
  path: string;
  kind: SeoMetadataAttentionKind;
  detail: string;
};
