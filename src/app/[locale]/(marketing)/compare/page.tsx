import { getTranslations, setRequestLocale } from "next-intl/server";
import { CompareWorkspace } from "@/features/comparison/components/compare-workspace";
import { listComparableContentTypes } from "@/features/comparison/comparison-registry";
import { buildCompareTypePageConfig } from "@/features/comparison/build-compare-type-config";
import { getLocaleByPrefix } from "@/i18n/locale-registry.server";
import "@/features/comparison/compare-page.css";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "compare" });
  return {
    title: t("drawerTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function CompareHubPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [types, t, entry] = await Promise.all([
    listComparableContentTypes(),
    getTranslations({ locale, namespace: "compare" }),
    getLocaleByPrefix(locale),
  ]);

  const isAr = entry?.code.startsWith("ar") ?? false;
  const workspaceTypes = types.map((type) => buildCompareTypePageConfig(type, locale));

  return (
    <div className="cmp-wrap">
      <header className="cmp-header">
        <h1 className="cmp-title">{t("drawerTitle")}</h1>
        <p className="text-muted-foreground mt-2 max-w-xl">{t("hubHint")}</p>
      </header>

      <CompareWorkspace
        locale={locale}
        localePrefix={locale}
        isAr={isAr}
        types={workspaceTypes}
        labels={{
          drawerTitle: t("drawerTitle"),
          browseTypes: t("browseTypes"),
          sameTypeOnly: t("sameTypeOnly"),
          empty: t("empty"),
          allSpecs: t("allSpecs"),
          differences: t("differences"),
          hideEqual: t("hideEqual"),
          specifications: t("specifications"),
          remove: t("remove"),
          continueBrowsing: t("continueBrowsing"),
          searchPlaceholder: t("searchPlaceholder"),
          loading: t("loading"),
          clearAll: t("clearAll"),
          clearBucket: t("clearBucket"),
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
