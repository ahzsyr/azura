export type {
  Category,
  CategoryScope,
  CategoryEntityKind,
  CategoryMembership,
  CategoryListItem,
  CategoryMetadata,
  CategoryWriteInput,
  MembershipMode,
  MembershipSource,
} from "./types";

export {
  CATEGORY_CONTRACTS,
  SCOPE_ENTITY_KIND_ALLOWLIST,
  isEntityKindAllowedForScope,
  requiresScopeOwnerId,
} from "./invariants";

export { toDbScopeOwnerId, fromDbScopeOwnerId } from "./scope-owner";

export * from "./matching";

export { syncProductCategoryRuleMemberships } from "./sync-rule-memberships";
export type { CategoryRuleSyncReport } from "./sync-rule-memberships";

export { categoriesDataService } from "./categories-data.service";
export { dualWriteCategoryFromCollection } from "./dual-write-from-collection";
export { CATEGORY_STAGE7_INTENTIONAL_ALIASES } from "./stage7-deprecation";
export {
  buildCategoryFacetIndex,
  normalizeCategoryFacetKey,
  resolveCategoryForFacetValue,
  resolveCategoriesForProductFacet,
  isCategoryFacetValueVisible,
  isCategoryTaxonomyNodeVisible,
  recordMatchesCategoryFacetValue,
} from "./resolve-category-for-facet";
export type {
  CategoryTaxonomyNode,
  CategoryFacetResolveInput,
  CategoryFacetIndex,
} from "./resolve-category-for-facet";
