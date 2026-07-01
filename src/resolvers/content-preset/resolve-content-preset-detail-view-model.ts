import "server-only";

import { getTranslations } from "next-intl/server";
import type { ContentItemView, ContentTypeView } from "@/features/content/content-public.types";
import { contentPublicService } from "@/features/content/content-public.service";
import { entityService } from "@/features/entities/entity.service";
import { EntityNotFoundError } from "@/resolvers/errors";
import { buildContentPresetAttributeSections } from "@/resolvers/content-preset/build-attribute-sections";
import type { ContentPresetDetailViewModel } from "@/view-models/content-preset-detail";
import type { ResolverContext } from "@/view-models/types";
import {
  resolveDetailTemplateId,
  type ContentPresetId,
} from "@/templates/preset-template-map";
import {
  loadEntityTranslations,
  loadPageTranslations,
} from "@/features/i18n/public-locale-context";
import { getLocalizedField } from "@/lib/utils";
import { DEFAULT_MEDIA_PLACEHOLDER } from "@/features/media/constants";
import { resolveComparisonForType } from "@/features/comparison/comparison-schema-resolver";
import { compareAddLabel } from "@/features/comparison/lib/compare-locale";
import { getCompanyInfo } from "@/lib/data";
import { resolveSiteIdentity } from "@/lib/site-identity";
import { resolveWhatsAppPhone } from "@/features/whatsapp/whatsapp-message";
import { whatsappService } from "@/features/whatsapp/whatsapp.service";

export type ResolveContentPresetDetailInput = {
  slug: string;
  path: string;
  contentType: ContentTypeView;
  item?: ContentItemView;
};

function showInquiryForm(adminConfig: Record<string, unknown>) {
  return adminConfig.inquiryEnabled !== false;
}

export async function resolveContentPresetDetailViewModel(
  presetId: ContentPresetId,
  entityIdOrSlug: string,
  ctx: ResolverContext,
  input: ResolveContentPresetDetailInput,
): Promise<ContentPresetDetailViewModel> {
  const slug = input.slug.trim() || entityIdOrSlug.trim();
  const item =
    input.item ??
    (await contentPublicService.getItemByTypeAndSlug(input.contentType.slug, slug));

  if (!item) {
    throw new EntityNotFoundError(presetId, slug);
  }

  const entity = await entityService.getEntity(presetId, item.id, { locale: ctx.localePrefix });
  if (!entity) {
    throw new EntityNotFoundError(presetId, item.id);
  }

  const [
    tWhatsapp,
    pageBundleResult,
    collectionTranslations,
    company,
    whatsappSettings,
  ] = await Promise.all([
    getTranslations({ locale: ctx.locale, namespace: "whatsapp" }),
    loadPageTranslations("ContentItem", item.id, item.blocks),
    item.collection
      ? loadEntityTranslations("ContentCollection", item.collection.id)
      : Promise.resolve([]),
    getCompanyInfo(),
    whatsappService.get(),
  ]);

  const { bundle, translations: itemTranslations } = pageBundleResult;
  const fieldOpts = {
    enabledLocales: bundle.enabledLocales,
    defaultCode: bundle.defaultCode,
    translations: itemTranslations,
  };

  const title = getLocalizedField(item, "title", ctx.locale, fieldOpts);
  const description = getLocalizedField(item, "description", ctx.locale, fieldOpts);
  const excerpt = getLocalizedField(item, "excerpt", ctx.locale, fieldOpts);
  const cover = item.media.find((m) => m.isCover) ?? item.media[0];
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const showInquiry = showInquiryForm(input.contentType.adminConfig);
  const priceRaw = item.attributes.price;
  const price = priceRaw != null && priceRaw !== "" ? Number(priceRaw) : null;
  const currency = (item.attributes.currency as string) ?? "USD";
  const { comparable, config } = resolveComparisonForType({
    fieldSchema: input.contentType.fieldSchema,
    adminConfig: input.contentType.adminConfig,
  });
  const compareLabel = compareAddLabel(ctx.locale);
  const { brandName } = resolveSiteIdentity({ companyName: company?.name });
  const whatsappPhone = resolveWhatsAppPhone(company?.whatsapp);
  const whatsappMessage = tWhatsapp("message.contentInquiry", {
    brandName,
    itemTitle: title,
  });

  const collectionLabel = item.collection
    ? getLocalizedField(item.collection, "name", ctx.locale, {
        ...fieldOpts,
        translations: collectionTranslations,
      })
    : null;

  const attributeSections = buildContentPresetAttributeSections({
    locale: ctx.locale,
    fields: input.contentType.fieldSchema,
    attributes: item.attributes,
    itemTranslations,
    enabledLocales: bundle.enabledLocales,
    defaultCode: bundle.defaultCode,
  });

  return {
    templateId: resolveDetailTemplateId(presetId),
    presetId,
    entityId: entity.ref.id,
    slug,
    locale: ctx.locale,
    path: input.path,
    contentTypeSlug: input.contentType.slug,
    contentTypeId: input.contentType.id,
    routePrefix: input.contentType.routePrefix,
    title,
    excerpt,
    description,
    coverUrl: cover?.url ?? DEFAULT_MEDIA_PLACEHOLDER,
    coverAlt: cover?.alt || title,
    media: item.media.map((m) => ({
      id: m.id,
      url: m.url,
      alt: getLocalizedField(m, "alt", ctx.locale, fieldOpts),
      isCover: m.isCover,
    })),
    blocks: item.blocks,
    price: Number.isFinite(price) ? price : null,
    currency,
    showInquiry,
    comparable,
    compareMaxItems: config.comparisonSettings.maxItems,
    compareLabel,
    attributeSections,
    collectionLabel,
    whatsappPhone,
    whatsappMessage,
    brandName,
    siteUrl,
    fieldSchema: input.contentType.fieldSchema,
    itemTranslations,
    collectionTranslations,
    enabledLocales: bundle.enabledLocales,
    defaultCode: bundle.defaultCode,
    discoveryCategorySlugs: (item.attributes?.categories as string[] | undefined) ?? [],
    discoveryTags: (item.attributes?.tags as string[] | undefined) ?? [],
    pageTranslationBundle: bundle,
    whatsappAppearance: whatsappSettings.contentInquiry,
  };
}
