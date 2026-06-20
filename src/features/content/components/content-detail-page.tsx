import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Section } from "@/components/marketing/section";
import { InquiryForm } from "@/components/forms/inquiry-form";
import { BlockRenderer } from "@/features/builder/components/block-renderer";
import { AttributeSections } from "@/features/content/components/attribute-sections";
import type { ContentItemView, ContentTypeView } from "@/features/content/content-public.types";
import { PageSeoJsonLd } from "@/features/seo/components/page-seo-jsonld";
import { JsonLd, productJsonLd } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";
import {
  loadEntityTranslations,
  loadPageTranslations,
} from "@/features/i18n/public-locale-context";
import { formatPrice, getLocalizedField } from "@/lib/utils";
import { DEFAULT_MEDIA_PLACEHOLDER } from "@/features/media/constants";
import { resolveComparisonForType } from "@/features/comparison/comparison-schema-resolver";
import { compareAddLabel } from "@/features/comparison/lib/compare-locale";
import { ContentDetailCompare } from "@/features/content/components/content-detail-compare";
import { ContentFavoriteButton } from "@/components/account/content-favorite-button";
import { WhatsAppLinkButton } from "@/features/whatsapp/components/whatsapp-link-button";
import { whatsappService } from "@/features/whatsapp/whatsapp.service";
import {
  resolveWhatsAppPhone,
} from "@/features/whatsapp/whatsapp-message";
import { getCompanyInfo } from "@/lib/data";
import { resolveSiteIdentity } from "@/lib/site-identity";

type Props = {
  locale: string;
  contentType: ContentTypeView;
  item: ContentItemView;
  path: string;
};

function showInquiryForm(adminConfig: Record<string, unknown>) {
  return adminConfig.inquiryEnabled !== false;
}

export async function ContentDetailPage({ locale, contentType, item, path }: Props) {
  const [t, tWhatsapp, pageBundleResult, collectionTranslations, company, whatsappSettings] =
    await Promise.all([
    getTranslations({ locale, namespace: "packages" }),
    getTranslations({ locale, namespace: "whatsapp" }),
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
  };
  const name = getLocalizedField(item, "title", locale, {
    ...fieldOpts,
    translations: itemTranslations,
  });
  const description = getLocalizedField(item, "description", locale, {
    ...fieldOpts,
    translations: itemTranslations,
  });
  const excerpt = getLocalizedField(item, "excerpt", locale, {
    ...fieldOpts,
    translations: itemTranslations,
  });
  const cover = item.media.find((m) => m.isCover) ?? item.media[0];
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const showInquiry = showInquiryForm(contentType.adminConfig);
  const price = item.attributes.price;
  const currency = (item.attributes.currency as string) ?? "USD";
  const { comparable, config } = resolveComparisonForType({
    fieldSchema: contentType.fieldSchema,
    adminConfig: contentType.adminConfig,
  });
  const compareLabel = compareAddLabel(locale);
  const { brandName } = resolveSiteIdentity({ companyName: company?.name });
  const whatsappPhone = resolveWhatsAppPhone(company?.whatsapp);
  const whatsappMessage = tWhatsapp("message.contentInquiry", {
    brandName,
    itemTitle: name,
  });

  return (
    <>
      <PageSeoJsonLd
        locale={locale as Locale}
        path={path}
        entityType="CONTENT_ITEM"
        entityId={item.id}
        fallback={{ title: name, description: (description || excerpt).slice(0, 160) }}
        ogImage={cover?.url}
      />
      {price != null ? (
        <JsonLd
          data={productJsonLd({
            name,
            description: description || excerpt,
            price: Number(price),
            currency,
            url: `${siteUrl}/${locale}${path}`,
            image: cover?.url,
          })}
        />
      ) : null}

      <div className="relative h-[50vh] min-h-[320px]">
        <Image
          src={cover?.url ?? DEFAULT_MEDIA_PLACEHOLDER}
          alt={name}
          fill
          priority
          className="object-cover"
        />
        <div className="hero-overlay absolute inset-0" />
        <div className="container-premium relative flex h-full flex-col justify-end pb-12 text-white">
          {item.collection ? (
            <span className="mb-2 text-sm uppercase tracking-wider text-accent">
              {getLocalizedField(item.collection, "name", locale, {
                ...fieldOpts,
                translations: collectionTranslations,
              })}
            </span>
          ) : null}
          <h1 className="font-heading text-4xl font-bold md:text-5xl">{name}</h1>
          {price != null ? (
            <p className="mt-4 text-2xl font-semibold text-accent">
              {formatPrice(Number(price), currency, locale)}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {comparable ? (
              <ContentDetailCompare
                contentTypeSlug={contentType.slug}
                itemId={item.id}
                maxItems={config.comparisonSettings.maxItems}
                label={compareLabel}
              />
            ) : null}
            <ContentFavoriteButton contentItemId={item.id} locale={locale} />
          </div>
        </div>
      </div>

      <Section>
        <div className="grid gap-12 lg:grid-cols-3">
          <div className="space-y-10 lg:col-span-2">
            {excerpt || description ? (
              <div>
                <h2 className="font-heading text-2xl font-semibold">
                  {t("overview")}
                </h2>
                <p className="mt-4 leading-relaxed text-muted-foreground">{description || excerpt}</p>
              </div>
            ) : null}

            {item.media.length > 1 ? (
              <div>
                <h2 className="font-heading mb-4 text-xl font-semibold">
                  {t("photoGallery")}
                </h2>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  {item.media.map((img) => (
                    <div key={img.id} className="relative aspect-[4/3] overflow-hidden rounded-xl">
                      <Image
                        src={img.url}
                        alt={getLocalizedField(img, "alt", locale, fieldOpts)}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {item.blocks.length > 0 ? (
              <BlockRenderer
                blocks={item.blocks}
                locale={locale}
                parentType="ContentItem"
                parentId={item.id}
                translationBundle={bundle}
                discoveryAnchor={{
                  context: "contentItem",
                  id: item.id,
                  slug: item.slug ?? undefined,
                  contentTypeSlug: contentType.slug,
                  categorySlugs: (item.attributes?.categories as string[] | undefined) ?? [],
                  tags: (item.attributes?.tags as string[] | undefined) ?? [],
                }}
              />
            ) : (
              <AttributeSections
                locale={locale}
                fields={contentType.fieldSchema}
                attributes={item.attributes}
                fieldOpts={fieldOpts}
              />
            )}
          </div>

          {showInquiry ? (
            <div className="space-y-6">
              <div className="sticky top-24 rounded-xl border bg-card p-6 shadow-sm">
                <h3 className="font-heading text-xl font-semibold">{t("bookInquiry")}</h3>
                {price != null ? (
                  <p className="mt-2 text-3xl font-bold text-primary">
                    {formatPrice(Number(price), currency, locale)}
                  </p>
                ) : null}
                <div className="mt-6 space-y-3">
                  <WhatsAppLinkButton
                    phone={whatsappPhone}
                    message={whatsappMessage}
                    appearance={whatsappSettings.contentInquiry}
                    label={t("whatsappInquiry")}
                  />
                </div>
                <div className="mt-8">
                  <InquiryForm
                    locale={locale}
                    type="CONTENT"
                    contentItemId={item.id}
                    contentItemSlug={item.slug ?? undefined}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </Section>
    </>
  );
}
