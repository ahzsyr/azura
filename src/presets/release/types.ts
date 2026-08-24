import type { LocalizedValueMap } from "@/features/translation/types";

export type ReleaseEntryPublic = {
  id: string;
  category: string;
  text: LocalizedValueMap;
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
  title: LocalizedValueMap;
  description: LocalizedValueMap;
  releases: ReleasePublic[];
};

export type ReleaseSetAdmin = {
  id: string;
  slug: string;
  title: LocalizedValueMap;
  description: LocalizedValueMap;
  sortOrder: number;
  isPublished: boolean;
  releaseCount: number;
};

export type ReleasesBlockInput = {
  releaseSetSlug?: string;
};
