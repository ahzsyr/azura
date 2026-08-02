import type { JsonNamespace } from "@/features/storage/constants";

// ---------------------------------------------------------------------------
// Storage providers
// ---------------------------------------------------------------------------

export type StorageProviderId = "mysql" | "json-store";

export type StorageProviderKind = "relational" | "document";

export interface StorageProvider {
  id: StorageProviderId;
  displayName: string;
  kind: StorageProviderKind;
}

// Future provider stubs (not implemented in Phase 1)
export type FutureStorageProviderId =
  | "supabase-storage"
  | "filesystem"
  | "search-index"
  | "redis";

// ---------------------------------------------------------------------------
// Data categories
// ---------------------------------------------------------------------------

export type DataCategory =
  | "content"
  | "catalog"
  | "marketing"
  | "seo"
  | "i18n"
  | "portal"
  | "system";

// JSON-specific sub-category (drives grouping in the namespace dropdown)
export type JsonCategory =
  | "builder"
  | "cache"
  | "theme"
  | "settings"
  | "seo"
  | "navigation"
  | "cms";

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

export interface DataSourceCapabilities {
  /** Whether to include this source in Overview row counts. */
  count: boolean;
  /** Whether records can be listed in Data Explorer. */
  browse: boolean;
  /** Whether a single record can be inspected (full JSON). */
  inspect: boolean;
  /** Whether records can be created/updated/deleted (JSON store only in Phase 1). */
  edit: boolean;
  /** Whether namespace/table can be exported. */
  export: boolean;
}

// ---------------------------------------------------------------------------
// List rendering helpers (row → human-readable label)
// ---------------------------------------------------------------------------

export interface ListConfig {
  title: (row: Record<string, unknown>) => string;
  subtitle?: (row: Record<string, unknown>) => string;
}

// ---------------------------------------------------------------------------
// Core source definition
// ---------------------------------------------------------------------------

/**
 * A DataSourceDefinition is the single registry entry for any piece of
 * persisted data in the platform — whether MySQL/Prisma or JSON store.
 * Overview counts, Schema Explorer, Data Explorer, and Backup all derive
 * their data from this registry.
 */
export interface DataSourceDefinition {
  /** Unique identifier. For MySQL sources this mirrors the Prisma model name. */
  id: string;

  storage: StorageProviderId;

  /** Broad admin category used to group sources in Overview cards. */
  category: DataCategory;

  displayName: string;

  /** Optional deep-link to the dedicated admin screen for this model. */
  adminHref?: string;

  /**
   * If set, source visibility in Overview/Data Explorer is gated by the
   * deployment profile nav item. Uses `isAdminNavItemEnabled(deploymentNavItemId)`.
   */
  deploymentNavItemId?: string;

  capabilities: DataSourceCapabilities;

  // ------------------------------------------------------------------
  // MySQL / Prisma sources
  // ------------------------------------------------------------------

  /** Matches the Prisma model name, e.g. "FaqItem". Used in Schema Explorer. */
  prismaModelName?: string;

  /**
   * Explicit list query returning paginated `{ items, total }`.
   * Required when `capabilities.browse = true` for MySQL sources.
   */
  findMany?: (args: { skip: number; take: number }) => Promise<unknown[]>;
  findUnique?: (id: string) => Promise<unknown | null>;
  count?: () => Promise<number>;
  /**
   * Free-text search across the source's most relevant string fields.
   * Returns up to `limit` matching records.
   * Required when `capabilities.browse = true` to participate in global search.
   */
  search?: (query: string, limit: number) => Promise<unknown[]>;

  /** How to render a row in the Data Explorer list. */
  list?: ListConfig;

  /** Note shown in Schema Explorer (e.g. edit location). */
  note?: string;

  // ------------------------------------------------------------------
  // JSON store sources
  // ------------------------------------------------------------------

  /** For `storage: "json-store"` sources, this is the namespace key. */
  namespace?: JsonNamespace;

  /** Shown below the namespace selector in JSON Configuration. */
  description?: string;

  /** Groups namespaces in the JSON Configuration dropdown. */
  jsonCategory?: JsonCategory;
}
