import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ContentDetailPage } from "@/features/content/components/content-detail-page";
import { contentPublicService } from "@/features/content/content-public.service";
import { seoService } from "@/features/seo/seo.service";
import { loadPageTranslations, loadPublicLocaleContext } from "@/features/i18n/public-locale-context";
import { RESERVED_URL_PREFIXES } from "@/i18n/reserved-slugs";
import type { Locale } from "@/i18n/routing";
import { getLocalizedField } from "@/lib/utils";

/** Static marketing routes with dedicated folders — handled by those routes, not here. */
const STATIC_SEGMENTS = new Set([
  "about",
  "packages",
  "hotels-transport",
  "gallery",
  "testimonials",
  "contact",
  "blog",
  "faq",
  "pages",
  "collections",
  "products",
  "services",
  "compare",
  "favorites",
  "account",
]);

type Props = {
  params: Promise<{ locale: string; slug: string; itemSlug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale, slug, itemSlug } = await params;
  if (STATIC_SEGMENTS.has(slug) || RESERVED_URL_PREFIXES.has(slug)) return {};

  const { languageCode } = await loadPublicLocaleContext(locale);
  const resolution = await contentPublicService.resolveRoute([slug, itemSlug], languageCode);
  if (resolution.kind !== "detail") return {};

  const { item } = resolution;
  const path = `/${slug}/${itemSlug}`;
  const { bundle, translations } = await loadPageTranslations(
    "ContentItem",
    item.id,
    item.blocks
  );
  const fieldOpts = {
    enabledLocales: bundle.enabledLocales,
    defaultCode: bundle.defaultCode,
    translations,
  };
  const title = getLocalizedField(item, "title", locale, fieldOpts);
  const description = getLocalizedField(item, "description", locale, fieldOpts);

  return seoService.resolveMetadata({
    locale: locale as Locale,
    path,
    entityType: "CONTENT_ITEM",
    entityId: item.id,
    fallback: { title, description: description.slice(0, 160) },
    ogImage: item.media[0]?.url,
  });
}

export default async function DynamicContentDetailRoute({ params }: Props) {
  const { locale, slug, itemSlug } = await params;
  setRequestLocale(locale);

  if (STATIC_SEGMENTS.has(slug) || RESERVED_URL_PREFIXES.has(slug)) {
    notFound();
  }

  const { languageCode } = await loadPublicLocaleContext(locale);
  const resolution = await contentPublicService.resolveRoute([slug, itemSlug], languageCode);
  if (resolution.kind !== "detail") notFound();

  const path = `/${slug}/${itemSlug}`;
  return (
    <ContentDetailPage
      locale={locale}
      contentType={resolution.contentType}
      item={resolution.item}
      path={path}
    />
  );
}
