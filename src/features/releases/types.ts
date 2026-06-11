export type ReleaseEntryPublic = {
  id: string;
  category: string;
  textEn: string;
  textAr: string;
};

export type ReleasePublic = {
  id: string;
  version: string;
  releaseDate: string | null;
  status: string;
  tags: string[];
  entries: ReleaseEntryPublic[];
};

export type ReleaseSetPublic = {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  releases: ReleasePublic[];
};

export type ReleaseSetAdmin = {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  sortOrder: number;
  isPublished: boolean;
  releaseCount: number;
};

export type ReleasesBlockInput = {
  releaseSetSlug?: string;
};
