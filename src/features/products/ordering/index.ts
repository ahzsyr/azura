export {
  parseProductOrderingSettings,
  serializeProductOrderingForSite,
  createDefaultGlobalProfile,
  createEmptyProfile,
  DEFAULT_PRODUCT_ORDERING_SETTINGS,
  DEFAULT_PRODUCT_ORDERING_RULE_ORDER,
  PRODUCT_ORDERING_DEFAULT_SORT_LABELS,
  PRODUCT_ORDERING_RULE_LABELS,
  PRODUCT_ORDERING_KEYWORD_FIELD_LABELS,
  PRODUCT_ORDERING_SCOPE_TYPES,
  PRODUCT_ORDERING_DEFAULT_SORTS,
  PRODUCT_ORDERING_RULE_IDS,
  PRODUCT_ORDERING_KEYWORD_FIELDS,
  type ProductOrderingSettings,
  type ProductOrderingProfile,
  type ProductOrderingScope,
  type ProductOrderingScopeType,
  type ProductOrderingDefaultSort,
  type ProductOrderingRuleId,
  type ProductOrderingKeywordField,
  type ProductOrderingKeywordPriority,
} from "./product-ordering.schema";

export {
  resolveProductOrderingProfile,
  findProductOrderingProfileById,
  type ProductOrderingContext,
  type ProductOrderingSurface,
} from "./resolve-product-ordering-profile";

export {
  applyProductOrdering,
  type OrderableListingRecord,
} from "./apply-product-ordering";

export { applyProductOrderingToSearchHits } from "./apply-product-ordering-to-search-hits";

// Server-only loaders: import `@/features/products/ordering/load-product-ordering`
// directly from Server Components / route handlers (not this barrel).
