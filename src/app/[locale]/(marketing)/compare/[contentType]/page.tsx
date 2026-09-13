import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RouteSuspenseFallback } from "@/components/layout/route-suspense-fallback";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CompareWorkspace } from "@/features/comparison/components/compare-workspace";
import { getComparableContentTypeBySlug, listComparableContentTypes } from "@/features/comparison/comparison-registry";
import { buildCompareTypePageConfig } from "@/features/comparison/build-compare-type-config";
import { resolveCompareContentTypeSlug } from "@/features/comparison/comparison-route-resolver";
import { getCompareWorkspaceLabels } from "@/features/comparison/get-compare-page-labels.server";
import { getLocaleByPrefix } from "@/i18n/locale-registry.server";
import { seoService } from "@/features/seo/seo.service";
import type { Locale } from "@/i18n/routing";
import "@/features/comparison/compare-page.css";
import { isArabicLocale } from "@/shared/layout/direction/direction-resolver";

type Props = {
  params: Promise<{ locale: string; contentType: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale, contentType } = await params;
  const type = await getComparableContentTypeBySlug(contentType);
  const entry = await getLocaleByPrefix(locale);
  const label = type
    ? isArabicLocale(entry?.code ?? locale)
      ? type.labelPluralAr
      : type.labelPluralEn
    : "Compare";

  if (!type) {
    return seoService.resolveMetadata({
      locale: locale as Locale,
      path: `/compare/${contentType}`,
      pageKey: "compare",
      status: 404,
      fallback: { title: "Compare", description: "" },
    });
  }

  return seoService.resolveMetadata({
    locale: locale as Locale,
    path: `/compare/${contentType}`,
    pageKey: "compare",
    fallback: { title: label, description: "" },
  });
}

export default async function CatalogComparePage({ params }: Props) {
  const { locale, contentType: urlSegment } = await params;
  setRequestLocale(locale);

  const contentTypeSlug = resolveCompareContentTypeSlug(urlSegment);
  const registered = await getComparableContentTypeBySlug(contentTypeSlug);
  if (!registered) notFound();

  const config = buildCompareTypePageConfig(registered, locale);
  const [types, labels, entry, t] = await Promise.all([
    listComparableContentTypes(),
    getCompareWorkspaceLabels(locale),
    getLocaleByPrefix(locale),
    getTranslations({ locale, namespace: "compare" }),
  ]);

  const isAr = isArabicLocale(entry?.code ?? locale);
  const workspaceTypes = types.map((type) => buildCompareTypePageConfig(type, locale));
  const pageTitle = isAr ? config.labelPluralAr : config.labelPluralEn;

  return (
    <div className="cmp-wrap">
      <header className="cmp-header">
        <h1 className="cmp-title">{pageTitle}</h1>
        <p className="text-muted-foreground mt-2 max-w-xl">{t("hubHint")}</p>
      </header>

      <Suspense fallback={<RouteSuspenseFallback variant="compare" />}>
        <CompareWorkspace
          locale={locale}
          localePrefix={locale}
          isAr={isAr}
          types={workspaceTypes}
          labels={labels}
          initialActiveSlug={config.slug}
        />
      </Suspense>
    </div>
  );
}
