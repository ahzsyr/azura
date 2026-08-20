import "server-only";

import { entityService } from "@/features/entities/entity.service";
import { EntityNotFoundError } from "@/resolvers/errors";
import {
  mapPricingPlanEntityToCardViewModel,
  type MapPricingPlanEntityInput,
} from "@/resolvers/pricing/map-entity-to-card";
import type { PricingPlanCardViewModel } from "@/view-models/pricing-plan-card";
import type { ResolverContext } from "@/view-models/types";
import { translationService } from "@/features/translation/translation.service";

export async function resolvePricingPlanCardViewModel(
  entityId: string,
  ctx: ResolverContext,
  options?: { pricingPlanSetSlug?: string; currency?: string },
): Promise<PricingPlanCardViewModel> {
  const key = entityId.trim();
  const entity = await entityService.getEntity("pricing", key, {
    locale: ctx.localePrefix,
    pricingPlanSetSlug: options?.pricingPlanSetSlug,
  });
  if (!entity) {
    throw new EntityNotFoundError("pricing", key);
  }

  const translations = await translationService.getForEntity("PricingPlan", entity.ref.id);
  const setSlug =
    options?.pricingPlanSetSlug ??
    (typeof entity.fields.pricingPlanSetSlug === "string"
      ? entity.fields.pricingPlanSetSlug
      : "");
  const currency =
    options?.currency ??
    (typeof entity.fields.currency === "string" ? entity.fields.currency : "USD");

  return mapPricingPlanEntityToCardViewModel(
    {
      entity,
      itemTranslations: translations,
      pricingPlanSetSlug: setSlug,
      currency,
    },
    ctx,
  );
}

export function resolvePricingPlanCardViewModelFromEntity(
  input: MapPricingPlanEntityInput,
  ctx: ResolverContext,
): PricingPlanCardViewModel {
  return mapPricingPlanEntityToCardViewModel(input, ctx);
}
