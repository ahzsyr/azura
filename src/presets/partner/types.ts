import type { LocalizedValueMap } from "@/features/translation/types";

export type PartnerCategoryPublic = {
  id: string;
  slug: string;
  name: LocalizedValueMap;
};

export type PartnerPublic = {
  id: string;
  categoryId: string | null;
  categorySlug: string | null;
  name: LocalizedValueMap;
  description: LocalizedValueMap;
  logoUrl: string;
  websiteUrl: string;
  profileUrl: string;
  email: string;
  phone: string;
  location: LocalizedValueMap;
  latitude: number | null;
  longitude: number | null;
  certifications: string[];
};

export type PartnerProgramPublic = {
  id: string;
  slug: string;
  title: LocalizedValueMap;
  description: LocalizedValueMap;
  categories: PartnerCategoryPublic[];
  partners: PartnerPublic[];
};

export type PartnerProgramAdmin = {
  id: string;
  slug: string;
  title: LocalizedValueMap;
  description: LocalizedValueMap;
  sortOrder: number;
  isPublished: boolean;
  categoryCount: number;
  partnerCount: number;
};

export type PartnerProgramBlockInput = {
  partnerProgramSlug?: string;
  categorySlug?: string;
  locationFilter?: string;
  limit?: number;
};
