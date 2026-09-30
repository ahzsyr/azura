import type { Product } from "@/features/products/types";
import type { GoogleShoppingIssueCode } from "./google-shopping-issues";

/** Internal feed contract version (not required in Google XML). */
export const GOOGLE_SHOPPING_FEED_VERSION = 3 as const;

export const GOOGLE_SHOPPING_FEED_PATH = "/feeds/google-shopping.xml";

export type GoogleShoppingAvailability =
  | "in stock"
  | "out of stock"
  | "preorder"
  | "backorder";

export type GoogleShoppingPriceAdjustmentDirection = "increase" | "decrease";

export type GoogleShoppingCondition = "new" | "used" | "refurbished";

export type GoogleShoppingValidationMode = "standard" | "strict" | "permissive";

export type GoogleShoppingEligibilityStatus = "ready" | "warning" | "excluded";

export type GoogleShoppingShipping = {
  country: string;
  service: string;
  price: string;
};

export type GoogleShoppingFeedItem = {
  id: string;
  title: string;
  description: string;
  link: string;
  imageLink: string;
  additionalImageLinks?: string[];
  availability: GoogleShoppingAvailability;
  /** Required by Google when availability is preorder or backorder. */
  availabilityDate?: string;
  price: string;
  salePrice?: string;
  condition: GoogleShoppingCondition;
  brand: string;
  gtin?: string;
  mpn?: string;
  identifierExists: "yes" | "no";
  googleProductCategory?: string;
  productType?: string;
  itemGroupId?: string;
  color?: string;
  size?: string;
  shipping?: GoogleShoppingShipping;
  customLabel0?: string;
};

export type GoogleShoppingMarket = {
  country: string;
  language: string;
  defaultCurrency: string;
  destination: string;
  validationMode: GoogleShoppingValidationMode;
  feedUrl: string;
  shippingCountry?: string;
  shippingService?: string;
  shippingPrice?: number | null;
  siteOrigin: string;
  localePrefix: string;
  /** Percent applied to list (and sale) price at feed generation. 0 = unchanged. */
  priceAdjustmentPercent?: number;
  priceAdjustmentDirection?: GoogleShoppingPriceAdjustmentDirection;
  /** When set, every feed item uses this availability instead of product stock. */
  availabilityOverride?: GoogleShoppingAvailability;
  /** Used as <g:availability_date> when availability is preorder or backorder. */
  availabilityDate?: string;
};

export type GoogleShoppingFeedProductInput = Product & {
  slug: string;
  /** When set, overrides published detection for eligibility. */
  publishStatus?: string | null;
};

export type GoogleShoppingEligibilityResult = {
  status: GoogleShoppingEligibilityStatus;
  issues: GoogleShoppingIssueCode[];
  warnings: GoogleShoppingIssueCode[];
  /** Null only when status === "excluded". When variants exist, primary item is first. */
  item: GoogleShoppingFeedItem | null;
  /** All feed rows for this product (variants). Empty when excluded. */
  items: GoogleShoppingFeedItem[];
  feedVersion: typeof GOOGLE_SHOPPING_FEED_VERSION;
};

export type GoogleShoppingDiagnosticsProductRef = {
  id: string;
  slug: string;
  title: string;
};

export type GoogleShoppingDiagnosticsIssueBucket = {
  severity: "excluded" | "warning";
  count: number;
  products: GoogleShoppingDiagnosticsProductRef[];
};

export type GoogleShoppingDiagnosticsSummary = {
  published: number;
  ready: number;
  warnings: number;
  excluded: number;
  feedItems: number;
};

export type GoogleShoppingDiagnosticsReport = {
  feedVersion: typeof GOOGLE_SHOPPING_FEED_VERSION;
  summary: GoogleShoppingDiagnosticsSummary;
  issues: Partial<Record<GoogleShoppingIssueCode, GoogleShoppingDiagnosticsIssueBucket>>;
};
