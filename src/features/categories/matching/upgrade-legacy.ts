import type { CollectionRule, CollectionRuleSet } from "@/features/collections/types";
import type { RuleGroup, RuleLeaf, RuleNode } from "./types";
import { emptyRuleGroup, isRuleGroup } from "./types";

/**
 * Upgrade legacy flat `{ match, rules[] }` to a root RuleGroup.
 * Already-upgraded groups are returned as-is (normalized kind).
 */
export function upgradeLegacyRuleSet(input: unknown): RuleGroup {
  if (input == null || typeof input !== "object") {
    return emptyRuleGroup("any");
  }

  const obj = input as Record<string, unknown>;

  // Already a root group with children
  if ("match" in obj && Array.isArray(obj.children)) {
    return normalizeGroup(obj as unknown as RuleGroup);
  }

  // Legacy CollectionRuleSet
  if ("match" in obj && Array.isArray(obj.rules)) {
    const legacy = obj as CollectionRuleSet;
    const match = legacy.match === "all" ? "all" : "any";
    const children: RuleLeaf[] = (legacy.rules ?? []).map(legacyRuleToLeaf);
    return { kind: "group", match, children };
  }

  // Bare leaf mistakenly at root — wrap
  if ("field" in obj && "operator" in obj) {
    return {
      kind: "group",
      match: "any",
      children: [normalizeLeaf(obj as unknown as RuleLeaf)],
    };
  }

  return emptyRuleGroup("any");
}

function legacyRuleToLeaf(rule: CollectionRule): RuleLeaf {
  return {
    kind: "leaf",
    field: rule.field,
    operator: rule.operator,
    value: rule.value,
  };
}

function normalizeLeaf(leaf: RuleLeaf): RuleLeaf {
  return {
    kind: "leaf",
    field: leaf.field,
    operator: leaf.operator,
    value: leaf.value,
    values: leaf.values,
  };
}

function normalizeGroup(group: RuleGroup): RuleGroup {
  const match = group.match === "all" ? "all" : "any";
  const children = (group.children ?? []).map((child) =>
    isRuleGroup(child) ? normalizeGroup(child) : normalizeLeaf(child as RuleLeaf)
  );
  return { kind: "group", match, children };
}

/** True when the root group has no children (empty rules → zero matches). */
export function isEmptyRuleTree(root: RuleGroup): boolean {
  return !root.children || root.children.length === 0;
}

/** Assert/document that a node is a valid root (group). */
export function assertRootIsGroup(node: RuleNode): RuleGroup {
  if (!isRuleGroup(node)) {
    throw new Error("Matching Rules root must be a RuleGroup, not a leaf");
  }
  return node;
}
