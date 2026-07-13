import type { DisplaySettings } from "@/schemas/catalog/display-settings";

export type CatalogListItem = {
  id: string;
  titleEn: string;
  titleAr: string;
  subtitle?: string;
  thumbnailUrl?: string | null;
  isPublished: boolean;
  sortOrder: number;
  badge?: string;
  meta?: string;
  editHref: string;
};

export type CatalogEntityKind = "package" | "hotel" | "service";

export type CatalogCardData = {
  id: string;
  slug?: string;
  source: "packages" | "hotels" | "services";
  nameEn: string;
  nameAr: string;
  excerptEn?: string;
  excerptAr?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  price?: unknown;
  currency?: string;
  duration?: number;
  category?: { id: string; slug: string; nameEn: string; nameAr: string };
  city?: string;
  stars?: number;
  type?: string;
  icon?: string;
  ctaLabelEn?: string;
  ctaLabelAr?: string;
  ctaHref?: string;
  isFeatured?: boolean;
  imageUrl?: string;
  href?: string;
  images: { url: string; altEn?: string; altAr?: string }[];
};

export type CatalogBlockRenderProps = {
  source: "packages" | "hotels" | "services";
  locale: string;
  title?: string;
  subtitle?: string;
  items: CatalogCardData[];
  displaySettings: DisplaySettings;
  viewAllHref?: string;
  emptyMessage?: string;
};
