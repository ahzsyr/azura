/**
 * First-class Google Shopping issue codes shared by resolver, diagnostics, UI, and tests.
 * Do not invent aliases (NO_EAN, INVALID_IDENTIFIER, etc.).
 */

export type GoogleShoppingIssueCode =
  | "UNPUBLISHED"
  | "EXCLUDED"
  | "QUOTE_REQUIRED"
  | "EXTERNAL_PURCHASE"
  | "MISSING_TITLE"
  | "MISSING_DESCRIPTION"
  | "MISSING_IMAGE"
  | "INVALID_IMAGE_URL"
  | "MISSING_PRICE"
  | "INVALID_PRICE"
  | "MISSING_BRAND"
  | "MISSING_GTIN"
  | "MISSING_MPN"
  | "MISSING_GOOGLE_CATEGORY"
  | "MISSING_SHIPPING"
  | "CURRENCY_MISMATCH"
  | "INVALID_CANONICAL_URL"
  | "IDENTIFIER_UNAVAILABLE";

export type GoogleShoppingIssueSeverity = "excluded" | "warning";

export const GOOGLE_SHOPPING_ISSUE_LABELS: Record<GoogleShoppingIssueCode, string> = {
  UNPUBLISHED: "Unpublished",
  EXCLUDED: "Excluded from Google Shopping",
  QUOTE_REQUIRED: "Quote required",
  EXTERNAL_PURCHASE: "External purchase only",
  MISSING_TITLE: "Missing title",
  MISSING_DESCRIPTION: "Missing description",
  MISSING_IMAGE: "Missing image",
  INVALID_IMAGE_URL: "Invalid image URL",
  MISSING_PRICE: "Missing price",
  INVALID_PRICE: "Invalid price",
  MISSING_BRAND: "Missing brand",
  MISSING_GTIN: "Missing GTIN",
  MISSING_MPN: "Missing MPN",
  MISSING_GOOGLE_CATEGORY: "Google category not assigned",
  MISSING_SHIPPING: "Missing feed shipping configuration",
  CURRENCY_MISMATCH: "Currency mismatch",
  INVALID_CANONICAL_URL: "Invalid product URL",
  IDENTIFIER_UNAVAILABLE: "Product identifiers unavailable",
};

/** Codes that always exclude a product from the production feed. */
export const GOOGLE_SHOPPING_EXCLUSION_CODES: ReadonlySet<GoogleShoppingIssueCode> = new Set([
  "UNPUBLISHED",
  "EXCLUDED",
  "QUOTE_REQUIRED",
  "EXTERNAL_PURCHASE",
  "MISSING_TITLE",
  "MISSING_DESCRIPTION",
  "MISSING_IMAGE",
  "INVALID_IMAGE_URL",
  "MISSING_PRICE",
  "INVALID_PRICE",
  "MISSING_BRAND",
  "INVALID_CANONICAL_URL",
  "MISSING_SHIPPING",
]);

/** Codes that allow feed inclusion but elevate GMC risk (standard mode). */
export const GOOGLE_SHOPPING_WARNING_CODES: ReadonlySet<GoogleShoppingIssueCode> = new Set([
  "MISSING_GTIN",
  "MISSING_MPN",
  "MISSING_GOOGLE_CATEGORY",
  "CURRENCY_MISMATCH",
  "IDENTIFIER_UNAVAILABLE",
]);

export function labelForGoogleShoppingIssue(code: GoogleShoppingIssueCode): string {
  return GOOGLE_SHOPPING_ISSUE_LABELS[code] ?? code;
}

export function severityForGoogleShoppingIssue(
  code: GoogleShoppingIssueCode,
  options?: { strict?: boolean },
): GoogleShoppingIssueSeverity {
  if (options?.strict && code === "MISSING_GTIN") return "excluded";
  if (GOOGLE_SHOPPING_EXCLUSION_CODES.has(code)) return "excluded";
  return "warning";
}
