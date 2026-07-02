import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ContentDetailPage } from "@/features/content/components/content-detail-page";
import { contentPublicService } from "@/features/content/content-public.service";
import { seoService } from "@/features/seo/seo.service";
import type { Locale } from "@/i18n/routing";
import { getLocalizedField } from "@/lib/utils";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const contentType = await contentPublicService.getTypeBySlug("catalog-items");
  const item = contentType
    ? await contentPublicService.getItemByTypeAndSlug("catalog-items", slug)
    : null;
  if (!item) return {};

  const name = getLocalizedField(item, "title", locale);
  const description = getLocalizedField(item, "description", locale);
  return seoService.resolveMetadata({
    locale: locale as Locale,
    path: `/packages/${slug}`,
    entityType: "CONTENT_ITEM",
    entityId: item.id,
    fallback: { title: name, description: description.slice(0, 160) },
    ogImage: item.media[0]?.url,
  });
}

export default async function PackageDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const contentType = await contentPublicService.getTypeBySlug("catalog-items");
  const item = contentType
    ? await contentPublicService.getItemByTypeAndSlug("catalog-items", slug)
    : null;
  if (!contentType || !item) notFound();

  return (
    <ContentDetailPage
      locale={locale}
      contentType={contentType}
      item={item}
      path={`/packages/${slug}`}
    />
  );
}
