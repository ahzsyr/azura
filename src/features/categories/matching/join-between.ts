import { isRuleGroup, type RuleGroup, type RuleMatchMode, type RuleNode } from "./types";

/** Inline children of nested groups that share the same match mode. */
export function flattenSameMatch(group: RuleGroup): RuleGroup {
  const children: RuleNode[] = [];
  for (const child of group.children ?? []) {
    if (isRuleGroup(child) && child.match === group.match) {
      children.push(...(flattenSameMatch(child).children ?? []));
    } else {
      children.push(child);
    }
  }
  return { kind: "group", match: group.match, children };
}

/**
 * Change the boolean join between children[leftIndex] and children[leftIndex + 1].
 * Same as the parent match → no structural change.
 * Different → wrap that pair in a nested group (or promote when it becomes the sole child).
 */
export function applyJoinBetween(
  group: RuleGroup,
  leftIndex: number,
  join: RuleMatchMode,
  depth: number,
  maxDepth: number,
): RuleGroup {
  if (join === group.match) return group;
  const left = group.children[leftIndex];
  const right = group.children[leftIndex + 1];
  if (!left || !right) return group;

  // At max depth, fall back to switching the whole group.
  if (depth >= maxDepth - 1) {
    return { ...group, match: join };
  }

  const nested = flattenSameMatch({
    kind: "group",
    match: join,
    children: [left, right],
  });

  const children = [
    ...group.children.slice(0, leftIndex),
    nested,
    ...group.children.slice(leftIndex + 2),
  ];

  if (children.length === 1 && isRuleGroup(children[0])) {
    return flattenSameMatch(children[0]);
  }

  return flattenSameMatch({ ...group, children });
}
