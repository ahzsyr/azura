import type { ContentStatus } from "@prisma/client";
import type { PageBlocks } from "@/types/builder";
import type { ContentFieldDefinition } from "@/features/content/types";

export type ContentMediaView = {
  id: string;
  url: string;
  alt: string;
  caption: string;
  altEn: string;
  altAr: string;
  captionEn: string;
  captionAr: string;
  sortOrder: number;
  isCover: boolean;
};

export type ContentCollectionView = {
  id: string;
  slug: string;
  name: string;
  nameEn: string;
  nameAr: string;
};

export type ContentTypeView = {
  id: string;
  slug: string;
  name: string;
  nameEn: string;
  nameAr: string;
  routePrefix: string | null;
  fieldSchema: ContentFieldDefinition[];
  adminConfig: Record<string, unknown>;
};

export type ContentItemView = {
  id: string;
  contentTypeSlug: string;
  routePrefix: string | null;
  slug: string | null;
  title: string;
  excerpt: string;
  description: string;
  titleEn: string;
  titleAr: string;
  excerptEn: string;
  excerptAr: string;
  descriptionEn: string;
  descriptionAr: string;
  attributes: Record<string, unknown>;
  blocks: PageBlocks;
  composition?: unknown;
  displaySettings: Record<string, unknown>;
  visualSettings: Record<string, unknown>;
  status: ContentStatus;
  isFeatured: boolean;
  isVisible: boolean;
  sortOrder: number;
  collection: ContentCollectionView | null;
  media: ContentMediaView[];
  href: string;
};

export type ContentRouteResolution =
  | { kind: "list"; contentType: ContentTypeView; collections: ContentCollectionView[] }
  | { kind: "detail"; contentType: ContentTypeView; item: ContentItemView }
  | { kind: "notFound" };

/** Legacy-compatible package list/detail shape for existing components */
export type LegacyPackageView = {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  excerptEn: string;
  excerptAr: string;
  descriptionEn: string;
  descriptionAr: string;
  price: unknown;
  currency: string;
  duration: number;
  travelDates: unknown;
  facilitiesEn: unknown;
  facilitiesAr: unknown;
  featuresEn: unknown;
  featuresAr: unknown;
  itineraryEn: unknown;
  itineraryAr: unknown;
  hotelInfoEn: string;
  hotelInfoAr: string;
  airlineInfoEn: string;
  airlineInfoAr: string;
  isFeatured: boolean;
  isPublished: boolean;
  sortOrder: number;
  category: ContentCollectionView;
  images: { id?: string; url: string; altEn?: string; altAr?: string; sortOrder?: number }[];
  contentItemId: string;
};

export type LegacyHotelView = {
  id: string;
  nameEn: string;
  nameAr: string;
  city: string;
  stars: number;
  excerptEn: string;
  excerptAr: string;
  descriptionEn: string;
  descriptionAr: string;
  imageUrl: string | null;
  sortOrder: number;
  contentItemId: string;
};

export type LegacyServiceView = {
  id: string;
  slug: string;
  type: string;
  titleEn: string;
  titleAr: string;
  excerptEn: string;
  excerptAr: string;
  descriptionEn: string;
  descriptionAr: string;
  icon: string;
  imageUrl: string | null;
  ctaLabelEn: string;
  ctaLabelAr: string;
  ctaHref: string;
  sortOrder: number;
  contentItemId: string;
};
