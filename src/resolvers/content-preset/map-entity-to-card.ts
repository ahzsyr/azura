import type { EntityTranslation } from "@prisma/client";
import { TYPE_TO_LEGACY_SOURCE } from "@/features/content/content-type.registry";
import type { EntityRecord } from "@/features/entities/types";
import { resolveTranslation } from "@/features/translation/translation-resolver";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";
import type { ContentPresetCardViewModel } from "@/view-models/content-preset-card";
import type { ResolverContext } from "@/view-models/types";
import {
  resolveCardTemplateId,
  type ContentPresetId,
} from "@/templates/preset-template-map";
import { mergeDisplaySettings } from "@/schemas/content/display-settings";

const DEFAULT_LOCALE_CODE = FALLBACK_LOCALES.find((locale) => locale.isDefault)?.code ?? "en";

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function resolveLocalizedTitle(
  entity: EntityRecord,
  translations: EntityTranslation[],
  locale: string,
): { title: string; excerpt: string } {
  const ctx = { translations };
  const title =
    resolveTranslation("title", locale, ctx) ||
    resolveTranslation("title", DEFAULT_LOCALE_CODE, ctx) ||
    entity.title;
  const excerpt =
    resolveTranslation("excerpt", locale, ctx) ||
    resolveTranslation("excerpt", DEFAULT_LOCALE_CODE, ctx) ||
    entity.excerpt ||
    "";
  return { title, excerpt };
}

function resolveCollectionLabel(
  collectionName: string | undefined,
  translations: EntityTranslation[],
  locale: string,
): string | null {
  if (!collectionName) return null;
  const ctx = { translations };
  return (
    resolveTranslation("name", locale, ctx) ||
    resolveTranslation("name", DEFAULT_LOCALE_CODE, ctx) ||
    collectionName
  );
}

export function resolveContentItemHref(input: {
  contentTypeSlug: string;
  slug: string;
  routePrefix?: string | null;
  ctaHref?: string | null;
  localePrefix: string;
}): string {
  const legacy = TYPE_TO_LEGACY_SOURCE[input.contentTypeSlug];
  if (legacy === "packages" && input.slug) {
    return `/${input.localePrefix}/packages/${input.slug}`;
  }
  if (legacy === "services" && input.ctaHref) return input.ctaHref;
  if (input.routePrefix && input.slug) {
    return `/${input.localePrefix}/${input.routePrefix}/${input.slug}`;
  }
  if (input.routePrefix) return `/${input.localePrefix}/${input.routePrefix}`;
  return `/${input.localePrefix}/${input.contentTypeSlug}/${input.slug}`;
}

export type MapEntityToCardInput = {
  entity: EntityRecord;
  presetId: ContentPresetId;
  contentTypeSlug: string;
  routePrefix?: string | null;
  itemTranslations?: EntityTranslation[];
  collectionTranslations?: EntityTranslation[];
  collectionName?: string;
  imageUrl?: string | null;
  imageAlt?: string;
};

export function mapEntityToCardViewModel(
  input: MapEntityToCardInput,
  ctx: ResolverContext,
): ContentPresetCardViewModel {
  const { entity, presetId, contentTypeSlug } = input;
  const fields = entity.fields;
  const locale = ctx.locale;
  const display = mergeDisplaySettings(ctx.displaySettings);
  const { title, excerpt } = resolveLocalizedTitle(
    entity,
    input.itemTranslations ?? [],
    locale,
  );

  const slug = entity.ref.slug;
  const ctaHref = readString(fields.ctaHref);
  const href =
    entity.href?.trim() ||
    resolveContentItemHref({
      contentTypeSlug,
      slug,
      routePrefix: input.routePrefix,
      ctaHref,
      localePrefix: ctx.localePrefix,
    });

  const imageUrl = input.imageUrl ?? entity.thumbnailUrl ?? null;
  const compare = ctx.compareProps;

  const base: ContentPresetCardViewModel = {
    templateId: resolveCardTemplateId(presetId),
    presetId,
    entityId: entity.ref.id,
    slug,
    contentTypeSlug,
    title,
    excerpt,
    href,
    imageUrl,
    imageAlt: input.imageAlt || title,
    isFeatured: Boolean(entity.isFeatured),
    collectionLabel: resolveCollectionLabel(
      input.collectionName,
      input.collectionTranslations ?? [],
      locale,
    ),
    display,
    compareContentTypeSlug: compare?.contentTypeSlug,
    compareMaxItems: compare?.maxItems,
    compareLabel: compare?.label,
  };

  if (presetId === "destination") {
    const priceValue = readNumber(fields.price);
    return {
      ...base,
      price: priceValue,
      currency: readString(fields.currency) ?? "USD",
      duration: readNumber(fields.duration),
    };
  }

  if (presetId === "property") {
    return {
      ...base,
      city: readString(fields.city),
      stars: readNumber(fields.stars),
    };
  }

  return {
    ...base,
    icon: readString(fields.icon),
    ctaHref,
  };
}
