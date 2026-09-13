import {
  collectRuleLeaves,
  emptyRuleGroup,
  isRuleGroup,
  type RuleGroup,
  type RuleLeaf,
  type RuleNode,
} from "@/features/categories/matching";

/**
 * Normalize catalog-navigation item filters to a Matching Rules RuleGroup.
 * Accepts:
 * - Canonical RuleGroup (`{ match, children }`)
 * - Legacy flat nav filters (`{ match: ALL|ANY, conditions: [{ field, value }] }`)
 * - Legacy collection-style `{ match, rules[] }` (via children-compatible shape)
 */
export function normalizeNavFilters(input: unknown): RuleGroup {
  if (input == null || typeof input !== "object") {
    return emptyRuleGroup("all");
  }

  const obj = input as Record<string, unknown>;

  if ("match" in obj && Array.isArray(obj.children)) {
    return normalizeGroup(obj as unknown as RuleGroup);
  }

  if ("match" in obj && Array.isArray(obj.conditions)) {
    return upgradeLegacyNavConditions(obj);
  }

  if ("match" in obj && Array.isArray(obj.rules)) {
    const match = String(obj.match).toLowerCase() === "all" ? "all" : "any";
    const children: RuleLeaf[] = (obj.rules as Array<Record<string, unknown>>).map((rule) => ({
      kind: "leaf" as const,
      field: String(rule.field ?? "brand"),
      operator: (rule.operator as RuleLeaf["operator"]) ?? "equals",
      value: rule.value as RuleLeaf["value"],
      values: Array.isArray(rule.values) ? (rule.values as RuleLeaf["values"]) : undefined,
    }));
    return { kind: "group", match, children };
  }

  if ("field" in obj && "operator" in obj) {
    return {
      kind: "group",
      match: "all",
      children: [normalizeLeaf(obj as unknown as RuleLeaf)],
    };
  }

  return emptyRuleGroup("all");
}

function upgradeLegacyNavConditions(obj: Record<string, unknown>): RuleGroup {
  const matchRaw = String(obj.match ?? "ALL").toUpperCase();
  const match = matchRaw === "ANY" || matchRaw === "any" ? "any" : "all";
  const conditions = obj.conditions as Array<Record<string, unknown>>;
  const children: RuleLeaf[] = conditions.map((cond) => legacyConditionToLeaf(cond));
  return { kind: "group", match, children };
}

function legacyConditionToLeaf(cond: Record<string, unknown>): RuleLeaf {
  const fieldRaw = String(cond.field ?? "category").trim();
  const value = String(cond.value ?? "").trim();
  const variationType = String(cond.variationType ?? "").trim();

  if (fieldRaw === "tag") {
    return { kind: "leaf", field: "tags", operator: "equals", value };
  }
  if (fieldRaw === "variation" || fieldRaw === "attribute") {
    const specValue = variationType ? `${variationType}: ${value}` : value;
    return { kind: "leaf", field: "specification", operator: "equals", value: specValue };
  }
  if (fieldRaw === "collection") {
    // Listing facet; keep field name for URL compile (not a product rule field).
    return { kind: "leaf", field: "collection", operator: "equals", value };
  }
  if (fieldRaw === "condition") {
    return { kind: "leaf", field: "condition", operator: "equals", value };
  }
  if (fieldRaw === "categories") {
    return { kind: "leaf", field: "categories", operator: "equals", value };
  }
  // category | brand | …
  return { kind: "leaf", field: fieldRaw || "category", operator: "equals", value };
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
  const match = group.match === "any" ? "any" : "all";
  const children = (group.children ?? []).map((child) =>
    isRuleGroup(child) ? normalizeGroup(child) : normalizeLeaf(child as RuleLeaf),
  );
  return { kind: "group", match, children };
}

export function navFiltersHaveLeaves(filters: RuleGroup | null | undefined): boolean {
  if (!filters) return false;
  return collectRuleLeaves(filters).length > 0;
}

export function seedNavFiltersForAction(
  action:
    | "CATEGORY_FILTER"
    | "BRAND_FILTER"
    | "ATTRIBUTE_FILTER"
    | "SPEC_FILTER"
    | "MULTI_FILTER",
  existing?: RuleGroup | null,
): RuleGroup {
  if (existing && collectRuleLeaves(existing).length > 0) {
    return normalizeGroup(existing);
  }
  const field =
    action === "BRAND_FILTER"
      ? "brand"
      : action === "SPEC_FILTER" || action === "ATTRIBUTE_FILTER"
        ? "specification"
        : action === "MULTI_FILTER"
          ? "brand"
          : "category";
  return {
    kind: "group",
    match: "all",
    children: [{ kind: "leaf", field, operator: "equals", value: "" }],
  };
}

export function summarizeNavFilterLeaves(filters: RuleGroup | null | undefined): string {
  const leaves = filters ? collectRuleLeaves(filters) : [];
  if (!leaves.length) return "";
  return leaves
    .map((leaf) => {
      const val =
        leaf.values?.length != null && leaf.values.length > 0
          ? leaf.values.map(String).join(", ")
          : leaf.value != null && String(leaf.value) !== ""
            ? String(leaf.value)
            : "";
      return val ? `${leaf.field} ${leaf.operator} ${val}` : `${leaf.field} ${leaf.operator}`;
    })
    .join("; ");
}

/** Walk rule tree nodes (for type-safe callers). */
export function mapRuleNodes(nodes: RuleNode[]): RuleNode[] {
  return nodes;
}
