import { labelForGoogleShoppingIssue, severityForGoogleShoppingIssue } from "./google-shopping-issues";
import type { GoogleShoppingIssueCode } from "./google-shopping-issues";
import { GOOGLE_SHOPPING_FEED_VERSION } from "./google-shopping-feed.types";
import type {
  GoogleShoppingDiagnosticsReport,
  GoogleShoppingEligibilityResult,
  GoogleShoppingFeedProductInput,
} from "./google-shopping-feed.types";

const MAX_PRODUCTS_PER_ISSUE = 50;

export type GoogleShoppingEligibilityWithProduct = {
  product: GoogleShoppingFeedProductInput;
  result: GoogleShoppingEligibilityResult;
};

/**
 * Aggregate resolver results into a diagnostics report.
 * Does not re-implement eligibility — only groups resolver output.
 */
export function aggregateGoogleShoppingDiagnostics(
  entries: GoogleShoppingEligibilityWithProduct[],
  options?: { strict?: boolean },
): GoogleShoppingDiagnosticsReport {
  const strict = Boolean(options?.strict);
  let ready = 0;
  let warnings = 0;
  let excluded = 0;
  let feedItems = 0;

  const issues: GoogleShoppingDiagnosticsReport["issues"] = {};

  function pushIssue(
    code: GoogleShoppingIssueCode,
    product: GoogleShoppingFeedProductInput,
    severity: "excluded" | "warning",
  ) {
    const bucket = issues[code] ?? { severity, count: 0, products: [] };
    bucket.count += 1;
    if (bucket.products.length < MAX_PRODUCTS_PER_ISSUE) {
      bucket.products.push({
        id: product.id,
        slug: product.slug,
        title:
          product.productTitle ||
          product.name ||
          product.title ||
          product.id,
      });
    }
    issues[code] = bucket;
  }

  for (const { product, result } of entries) {
    if (result.status === "ready") ready += 1;
    else if (result.status === "warning") warnings += 1;
    else excluded += 1;

    feedItems += result.items.length;

    for (const code of result.issues) {
      pushIssue(code, product, "excluded");
    }
    for (const code of result.warnings) {
      pushIssue(code, product, severityForGoogleShoppingIssue(code, { strict }));
    }
  }

  return {
    feedVersion: GOOGLE_SHOPPING_FEED_VERSION,
    summary: {
      published: entries.length,
      ready,
      warnings,
      excluded,
      feedItems,
    },
    issues,
  };
}

export function formatGoogleShoppingIssueList(
  codes: GoogleShoppingIssueCode[],
): string[] {
  return codes.map(labelForGoogleShoppingIssue);
}
