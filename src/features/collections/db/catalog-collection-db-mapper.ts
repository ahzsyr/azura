import type { Prisma } from "@prisma/client";
import type { CatalogCollection } from "@prisma/client";
import type { Collection, CollectionRuleSet, CollectionSeo } from "@/features/collections/types";

type CollectionMetadata = {
  id?: string;
  badge?: string;
  coverImage?: string;
  iconImage?: string;
  seo?: CollectionSeo;
  cardTemplate?: Collection["cardTemplate"];
  sortBy?: Collection["sortBy"];
  showInNav?: boolean;
  featured?: boolean;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
};

function parseMetadata(raw: unknown): CollectionMetadata {
  if (!raw || typeof raw !== "object") return {};
  return raw as CollectionMetadata;
}

export function rowToCollection(row: CatalogCollection): Collection {
  const meta = parseMetadata(row.metadata);
  const ruleSet = row.conditions as CollectionRuleSet;
  return {
    id: meta.id ?? row.slug,
    slug: row.slug,
    name: row.slug,
    description: "",
    badge: meta.badge,
    coverImage: meta.coverImage,
    iconImage: meta.iconImage,
    parentSlug: row.parentSlug ?? undefined,
    seo: meta.seo,
    conditions: ruleSet,
    cardTemplate: meta.cardTemplate,
    sortBy: meta.sortBy,
    visible: row.visible,
    showInNav: meta.showInNav,
    featured: meta.featured,
    tags: meta.tags,
    createdAt: meta.createdAt ?? row.createdAt.toISOString(),
    updatedAt: meta.updatedAt ?? row.updatedAt.toISOString(),
  };
}

export function collectionToRow(
  col: Collection,
  sortOrder = 0,
): Prisma.CatalogCollectionUncheckedCreateInput {
  const metadata: CollectionMetadata = {
    id: col.id,
    badge: col.badge,
    coverImage: col.coverImage,
    iconImage: col.iconImage,
    seo: col.seo,
    cardTemplate: col.cardTemplate,
    sortBy: col.sortBy,
    showInNav: col.showInNav,
    featured: col.featured,
    tags: col.tags,
    createdAt: col.createdAt,
    updatedAt: col.updatedAt ?? new Date().toISOString(),
  };

  const conditionsValue = (col.conditions ?? { match: "any", rules: [] }) as Prisma.InputJsonValue;

  return {
    slug: col.slug,
    parentSlug: col.parentSlug?.trim() || null,
    sortOrder,
    visible: col.visible !== false,
    conditions: conditionsValue,
    metadata: metadata as Prisma.InputJsonValue,
  };
}
