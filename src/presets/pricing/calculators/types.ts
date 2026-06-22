import type { LocalizedValueMap } from "@/features/translation/types";

export type PricingCalculatorFieldPublic = {
  id: string;
  key: string;
  label: LocalizedValueMap;
  fieldType: string;
  options: unknown[];
  defaultValue: string;
};

export type PricingCalculatorRulePublic = {
  id: string;
  fieldKey: string;
  operator: string;
  value: string;
  priceDelta: number;
  multiplier: number;
};

export type PricingCalculatorPublic = {
  id: string;
  slug: string;
  title: LocalizedValueMap;
  description: LocalizedValueMap;
  currency: string;
  basePrice: number;
  fields: PricingCalculatorFieldPublic[];
  rules: PricingCalculatorRulePublic[];
};

export type PricingCalculatorAdmin = {
  id: string;
  slug: string;
  title: LocalizedValueMap;
  sortOrder: number;
  isPublished: boolean;
  fieldCount: number;
  ruleCount: number;
};

export type PricingCalculatorBlockInput = {
  pricingCalculatorSlug?: string;
};
