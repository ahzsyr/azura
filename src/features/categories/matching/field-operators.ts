import type { MatchingRuleOperator } from "./types";
import { isSpecificationRuleField, PRODUCT_RULE_FIELDS } from "./fields-product";

export type RuleFieldKind = "text" | "list" | "numeric";

const LIST_FIELDS = new Set([
  "categories",
  "tags",
  "categoryAncestors",
  "specification",
  "matchingRules",
]);
const NUMERIC_FIELDS = new Set(["price", "comparePrice"]);

export const EDITOR_PRODUCT_FIELDS = [
  ...PRODUCT_RULE_FIELDS,
  "comparePrice",
  "categoryAncestors",
] as const;

export type EditorProductField = (typeof EDITOR_PRODUCT_FIELDS)[number];

export function fieldKind(field: string): RuleFieldKind {
  if (isSpecificationRuleField(field)) return "text";
  if (LIST_FIELDS.has(field)) return "list";
  if (NUMERIC_FIELDS.has(field)) return "numeric";
  return "text";
}

const TEXT_OPS: MatchingRuleOperator[] = [
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "starts_with",
  "ends_with",
  "matches",
  "is_empty",
  "is_not_empty",
  "in",
  "not_in",
];

const LIST_OPS: MatchingRuleOperator[] = [
  ...TEXT_OPS,
  "contains_any",
  "contains_all",
  "contains_none",
];

const NUMERIC_OPS: MatchingRuleOperator[] = [
  "equals",
  "not_equals",
  "greater_than",
  "greater_than_or_equal",
  "less_than",
  "less_than_or_equal",
  "between",
  "in",
  "not_in",
  "is_empty",
  "is_not_empty",
];

export function operatorsForField(field: string): MatchingRuleOperator[] {
  switch (fieldKind(field)) {
    case "list":
      return LIST_OPS;
    case "numeric":
      return NUMERIC_OPS;
    default:
      return TEXT_OPS;
  }
}

const UNARY_OPS = new Set<MatchingRuleOperator>([
  "is_empty",
  "is_not_empty",
  "is_true",
  "is_false",
]);

const MULTI_VALUE_OPS = new Set<MatchingRuleOperator>([
  "between",
  "in",
  "not_in",
  "contains_any",
  "contains_all",
  "contains_none",
]);

export function isUnaryOperator(op: MatchingRuleOperator): boolean {
  return UNARY_OPS.has(op);
}

export function isMultiValueOperator(op: MatchingRuleOperator): boolean {
  return MULTI_VALUE_OPS.has(op);
}

/** All operators known to the Matching Rules engine (for sync validation). */
export const ALL_MATCHING_OPERATORS: MatchingRuleOperator[] = [
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "starts_with",
  "ends_with",
  "matches",
  "is_empty",
  "is_not_empty",
  "greater_than",
  "greater_than_or_equal",
  "less_than",
  "less_than_or_equal",
  "between",
  "is_true",
  "is_false",
  "contains_any",
  "contains_all",
  "contains_none",
  "in",
  "not_in",
];

export const VALID_PRODUCT_RULE_FIELDS = new Set<string>([
  ...EDITOR_PRODUCT_FIELDS,
  "id",
  "slug",
  "name",
  "mpn",
  "description",
]);

/** Spec fields (`spec:*`) and known product fields are valid for matching. */
export function isValidProductRuleField(field: string): boolean {
  return VALID_PRODUCT_RULE_FIELDS.has(field) || isSpecificationRuleField(field);
}
