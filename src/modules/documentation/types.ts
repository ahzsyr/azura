import type { LocalizedValueMap } from "@/features/translation/types";

export type DocSectionPublic = {
  id: string;
  slug: string;
  parentId: string | null;
  title: LocalizedValueMap;
  href: string;
  content: LocalizedValueMap;
  versionId: string | null;
};

export type DocVersionPublic = {
  id: string;
  slug: string;
  label: LocalizedValueMap;
  isDefault: boolean;
};

export type DocPortalPublic = {
  id: string;
  slug: string;
  title: LocalizedValueMap;
  description: LocalizedValueMap;
  versions: DocVersionPublic[];
  sections: DocSectionPublic[];
};

export type DocPortalAdmin = {
  id: string;
  slug: string;
  title: LocalizedValueMap;
  description: LocalizedValueMap;
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
