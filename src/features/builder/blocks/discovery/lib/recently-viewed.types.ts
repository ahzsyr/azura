import type { SearchEntityType } from "@prisma/client";

export type RecentlyViewedEntry = {
  entityType: SearchEntityType;
  entityId: string;
  title: string;
  urlPath: string;
  imageUrl?: string;
  viewedAt: number;
};

export type DiscoveryItem = {
  id: string;
  entityType: SearchEntityType;
  entityId: string;
  title: string;
  urlPath: string;
  imageUrl?: string;
  snippet?: string;
  badge?: string;
};

export type DiscoveryAnchorContext = {
  context: "page" | "product" | "post" | "contentItem";
  slug?: string;
  id?: string;
  categorySlugs?: string[];
  tags?: string[];
  collectionSlug?: string;
  contentTypeSlug?: string;
};
