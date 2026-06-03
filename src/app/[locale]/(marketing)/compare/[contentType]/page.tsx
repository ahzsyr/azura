import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ComparisonPage } from "@/features/comparison/components/comparison-page";
import { getComparableContentTypeBySlug } from "@/features/comparison/comparison-registry";
import { buildCompareTypePageConfig } from "@/features/comparison/build-compare-type-config";
import { resolveCompareContentTypeSlug } from "@/features/comparison/comparison-route-resolver";
import { getLocaleByPrefix } from "@/i18n/locale-registry.server";
import "@/features/comparison/compare-page.css";

type Props = {
  params: Promise<{ locale: string; contentType: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale, contentType } = await params;
  const type = await getComparableContentTypeBySlug(contentType);
  if (!type) return { title: "Compare" };
  const entry = await getLocaleByPrefix(locale);
  const label = entry?.code.startsWith("ar") ? type.labelPluralAr : type.labelPluralEn;
  return {
    title: label,
    robots: { index: false, follow: false },
  };
}

export default async function CatalogComparePage({ params }: Props) {
  const { locale, contentType: urlSegment } = await params;
  setRequestLocale(locale);

  const contentTypeSlug = resolveCompareContentTypeSlug(urlSegment);
  const registered = await getComparableContentTypeBySlug(contentTypeSlug);
  if (!registered) notFound();

  const config = buildCompareTypePageConfig(registered, locale);
  const t = await getTranslations({ locale, namespace: "compare" });
  const entry = await getLocaleByPrefix(locale);
  const pageTitle = entry?.code.startsWith("ar")
    ? config.labelPluralAr
    : config.labelPluralEn;

  return (
    <div className="cmp-wrap">
      <header className="cmp-header">
        <h1 className="cmp-title">{pageTitle}</h1>
      </header>

      <ComparisonPage
        locale={locale}
        localePrefix={locale}
        contentTypeSlug={config.slug}
        apiSegment={config.apiSegment}
        comparisonMode={config.comparisonMode}
        compareFields={config.compareFields}
        maxItems={config.maxItems}
        listHref={config.listHref}
        labels={{
          empty: t("empty"),
          allSpecs: t("allSpecs"),
          differences: t("differences"),
          hideEqual: t("hideEqual"),
          specifications: t("specifications"),
          remove: t("remove"),
          continueBrowsing: t("continueBrowsing"),
          searchPlaceholder: t("searchPlaceholder"),
          loading: t("loading"),
          clearAll: t("clearBucket"),
          quickAdd: t("quickAdd"),
          quickAddPlaceholder: t("quickAddPlaceholder"),
          filterGroups: t("filterGroups"),
          allGroups: t("allGroups"),
          mobileView: t("mobileView"),
          tableView: t("tableView"),
        }}
      />
    </div>
  );
}
