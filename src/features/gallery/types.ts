import type { GalleryMediaKind } from "@prisma/client";

export type GalleryAlbumAdmin = {
  id: string;
  slug: string;
  displayTitle: string;
  titleEn: string;
  titleAr: string;
  excerptEn: string | null;
  excerptAr: string | null;
  descriptionEn: string;
  descriptionAr: string;
  infoEn: string | null;
  infoAr: string | null;
  coverUrl: string | null;
  sortOrder: number;
  isPublished: boolean;
  mediaCount: number;
  previewUrl: string | null;
};

export type GalleryMediaAdmin = {
  id: string;
  galleryId: string;
  titleEn: string;
  titleAr: string;
  excerptEn: string | null;
  excerptAr: string | null;
  descriptionEn: string;
  descriptionAr: string;
  infoEn: string | null;
  infoAr: string | null;
  mediaUrl: string;
  mediaKind: GalleryMediaKind;
  sortOrder: number;
  isPublished: boolean;
};

export type GalleryAlbumPublic = {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  excerptEn: string | null;
  excerptAr: string | null;
  coverUrl: string | null;
  mediaCount: number;
};

export type GalleryMediaPublic = {
  id: string;
  titleEn: string;
  titleAr: string;
  excerptEn: string | null;
  excerptAr: string | null;
  descriptionEn: string;
  descriptionAr: string;
  infoEn: string | null;
  infoAr: string | null;
  mediaUrl: string;
  mediaKind: GalleryMediaKind;
  sortOrder: number;
};

export type GalleryAlbumDetailPublic = GalleryAlbumPublic & {
  descriptionEn: string;
  descriptionAr: string;
  infoEn: string | null;
  infoAr: string | null;
  media: GalleryMediaPublic[];
};

export type GalleryBuilderOption = {
  slug: string;
  titleEn: string;
  titleAr: string;
  isPublished: boolean;
  mediaCount: number;
};

export type GalleryHomePreviewItem = {
  id: string;
  titleEn: string;
  titleAr: string;
  mediaUrl: string;
  mediaKind: GalleryMediaKind;
  gallerySlug: string;
};
