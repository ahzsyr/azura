import type { PricingPlanCardTemplateId } from "@/view-models/types";

/** Flattened pricing plan card for plan-set blocks. */
export type PricingPlanCardViewModel = {
  templateId: PricingPlanCardTemplateId;
  presetId: "pricing";
  entityId: string;
  pricingPlanSetSlug: string;
  name: string;
  description: string;
  badge: string;
  ctaLabel: string;
  ctaHref: string;
  priceMonthly: number;
  priceYearly: number;
  discountPercent: number;
  currency: string;
  isHighlighted: boolean;
  featureValues: Record<string, string>;
};
