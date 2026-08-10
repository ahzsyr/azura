import type { RuleExplainEntry, RuleGroup, RuleLeaf, RuleNode, MatchExplainResult } from "./types";
import { isRuleGroup, isRuleLeaf } from "./types";
import {
  isEmptyValue,
  matchesContains,
  matchesEndsWith,
  matchesExact,
  matchesStartsWith,
  normalizeForMatch,
  toBoolean,
  toNumber,
  toStringList,
} from "./normalize";
import { isEmptyRuleTree } from "./upgrade-legacy";

/** Entity field bag for Matching Rules evaluation. */
export type RuleEntityFields = Record<string, unknown>;

export type EvaluateOptions = {
  explain?: boolean;
};

function fieldValue(entity: RuleEntityFields, field: string): unknown {
  return entity[field];
}

function singleCompareValue(leaf: RuleLeaf): string {
  if (leaf.value == null) return "";
  return String(leaf.value);
}

function multiValues(leaf: RuleLeaf): Array<string | number | boolean> {
  if (leaf.values && leaf.values.length) return leaf.values;
  if (leaf.value != null) return [leaf.value as string | number | boolean];
  return [];
}

function evaluateTextOp(
  raw: unknown,
  operator: RuleLeaf["operator"],
  leaf: RuleLeaf
): { passed: boolean; detail: string } {
  const str = raw == null ? "" : String(raw);
  const val = singleCompareValue(leaf);

  switch (operator) {
    case "equals":
      return { passed: matchesExact(str, val), detail: `${JSON.stringify(str)} equals ${JSON.stringify(val)}` };
    case "not_equals":
      return { passed: !matchesExact(str, val), detail: `${JSON.stringify(str)} not_equals ${JSON.stringify(val)}` };
    case "contains":
      return { passed: matchesContains(str, val), detail: `${JSON.stringify(str)} contains ${JSON.stringify(val)}` };
    case "not_contains":
      return { passed: !matchesContains(str, val), detail: `${JSON.stringify(str)} not_contains ${JSON.stringify(val)}` };
    case "starts_with":
      return { passed: matchesStartsWith(str, val), detail: `${JSON.stringify(str)} starts_with ${JSON.stringify(val)}` };
    case "ends_with":
      return { passed: matchesEndsWith(str, val), detail: `${JSON.stringify(str)} ends_with ${JSON.stringify(val)}` };
    case "matches": {
      try {
        const re = new RegExp(val, "i");
        const passed = re.test(str);
        return { passed, detail: `${JSON.stringify(str)} matches /${val}/i` };
      } catch {
        return { passed: false, detail: `invalid regex ${JSON.stringify(val)}` };
      }
    }
    case "is_empty":
      return { passed: isEmptyValue(raw), detail: `is_empty(${JSON.stringify(raw)})` };
    case "is_not_empty":
      return { passed: !isEmptyValue(raw), detail: `is_not_empty(${JSON.stringify(raw)})` };
    default:
      return { passed: false, detail: `unsupported text op ${operator}` };
  }
}

function evaluateArrayTextOp(
  values: string[],
  operator: RuleLeaf["operator"],
  leaf: RuleLeaf
): { passed: boolean; detail: string } {
  const val = singleCompareValue(leaf);
  const list = values.map((v) => normalizeForMatch(v));
  const normVal = normalizeForMatch(val);

  switch (operator) {
    case "equals":
      return {
        passed: values.some((v) => matchesExact(v, val)),
        detail: `any of [${values.join(", ")}] equals ${val}`,
      };
    case "not_equals":
      return {
        passed: values.every((v) => !matchesExact(v, val)),
        detail: `all of [${values.join(", ")}] not_equals ${val}`,
      };
    case "contains":
      return {
        passed: values.some((v) => matchesContains(v, val)),
        detail: `any of [${values.join(", ")}] contains ${val}`,
      };
    case "not_contains":
      return {
        passed: values.every((v) => !matchesContains(v, val)),
        detail: `none of [${values.join(", ")}] contains ${val}`,
      };
    case "starts_with":
      return {
        passed: values.some((v) => matchesStartsWith(v, val)),
        detail: `any of [${values.join(", ")}] starts_with ${val}`,
      };
    case "ends_with":
      return {
        passed: values.some((v) => matchesEndsWith(v, val)),
        detail: `any of [${values.join(", ")}] ends_with ${val}`,
      };
    case "is_empty":
      return { passed: values.length === 0, detail: "array is_empty" };
    case "is_not_empty":
      return { passed: values.length > 0, detail: "array is_not_empty" };
    case "contains_any": {
      const needles = multiValues(leaf).map((v) => normalizeForMatch(String(v)));
      const passed = needles.some((n) => list.some((t) => t === n || t.includes(n)));
      return { passed, detail: `contains_any ${needles.join("|")}` };
    }
    case "contains_all": {
      const needles = multiValues(leaf).map((v) => normalizeForMatch(String(v)));
      const passed = needles.every((n) => list.some((t) => t === n || t.includes(n)));
      return { passed, detail: `contains_all ${needles.join("|")}` };
    }
    case "contains_none": {
      const needles = multiValues(leaf).map((v) => normalizeForMatch(String(v)));
      const passed = needles.every((n) => !list.some((t) => t === n || t.includes(n)));
      return { passed, detail: `contains_none ${needles.join("|")}` };
    }
    case "in": {
      const set = new Set(multiValues(leaf).map((v) => normalizeForMatch(String(v))));
      const passed = list.some((t) => set.has(t));
      return { passed, detail: `in [${[...set].join(", ")}]` };
    }
    case "not_in": {
      const set = new Set(multiValues(leaf).map((v) => normalizeForMatch(String(v))));
      const passed = list.every((t) => !set.has(t));
      return { passed, detail: `not_in [${[...set].join(", ")}]` };
    }
    default:
      // Fall back: treat first array element / joined for scalar text ops already handled
      return evaluateTextOp(values[0] ?? "", operator, leaf);
  }
}

function evaluateNumericOp(
  raw: unknown,
  operator: RuleLeaf["operator"],
  leaf: RuleLeaf
): { passed: boolean; detail: string } {
  const num = toNumber(raw);
  if (operator === "is_empty") return { passed: num == null && isEmptyValue(raw), detail: "numeric is_empty" };
  if (operator === "is_not_empty") return { passed: num != null, detail: "numeric is_not_empty" };
  if (num == null) return { passed: false, detail: `non-numeric ${JSON.stringify(raw)}` };

  const cmp = toNumber(leaf.value);
  switch (operator) {
    case "equals":
      return { passed: cmp != null && num === cmp, detail: `${num} == ${cmp}` };
    case "not_equals":
      return { passed: cmp == null || num !== cmp, detail: `${num} != ${cmp}` };
    case "greater_than":
      return { passed: cmp != null && num > cmp, detail: `${num} > ${cmp}` };
    case "greater_than_or_equal":
      return { passed: cmp != null && num >= cmp, detail: `${num} >= ${cmp}` };
    case "less_than":
      return { passed: cmp != null && num < cmp, detail: `${num} < ${cmp}` };
    case "less_than_or_equal":
      return { passed: cmp != null && num <= cmp, detail: `${num} <= ${cmp}` };
    case "between": {
      const vals = multiValues(leaf).map((v) => toNumber(v));
      const lo = vals[0];
      const hi = vals[1];
      const passed = lo != null && hi != null && num >= lo && num <= hi;
      return { passed, detail: `${num} between ${lo}..${hi}` };
    }
    case "in": {
      const set = multiValues(leaf).map((v) => toNumber(v));
      const passed = set.some((v) => v != null && v === num);
      return { passed, detail: `${num} in [...]` };
    }
    case "not_in": {
      const set = multiValues(leaf).map((v) => toNumber(v));
      const passed = set.every((v) => v == null || v !== num);
      return { passed, detail: `${num} not_in [...]` };
    }
    default:
      return { passed: false, detail: `unsupported numeric op ${operator}` };
  }
}

function evaluateBooleanOp(
  raw: unknown,
  operator: RuleLeaf["operator"]
): { passed: boolean; detail: string } {
  const b = toBoolean(raw);
  switch (operator) {
    case "is_true":
      return { passed: b === true, detail: `is_true(${JSON.stringify(raw)})` };
    case "is_false":
      return { passed: b === false, detail: `is_false(${JSON.stringify(raw)})` };
    case "is_empty":
      return { passed: b == null && isEmptyValue(raw), detail: "boolean is_empty" };
    case "is_not_empty":
      return { passed: b != null, detail: "boolean is_not_empty" };
    case "equals":
      return { passed: b === true || (typeof raw === "string" && matchesExact(String(raw), "true")), detail: "bool equals" };
    default:
      return { passed: false, detail: `unsupported boolean op ${operator}` };
  }
}

const NUMERIC_FIELDS = new Set(["price", "comparePrice", "stockQty"]);
const BOOLEAN_FIELDS = new Set(["featured", "visible"]);
const ARRAY_FIELDS = new Set([
  "categories",
  "tags",
  "categoryAncestors",
  "specification",
  "matchingRules",
]);

function evaluateLeaf(
  entity: RuleEntityFields,
  leaf: RuleLeaf,
  path: string,
  entries: RuleExplainEntry[] | null
): boolean {
  const raw = fieldValue(entity, leaf.field);
  const op = leaf.operator;

  // Special: category also ORs categories[] (legacy parity)
  if (leaf.field === "category") {
    const scalar = evaluateTextOp(raw ?? "", op, leaf);
    const arr = evaluateArrayTextOp(toStringList(entity.categories), op, leaf);
    const passed = scalar.passed || arr.passed;
    entries?.push({
      path,
      field: leaf.field,
      operator: op,
      passed,
      detail: `${scalar.detail} OR categories: ${arr.detail}`,
    });
    return passed;
  }

  let result: { passed: boolean; detail: string };

  if (ARRAY_FIELDS.has(leaf.field) || Array.isArray(raw)) {
    result = evaluateArrayTextOp(toStringList(raw), op, leaf);
  } else if (NUMERIC_FIELDS.has(leaf.field) || op.startsWith("greater_") || op.startsWith("less_") || op === "between") {
    result = evaluateNumericOp(raw, op, leaf);
  } else if (BOOLEAN_FIELDS.has(leaf.field) || op === "is_true" || op === "is_false") {
    result = evaluateBooleanOp(raw, op);
  } else if (op === "in" || op === "not_in" || op === "contains_any" || op === "contains_all" || op === "contains_none") {
    // Scalar field with list operators: treat as single-element list
    result = evaluateArrayTextOp(toStringList(raw), op, leaf);
  } else {
    result = evaluateTextOp(raw, op, leaf);
  }

  entries?.push({
    path,
    field: leaf.field,
    operator: op,
    passed: result.passed,
    detail: result.detail,
  });
  return result.passed;
}

function evaluateNode(
  entity: RuleEntityFields,
  node: RuleNode,
  path: string,
  entries: RuleExplainEntry[] | null
): boolean {
  if (isRuleLeaf(node) && !isRuleGroup(node)) {
    return evaluateLeaf(entity, node, path, entries);
  }
  if (!isRuleGroup(node)) {
    entries?.push({ path, passed: false, detail: "invalid node" });
    return false;
  }
  return evaluateGroup(entity, node, path, entries);
}

function evaluateGroup(
  entity: RuleEntityFields,
  group: RuleGroup,
  path: string,
  entries: RuleExplainEntry[] | null
): boolean {
  const children = group.children ?? [];
  if (children.length === 0) {
    entries?.push({ path, passed: false, detail: "empty group → no match" });
    return false;
  }

  if (group.match === "all") {
    let all = true;
    children.forEach((child, i) => {
      const ok = evaluateNode(entity, child, `${path}/${i}`, entries);
      if (!ok) all = false;
    });
    entries?.push({ path, passed: all, detail: `ALL (${children.length} children)` });
    return all;
  }

  let any = false;
  children.forEach((child, i) => {
    const ok = evaluateNode(entity, child, `${path}/${i}`, entries);
    if (ok) any = true;
  });
  entries?.push({ path, passed: any, detail: `ANY (${children.length} children)` });
  return any;
}

/** Evaluate a root RuleGroup against an entity field bag. Empty root → false. */
export function matchEntityToRules(
  entity: RuleEntityFields,
  root: RuleGroup,
  options?: EvaluateOptions
): boolean | MatchExplainResult {
  if (isEmptyRuleTree(root)) {
    if (options?.explain) {
      return { matched: false, entries: [{ path: "root", passed: false, detail: "empty rules → no match" }] };
    }
    return false;
  }

  if (options?.explain) {
    const entries: RuleExplainEntry[] = [];
    const matched = evaluateGroup(entity, root, "root", entries);
    return { matched, entries };
  }

  return evaluateGroup(entity, root, "root", null);
}

export function matchEntityToRulesBool(entity: RuleEntityFields, root: RuleGroup): boolean {
  return matchEntityToRules(entity, root) as boolean;
}

export function explainEntityMatch(entity: RuleEntityFields, root: RuleGroup): MatchExplainResult {
  return matchEntityToRules(entity, root, { explain: true }) as MatchExplainResult;
}
