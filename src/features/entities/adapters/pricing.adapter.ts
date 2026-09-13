import "server-only";

import type { EntityTranslation } from "@prisma/client";
import { pricingRepository } from "@/repositories/pricing.repository";
import { translationService } from "@/features/translation/translation.service";
import { resolveTranslation } from "@/features/translation/translation-resolver";
import type {
  Collection,
  EntityGetOptions,
  EntityListOptions,
  EntityListRow,
  EntityRecord,
} from "@/features/entities/types";
import type { EntityStorageAdapter } from "@/features/entities/adapters/types";

const PRESET_ID = "pricing" as const;
const CUID_PATTERN = /^c[a-z0-9]{20,}$/i;

type PlanRow = {
  id: string;
  planSetId: string;
  priceMonthly: { toString(): string } | number;
  priceYearly: { toString(): string } | number;
  discountPercent: number;
  isHighlighted: boolean;
  ctaHref: string;
  featureValues: unknown;
  sortOrder: number;
  isPublished: boolean;
  updatedAt: Date;
  planSet?: { slug: string; currency: string; isPublished?: boolean } | null;
};

function looksLikePlanId(value: string): boolean {
  return CUID_PATTERN.test(value.trim());
}

function toNumber(value: { toString(): string } | number | null | undefined): number {
  if (value == null) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function parseFeatureValues(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function resolveName(translations: EntityTranslation[], fallback: string): string {
  const ctx = { translations };
  return (
    resolveTranslation("name", "en", ctx) ||
    resolveTranslation("name", "ar", ctx) ||
    fallback
  );
}

function mapPlanToListRow(plan: PlanRow, translations: EntityTranslation[]): EntityListRow {
  const title = resolveName(translations, plan.id);
  return {
    ref: {
      presetId: PRESET_ID,
      storage: "portal",
      id: plan.id,
      slug: plan.id,
    },
    title,
    status: plan.isPublished ? "PUBLISHED" : "DRAFT",
    updatedAt: plan.updatedAt,
  };
}

function mapPlanToRecord(
  plan: PlanRow,
  setSlug: string,
  currency: string,
  translations: EntityTranslation[],
): EntityRecord {
  const ctx = { translations };
  const title = resolveName(translations, plan.id);
  const description =
    resolveTranslation("description", "en", ctx) ||
    resolveTranslation("description", "ar", ctx) ||
    "";
  const badge =
    resolveTranslation("badge", "en", ctx) || resolveTranslation("badge", "ar", ctx) || "";
  const ctaLabel =
    resolveTranslation("ctaLabel", "en", ctx) ||
    resolveTranslation("ctaLabel", "ar", ctx) ||
    "";

  return {
    ref: {
      presetId: PRESET_ID,
      storage: "portal",
      id: plan.id,
      slug: plan.id,
    },
    title,
    titleEn: resolveTranslation("name", "en", ctx) || undefined,
    titleAr: resolveTranslation("name", "ar", ctx) || undefined,
    description,
    excerpt: description,
    status: plan.isPublished ? "PUBLISHED" : "DRAFT",
    updatedAt: plan.updatedAt,
    fields: {
      description,
      badge,
      ctaLabel,
      ctaHref: plan.ctaHref,
      priceMonthly: toNumber(plan.priceMonthly),
      priceYearly: toNumber(plan.priceYearly),
      discountPercent: plan.discountPercent,
      isHighlighted: plan.isHighlighted,
      featureValues: parseFeatureValues(plan.featureValues),
      currency,
      pricingPlanSetSlug: setSlug,
      planSetId: plan.planSetId,
    },
  };
}

async function resolvePricingPlanSet(
  slug: string | undefined,
  publishedOnly: boolean,
): Promise<{ id: string; slug: string; currency: string } | null> {
  const trimmed = slug?.trim();
  if (!trimmed) return null;
  return pricingRepository.findPlanSet(trimmed, publishedOnly);
}

export function createPricingAdapter(): EntityStorageAdapter {
  return {
    async list(options?: EntityListOptions): Promise<EntityListRow[]> {
      const planSet = await resolvePricingPlanSet(
        options?.pricingPlanSetSlug,
        !options?.includeDeleted,
      );
      if (!planSet) return [];

      const plans = await pricingRepository.findPlans(
        planSet.id,
        !options?.includeDeleted,
        options?.limit,
      );

      const ids = plans.map((p) => p.id);
      const translationMap =
        ids.length > 0
          ? await translationService.getForEntities("PricingPlan", ids)
          : new Map<string, EntityTranslation[]>();

      return plans.map((plan) =>
        mapPlanToListRow(plan, translationMap.get(plan.id) ?? []),
      );
    },

    async get(idOrSlug: string, options?: EntityGetOptions): Promise<EntityRecord | null> {
      const key = idOrSlug.trim();
      if (!key) return null;

      const publishedOnly = !options?.includeDeleted;
      let plan: PlanRow | null = null;
      let setSlug = options?.pricingPlanSetSlug?.trim() ?? "";
      let currency = "USD";

      if (looksLikePlanId(key)) {
        plan = await pricingRepository.findPlanById(key);
        if (plan?.planSet) {
          if (publishedOnly && (!plan.isPublished || !plan.planSet.isPublished)) {
            return null;
          }
          setSlug = plan.planSet.slug;
          currency = plan.planSet.currency;
        }
      } else {
        return null;
      }

      if (!plan || !setSlug) return null;

      const translations = await translationService.getForEntity("PricingPlan", plan.id);
      return mapPlanToRecord(plan, setSlug, currency, translations);
    },

    async listCollections(options?: EntityListOptions): Promise<Collection[]> {
      const planSet = await resolvePricingPlanSet(
        options?.pricingPlanSetSlug,
        !options?.includeDeleted,
      );
      if (!planSet) return [];

      const features = await pricingRepository.findPlanFeatures(planSet.id);

      const ids = features.map((f) => f.id);
      const translationMap =
        ids.length > 0
          ? await translationService.getForEntities("PricingPlanFeature", ids)
          : new Map<string, EntityTranslation[]>();

      return features.map((feature, index) => {
        const translations = translationMap.get(feature.id) ?? [];
        const ctx = { translations };
        const title =
          resolveTranslation("label", "en", ctx) ||
          resolveTranslation("label", "ar", ctx) ||
          feature.id;
        return {
          id: feature.id,
          slug: feature.id,
          title,
          presetId: PRESET_ID,
          sortOrder: feature.sortOrder ?? index,
        };
      });
    },
  };
}
