import type { PricingCalculatorBlockInput, PricingCalculatorPublic } from "./types";
import { getPricingCalculatorBySlugCached } from "@/services/data-loaders";

export async function resolveCalculatorForBlock(
  props: PricingCalculatorBlockInput
): Promise<PricingCalculatorPublic | null> {
  const slug = (props.pricingCalculatorSlug ?? "").trim();
  if (!slug) return null;
  return getPricingCalculatorBySlugCached(slug);
}
