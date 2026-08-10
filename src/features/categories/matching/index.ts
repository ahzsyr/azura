export type { RuleGroup, RuleLeaf, RuleNode, MatchingRuleOperator, RuleOperator, RuleMatchMode, MatchExplainResult } from "./types";
export {
  isRuleGroup,
  isRuleLeaf,
  emptyRuleGroup,
  countRuleLeaves,
  hasNestedRuleGroups,
  collectRuleLeaves,
} from "./types";
export { upgradeLegacyRuleSet, isEmptyRuleTree, assertRootIsGroup } from "./upgrade-legacy";
export {
  matchEntityToRules,
  matchEntityToRulesBool,
  explainEntityMatch,
  type RuleEntityFields,
} from "./evaluate";
export {
  productToRuleFields,
  ruleMetaToRuleFields,
  PRODUCT_RULE_FIELDS,
  flattenProductSpecifications,
  flattenSpecificationTokens,
  normalizeMatchingRulesList,
  collectProductSpecKeys,
  isSpecificationRuleField,
} from "./fields-product";
export {
  normalizeForMatch,
  matchesExact,
  matchesContains,
  matchesStartsWith,
  matchesEndsWith,
} from "./normalize";
export {
  EDITOR_PRODUCT_FIELDS,
  operatorsForField,
  fieldKind,
  isUnaryOperator,
  isMultiValueOperator,
  ALL_MATCHING_OPERATORS,
  VALID_PRODUCT_RULE_FIELDS,
  isValidProductRuleField,
  type RuleFieldKind,
  type EditorProductField,
} from "./field-operators";
export {
  SPECIFICATION_FIELD,
  MATCHING_RULES_FIELD,
  SPECIFICATION_FIELD_OPTION,
  buildMatchingRuleFieldGroups,
  isSpecificationEditorField,
  isMatchingRulesEditorField,
  isSpecificationPrimarySelection,
  specificationKeyFromField,
  fieldFromSpecificationKey,
  type MatchingRuleFieldOptionGroup,
} from "./specification-field-ui";
