import "server-only";

import type { RegisteredComparableType } from "@/features/comparison/comparison-registry";
import {
  resolveCompareFields,
  resolveComparisonForType,
} from "@/features/comparison/comparison-schema-resolver";
import { usesProductCompareAdapter } from "@/features/comparison/comparison-data-adapter";
import type { CompareFieldMeta, ComparisonMode } from "@/features/comparison/types";

export type CompareTypePageConfig = {
  slug: string;
  routePrefix: string;
  apiSegment: string;
  labelPluralEn: string;
  labelPluralAr: string;
  maxItems: number;
  comparisonMode: ComparisonMode;
  listHref: string;
  compareFields: CompareFieldMeta[];
  usesSpecAdapter: boolean;
};

export function buildCompareTypePageConfig(
  registered: RegisteredComparableType,
  locale: string
): CompareTypePageConfig {
  const { config } = resolveComparisonForType({
    fieldSchema: registered.fieldSchema,
    adminConfig: registered.adminConfig,
  });
  const routePrefix = registered.routePrefix ?? registered.slug;
  const compareFields = usesProductCompareAdapter(registered.slug)
    ? []
    : resolveCompareFields(registered.fieldSchema, config);

  return {
    slug: registered.slug,
    routePrefix,
    apiSegment: routePrefix,
    labelPluralEn: registered.labelPluralEn,
    labelPluralAr: registered.labelPluralAr,
    maxItems: config.comparisonSettings.maxItems,
    comparisonMode: config.comparisonSettings.comparisonMode,
    listHref: `/${locale}/${routePrefix}`,
    compareFields,
    usesSpecAdapter: usesProductCompareAdapter(registered.slug),
  };
}
