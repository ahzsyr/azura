import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PageHero, Section } from "@/components/marketing/section";
import { AnimatedSection } from "@/components/motion/lazy-motion";
import { ContentCard } from "@/components/content/content-card";
import { contentPublicService } from "@/features/content/content-public.service";
import type { ContentTypeView } from "@/features/content/content-public.types";
import { mergeDisplaySettings } from "@/schemas/content/display-settings";
import {
  createLocalizedGetter,
  loadEntityTranslations,
  loadEntityTranslationsMap,
  loadPublicLocaleContext,
} from "@/features/i18n/public-locale-context";
import { pickLocaleField } from "@/features/builder/blocks/content/lib/locale-field";
import { cn } from "@/lib/utils";
import { loadComparePropsFromContentTypeView } from "@/features/comparison/load-compare-props";
import {
  isContentPresetId,
  resolvePresetFromContentTypeSlug,
} from "@/templates/preset-template-map";
import { resolveContentPresetCardsFromEntityIds } from "@/resolvers/content-preset/resolve-content-preset-cards-for-list";
import { resolveEntityCardsForList } from "@/resolvers/entity/resolve-entity-cards-for-list";
import { EntityCardTemplate } from "@/templates/entity/entity-card-template";

type Props = {
  locale: string;
  contentType: ContentTypeView;
  collectionSlug?: string;
  children?: React.ReactNode;
};

export async function ContentListPage({ locale, contentType, collectionSlug, children }: Props) {
  await contentPublicService.ensureReady();

  const presetId = resolvePresetFromContentTypeSlug(contentType.slug);
  const useViewModels = presetId != null && isContentPresetId(presetId);

  const [items, collections, ctx, t] = await Promise.all([
    contentPublicService.listItemsByTypeSlug(contentType.slug, { collectionSlug }),
    contentPublicService.listCollections(contentType.slug),
    loadPublicLocaleContext(locale),
    getTranslations({ locale, namespace: "packages" }),
  ]);

  const [typeTranslations, collectionTranslationMap] = await Promise.all([
    loadEntityTranslations("ContentType", contentType.id),
    loadEntityTranslationsMap(
      "ContentCollection",
      collections.map((c) => c.id),
    ),
  ]);

  const localized = createLocalizedGetter(ctx);
  const title = localized(
    contentType as unknown as Record<string, unknown>,
    "name",
    typeTranslations,
  );
  const subtitle =
    localized(contentType as unknown as Record<string, unknown>, "labelPlural", typeTranslations) ||
    localized(contentType as unknown as Record<string, unknown>, "excerpt", typeTranslations);

  const display = mergeDisplaySettings(contentType.adminConfig.displayDefaults as Record<string, unknown>);
  const compareProps = loadComparePropsFromContentTypeView(contentType, locale);

  const presetViewModels = useViewModels
    ? await resolveContentPresetCardsFromEntityIds(
        presetId,
        items.map((item) => item.id),
        {
          locale,
          localePrefix: locale,
          displaySettings: display,
          contentTypeSlug: contentType.slug,
          compareProps: compareProps
            ? {
                contentTypeSlug: compareProps.contentTypeSlug,
                maxItems: compareProps.maxItems,
                label: compareProps.label,
              }
            : undefined,
        },
      )
    : [];

  const entityViewModels = !useViewModels
    ? await resolveEntityCardsForList(items, contentType, {
        locale,
        localePrefix: locale,
        displaySettings: display,
        contentTypeSlug: contentType.slug,
      })
    : [];

  const prefix = contentType.routePrefix ?? contentType.slug;
  const listPath = `/${prefix}`;
  const hasItems = useViewModels ? presetViewModels.length > 0 : entityViewModels.length > 0;

  return (
    <>
      <PageHero title={title} subtitle={subtitle || undefined} />
      <Section>
        {collections.length > 0 ? (
          <AnimatedSection>
            <div className="flex flex-wrap gap-2">
              <Link
                href={listPath}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm transition-colors",
                  !collectionSlug ? "border-primary bg-primary/10 text-primary" : "hover:border-primary/50",
                )}
              >
                {t("all")}
              </Link>
              {collections.map((cat) => {
                const catTranslations = collectionTranslationMap.get(cat.id);
                const catName = localized(
                  cat as unknown as Record<string, unknown>,
                  "name",
                  catTranslations,
                );
                return (
                  <Link
                    key={cat.id}
                    href={`${listPath}?collection=${cat.slug}`}
                    className={cn(
                      "rounded-full border px-4 py-1.5 text-sm transition-colors",
                      collectionSlug === cat.slug
                        ? "border-primary bg-primary/10 text-primary"
                        : "hover:border-primary/50",
                    )}
                  >
                    {catName}
                  </Link>
                );
              })}
            </div>
          </AnimatedSection>
        ) : null}

        <div className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {useViewModels
            ? presetViewModels.map((viewModel, i) => (
                <AnimatedSection key={viewModel.entityId} delay={i * 0.08}>
                  <ContentCard
                    viewModel={viewModel}
                    item={{
                      id: viewModel.entityId,
                      contentTypeSlug: viewModel.contentTypeSlug,
                      slug: viewModel.slug,
                      title: viewModel.title,
                      titleEn: viewModel.title,
                      titleAr: viewModel.title,
                      attributes: {},
                      images: viewModel.imageUrl
                        ? [{ url: viewModel.imageUrl, alt: viewModel.imageAlt }]
                        : [],
                      href: viewModel.href,
                    }}
                    locale={locale}
                    display={viewModel.display}
                  />
                </AnimatedSection>
              ))
            : entityViewModels.map((viewModel, i) => (
                <AnimatedSection key={viewModel.entityId} delay={i * 0.08}>
                  <EntityCardTemplate viewModel={viewModel} />
                </AnimatedSection>
              ))}
        </div>

        {!hasItems ? (
          <p className="mt-12 text-center text-muted-foreground">
            {pickLocaleField(
              { messageEn: "No items found.", messageAr: "لا توجد عناصر." },
              "message",
              locale,
            )}
          </p>
        ) : null}
      </Section>
      {children}
    </>
  );
}
