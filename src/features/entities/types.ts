import type { ContentStatus } from "@prisma/client";

/** Shipped preset identifiers — canonical names for AZURA 2.0. */
export type EntityPresetId =
  | "product"
  | "service"
  | "destination"
  | "property"
  | "project"
  | "case-study"
  | "team-member"
  | "partner"
  | "knowledge"
  | "pricing"
  | "event";

/** Where the preset's data lives today (pre-unification). */
export type EntityStorageBackend = "content_item" | "product" | "portal";

export type EntityRoutePolicy = "none" | "optional" | "required";

export type EntityPresetStatus = "active" | "planned";

/** Manifest row for a preset EntityType. */
export type EntityTypeDefinition = {
  presetId: EntityPresetId;
  labelSingularEn: string;
  labelPluralEn: string;
  labelSingularAr?: string;
  labelPluralAr?: string;
  icon: string;
  storage: EntityStorageBackend;
  /** Legacy ContentType.slug when storage is content_item. */
  contentTypeSlug?: string;
  routePolicy: EntityRoutePolicy;
  status: EntityPresetStatus;
  /** Current admin list href (legacy routes until Phase 8). */
  adminHref: string;
  /** Phase 3 storage cutover stage for product preset. */
  migrationPhase?: "legacy" | "dual" | "content_item";
};

/** Stable pointer to one entity instance across storage backends. */
export type EntityRef = {
  presetId: EntityPresetId;
  storage: EntityStorageBackend;
  id: string;
  slug: string;
};

/** Unified list row for admin and public pickers. */
export type EntityListRow = {
  ref: EntityRef;
  title: string;
  status?: ContentStatus | string;
  thumbnailUrl?: string | null;
  collectionSlug?: string | null;
  updatedAt?: Date | null;
  isFeatured?: boolean;
  isVisible?: boolean;
};

/** Full entity read shape — no raw Prisma rows in the public contract. */
export type EntityRecord = EntityListRow & {
  titleEn?: string;
  titleAr?: string;
  description?: string;
  excerpt?: string;
  fields: Record<string, unknown>;
  href?: string;
};

/** Grouping bucket for entities within a preset EntityType. */
export type Collection = {
  id: string;
  slug: string;
  title: string;
  presetId: EntityPresetId;
  sortOrder?: number;
};

export type EntityListOptions = {
  /** Locale URL prefix, e.g. `en` or `ar`. Required for product preset reads. */
  locale?: string;
  search?: string;
  status?: ContentStatus;
  collectionSlug?: string;
  /** Portal preset: scope articles/categories to a knowledge base slug. */
  knowledgeBaseSlug?: string;
  /** Portal preset: scope team members to a team directory slug. */
  teamDirectorySlug?: string;
  /** Portal preset: scope partners to a partner program slug. */
  partnerProgramSlug?: string;
  /** Portal preset: filter team members by department id. */
  departmentId?: string;
  /** Portal preset: filter partners by localized location substring. */
  locationFilter?: string;
  /** Portal preset: scope pricing plans to a plan set slug. */
  pricingPlanSetSlug?: string;
  limit?: number;
  includeDeleted?: boolean;
};

export type EntityGetOptions = Pick<
  EntityListOptions,
  | "locale"
  | "status"
  | "includeDeleted"
  | "knowledgeBaseSlug"
  | "teamDirectorySlug"
  | "partnerProgramSlug"
  | "pricingPlanSetSlug"
>;

  /** @planned Phase 3 — implemented via entityService.saveEntity */
export type EntityWriteInput = {
  presetId: EntityPresetId;
  id?: string;
  slug?: string;
  fields: Record<string, unknown>;
  status?: ContentStatus;
  localeCode?: string;
  localizedSlug?: string;
  collectionSlugs?: string[];
};

/**
 * Result of entityService.saveEntity.
 */
export type EntitySaveResult = {
  ref: EntityRef;
  created: boolean;
};
