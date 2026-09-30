import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { EntityRecord } from "@/features/entities/types";
import { mapPricingPlanEntityToCardViewModel } from "@/resolvers/pricing/map-entity-to-card";
import {
  isPricingPresetId,
  resolvePricingPlanCardTemplateId,
} from "@/templates/preset-template-map";
import { pricingPropsSchema } from "@/presets/pricing/schemas/pricing-blocks";
import { getEntityConfigForPreset, getEntityTypesForPreset } from "@/features/translation/entity-registry";

const planEntity: EntityRecord = {
  ref: { presetId: "pricing", storage: "portal", id: "plan-abc123456789012345", slug: "plan-abc123456789012345" },
  title: "Pro",
  fields: {
    description: "For growing teams",
    badge: "Popular",
    ctaLabel: "Start trial",
    ctaHref: "/signup",
    priceMonthly: 29,
    priceYearly: 290,
    discountPercent: 10,
    isHighlighted: true,
    featureValues: { feat1: "Unlimited", feat2: "5 seats" },
    currency: "USD",
    pricingPlanSetSlug: "saas",
    planSetId: "set-1",
  },
};

const baseCtx = { locale: "en", localePrefix: "en" };

describe("pricing preset-template-map", () => {
  it("identifies pricing preset", () => {
    assert.equal(isPricingPresetId("pricing"), true);
    assert.equal(isPricingPresetId("partner"), false);
  });

  it("resolves plan-card template id", () => {
    assert.equal(resolvePricingPlanCardTemplateId(), "plan-card");
  });
});

describe("mapPricingPlanEntityToCardViewModel", () => {
  it("builds pricing plan card view model", () => {
    const vm = mapPricingPlanEntityToCardViewModel(
      { entity: planEntity, pricingPlanSetSlug: "saas", currency: "USD" },
      baseCtx,
    );
    assert.equal(vm.templateId, "plan-card");
    assert.equal(vm.presetId, "pricing");
    assert.equal(vm.entityId, "plan-abc123456789012345");
    assert.equal(vm.name, "Pro");
    assert.equal(vm.priceMonthly, 29);
    assert.equal(vm.priceYearly, 290);
    assert.equal(vm.currency, "USD");
    assert.equal(vm.pricingPlanSetSlug, "saas");
    assert.equal(vm.isHighlighted, true);
    assert.deepEqual(vm.featureValues, { feat1: "Unlimited", feat2: "5 seats" });
  });

  it("uses entity id as slug surrogate", () => {
    const vm = mapPricingPlanEntityToCardViewModel({ entity: planEntity }, baseCtx);
    assert.equal(vm.entityId, planEntity.ref.id);
    assert.equal(planEntity.ref.slug, planEntity.ref.id);
  });
});

describe("pricingPropsSchema", () => {
  it("accepts optional presetId and templateId for planSet path", () => {
    const parsed = pricingPropsSchema.parse({
      source: "planSet",
      planSetSlug: "saas",
      presetId: "pricing",
      templateId: "plan-card",
    });
    assert.equal(parsed.presetId, "pricing");
    assert.equal(parsed.templateId, "plan-card");
    assert.equal(parsed.source, "planSet");
  });

  it("defaults source to packages without preset fields", () => {
    const parsed = pricingPropsSchema.parse({});
    assert.equal(parsed.source, "packages");
    assert.equal(parsed.presetId, undefined);
    assert.equal(parsed.templateId, undefined);
  });
});

describe("pricing translation preset aliases", () => {
  it("maps pricing preset to legacy entity types", () => {
    const types = getEntityTypesForPreset("pricing");
    assert.deepEqual(types, ["PricingPlan", "PricingPlanFeature", "PricingPlanSet"]);
    const configs = getEntityConfigForPreset("pricing");
    assert.equal(configs.length, 3);
  });
});
