import type { ContentItem, ContentStatus, ContentType, ContentCollection } from "@prisma/client";
import type { DisplaySettings } from "@/schemas/content/display-settings";

export type ContentFieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "boolean"
  | "json"
  | "price"
  | "url"
  | "date";

export type ContentFieldDefinition = {
  key: string;
  type: ContentFieldType;
  labelEn: string;
  labelAr?: string;
  required?: boolean;
  localized?: boolean;
  group?: string;
  placeholder?: string;
  options?: { value: string; labelEn: string; labelAr?: string }[];
  /** Comparison framework — schema-driven, no hardcoded field mapping */
  compare?: boolean;
  compareOrder?: number;
  compareGroup?: string;
  highlightDifferences?: boolean;
  compareLabelEn?: string;
  compareLabelAr?: string;
  /** Search framework — include field text in index; `facet: true` exposes filter facet */
  search?: boolean | { weight?: number; facet?: boolean };
};

export type ContentTypeDefinition = {
  slug: string;
  nameEn: string;
  nameAr: string;
  labelSingularEn: string;
  labelSingularAr: string;
  labelPluralEn: string;
  labelPluralAr: string;
  icon: string;
  routePrefix?: string;
  fields: ContentFieldDefinition[];
  displayDefaults?: Partial<DisplaySettings>;
  /** Maps legacy CatalogEntityType for migration bridge */
  legacyEntityType?: "PACKAGE" | "HOTEL" | "SERVICE";
};

export type ContentItemWithRelations = ContentItem & {
  contentType: ContentType;
  collection: ContentCollection | null;
  media?: ContentItemMediaAdmin[];
};

export type ContentItemMediaAdmin = {
  id: string;
  itemId: string;
  url: string;
  altEn: string;
  altAr: string;
  captionEn: string;
  captionAr: string;
  sortOrder: number;
  isPublished: boolean;
  isCover: boolean;
  isHidden: boolean;
};

export type ContentListItem = {
  id: string;
  titleEn: string;
  titleAr: string;
  subtitle?: string;
  thumbnailUrl?: string | null;
  status: ContentStatus;
  isVisible: boolean;
  isFeatured: boolean;
  sortOrder: number;
  badge?: string;
  meta?: string;
  editHref: string;
  slug?: string | null;
};

export type ContentCardData = {
  id: string;
  contentTypeSlug: string;
  slug?: string | null;
  title: string;
  excerpt?: string;
  description?: string;
  titleEn: string;
  titleAr: string;
  excerptEn?: string;
  excerptAr?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  attributes: Record<string, unknown>;
  isFeatured?: boolean;
  collection?: { id: string; slug: string; name: string; nameEn: string; nameAr: string };
  href?: string;
  images: { url: string; alt?: string; altEn?: string; altAr?: string }[];
};

export type ContentBlockConfig = {
  contentTypeSlug?: string;
  collectionSlug?: string;
  featuredOnly?: boolean;
  manualIds?: string[];
  limit?: number;
  attributeFilters?: Record<string, string>;
};

export type ContentBlockRenderProps = {
  locale: string;
  title?: string;
  subtitle?: string;
  items: ContentCardData[];
  displaySettings: DisplaySettings;
  viewAllHref?: string;
  emptyMessage?: string;
  compare?: {
    contentTypeSlug: string;
    maxItems: number;
    label?: string;
  };
};
