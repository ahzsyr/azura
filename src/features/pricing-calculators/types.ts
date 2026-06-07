export type PricingCalculatorFieldPublic = {
  id: string;
  key: string;
  labelEn: string;
  labelAr: string;
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
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  currency: string;
  basePrice: number;
  fields: PricingCalculatorFieldPublic[];
  rules: PricingCalculatorRulePublic[];
};

export type PricingCalculatorAdmin = {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  sortOrder: number;
  isPublished: boolean;
  fieldCount: number;
  ruleCount: number;
};

export type PricingCalculatorBlockInput = {
  pricingCalculatorSlug?: string;
};
