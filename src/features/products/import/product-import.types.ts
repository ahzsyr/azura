export type ProductImportSourceType = "json" | "csv" | "manual";

export type ProductImportData = {
  slug: string;
  product: Record<string, unknown>;
  sourceFile?: string;
  /** Companion WooCommerce CSV from converter (metadata only; not merged into product). */
  pairedCsv?: string;
};

export type ProductImportRowResult = {
  slug: string;
  status: "ok" | "skipped" | "error";
  errors: string[];
  warnings: string[];
  sourceFile?: string;
};

export type ProductImportBatchResult = {
  summary: { total: number; ok: number; skipped: number; error: number };
  results: ProductImportRowResult[];
};

export type ProductImportUpsertOptions = {
  locale: string;
  sourceType?: ProductImportSourceType;
  sourceFile?: string;
  dryRun?: boolean;
  duplicatePolicy?: "overwrite" | "skip";
};
