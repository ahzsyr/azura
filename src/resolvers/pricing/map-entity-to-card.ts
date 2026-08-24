import type { EntityTranslation } from "@prisma/client";
import type { EntityRecord } from "@/features/entities/types";
import { resolveTranslation } from "@/features/translation/translation-resolver";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";
import type { PricingPlanCardViewModel } from "@/view-models/pricing-plan-card";
import type { ResolverContext } from "@/view-models/types";
import { resolvePricingPlanCardTemplateId } from "@/templates/preset-template-map";

const DEFAULT_LOCALE_CODE = FALLBACK_LOCALES.find((locale) => locale.isDefault)?.code ?? "en";

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function readFeatureValues(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    out[key] = raw == null ? "" : String(raw);
  }
  return out;
}

function resolveLocalizedName(
  entity: EntityRecord,
  translations: EntityTranslation[],
  locale: string,
): string {
  const ctx = { translations };
  return (
    resolveTranslation("name", locale, ctx) ||
    resolveTranslation("name", DEFAULT_LOCALE_CODE, ctx) ||
    entity.title
  );
}

function resolveLocalizedField(
  translations: EntityTranslation[],
  locale: string,
  field: string,
  fallback = "",
): string {
  const ctx = { translations };
  return (
    resolveTranslation(field, locale, ctx) ||
    resolveTranslation(field, DEFAULT_LOCALE_CODE, ctx) ||
    fallback
  );
}

export type MapPricingPlanEntityInput = {
  entity: EntityRecord;
  itemTranslations?: EntityTranslation[];
  pricingPlanSetSlug?: string;
  currency?: string;
};

export function mapPricingPlanEntityToCardViewModel(
  input: MapPricingPlanEntityInput,
  ctx: ResolverContext,
): PricingPlanCardViewModel {
  const { entity } = input;
  const fields = entity.fields;
  const translations = input.itemTranslations ?? [];
  const setSlug =
    input.pricingPlanSetSlug ?? readString(fields.pricingPlanSetSlug) ?? "";
  const currency = input.currency ?? readString(fields.currency) ?? "USD";
  const name = resolveLocalizedName(entity, translations, ctx.locale);
  const description = resolveLocalizedField(
    translations,
    ctx.locale,
    "description",
    readString(fields.description) ?? entity.description ?? "",
  );
  const badge = resolveLocalizedField(
    translations,
    ctx.locale,
    "badge",
    readString(fields.badge) ?? "",
  );
  const ctaLabel = resolveLocalizedField(
    translations,
    ctx.locale,
    "ctaLabel",
    readString(fields.ctaLabel) ?? "",
  );

  return {
    templateId: resolvePricingPlanCardTemplateId(),
    presetId: "pricing",
    entityId: entity.ref.id,
    pricingPlanSetSlug: setSlug,
    name,
    description,
    badge,
    ctaLabel,
    ctaHref: readString(fields.ctaHref) ?? "",
    priceMonthly: readNumber(fields.priceMonthly),
    priceYearly: readNumber(fields.priceYearly),
    discountPercent: readNumber(fields.discountPercent),
    currency,
    isHighlighted: fields.isHighlighted === true,
    featureValues: readFeatureValues(fields.featureValues),
  };
}
