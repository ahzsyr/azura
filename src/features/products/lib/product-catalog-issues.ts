/**
 * Shared catalog health issues (storefront glob parse + admin API disk scan).
 */
export type CatalogIssueKind = "invalid_json" | "validation";

export interface CatalogIssue {
  kind: CatalogIssueKind;
  slug: string;
  /** Locale folder code (e.g. en-us) or "default" for legacy `src/data/products`. */
  locale?: string;
  /** Vite module id or filesystem path when known. */
  filePath?: string;
  message: string;
  /** Zod / validation paths, when kind === "validation". */
  fields?: string[];
}
