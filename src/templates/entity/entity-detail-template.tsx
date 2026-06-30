import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Section } from "@/components/marketing/section";
import { InquiryForm } from "@/components/forms/inquiry-form";
import { BlockRenderer } from "@/features/builder/components/block-renderer";
import { PageSeoJsonLd } from "@/features/seo/components/page-seo-jsonld";
import type { Locale } from "@/i18n/routing";
import { ContentFavoriteButton } from "@/components/account/content-favorite-button";
import { WhatsAppLinkButton } from "@/features/whatsapp/components/whatsapp-link-button";
import type { EntityDetailViewModel } from "@/view-models/entity-detail";
import type { ContentPresetDetailViewModel } from "@/view-models/content-preset-detail";
import {
  ContentPresetAttributeSectionsView,
  ContentPresetDetailGallery,
  ContentPresetDetailOverview,
} from "@/templates/content-preset/content-preset-detail-sections";

type Props = {
  viewModel: EntityDetailViewModel;
};

export async function EntityDetailTemplate({ viewModel }: Props) {
  const t = await getTranslations({ locale: viewModel.locale, namespace: "packages" });

  const presetCompatibleView = {
    ...viewModel,
    presetId: "destination" as const,
    templateId: "destination-detail" as const,
    price: null,
    currency: "USD",
    comparable: false,
    compareMaxItems: 0,
    compareLabel: "",
    discoveryCategorySlugs: [],
    discoveryTags: [],
  } satisfies Partial<ContentPresetDetailViewModel> as ContentPresetDetailViewModel;

  return (
    <>
      <PageSeoJsonLd
        locale={viewModel.locale as Locale}
        path={viewModel.path}
        entityType="CONTENT_ITEM"
        entityId={viewModel.entityId}
        fallback={{
          title: viewModel.title,
          description: (viewModel.description || viewModel.excerpt).slice(0, 160),
        }}
        ogImage={viewModel.coverUrl}
      />

      <div className="relative h-[50vh] min-h-[320px]">
        <Image
          src={viewModel.coverUrl}
          alt={viewModel.coverAlt}
          fill
          priority
          className="object-cover"
        />
        <div className="hero-overlay absolute inset-0" />
        <div className="container-premium relative flex h-full flex-col justify-end pb-12 text-white">
          {viewModel.collectionLabel ? (
            <span className="mb-2 text-sm uppercase tracking-wider text-accent">
              {viewModel.collectionLabel}
            </span>
          ) : null}
          <h1 className="font-heading text-4xl font-bold md:text-5xl">{viewModel.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <ContentFavoriteButton contentItemId={viewModel.entityId} locale={viewModel.locale} />
          </div>
        </div>
      </div>

      <Section>
        <div className="grid gap-12 lg:grid-cols-3">
          <div className="space-y-10 lg:col-span-2">
            <ContentPresetDetailOverview viewModel={presetCompatibleView} />
            <ContentPresetDetailGallery viewModel={presetCompatibleView} />

            {viewModel.blocks.length > 0 ? (
              <BlockRenderer
                blocks={viewModel.blocks}
                locale={viewModel.locale}
                parentType="ContentItem"
                parentId={viewModel.entityId}
                translationBundle={viewModel.pageTranslationBundle}
                discoveryAnchor={{
                  context: "contentItem",
                  id: viewModel.entityId,
                  slug: viewModel.slug,
                  contentTypeSlug: viewModel.contentTypeSlug,
                  categorySlugs: [],
                  tags: [],
                }}
              />
            ) : (
              <ContentPresetAttributeSectionsView viewModel={presetCompatibleView} />
            )}
          </div>

          {viewModel.showInquiry ? (
            <div className="space-y-6">
              <div className="sticky top-24 rounded-xl border bg-card p-6 shadow-sm">
                <h3 className="font-heading text-xl font-semibold">{t("bookInquiry")}</h3>
                <div className="mt-6 space-y-3">
                  <WhatsAppLinkButton
                    phone={viewModel.whatsappPhone}
                    message={viewModel.whatsappMessage}
                    appearance={viewModel.whatsappAppearance}
                    label={t("whatsappInquiry")}
                  />
                </div>
                <div className="mt-8">
                  <InquiryForm
                    locale={viewModel.locale}
                    type="CONTENT"
                    contentItemId={viewModel.entityId}
                    contentItemSlug={viewModel.slug}
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
