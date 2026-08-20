export type SchemaNode = Record<string, unknown>;

export type SchemaGraph = {
  "@context": "https://schema.org";
  "@graph": SchemaNode[];
};

export type AuditStatus =
  | "provided"
  | "valid"
  | "eligible"
  | "google-controlled"
  | "observed"
  | "missing";

export type SchemaGoogleRelevanceRow = {
  schemaType: string;
  valid: boolean;
  googleFeatureRelevance: string;
  status: AuditStatus;
};

export type EntityReadinessSection = {
  id: string;
  title: string;
  items: Array<{ label: string; status: AuditStatus; detail?: string }>;
};

export type SchemaGraphAuditResult = {
  schemaRelevance: SchemaGoogleRelevanceRow[];
  sections: EntityReadinessSection[];
  relationshipIssues: Array<{ level: "ERROR" | "WARNING"; message: string }>;
  duplicateIdCount: number;
  graphSummary: Array<{ type: string; id?: string; propertyCount: number }>;
};

export type SchemaNodeDiff = {
  schemaType: string;
  generated: boolean;
  published: boolean;
  idMatch: boolean | null;
  propertyMatchCount: number;
  propertyTotal: number;
};

export type PublicHtmlAuditResult = {
  url: string;
  pathname: string;
  fetched: boolean;
  fetchError?: string;
  renderedInHtml: boolean;
  invalidJsonLdBlocks: number;
  duplicateIdGenerated: number;
  duplicateIdPublished: number;
  canonicalExpected?: string | null;
  canonicalPublished?: string | null;
  canonicalMatch: boolean | null;
  nodeDiffs: SchemaNodeDiff[];
  seoMetaJsonLd: {
    inDatabase: boolean;
    inResolvedGraph: boolean;
    inPublishedHtml: boolean;
  };
  generatedGraph?: SchemaGraph;
  publishedNodes: SchemaNode[];
};

export type StructuredDataAuditBundle = {
  pathname: string;
  canonicalUrl: string | null;
  graphJson: string;
  graphAudit: SchemaGraphAuditResult;
  publicAudit: PublicHtmlAuditResult | null;
};
