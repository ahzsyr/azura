import type { DataCategory } from "./registry/types";

/** Overview data passed to the DataPlatformConsole component. */
export type PlatformOverview = {
  jsonEntries: number;
  namespaces: { name: string; count: number }[];
  relationalCounts: Record<string, number>;
  /** Non-null when the database could not be reached. */
  databaseError: string | null;
  /** The active deployment profile, for the Overview badge. */
  activeProfile: { id: string; label: string };
  /** Status breakdowns for key models, shown in the Overview health section. */
  healthSignals?: HealthSignals;
};

/** Schema model info for the Schema Explorer tab. */
export type SchemaModelInfo = {
  name: string;
  /** "relational" for MySQL models, "json" for JsonStore. */
  kind: "relational" | "json";
  category: DataCategory;
  note: string;
  adminHref?: string;
  deploymentNavItemId?: string;
  /**
   * Whether this model is enabled in the active deployment profile.
   * undefined = no profile gate (always visible).
   */
  profileEnabled?: boolean;
  fieldCount?: number;
  relationCount?: number;
  count?: number;
  /** Outgoing relations, derived from prisma-metadata.json. */
  relations?: Array<{
    field: string;
    referencedModel: string;
    /** adminHref of the referenced model, if available in the overlay. */
    referencedAdminHref?: string;
  }>;
};

/** A raw Prisma model field from prisma-metadata.json. */
export type PrismaMetadataField = {
  name: string;
  type: string;
  isList: boolean;
  isOptional: boolean;
  isRelation: boolean;
  hasDefault: boolean;
};

/** A raw Prisma model entry from prisma-metadata.json. */
export type PrismaMetadataModel = {
  name: string;
  fields: PrismaMetadataField[];
  relations: { field: string; referencedModel: string }[];
  indexes: string[];
  uniqueConstraints: string[];
};

/** The full prisma-metadata.json shape. */
export type PrismaMetadata = {
  generatedAt: string;
  modelCount: number;
  models: PrismaMetadataModel[];
};

/**
 * Richer status breakdowns shown in the Overview "health signals" section.
 * All counts are optional — missing means the query was skipped (e.g. feature
 * disabled) rather than zero.
 */
export type HealthSignals = {
  contentItems?: {
    total: number;
    published: number;
    draft: number;
    scheduled: number;
    archived: number;
  };
  faqSets?: { total: number; active: number };
  galleries?: { total: number; published: number };
};

/** A single source's contribution to a cross-source search. */
export type SearchResult = {
  sourceId: string;
  sourceName: string;
  adminHref?: string;
  items: Array<{
    id: string;
    title: string;
    subtitle?: string;
  }>;
};

/**
 * Serializable subset of a DataSourceDefinition safe to pass from a Server
 * Component into a Client Component. Omits query functions and list helpers.
 */
export type DataSourceClientMeta = {
  id: string;
  storage: "mysql" | "json-store";
  category: DataCategory;
  displayName: string;
  adminHref?: string;
  deploymentNavItemId?: string;
  capabilities: {
    count: boolean;
    browse: boolean;
    inspect: boolean;
    edit: boolean;
    export: boolean;
  };
  prismaModelName?: string;
  note?: string;
  namespace?: string;
  description?: string;
  jsonCategory?: string;
};
