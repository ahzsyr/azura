export type PricingPlanFeaturePublic = {
  id: string;
  labelEn: string;
  labelAr: string;
};

export type PricingPlanPublic = {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  priceMonthly: number;
  priceYearly: number;
  discountPercent: number;
  badgeEn: string;
  badgeAr: string;
  isHighlighted: boolean;
  ctaLabelEn: string;
  ctaLabelAr: string;
  ctaHref: string;
  featureValues: Record<string, unknown>;
};

export type PricingPlanSetPublic = {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  currency: string;
  plans: PricingPlanPublic[];
  features: PricingPlanFeaturePublic[];
};

export type PricingPlanSetAdmin = {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  currency: string;
  sortOrder: number;
  isPublished: boolean;
  planCount: number;
  featureCount: number;
};

export type PricingPlanSetBlockInput = {
  planSetSlug?: string;
  pricingPlanSetSlug?: string;
};
