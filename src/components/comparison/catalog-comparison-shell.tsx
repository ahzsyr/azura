import { getTranslations } from "next-intl/server";
import { ComparisonProvider } from "@/features/comparison/comparison-provider";
import { listComparableContentTypes } from "@/features/comparison/comparison-registry";

type Props = {
  locale: string;
  children: React.ReactNode;
};

export async function CatalogComparisonShell({ locale, children }: Props) {
  const [types, t] = await Promise.all([
    listComparableContentTypes(),
    getTranslations({ locale, namespace: "compare" }),
  ]);

  const comparableTypes = types.map((type) => ({
    id: type.id,
    slug: type.slug,
    labelPluralEn: type.labelPluralEn,
    labelPluralAr: type.labelPluralAr,
    routePrefix: type.routePrefix,
    maxItems: type.maxItems,
    comparisonMode: type.comparisonMode,
  }));

  if (comparableTypes.length === 0) {
    return <>{children}</>;
  }

  return (
    <ComparisonProvider
      locale={locale}
      comparableTypes={comparableTypes}
      labels={{
        drawerTitle: t("drawerTitle"),
        compareNow: t("compareNow"),
        clearAll: t("clearAll"),
        empty: t("drawerEmpty"),
        remove: t("remove"),
        addMore: t("addMore"),
        clearBucket: t("clearBucket"),
        close: t("close"),
        viewComparison: t("viewComparison"),
      }}
    >
      {children}
    </ComparisonProvider>
  );
}
