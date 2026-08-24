import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RouteSuspenseFallback } from "@/components/layout/route-suspense-fallback";
import type { Locale } from "@/i18n/routing";
import { CompareWorkspace } from "@/features/comparison/components/compare-workspace";
import { listComparableContentTypes } from "@/features/comparison/comparison-registry";
import { buildCompareTypePageConfig } from "@/features/comparison/build-compare-type-config";
import { getCompareWorkspaceLabels } from "@/features/comparison/get-compare-page-labels.server";
import { getLocaleByPrefix } from "@/i18n/locale-registry.server";
import { CmsPageBlocksSection } from "@/features/cms/components/cms-page-blocks-section";
import { seoService } from "@/features/seo/seo.service";
import "@/features/comparison/compare-page.css";
import { isArabicLocale } from "@/shared/layout/direction/direction-resolver";

export const revalidate = 60;

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "compare" });
  return seoService.resolveMetadata({
    locale: locale as Locale,
    path: "/compare",
    pageKey: "compare",
    fallback: { title: t("drawerTitle"), description: t("hubHint") },
  });
}

export default async function CompareHubPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [types, labels, entry, t] = await Promise.all([
    listComparableContentTypes(),
    getCompareWorkspaceLabels(locale),
    getLocaleByPrefix(locale),
    getTranslations({ locale, namespace: "compare" }),
  ]);

  const isAr = isArabicLocale(entry?.code ?? locale);
  const workspaceTypes = types.map((type) => buildCompareTypePageConfig(type, locale));

  return (
    <div className="cmp-wrap">
      <CmsPageBlocksSection slug="compare" locale={locale as Locale} />
      <header className="cmp-header">
        <h1 className="cmp-title">{t("drawerTitle")}</h1>
        <p className="text-muted-foreground mt-2 max-w-xl">{t("hubHint")}</p>
      </header>

      <Suspense fallback={<RouteSuspenseFallback variant="compare" />}>
        <CompareWorkspace
          locale={locale}
          localePrefix={locale}
          isAr={isAr}
          types={workspaceTypes}
          labels={labels}
        />
      </Suspense>
    </div>
  );
}
