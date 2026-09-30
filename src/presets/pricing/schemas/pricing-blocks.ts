import { z } from "zod";

export const pricingSourceSchema = z.enum(["packages", "planSet"]);
export const pricingLayoutSchema = z.enum(["cards", "table", "comparison"]);
export const billingPeriodSchema = z.enum(["monthly", "yearly"]);

export const pricingPropsSchema = z.object({
  title: z.string().default(""),
  source: pricingSourceSchema.default("packages"),
  planSetSlug: z.string().default(""),
  presetId: z.literal("pricing").optional(),
  templateId: z.enum(["plan-card"]).optional(),
  layout: pricingLayoutSchema.default("cards"),
  showBillingToggle: z.boolean().default(true),
  defaultBillingPeriod: billingPeriodSchema.default("monthly"),
  highlightedPlanId: z.string().default(""),
  packageCategorySlug: z.string().default(""),
  limit: z.coerce.number().default(3),
  showFeaturedOnly: z.boolean().default(false),
});

export type PricingProps = z.infer<typeof pricingPropsSchema>;
