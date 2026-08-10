import "server-only";

import { getTranslations } from "next-intl/server";
import type { ComparisonPageLabels } from "@/features/comparison/components/comparison-page";

export type CompareWorkspaceLabels = ComparisonPageLabels & {
  drawerTitle: string;
  browseTypes: string;
  sameTypeOnly: string;
  clearAll: string;
  clearBucket: string;
  typeNotComparable: string;
};

export async function getCompareWorkspaceLabels(
  locale: string
): Promise<CompareWorkspaceLabels> {
  const t = await getTranslations({ locale, namespace: "compare" });
  return {
    drawerTitle: t("drawerTitle"),
    browseTypes: t("browseTypes"),
    sameTypeOnly: t("sameTypeOnly"),
    empty: t("empty"),
    typeNotComparable: t("typeNotComparable"),
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
  };
}
