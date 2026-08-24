import type { CategoryEntityKind, CategoryScope } from "./types";

/**
 * Immutable execution contracts for Categories unification.
 * Violations are bugs.
 */
export const CATEGORY_CONTRACTS = {
  categoryIsSourceOfTruth: true,
  membershipIsMaterializedIndex: true,
  manualIsDurable: true,
  ruleIsDerivedRebuildable: true,
  hybridIsManualOrRule: true,
  hybridManualWinsOnOverlap: true,
  emptyRulesMatchNothing: true,
  rootRuleIsAlwaysGroup: true,
  productCategoryStringsAreDerivedOnly: true,
  collectionsIsLegacyTerminologyOnly: true,
  categoriesIsSoleUserFacingTerm: true,
} as const;

/** Scope ↔ entityKind allowlist — enforced in the service layer. */
export const SCOPE_ENTITY_KIND_ALLOWLIST: Record<CategoryScope, readonly CategoryEntityKind[]> = {
  PRODUCT: ["product"],
  CONTENT: ["contentItem"],
  POST: ["post"],
  KNOWLEDGE: ["knowledgeArticle"],
  PARTNER: ["partner"],
  TESTIMONIAL: ["testimonial"],
};

export function isEntityKindAllowedForScope(
  scope: CategoryScope,
  entityKind: CategoryEntityKind
): boolean {
  return SCOPE_ENTITY_KIND_ALLOWLIST[scope].includes(entityKind);
}

/** Scopes that require a non-empty scopeOwnerId (content type / KB / program). */
const SCOPES_REQUIRING_OWNER = new Set<CategoryScope>(["CONTENT", "KNOWLEDGE", "PARTNER"]);

/** PRODUCT, POST, and TESTIMONIAL use empty scopeOwnerId (site-wide taxonomy). */
export function requiresScopeOwnerId(scope: CategoryScope): boolean {
  return SCOPES_REQUIRING_OWNER.has(scope);
}
