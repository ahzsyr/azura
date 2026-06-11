import { access, mkdir, rename, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { Product } from "@/features/products/types";
import { syncSingleProduct } from "@/features/collections/collection-sync.service";
import { collectProductCatalogZodIssues } from "./product-catalog-zod";
import { asProductWithNormalizedDetail, ensureProductIdentity } from "./product-detailed-description";
import { configuredLocaleCodes, isConfiguredLocaleCode } from "./i18n/config";
import { buildLocalizedProductStub, markSourceProductLocalization } from "./product-locale-clone";
import { legacyProductJsonPath, productJsonPath } from "@/features/products/fs/product-fs-paths";
import { resolveProductJsonPath } from "@/features/products/fs/product-fs-scan";
import { normalizeProductPayload } from "./product-payload-normalize";

export type DuplicatePolicy = "overwrite" | "skip";

export type SlugConflictPolicy = "error" | "suffix" | "skip";

export type ImportItem = { sourceFile?: string; product: unknown };

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

async function writeProductJsonAtomic(absPath: string, product: Product): Promise<void> {
  const dir = dirname(absPath);
  await mkdir(dir, { recursive: true });
  const tmp = `${absPath}.tmp.${process.pid}.${Math.random().toString(16).slice(2)}`;
  try {
    await writeFile(tmp, JSON.stringify(product, null, 2), "utf-8");
    await rename(tmp, absPath);
  } catch (e) {
    try {
      await unlink(tmp);
    } catch {
      /* ignore */
    }
    throw e;
  }
}

function normalizeLocaleList(
  targetLocales: string[] | "all",
  sourceLocale: string,
): string[] {
  const src = sourceLocale.toLowerCase();
  const all = configuredLocaleCodes.map((c) => c.toLowerCase());
  const list =
    targetLocales === "all"
      ? [...all]
      : targetLocales.map((c) => c.toLowerCase()).filter((c) => isConfiguredLocaleCode(c));
  const uniq = [...new Set(list)];
  if (!uniq.includes(src)) uniq.push(src);
  return uniq;
}

async function resolveSlugForImport(
  baseSlug: string,
  sourceLocale: string,
  duplicatePolicy: DuplicatePolicy,
  slugConflict: SlugConflictPolicy,
  reservedInBatch: Set<string>,
): Promise<{ slug: string | null; decision: "write" | "skip" | "error"; message?: string }> {
  const taken = async (s: string) =>
    reservedInBatch.has(s) ||
    (await resolveProductJsonPath(sourceLocale, s)) !== null;

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
  const sourceLocale = opts.sourceLocale.toLowerCase();
  if (!isConfiguredLocaleCode(sourceLocale)) {
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

  const targetList = normalizeLocaleList(opts.targetLocales, sourceLocale);
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
      sourceLocale,
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

    const slug = resolved.slug!;
    reservedSlugs.add(slug);

    let product = ensureProductIdentity(raw, slug);
    product = normalizeProductPayload(product, slug);

    const zod = collectProductCatalogZodIssues(product);
    if (!zod.ok) {
      row.slug = slug;
      row.errors.push(zod.message);
      results.push(row);
      error += 1;
      reservedSlugs.delete(slug);
      continue;
    }

    const localesWritten: string[] = [];

    const sourceMarked = markSourceProductLocalization(product, slug, sourceLocale);

    const localesToWrite = new Set<string>();
    localesToWrite.add(sourceLocale);

    if (opts.autoGenerateStubs) {
      for (const loc of targetList) {
        if (loc === sourceLocale) continue;
        const dest = productJsonPath(loc, slug);
        const exists = await fileExists(dest);
        if (exists) {
          if (opts.onlyMissingLocales) continue;
          if (!opts.localizedOverwrite) continue;
        }
        localesToWrite.add(loc);
      }
    }

    if (opts.dryRun) {
      row.slug = slug;
      row.status = "ok";
      row.localesWritten = [...localesToWrite];
      row.warnings.push("Dry run — no files written");
      results.push(row);
      ok += 1;
      continue;
    }

    try {
      for (const loc of localesToWrite) {
        const path = productJsonPath(loc, slug);
        if (loc === sourceLocale) {
          await writeProductJsonAtomic(path, sourceMarked);
        } else {
          const stub = buildLocalizedProductStub(sourceMarked, {
            targetLocale: loc,
            sourceLocale,
            slug,
          });
          await writeProductJsonAtomic(path, stub);
        }
        localesWritten.push(loc);
      }
    } catch (e) {
      row.slug = slug;
      row.errors.push(e instanceof Error ? e.message : String(e));
      results.push(row);
      error += 1;
      reservedSlugs.delete(slug);
      continue;
    }

    let collectionSync: ImportPipelineRowResult["collectionSync"] = null;
    if (!opts.skipCollectionSync) {
      try {
        const syncResult = await syncSingleProduct(slug, sourceMarked);
        collectionSync = {
          matchedCollections: syncResult.matchedCollections,
          isOrphan: syncResult.isOrphan,
          warnings: syncResult.warnings,
        };
      } catch {
        collectionSync = null;
      }
    }

    row.slug = slug;
    row.status = "ok";
    row.localesWritten = localesWritten;
    row.collectionSync = collectionSync;
    results.push(row);
    ok += 1;
  }

  return {
    summary: { total: items.length, ok, skipped, error },
    results,
  };
}
