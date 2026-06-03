export * from "@/features/comparison/types";
export {
  buildCompareTable,
  extractFieldValues,
  filterCompareItemsBySearch,
  filterCompareEntriesByGroups,
  getCompareGroupsFromFields,
  buildCompareTable as ComparisonEngine_buildTable,
} from "@/features/comparison/comparison-engine";
/** @alias ComparisonEngine */
export { buildCompareTable as ComparisonEngine } from "@/features/comparison/comparison-engine";
export {
  listComparableContentTypes,
  getComparableContentTypeBySlug,
  listComparableContentTypes as ComparisonRegistry_list,
} from "@/features/comparison/comparison-registry";
/** @alias ComparisonRegistry */
export { listComparableContentTypes as ComparisonRegistry } from "@/features/comparison/comparison-registry";
export { ComparisonProvider, useComparison, useComparisonOptional } from "@/features/comparison/comparison-provider";
export {
  getCompareStore,
  getCompareIdsForType,
  isInCompareList,
  toggleCompareList,
  removeFromCompareList,
  clearCompareList,
  getCompareBucketsSummary,
  COMPARE_CHANGED_EVENT,
  getCompareStore as ComparisonStore_read,
} from "@/features/comparison/comparison-store";
export {
  isContentTypeComparable,
  resolveCompareFields,
  resolveComparisonForType,
  getMaxCompareItems,
  resolveCompareFields as ComparisonSchemaResolver_resolve,
} from "@/features/comparison/comparison-schema-resolver";
export { ComparisonFieldRenderer } from "@/features/comparison/comparison-field-renderer";
export { ComparisonTable } from "@/features/comparison/components/comparison-table";
export { ComparisonDrawer } from "@/features/comparison/components/comparison-drawer";
export { AddToCompareButton } from "@/features/comparison/components/add-to-compare-button";
export { ComparisonPage } from "@/features/comparison/components/comparison-page";
export { parseComparisonConfig, mergeComparisonIntoAdminConfig } from "@/features/comparison/parse-comparison-config";
export { fetchCompareItems, searchCompareCandidates } from "@/features/comparison/comparison-data.service";
export { getComparePropsForType } from "@/features/comparison/get-compare-props";
export type { ComparisonField } from "@/features/comparison/comparison-field";
export { toComparisonField, buildComparisonAttributes } from "@/features/comparison/comparison-field";
export {
  resolveCompareContentTypeSlug,
  comparePagePath,
  COMPARE_ROUTE_ALIASES,
} from "@/features/comparison/comparison-route-resolver";
export { loadCompareBundle, searchCompareItems } from "@/features/comparison/comparison-data-adapter";
export { buildCompareTypePageConfig } from "@/features/comparison/build-compare-type-config";
export { CompareWorkspace } from "@/features/comparison/components/compare-workspace";
export { PRODUCT_COMPARE_SLUG, PRODUCT_COMPARE_MAX } from "@/features/comparison/product-comparison.constants";
export { fetchProductCompareBundle } from "@/features/comparison/product-comparison.service";
export { buildProductSpecCompareTable } from "@/features/comparison/product-comparison-engine";
