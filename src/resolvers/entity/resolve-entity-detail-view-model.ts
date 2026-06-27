import "server-only";

import { getTranslations } from "next-intl/server";
import type { ContentItemView, ContentTypeView } from "@/features/content/content-public.types";
import { buildContentPresetAttributeSections } from "@/resolvers/content-preset/build-attribute-sections";
import type { EntityDetailViewModel } from "@/view-models/entity-detail";
import type { ResolverContext } from "@/view-models/types";
import {
  loadEntityTranslations,
  loadPageTranslations,
} from "@/features/i18n/public-locale-context";
import { getLocalizedField } from "@/lib/utils";
import { DEFAULT_MEDIA_PLACEHOLDER } from "@/features/media/constants";
import { getCompanyInfo } from "@/lib/data";
import { resolveSiteIdentity } from "@/lib/site-identity";
import { resolveWhatsAppPhone } from "@/features/whatsapp/whatsapp-message";
import { whatsappService } from "@/features/whatsapp/whatsapp.service";

export type ResolveEntityDetailInput = {
  slug: string;
  path: string;
  contentType: ContentTypeView;
  item: ContentItemView;
};

function showInquiryForm(adminConfig: Record<string, unknown>) {
  return adminConfig.inquiryEnabled !== false;
}

export async function resolveEntityDetailViewModel(
  ctx: ResolverContext,
  input: ResolveEntityDetailInput,
): Promise<EntityDetailViewModel> {
  const item = input.item;

  const [tWhatsapp, pageBundleResult, collectionTranslations, company, whatsappSettings] =
    await Promise.all([
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
    templateId: "entity-detail",
    entityId: item.id,
    slug: input.slug,
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
    showInquiry,
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
    pageTranslationBundle: bundle,
    whatsappAppearance: whatsappSettings.contentInquiry,
  };
}
