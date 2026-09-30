/**
 * Canonical Category contracts (Categories unification).
 * Category = taxonomy SoT; CategoryMembership = materialized membership index.
 */

export type CategoryScope =
  | "PRODUCT"
  | "CONTENT"
  | "POST"
  | "KNOWLEDGE"
  | "PARTNER"
  | "TESTIMONIAL";

export type CategoryEntityKind =
  | "product"
  | "contentItem"
  | "post"
  | "knowledgeArticle"
  | "partner"
  | "testimonial";

export type MembershipMode = "MANUAL" | "RULES" | "HYBRID";

export type MembershipSource = "MANUAL" | "RULE";

export type CategorySeo = {
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterCard?: string;
  canonicalPath?: string;
};

export type CategoryCardTemplate = "default" | "featured" | "compact";

export type CategorySortBy =
  | "default"
  | "newest"
  | "oldest"
  | "name-asc"
  | "name-desc"
  | "price-asc"
  | "price-desc"
  | "popularity"
  | "featured"
  | "custom";

/** Presentation + SEO + migration metadata stored on Category. */
export type CategoryMetadata = {
  name?: string;
  description?: string;
  badge?: string;
  coverImage?: string;
  iconImage?: string;
  cardTemplate?: CategoryCardTemplate;
  sortBy?: CategorySortBy;
  seo?: CategorySeo;
  tags?: string[];
  legacy?: { table: string; id: string };
};

/**
 * Canonical Category — source of truth for taxonomy.
 * Identity: PRODUCT unique(scope, slug); scoped domains unique(scope, scopeOwnerId, slug).
 */
export type Category = {
  id: string;
  slug: string;
  scope: CategoryScope;
  /** null in domain API for PRODUCT; DB stores "". */
  scopeOwnerId: string | null;
  parentId?: string | null;
  sortOrder: number;
  visible: boolean;
  showInNav: boolean;
  featured: boolean;
  membershipMode: MembershipMode;
  /** Root Matching Rules group (always a group, never a bare leaf). */
  conditions: import("./matching/types").RuleGroup;
  metadata: CategoryMetadata;
  createdAt?: string;
  updatedAt?: string;
};

/** Input for create/upsert — id optional (generated when omitted). */
export type CategoryWriteInput = Omit<Category, "id"> & { id?: string };

/**
 * Materialized membership index — not a second taxonomy.
 * MANUAL = durable; RULE = derived/rebuildable.
 * Unique (categoryId, entityId, entityKind); HYBRID overlap → one row, MANUAL wins.
 */
export type CategoryMembership = {
  id: string;
  categoryId: string;
  entityId: string;
  entityKind: CategoryEntityKind;
  source: MembershipSource;
  sortOrder: number;
};

/** Unified list/picker shape for entity adapters (replaces Collection). */
export type CategoryListItem = {
  id: string;
  slug: string;
  title: string;
  scope: CategoryScope;
  sortOrder?: number;
};
