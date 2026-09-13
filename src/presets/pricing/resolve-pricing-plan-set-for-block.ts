import type { PricingPlanSetBlockInput, PricingPlanSetPublic } from "./types";
import { getPricingPlanSetBySlugCached } from "@/services/data-loaders";

export async function resolvePricingPlanSetForBlock(
  props: PricingPlanSetBlockInput
): Promise<PricingPlanSetPublic | null> {
  const slug = (props.pricingPlanSetSlug ?? props.planSetSlug ?? "").trim();
  if (!slug) return null;
  return getPricingPlanSetBySlugCached(slug);
}
