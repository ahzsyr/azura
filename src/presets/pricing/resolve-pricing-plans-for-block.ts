import "server-only";

import type { EntityTranslation } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { entityService } from "@/features/entities/entity.service";
import { translationService } from "@/features/translation/translation.service";
import { mapPricingPlanEntityToCardViewModel } from "@/resolvers/pricing/map-entity-to-card";
import type { PricingPlanCardViewModel } from "@/view-models/pricing-plan-card";
import type { ResolverContext } from "@/view-models/types";
import { resolvePricingPlanCardTemplateId } from "@/templates/preset-template-map";
import { resolveTranslation } from "@/features/translation/translation-resolver";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";
import type { PricingPlanFeatureView } from "@/templates/pricing/plan-card-body";

const DEFAULT_LOCALE_CODE = FALLBACK_LOCALES.find((locale) => locale.isDefault)?.code ?? "en";

export type PricingBlockResolvedData = {
  pricingPlanSetSlug: string;
  setTitle: string;
  currency: string;
  features: PricingPlanFeatureView[];
  planViewModels: PricingPlanCardViewModel[];
};

export type ResolvePricingPlansForBlockInput = {
  planSetSlug: string;
  limit?: number;
  presetId?: string;
  templateId?: string;
  highlightedPlanId?: string;
};

async function resolveSetTitle(planSetId: string, locale: string): Promise<string> {
  const translations = await translationService.getForEntity("PricingPlanSet", planSetId);
  const ctx = { translations };
  return (
    resolveTranslation("title", locale, ctx) ||
    resolveTranslation("title", DEFAULT_LOCALE_CODE, ctx) ||
    ""
  );
}

export async function resolvePricingPlansForBlock(
  input: ResolvePricingPlansForBlockInput,
  ctx: ResolverContext,
): Promise<PricingBlockResolvedData | null> {
  const setSlug = input.planSetSlug.trim();
  if (!setSlug) return null;

  const planSet = await prisma.pricingPlanSet.findFirst({
    where: { slug: setSlug, isPublished: true },
    select: { id: true, slug: true, currency: true },
  });
  if (!planSet) return null;

  const featureCollections = await entityService.listCollections("pricing", {
    pricingPlanSetSlug: setSlug,
  });

  const featureIds = featureCollections.map((collection) => collection.id);
  const featureTranslationMap =
    featureIds.length > 0
      ? await translationService.getForEntities("PricingPlanFeature", featureIds)
      : new Map<string, EntityTranslation[]>();

  const features: PricingPlanFeatureView[] = featureCollections.map((collection) => {
    const translations = featureTranslationMap.get(collection.id) ?? [];
    const tctx = { translations };
    const label =
      resolveTranslation("label", ctx.locale, tctx) ||
      resolveTranslation("label", DEFAULT_LOCALE_CODE, tctx) ||
      collection.title;
    return { id: collection.id, label };
  });

  const planRows = await entityService.listEntities("pricing", {
    pricingPlanSetSlug: setSlug,
    limit: input.limit && input.limit > 0 ? input.limit : undefined,
  });

  const planIds = planRows.map((row) => row.ref.id);
  const planTranslationMap =
    planIds.length > 0
      ? await translationService.getForEntities("PricingPlan", planIds)
      : new Map<string, EntityTranslation[]>();

  const templateId = input.templateId ?? resolvePricingPlanCardTemplateId();
  const planViewModels: PricingPlanCardViewModel[] = [];

  for (const row of planRows) {
    const entity = await entityService.getEntity("pricing", row.ref.id, {
      locale: ctx.localePrefix,
      pricingPlanSetSlug: setSlug,
    });
    if (!entity) continue;

    const vm = mapPricingPlanEntityToCardViewModel(
      {
        entity,
        itemTranslations: planTranslationMap.get(row.ref.id) ?? [],
        pricingPlanSetSlug: setSlug,
        currency: planSet.currency,
      },
      ctx,
    );
    if (templateId !== vm.templateId) continue;

    if (input.highlightedPlanId?.trim() && input.highlightedPlanId === vm.entityId) {
      vm.isHighlighted = true;
    }

    planViewModels.push(vm);
  }

  const setTitle = await resolveSetTitle(planSet.id, ctx.locale);

  return {
    pricingPlanSetSlug: planSet.slug,
    setTitle,
    currency: planSet.currency,
    features,
    planViewModels,
  };
}
