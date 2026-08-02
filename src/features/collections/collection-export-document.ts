import type { Collection } from "./types";

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
    conditions: {
      match: col.conditions?.match ?? "any",
      rules: Array.isArray(col.conditions?.rules) ? col.conditions.rules : [],
    },
    cardTemplate: col.cardTemplate ?? "default",
    sortBy: col.sortBy ?? "name-asc",
    visible: col.visible !== false,
    showInNav: col.showInNav ?? false,
    featured: col.featured ?? false,
    tags: col.tags ?? [],
    createdAt: col.createdAt,
    updatedAt: col.updatedAt,
  };
}
