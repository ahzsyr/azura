import type { LocalizedValueMap } from "@/features/translation/types";

export type PricingPlanFeaturePublic = {
  id: string;
  label: LocalizedValueMap;
};

export type PricingPlanPublic = {
  id: string;
  name: LocalizedValueMap;
  description: LocalizedValueMap;
  priceMonthly: number;
  priceYearly: number;
  discountPercent: number;
  badge: LocalizedValueMap;
  isHighlighted: boolean;
  ctaLabel: LocalizedValueMap;
  ctaHref: string;
  featureValues: Record<string, unknown>;
};

export type PricingPlanSetPublic = {
  id: string;
  slug: string;
  title: LocalizedValueMap;
  description: LocalizedValueMap;
  currency: string;
  plans: PricingPlanPublic[];
  features: PricingPlanFeaturePublic[];
};

export type PricingPlanSetAdmin = {
  id: string;
  slug: string;
  title: LocalizedValueMap;
  description: LocalizedValueMap;
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
