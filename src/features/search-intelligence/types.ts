/**
 * Shared contracts for the Search Intelligence Platform.
 * SEO, AI, and Search consume these types — they do not own the graph.
 */

/** Immutable public entity ID: `entity://type/slug` */
export type PublicEntityId = `entity://${string}/${string}`;

export type EntityType =
  | "Organization"
  | "Brand"
  | "Location"
  | "Department"
  | "Office"
  | "Person"
  | "Role"
  | "Product"
  | "ProductVariant"
  | "Category"
  | "Collection"
  | "Industry"
  | "Solution"
  | "Service"
  | "CaseStudy"
  | "Project"
  | "Customer"
  | "Supplier"
  | "Article"
  | "FAQ"
  | "Download"
  | "Video"
  | "Image"
  | "Document"
  | "Event"
  | "JobPosting"
  | "Review"
  | "Testimonial"
  | "ExternalProfile"
  | "WebPage";

export type RelationshipType =
  | "HAS_BRAND"
  | "HAS_LOCATION"
  | "EMPLOYS"
  | "OFFERS"
  | "OWNS"
  | "PUBLISHES"
  | "SUPPORTS"
  | "SELLS"
  | "MANUFACTURES"
  | "PARTNERS_WITH"
  | "BELONGS_TO_CATEGORY"
  | "RELATED_TO"
  | "REQUIRES"
  | "REPLACES"
  | "ACCESSORY_OF"
  | "COMPATIBLE_WITH"
  | "PART_OF_SOLUTION"
  | "MENTIONS"
  | "ABOUT"
  | "REFERENCES"
  | "ANSWERS"
  | "PROMOTES"
  | "COMPARES"
  | "SERVES"
  | "LOCATED_IN"
  | "PART_OF_REGION"
  | "HAS_DEPARTMENT"
  | "HAS_OFFICE"
  | "HAS_ROLE"
  | "HAS_VARIANT"
  | "BELONGS_TO_COLLECTION"
  | "IN_INDUSTRY"
  | "SERVES_CUSTOMER"
  | "SUPPLIED_BY"
  | "HAS_REVIEW"
  | "HAS_TESTIMONIAL"
  | "SAME_AS"
  | "HAS_MEDIA"
  | "DESCRIBES_PAGE";

export type DataSourceKind =
  | "manual_admin"
  | "company_profile"
  | "google_business"
  | "cms"
  | "importer"
  | "api"
  | "ai"
  | "crawler"
  | "product_catalog"
  | "social"
  | "forms"
  | "media";

/** Property-level confidence and lineage metadata. */
export type PropertyMeta<T = unknown> = {
  value: T;
  source: DataSourceKind;
  confidence: number;
  verified: boolean;
  editor?: string | null;
  timestamp: string;
  updatedAt?: string;
};

export type LocalizedPropertyMap<T = unknown> = Record<string, PropertyMeta<T>>;

export type EntityProperties = Record<string, PropertyMeta | LocalizedPropertyMap>;

export type GraphEntity = {
  /** Internal UUID — never expose to schema/public APIs. */
  uuid: string;
  /** Immutable public ID: entity://type/slug */
  publicId: PublicEntityId;
  type: EntityType;
  slug: string;
  properties: EntityProperties;
  localeViews?: Record<string, EntityProperties>;
  createdAt: string;
  updatedAt: string;
};

export type GraphRelationship = {
  uuid: string;
  type: RelationshipType;
  fromPublicId: PublicEntityId;
  toPublicId: PublicEntityId;
  properties?: EntityProperties;
  confidence: number;
  source: DataSourceKind;
  createdAt: string;
  updatedAt: string;
};

export type SourceRecord = {
  source: DataSourceKind;
  sourceKey: string;
  entityType: EntityType;
  slug: string;
  properties: Record<string, unknown>;
  locale?: string;
  relationships?: Array<{
    type: RelationshipType;
    toType: EntityType;
    toSlug: string;
    properties?: Record<string, unknown>;
  }>;
  editor?: string | null;
  timestamp?: string;
};

export type IssueSeverity = "critical" | "warn" | "info";

export type SearchIntelligenceIssue = {
  id: string;
  category:
    | "technical"
    | "schema"
    | "content"
    | "linking"
    | "authority"
    | "performance"
    | "indexation"
    | "entity";
  title: string;
  severity: IssueSeverity;
  message: string;
  source?: string;
  entityPublicId?: PublicEntityId;
  url?: string;
  detectedAt: string;
  system: "static_analysis" | "continuous_crawl" | "schema" | "policy" | "ai" | "connector";
  autoFixEligible?: boolean;
  resolvedAt?: string | null;
};

export type IndexationState =
  | "created"
  | "submitted"
  | "crawled"
  | "indexed"
  | "ranking"
  | "updated"
  | "redirected"
  | "retired"
  | "error";

export type IndexationLifecycleRecord = {
  url: string;
  state: IndexationState;
  entityPublicId?: PublicEntityId;
  lastChangedAt: string;
  history: Array<{ state: IndexationState; at: string; note?: string }>;
};

export type AuditEventKind =
  | "crawler_run"
  | "connector_sync"
  | "ai_suggestion"
  | "auto_fix"
  | "entity_upsert"
  | "schema_build"
  | "revision_created"
  | "rollback";

export type AuditEvent = {
  id: string;
  kind: AuditEventKind;
  at: string;
  actor?: string | null;
  payload: Record<string, unknown>;
};

export type RevisionRecord = {
  id: string;
  targetType: "entity" | "schema" | "metadata" | "ai_suggestion";
  targetId: string;
  createdAt: string;
  actor?: string | null;
  summary: string;
  before: unknown;
  after: unknown;
};

export type ConnectorState =
  | "disconnected"
  | "configuring"
  | "authenticating"
  | "ready"
  | "syncing"
  | "rate_limited"
  | "error"
  | "recovering";

export type ConnectorHealth = {
  connectorId: string;
  state: ConnectorState;
  ok: boolean;
  message: string;
  lastSyncAt?: string | null;
  metrics?: Record<string, number>;
};

export type SchemaVersionFlag = {
  version: number;
  enabled: boolean;
  shadowMode?: boolean;
};

export type GraphMetrics = {
  pageRank: number;
  betweenness: number;
  hubScore: number;
  authorityScore: number;
  topicClusterDensity: number;
  averageClickDistance: number;
  internalLinkDepth: number;
  inDegree: number;
  outDegree: number;
};
