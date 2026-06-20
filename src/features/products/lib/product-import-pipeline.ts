import { access } from "node:fs/promises";
import type { Product } from "@/features/products/types";
import { syncSingleProduct } from "@/features/collections/collection-sync.service";
import { collectProductCatalogZodIssues } from "./product-catalog-zod";
import { asProductWithNormalizedDetail, ensureProductIdentity } from "./product-detailed-description";
import {
  getConfiguredLocaleCodes,
  isConfiguredLocaleCodeAsync,
} from "./i18n/config.server";
import { buildLocalizedProductStub, markSourceProductLocalization } from "./product-locale-clone";
import { productJsonPath } from "@/features/products/fs/product-fs-paths";
import { resolveProductJsonPath } from "@/features/products/fs/product-fs-scan";
import { normalizeProductPayload } from "./product-payload-normalize";
import { importItemWarnings } from "@/features/products/import/product-validator";
import { productExistsInOverlay } from "@/features/products/products-persistence";
import {
  saveProductToDb,
  productExistsLocalized,
} from "@/features/products/db/product-db-persistence";
import { upsertProductLocaleTranslations } from "@/features/products/db/product-translation";
import { useCatalogProductsDb } from "@/features/products/products-source";
import { productRepository } from "@/repositories/product.repository";

export type DuplicatePolicy = "overwrite" | "skip";

export type SlugConflictPolicy = "error" | "suffix" | "skip";

export type ImportItem = { sourceFile?: string; pairedCsv?: string; product: unknown };

export type ProductImportOptions = {
  dryRun: boolean;
  sourceLocale: string;
  /** Lowercase locale codes, or `"all"` for every configured locale. */
  targetLocales: string[] | "all";
  duplicatePolicy: DuplicatePolicy;
  localizedOverwrite: boolean;
  onlyMissingLocales: boolean;
  autoGenerateStubs: boolean;
  slugConflict: SlugConflictPolicy;
  skipCollectionSync: boolean;
};

export type ImportRowStatus = "ok" | "skipped" | "error";

export type ImportPipelineRowResult = {
  sourceFile?: string;
  slug: string;
  status: ImportRowStatus;
  errors: string[];
  warnings: string[];
  localesWritten?: string[];
  collectionSync?: {
    matchedCollections: { slug: string; name: string }[];
    isOrphan: boolean;
    warnings: { code: string; message: string; context?: Record<string, unknown> }[];
  } | null;
};

export type ImportPipelineResult = {
  summary: { total: number; ok: number; skipped: number; error: number };
  results: ImportPipelineRowResult[];
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function productLocaleExists(locale: string, slug: string): Promise<boolean> {
  if (useCatalogProductsDb()) {
    return productExistsLocalized(locale, slug);
  }
  if (await productExistsInOverlay(locale, slug)) return true;
  return fileExists(productJsonPath(locale, slug));
}

async function normalizeLocaleList(
  targetLocales: string[] | "all",
  sourceLocale: string,
): Promise<string[]> {
  const src = sourceLocale.toLowerCase();
  const all = (await getConfiguredLocaleCodes()).map((c) => c.toLowerCase());
  const list =
    targetLocales === "all"
      ? [...all]
      : targetLocales.map((c) => c.toLowerCase()).filter((c) => all.includes(c));
  const uniq = [...new Set(list)];
  if (!uniq.includes(src)) uniq.push(src);
  return uniq;
}

async function resolveSlugForImport(
  baseSlug: string,
  duplicatePolicy: DuplicatePolicy,
  slugConflict: SlugConflictPolicy,
  reservedInBatch: Set<string>,
): Promise<{ slug: string | null; decision: "write" | "skip" | "error"; message?: string }> {
  const taken = async (s: string) =>
    reservedInBatch.has(s) ||
    (useCatalogProductsDb()
      ? await productRepository.exists(s)
      : false);

  if (!(await taken(baseSlug))) {
    return { slug: baseSlug, decision: "write" };
  }

  if (slugConflict === "suffix") {
    let n = 1;
    let candidate = baseSlug;
    while (await taken(candidate)) {
      n += 1;
      candidate = `${baseSlug}-${n}`;
      if (n > 500) {
        return { slug: null, decision: "error", message: "Could not allocate a unique slug suffix" };
      }
    }
    return { slug: candidate, decision: "write" };
  }

  if (duplicatePolicy === "overwrite") {
    return { slug: baseSlug, decision: "write" };
  }

  if (slugConflict === "error") {
    return { slug: null, decision: "error", message: `Slug "${baseSlug}" already exists` };
  }

  return {
    slug: baseSlug,
    decision: "skip",
    message: `Skipped existing product "${baseSlug}"`,
  };
}

/**
 * Validates, optionally writes, and fans out locale stubs for one import batch.
 */
export async function runProductImportPipeline(
  items: ImportItem[],
  opts: ProductImportOptions,
): Promise<ImportPipelineResult> {
  if (!useCatalogProductsDb()) {
    throw new Error("Product import requires database catalog mode (Supabase PostgreSQL)");
  }

  const sourceLocale = opts.sourceLocale.toLowerCase();
  if (!(await isConfiguredLocaleCodeAsync(sourceLocale))) {
    return {
      summary: { total: items.length, ok: 0, skipped: 0, error: items.length },
      results: items.map((it, i) => ({
        sourceFile: it.sourceFile,
        slug: `item-${i}`,
        status: "error" as const,
        errors: [`Invalid source locale: ${opts.sourceLocale}`],
        warnings: [],
      })),
    };
  }

  const targetList = await normalizeLocaleList(opts.targetLocales, sourceLocale);
  const reservedSlugs = new Set<string>();
  const results: ImportPipelineRowResult[] = [];

  let ok = 0;
  let skipped = 0;
  let error = 0;

  for (const item of items) {
    const row: ImportPipelineRowResult = {
      sourceFile: item.sourceFile,
      slug: "",
      status: "error",
      errors: [],
      warnings: [],
      localesWritten: [],
    };

    if (!item.product || typeof item.product !== "object") {
      row.errors.push("Item is not a JSON object");
      row.slug = "(invalid)";
      results.push(row);
      error += 1;
      continue;
    }

    let raw: Product;
    raw = asProductWithNormalizedDetail(item.product as Product);

    const rec = item.product as Record<string, unknown>;
    const candidate = String(rec.slug ?? raw.id ?? raw.productTitle ?? raw.name ?? raw.title ?? "").trim();
    const baseSlug = slugify(candidate) || slugify(String(raw.id ?? "")) || null;
    if (!baseSlug) {
      row.errors.push("Missing valid slug (slug, id, or title)");
      row.slug = "(no-slug)";
      results.push(row);
      error += 1;
      continue;
    }

    const resolved = await resolveSlugForImport(
      baseSlug,
      opts.duplicatePolicy,
      opts.slugConflict,
      reservedSlugs,
    );

    if (resolved.decision === "error") {
      row.slug = baseSlug;
      row.errors.push(resolved.message ?? "Slug resolution failed");
      results.push(row);
      error += 1;
      continue;
    }

    if (resolved.decision === "skip") {
      row.slug = baseSlug;
      row.status = "skipped";
      row.warnings.push(resolved.message ?? "Skipped");
      results.push(row);
      skipped += 1;
      continue;
    }

    const canonicalSlug = resolved.slug!;
    reservedSlugs.add(canonicalSlug);

    let product = ensureProductIdentity(raw, canonicalSlug);
    product = normalizeProductPayload(product, canonicalSlug);

    const zod = collectProductCatalogZodIssues(product);
    if (!zod.ok) {
      row.slug = canonicalSlug;
      row.errors.push(zod.message);
      results.push(row);
      error += 1;
      reservedSlugs.delete(canonicalSlug);
      continue;
    }

    const itemWarnings = importItemWarnings(
      item.product as Record<string, unknown>,
      item.pairedCsv,
    );

    const localesWritten: string[] = [];

    const localesToWrite = new Set<string>();
    localesToWrite.add(sourceLocale);

    if (opts.autoGenerateStubs) {
      for (const loc of targetList) {
        if (loc === sourceLocale) continue;
        const exists = await productLocaleExists(loc, canonicalSlug);
        if (exists) {
          if (opts.onlyMissingLocales) continue;
          if (!opts.localizedOverwrite) continue;
        }
        localesToWrite.add(loc);
      }
    }

    if (opts.dryRun) {
      row.slug = canonicalSlug;
      row.status = "ok";
      row.localesWritten = [...localesToWrite];
      row.warnings.push(...itemWarnings, "Dry run — no files written");
      results.push(row);
      ok += 1;
      continue;
    }

    const sourceMarked = markSourceProductLocalization(product, canonicalSlug, sourceLocale);

    try {
      await saveProductToDb(canonicalSlug, sourceMarked, {
        sourceType: "json",
        sourceFile: item.sourceFile ?? null,
        localeCode: sourceLocale,
        localizedSlug: canonicalSlug,
      });

      const saved = await productRepository.findByCanonicalSlug(canonicalSlug);
      if (!saved) {
        throw new Error("Product row missing after save");
      }

      for (const loc of localesToWrite) {
        if (loc === sourceLocale) {
          localesWritten.push(loc);
          continue;
        }

        const stub = buildLocalizedProductStub(sourceMarked, {
          targetLocale: loc,
          sourceLocale,
          slug: canonicalSlug,
        });
        await upsertProductLocaleTranslations(saved.id, loc, stub, canonicalSlug);
        localesWritten.push(loc);
      }
    } catch (e) {
      row.slug = canonicalSlug;
      row.errors.push(e instanceof Error ? e.message : String(e));
      results.push(row);
      error += 1;
      reservedSlugs.delete(canonicalSlug);
      continue;
    }

    let collectionSync: ImportPipelineRowResult["collectionSync"] = null;
    if (!opts.skipCollectionSync) {
      try {
        const syncResult = await syncSingleProduct(canonicalSlug, sourceMarked);
        collectionSync = {
          matchedCollections: syncResult.matchedCollections,
          isOrphan: syncResult.isOrphan,
          warnings: syncResult.warnings,
        };
      } catch {
        collectionSync = null;
      }
    }

    row.slug = canonicalSlug;
    row.status = "ok";
    row.localesWritten = localesWritten;
    row.warnings.push(...itemWarnings);
    row.collectionSync = collectionSync;
    results.push(row);
    ok += 1;
  }

  return {
    summary: { total: items.length, ok, skipped, error },
    results,
  };
}

export async function finalizeProductImportSync(
  localesWritten: string[],
): Promise<void> {
  const unique = [...new Set(localesWritten.map((l) => l.trim()).filter(Boolean))];
  if (unique.length === 0) return;

  const { invalidateProductCatalogIndex } = await import(
    "@/features/products/fs/product-catalog-index"
  );
  invalidateProductCatalogIndex();

  const { invalidateProductIndexLoaderCache } = await import(
    "@/features/products/index/product-index-loader"
  );
  invalidateProductIndexLoaderCache();

  if (useCatalogProductsDb()) {
    const { catalogLocaleFromParam } = await import("@/features/products/fs/product-fs-scan");
    const { warmDbProductIndexCaches, canWriteProductIndexes } = await import(
      "@/features/products/index/product-index-builder"
    );
    const { frameworkSearchIndexer } = await import("@/features/search-framework");

    for (const localePrefix of unique) {
      const catalogLocale = await catalogLocaleFromParam(localePrefix);
      await warmDbProductIndexCaches(catalogLocale, localePrefix);
      if (await canWriteProductIndexes()) {
        const { catalogSyncOrchestrator } = await import(
          "@/features/catalog/sync/catalog-sync-orchestrator"
        );
        await catalogSyncOrchestrator.writeLocaleIndexesIfWritable(catalogLocale, localePrefix);
      }
    }

    try {
      await frameworkSearchIndexer.syncCatalogIndexes();
    } catch (e) {
      console.warn("[import] search sync after DB import failed", e);
    }
    return;
  }

  const { catalogSyncOrchestrator } = await import(
    "@/features/catalog/sync/catalog-sync-orchestrator"
  );
  await catalogSyncOrchestrator.onBulkImportComplete(unique);
}
