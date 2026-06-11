export type PartnerCategoryPublic = {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
};

export type PartnerPublic = {
  id: string;
  categoryId: string | null;
  categorySlug: string | null;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  logoUrl: string;
  websiteUrl: string;
  profileUrl: string;
  email: string;
  phone: string;
  locationEn: string;
  locationAr: string;
  latitude: number | null;
  longitude: number | null;
  certifications: string[];
};

export type PartnerProgramPublic = {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  categories: PartnerCategoryPublic[];
  partners: PartnerPublic[];
};

export type PartnerProgramAdmin = {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
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
