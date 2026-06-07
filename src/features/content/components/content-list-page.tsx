import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PageHero, Section } from "@/components/marketing/section";
import { AnimatedSection } from "@/components/motion/lazy-motion";
import { ContentCard } from "@/components/content/content-card";
import { contentPublicService } from "@/features/content/content-public.service";
import { itemViewToCardData } from "@/features/content/components/content-card-mapper";
import type { ContentTypeView } from "@/features/content/content-public.types";
import { mergeDisplaySettings } from "@/schemas/content/display-settings";
import {
  createLocalizedGetter,
  loadEntityTranslations,
  loadEntityTranslationsMap,
  loadPublicLocaleContext,
} from "@/features/i18n/public-locale-context";
import { cn } from "@/lib/utils";
import { loadComparePropsFromContentTypeView } from "@/features/comparison/load-compare-props";

type Props = {
  locale: string;
  contentType: ContentTypeView;
  collectionSlug?: string;
  children?: React.ReactNode;
};

export async function ContentListPage({ locale, contentType, collectionSlug, children }: Props) {
  await contentPublicService.ensureReady();

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
      collections.map((c) => c.id)
    ),
  ]);

  const localized = createLocalizedGetter(ctx);
  const title = localized(
    contentType as unknown as Record<string, unknown>,
    "name",
    typeTranslations
  );
  const subtitle =
    localized(contentType as unknown as Record<string, unknown>, "labelPlural", typeTranslations) ||
    localized(contentType as unknown as Record<string, unknown>, "excerpt", typeTranslations);

  const display = mergeDisplaySettings(contentType.adminConfig.displayDefaults as Record<string, unknown>);
  const compareProps = loadComparePropsFromContentTypeView(contentType, locale);
  const itemTranslationMap = await loadEntityTranslationsMap(
    "ContentItem",
    items.map((i) => i.id)
  );
  const cards = items.map((item) => itemViewToCardData(item));
  const prefix = contentType.routePrefix ?? contentType.slug;
  const listPath = `/${prefix}`;

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
                  !collectionSlug ? "border-primary bg-primary/10 text-primary" : "hover:border-primary/50"
                )}
              >
                {t("all")}
              </Link>
              {collections.map((cat) => {
                const catTranslations = collectionTranslationMap.get(cat.id);
                const catName = localized(
                  cat as unknown as Record<string, unknown>,
                  "name",
                  catTranslations
                );
                return (
                  <Link
                    key={cat.id}
                    href={`${listPath}?collection=${cat.slug}`}
                    className={cn(
                      "rounded-full border px-4 py-1.5 text-sm transition-colors",
                      collectionSlug === cat.slug
                        ? "border-primary bg-primary/10 text-primary"
                        : "hover:border-primary/50"
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
          {cards.map((item, i) => (
            <AnimatedSection key={item.id} delay={i * 0.08}>
              <ContentCard
                item={item}
                locale={locale}
                display={display}
                translations={itemTranslationMap.get(item.id)}
                enabledLocales={ctx.enabledLocales}
                defaultCode={ctx.defaultCode}
                compare={compareProps}
              />
            </AnimatedSection>
          ))}
        </div>

        {cards.length === 0 ? (
          <p className="mt-12 text-center text-muted-foreground">
            {locale.startsWith("ar") ? "لا توجد عناصر." : "No items found."}
          </p>
        ) : null}
      </Section>
      {children}
    </>
  );
}
