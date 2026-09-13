/**
 * Matching Rules — nested boolean tree.
 * Root document is always a RuleGroup (never a bare leaf).
 */

export type RuleMatchMode = "any" | "all";

export type MatchingRuleOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "matches"
  | "is_empty"
  | "is_not_empty"
  | "greater_than"
  | "greater_than_or_equal"
  | "less_than"
  | "less_than_or_equal"
  | "between"
  | "is_true"
  | "is_false"
  | "contains_any"
  | "contains_all"
  | "contains_none"
  | "in"
  | "not_in";

/** @deprecated Prefer MatchingRuleOperator */
export type RuleOperator = MatchingRuleOperator;

export type RuleLeaf = {
  kind?: "leaf";
  field: string;
  operator: MatchingRuleOperator;
  value?: string | number | boolean | null;
  values?: Array<string | number | boolean>;
};

export type RuleGroup = {
  kind?: "group";
  match: RuleMatchMode;
  children: RuleNode[];
};

export type RuleNode = RuleLeaf | RuleGroup;

export function isRuleGroup(node: RuleNode): node is RuleGroup {
  return "match" in node && Array.isArray((node as RuleGroup).children);
}

export function isRuleLeaf(node: RuleNode): node is RuleLeaf {
  return "field" in node && "operator" in node;
}

export function emptyRuleGroup(match: RuleMatchMode = "any"): RuleGroup {
  return { kind: "group", match, children: [] };
}

/** Count leaf rules in a tree (nested groups included). */
export function countRuleLeaves(node: RuleNode): number {
  if (isRuleLeaf(node)) return 1;
  return (node.children ?? []).reduce((sum, child) => sum + countRuleLeaves(child), 0);
}

/** True when any child of the root (or deeper) is a nested group. */
export function hasNestedRuleGroups(root: RuleGroup): boolean {
  for (const child of root.children ?? []) {
    if (isRuleGroup(child)) return true;
  }
  return false;
}

/** Collect all leaf nodes from a rule tree. */
export function collectRuleLeaves(node: RuleNode): RuleLeaf[] {
  if (isRuleLeaf(node)) return [node];
  return (node.children ?? []).flatMap(collectRuleLeaves);
}

export type RuleExplainEntry = {
  path: string;
  field?: string;
  operator?: string;
  passed: boolean;
  detail?: string;
};

export type MatchExplainResult = {
  matched: boolean;
  entries: RuleExplainEntry[];
};
