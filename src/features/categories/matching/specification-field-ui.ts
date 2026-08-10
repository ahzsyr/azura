/**
 * Matching Rules field picker groups.
 *
 * `specification` and `matchingRules` are normal list fields (operator + value),
 * same UX as Tags / Categories. Legacy `spec:<key>` rules remain evaluable.
 */

import { EDITOR_PRODUCT_FIELDS } from "./field-operators";

export const SPECIFICATION_FIELD = "specification" as const;
export const MATCHING_RULES_FIELD = "matchingRules" as const;

export type MatchingRuleFieldOptionGroup = {
  label: string;
  options: Array<{ value: string; label: string }>;
};

const FIELD_LABELS: Record<string, string> = {
  category: "Category",
  categories: "Categories",
  tags: "Tags",
  brand: "Brand",
  title: "Title",
  name: "Name",
  badge: "Badge",
  status: "Status",
  stock: "Stock",
  price: "Price",
  mpn: "MPN",
  description: "Description",
  specification: "Specification",
  matchingRules: "Matching Rules",
  comparePrice: "Compare price",
  categoryAncestors: "Category ancestors",
};

/** @deprecated Sentinel no longer used; kept for any leftover imports. */
export const SPECIFICATION_FIELD_OPTION = SPECIFICATION_FIELD;

export function buildMatchingRuleFieldGroups(): MatchingRuleFieldOptionGroup[] {
  const productFields = EDITOR_PRODUCT_FIELDS.filter(
    (f) => f !== SPECIFICATION_FIELD && f !== MATCHING_RULES_FIELD,
  );

  return [
    {
      label: "Product Fields",
      options: productFields.map((value) => ({
        value,
        label: FIELD_LABELS[value] ?? value,
      })),
    },
    {
      label: "Specifications",
      options: [
        {
          value: SPECIFICATION_FIELD,
          label: FIELD_LABELS[SPECIFICATION_FIELD] ?? "Specification",
        },
      ],
    },
    {
      label: "Source Matching",
      options: [
        {
          value: MATCHING_RULES_FIELD,
          label: FIELD_LABELS[MATCHING_RULES_FIELD] ?? "Matching Rules",
        },
      ],
    },
  ];
}

export function isSpecificationEditorField(field: string): boolean {
  return field === SPECIFICATION_FIELD;
}

export function isMatchingRulesEditorField(field: string): boolean {
  return field === MATCHING_RULES_FIELD;
}

/** @deprecated Prefer `field === "specification"`. */
export function isSpecificationPrimarySelection(field: string): boolean {
  return field === SPECIFICATION_FIELD || field.startsWith("spec:");
}

export function specificationKeyFromField(field: string): string {
  if (!field.startsWith("spec:")) return "";
  return field.slice("spec:".length);
}

export function fieldFromSpecificationKey(key: string): string {
  const k = key.trim();
  return k ? `spec:${k}` : SPECIFICATION_FIELD;
}
