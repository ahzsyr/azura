import type { Collection } from "./types";
import { emptyRuleGroup, upgradeLegacyRuleSet } from "@/features/categories/matching";

export type CollectionExportDocument = {
  version: 1;
  exportedAt: string;
  collectionCount: number;
  collections: Collection[];
};

export function buildCollectionExportDocument(collections: Collection[]): CollectionExportDocument {
  const exported = collections.map((col) => normalizeCollectionForExport(col));
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    collectionCount: exported.length,
    collections: exported,
  };
}

export function normalizeCollectionForExport(col: Collection): Collection {
  return {
    id: col.id,
    slug: col.slug,
    name: col.name,
    description: col.description ?? "",
    badge: col.badge ?? "",
    coverImage: col.coverImage ?? "",
    iconImage: col.iconImage ?? undefined,
    parentSlug: col.parentSlug?.trim() || undefined,
    seo: col.seo ?? {},
    conditions: upgradeLegacyRuleSet(col.conditions ?? emptyRuleGroup("any")),
    cardTemplate: col.cardTemplate ?? "default",
    sortBy: col.sortBy ?? "name-asc",
    pageLayoutTemplate: col.pageLayoutTemplate ?? null,
    visible: col.visible !== false,
    showInNav: col.showInNav ?? false,
    featured: col.featured ?? false,
    tags: col.tags ?? [],
    createdAt: col.createdAt,
    updatedAt: col.updatedAt,
  };
}
