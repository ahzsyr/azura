/**
 * Backward-compatibility re-exports.
 *
 * The canonical definitions now live in src/features/data-platform/registry/.
 * These re-exports keep all existing consumers (json-store.service.ts,
 * storage/actions.ts, and any external imports) working without changes.
 *
 * @deprecated Import directly from @/features/data-platform/registry instead.
 */

import { JSON_STORE_SOURCES, BROWSABLE_SOURCES, DATA_SOURCES } from "@/features/data-platform/registry/data-sources";
import { PRISMA_MODEL_OVERLAYS } from "@/features/data-platform/registry/prisma-overlay";
import type { DataCategory } from "@/features/data-platform/registry/types";

// ---------------------------------------------------------------------------
// JSON_NAMESPACES — legacy shape required by json-store.service and actions
// ---------------------------------------------------------------------------

type JsonNamespaceEntry = {
  label: string;
  description: string;
  category: string;
};

export const JSON_NAMESPACES = Object.fromEntries(
  JSON_STORE_SOURCES.map((src) => [
    src.namespace!,
    {
      label: src.displayName,
      description: src.description ?? "",
      category: src.jsonCategory ?? "settings",
    } satisfies JsonNamespaceEntry,
  ])
) as Record<string, JsonNamespaceEntry>;

export type JsonNamespace = keyof typeof JSON_NAMESPACES;

export const ALLOWED_JSON_NAMESPACES = Object.keys(JSON_NAMESPACES) as JsonNamespace[];

// ---------------------------------------------------------------------------
// BROWSABLE_TABLES — legacy shape required by old actions.ts + database.service
// ---------------------------------------------------------------------------

type BrowsableTableEntry = {
  label: string;
  prismaModel: string;
  adminHref: string;
};

export const BROWSABLE_TABLES = Object.fromEntries(
  BROWSABLE_SOURCES.map((src) => [
    src.id,
    {
      label: src.displayName,
      prismaModel: src.prismaModelName ?? src.id,
      adminHref: src.adminHref ?? "",
    } satisfies BrowsableTableEntry,
  ])
) as Record<string, BrowsableTableEntry>;

export type BrowsableTableKey = keyof typeof BROWSABLE_TABLES;

// ---------------------------------------------------------------------------
// SCHEMA_MODELS — legacy shape for old schema inspector
// ---------------------------------------------------------------------------

export const SCHEMA_MODELS = PRISMA_MODEL_OVERLAYS.map((o) => ({
  name: o.name,
  kind: o.name === "JsonStore" ? ("json" as const) : ("relational" as const),
  note: o.note,
}));
