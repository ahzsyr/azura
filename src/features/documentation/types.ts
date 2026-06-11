export type DocSectionPublic = {
  id: string;
  slug: string;
  parentId: string | null;
  titleEn: string;
  titleAr: string;
  href: string;
  contentEn: string;
  contentAr: string;
  versionId: string | null;
};

export type DocVersionPublic = {
  id: string;
  slug: string;
  labelEn: string;
  labelAr: string;
  isDefault: boolean;
};

export type DocPortalPublic = {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  versions: DocVersionPublic[];
  sections: DocSectionPublic[];
};

export type DocPortalAdmin = {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  sortOrder: number;
  isPublished: boolean;
  versionCount: number;
  sectionCount: number;
};

export type DocumentationBlockInput = {
  docPortalSlug?: string;
  versionSlug?: string;
  rootSectionSlug?: string;
};
