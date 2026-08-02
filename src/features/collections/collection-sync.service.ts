import "server-only";

/**
 * AZURA Collection Sync Engine — ported from Astro sample.
 */

import { readFile, writeFile, access } from "node:fs/promises";
import { resolve, join } from "node:path";
import type { Collection, CollectionRule } from "./types";
import {
  isCatalogFsWriteError,
  preferCatalogJsonStore,
  safeMkdirCatalogDir,
} from "./collections-persistence";
import { catalogProductToCollectionProduct, type CollectionEngineProduct } from "./engine";
import {
  getCollectionsMatchingProduct,
  detectOrphanProducts,
  detectAmbiguousMatches,
  buildCollectionProductCounts,
  localizedToEngineCollection,
} from "@/features/products/product-collections";
import { collectionMapFromList } from "./collection-navigation";
import { collectionDepth } from "./collection-hierarchy";
import {
  normalizeSlug,
  uniqueSlug,
  similarityRatio,
  fuzzyMatch,
  normalizeForMatch,
} from "./normalization";
import type { Product as CatalogProduct } from "@/features/products/types";
import type { Prisma } from "@prisma/client";
import {
  getCatalogLocaleCodes,
  normalizeCatalogLocaleCode,
} from "@/features/catalog/locales";
import { useCatalogProductsDb } from "@/features/products/products-source";
import { fromDbRow } from "@/features/products/db/product-db-mapper";

type EngineProduct = CollectionEngineProduct;
type LocalizedCollection = Collection;

// ── Constants ─────────────────────────────────────────────────────────────────

import { catalogSeedRoot } from "@/lib/catalog-seed-paths";

const DATA_DIR = catalogSeedRoot();
const COLLECTIONS_JSON = resolve(DATA_DIR, "collections.json");

// ── IO helpers ────────────────────────────────────────────────────────────────

async function fileExists(path: string): Promise<boolean> {
  try { await access(path); return true; } catch { return false; }
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf-8")) as T;
}

async function writeJson(path: string, data: unknown): Promise<void> {
  if (preferCatalogJsonStore()) return;
  const dir = resolve(path, "..");
  const ready = await safeMkdirCatalogDir(dir);
  if (!ready) return;
  try {
    await writeFile(path, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    if (isCatalogFsWriteError(error)) return;
    throw error;
  }
}

// ── Collection loader ─────────────────────────────────────────────────────────

export async function loadCollectionsFromDisk(): Promise<Collection[]> {
  const { loadCollections } = await import("./collections-persistence");
  return loadCollections();
}

export async function saveCollectionsToDisk(collections: Collection[]): Promise<void> {
  const { saveCollections } = await import("./collections-persistence");
  await saveCollections(collections);
}

function collectionToLocalized(c: Collection): LocalizedCollection {
  const parent = typeof c.parentSlug === "string" && c.parentSlug.trim() ? c.parentSlug.trim() : undefined;
  return {
    id: String(c.id ?? c.slug),
    slug: c.slug,
    name: c.name,
    description: c.description ?? "",
    badge: c.badge,
    coverImage: typeof c.coverImage === "string" && c.coverImage.trim() ? c.coverImage.trim() : undefined,
    iconImage: typeof c.iconImage === "string" && c.iconImage.trim() ? c.iconImage.trim() : undefined,
    parentSlug: parent,
    seo: c.seo,
    conditions: c.conditions,
    cardTemplate: c.cardTemplate,
    sortBy: c.sortBy,
    visible: c.visible !== false,
    showInNav: c.showInNav,
    featured: c.featured,
    tags: c.tags,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

// ── Product loader ────────────────────────────────────────────────────────────

export async function loadAllProductsFromDisk(locale: string): Promise<Array<{ slug: string; product: CatalogProduct }>> {
  if (useCatalogProductsDb()) {
    return loadAllProductsFromDb(locale);
  }

  const { walkProductJsonFiles } = await import("@/features/products/fs/product-fs-scan");
  const results: Array<{ slug: string; product: CatalogProduct }> = [];

  const dirs = [
    resolve(DATA_DIR, locale, "products"),
    resolve(DATA_DIR, "products"),
  ];

  const seenSlugs = new Set<string>();

  for (const dir of dirs) {
    for await (const { absPath, slug } of walkProductJsonFiles(dir)) {
      if (seenSlugs.has(slug)) continue;
      seenSlugs.add(slug);
      try {
        const product = await readJson<CatalogProduct>(absPath);
        results.push({ slug, product });
      } catch {
        // skip invalid JSON files
      }
    }
  }

  return results;
}

/** Load all products from the Product table (Supabase / DB-only mode). */
export async function loadAllProductsFromDb(
  _locale: string,
): Promise<Array<{ slug: string; product: CatalogProduct }>> {
  const { productRepository } = await import("@/repositories/product.repository");
  const rows = await productRepository.findAll();
  return rows.map((row) => ({
    slug: row.canonicalSlug,
    product: fromDbRow(row),
  }));
}

/** Locale-aware product loader — DB or filesystem. */
export async function loadAllProducts(
  locale: string,
): Promise<Array<{ slug: string; product: CatalogProduct }>> {
  return loadAllProductsFromDisk(locale);
}

// ── Result types ──────────────────────────────────────────────────────────────

export interface ValidationWarning {
  code:
    | "ORPHAN_PRODUCT"
    | "AMBIGUOUS_MATCH"
    | "FUZZY_SLUG_COLLISION"
    | "INVALID_RULE"
    | "CIRCULAR_HIERARCHY"
    | "EMPTY_COLLECTION"
    | "DUPLICATE_COLLECTION_SLUG";
  message: string;
  context?: Record<string, unknown>;
}

export interface ProductSyncStatus {
  slug: string;
  name: string;
  brand?: string;
  category?: string;
  categories: string[];
  matchedCollections: Array<{ slug: string; name: string; depth: number }>;
  isOrphan: boolean;
  hasAmbiguity: boolean;
}

export interface SyncReport {
  generatedAt: string;
  locale: string;
  totalProducts: number;
  totalCollections: number;
  orphanProducts: number;
  ambiguousMatches: number;
  newCollectionsCreated: number;
  warnings: ValidationWarning[];
  productStatuses: ProductSyncStatus[];
  collectionCounts: Record<string, number>;
  indexesRebuilt?: boolean;
  indexRebuildCounts?: Record<string, number>;
}

/** Trimmed report persisted for admin product counts after page refresh. */
export type PersistedSyncReport = Omit<SyncReport, "productStatuses"> & {
  productStatuses?: never;
};

export const SYNC_REPORT_NAMESPACE = "catalog-collections-sync-report";
export const SYNC_REPORT_KEY = "latest";

// ── Cycle detection for hierarchy ─────────────────────────────────────────────

function detectCircularHierarchy(collections: Collection[]): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const bySlug = new Map(collections.map((c) => [c.slug, c]));

  for (const col of collections) {
    const seen = new Set<string>();
    let cur = col.parentSlug?.trim();
    while (cur) {
      if (seen.has(cur)) {
        warnings.push({
          code: "CIRCULAR_HIERARCHY",
          message: `Circular hierarchy detected for collection "${col.slug}" via parent "${cur}"`,
          context: { collectionSlug: col.slug, cycleAt: cur },
        });
        break;
      }
      if (cur === col.slug) {
        warnings.push({
          code: "CIRCULAR_HIERARCHY",
          message: `Collection "${col.slug}" is its own ancestor`,
          context: { collectionSlug: col.slug },
        });
        break;
      }
      seen.add(cur);
      cur = bySlug.get(cur)?.parentSlug?.trim();
    }
  }
  return warnings;
}

// ── Fuzzy slug collision detection ────────────────────────────────────────────

function detectFuzzySlugCollisions(collections: Collection[]): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const slugs = collections.map((c) => c.slug);

  for (let i = 0; i < slugs.length; i++) {
    for (let j = i + 1; j < slugs.length; j++) {
      const ratio = similarityRatio(slugs[i], slugs[j]);
      if (ratio >= 0.85 && slugs[i] !== slugs[j]) {
        warnings.push({
          code: "FUZZY_SLUG_COLLISION",
          message: `Collections "${slugs[i]}" and "${slugs[j]}" have very similar slugs (similarity: ${(ratio * 100).toFixed(0)}%)`,
          context: { slugA: slugs[i], slugB: slugs[j], similarity: ratio },
        });
      }
    }
  }
  return warnings;
}

// ── Rule validation ───────────────────────────────────────────────────────────

function validateCollectionRules(collections: Collection[]): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const validFields = ["category", "categories", "tags", "brand", "title", "badge", "status", "stock"];
  const validOps = ["equals", "contains", "starts_with", "not_equals"];

  for (const col of collections) {
    const rules = col.conditions?.rules ?? [];
    if (rules.length === 0) {
      warnings.push({
        code: "INVALID_RULE",
        message: `Collection "${col.slug}" has no matching rules — it will never match any product`,
        context: { collectionSlug: col.slug },
      });
    }
    for (const rule of rules) {
      if (!validFields.includes(rule.field)) {
        warnings.push({
          code: "INVALID_RULE",
          message: `Collection "${col.slug}" has rule with unknown field "${rule.field}"`,
          context: { collectionSlug: col.slug, rule },
        });
      }
      if (!validOps.includes(rule.operator)) {
        warnings.push({
          code: "INVALID_RULE",
          message: `Collection "${col.slug}" has rule with unknown operator "${rule.operator}"`,
          context: { collectionSlug: col.slug, rule },
        });
      }
      if (!rule.value?.trim()) {
        warnings.push({
          code: "INVALID_RULE",
          message: `Collection "${col.slug}" has a rule with empty value`,
          context: { collectionSlug: col.slug, rule },
        });
      }
    }
  }
  return warnings;
}

// ── Dynamic collection creation ───────────────────────────────────────────────

interface NewCollectionSpec {
  slug: string;
  name: string;
  description: string;
  parentSlug?: string;
  rules: CollectionRule[];
}

function buildCollectionForBrand(brand: string, existingSlugs: Set<string>): NewCollectionSpec {
  const slug = uniqueSlug(normalizeSlug(brand), existingSlugs);
  return {
    slug,
    name: brand,
    description: `Products by ${brand}`,
    rules: [
      { field: "brand", operator: "contains", value: brand },
      { field: "title", operator: "contains", value: brand },
    ],
  };
}

function buildCollectionForCategory(
  category: string,
  parentSlug: string | undefined,
  existingSlugs: Set<string>,
): NewCollectionSpec {
  const slug = uniqueSlug(normalizeSlug(category), existingSlugs);
  return {
    slug,
    name: category,
    description: `${category} products`,
    parentSlug,
    rules: [
      { field: "category", operator: "contains", value: category },
      { field: "categories", operator: "contains", value: category },
    ],
  };
}

function specToCollection(spec: NewCollectionSpec): Collection {
  const now = new Date().toISOString();
  return {
    id: spec.slug,
    slug: spec.slug,
    name: spec.name,
    description: spec.description,
    badge: "",
    coverImage: "",
    parentSlug: spec.parentSlug,
    seo: {},
    conditions: {
      match: "any",
      rules: spec.rules,
    },
    cardTemplate: "default",
    sortBy: "name-asc",
    visible: true,
    showInNav: false,
    createdAt: now,
    updatedAt: now,
  };
}

// ── Auto-collection creation for unmatched products ───────────────────────────

export interface AutoCreateResult {
  created: Collection[];
  warnings: ValidationWarning[];
}

/**
 * For each orphan product, generate minimal collections based on brand/category
 * if no existing collection could match.
 */
export async function autoCreateMissingCollections(
  orphanProducts: EngineProduct[],
  existingCollections: Collection[],
): Promise<AutoCreateResult> {
  const created: Collection[] = [];
  const warnings: ValidationWarning[] = [];
  const existingSlugs = new Set(existingCollections.map((c) => c.slug));
  const allCollections = [...existingCollections];
  const localized = allCollections.map(collectionToLocalized);
  const bySlug = collectionMapFromList(localized);

  for (const product of orphanProducts) {
    // Try brand first
    if (product.brand) {
      const brandNorm = normalizeForMatch(product.brand);

      // Check if an existing collection already covers this brand via fuzzy match
      const brandCovered = allCollections.some(
        (c) => fuzzyMatch(c.name, product.brand!, 0.85) || normalizeForMatch(c.slug) === normalizeSlug(product.brand!),
      );

      if (!brandCovered) {
        const spec = buildCollectionForBrand(product.brand, existingSlugs);
        const col = specToCollection(spec);
        existingSlugs.add(col.slug);
        allCollections.push(col);
        created.push(col);
      }

      // Now try each category under the brand collection
      const brandCollection = allCollections.find(
        (c) => fuzzyMatch(c.name, product.brand!, 0.85) || normalizeForMatch(c.slug) === normalizeSlug(product.brand!),
      );

      for (const category of product.categories) {
        if (!category) continue;
        const catCovered = allCollections.some(
          (c) => fuzzyMatch(c.name, category, 0.85) || normalizeForMatch(c.slug) === normalizeSlug(category),
        );
        if (!catCovered) {
          const spec = buildCollectionForCategory(category, brandCollection?.slug, existingSlugs);
          const col = specToCollection(spec);
          existingSlugs.add(col.slug);
          allCollections.push(col);
          created.push(col);
        }
      }
    } else {
      // No brand — create from primary category
      const primaryCategory = product.category || product.categories[0];
      if (primaryCategory) {
        const catCovered = allCollections.some(
          (c) => fuzzyMatch(c.name, primaryCategory, 0.85) || normalizeForMatch(c.slug) === normalizeSlug(primaryCategory),
        );
        if (!catCovered) {
          const spec = buildCollectionForCategory(primaryCategory, undefined, existingSlugs);
          const col = specToCollection(spec);
          existingSlugs.add(col.slug);
          allCollections.push(col);
          created.push(col);
        }
      }
    }
  }

  return { created, warnings };
}

// ── Locale-aware collection file sync ─────────────────────────────────────────

/**
 * Writes new collections to locale-specific collection folder files.
 * These files mirror the global collections.json but are locale-scoped.
 */
export async function writeLocaleCollectionFiles(
  collections: Collection[],
  locale: string,
): Promise<void> {
  if (preferCatalogJsonStore()) return;

  const dir = resolve(DATA_DIR, locale, "collections");
  try {
    const ready = await safeMkdirCatalogDir(dir);
    if (!ready) return;

    for (const col of collections) {
      const filePath = join(dir, `${col.slug}.json`);
      if (await fileExists(filePath)) continue;
      const localeData = {
        ...col,
        _locale: locale,
        seo: {
          metaTitle: col.name,
          metaDescription: col.description?.slice(0, 160) || "",
          canonicalPath: `/collections/${col.slug}`,
        },
      };
      await writeJson(filePath, localeData);
    }
  } catch (error) {
    if (isCatalogFsWriteError(error)) return;
    throw error;
  }
}

/** Writes locale collection files for every catalog locale (used on import). */
export async function writeLocaleCollectionFilesForImport(collections: Collection[]): Promise<void> {
  if (preferCatalogJsonStore()) return;

  for (const locale of await getCatalogLocaleCodes()) {
    const dir = resolve(DATA_DIR, locale, "collections");
    try {
      const ready = await safeMkdirCatalogDir(dir);
      if (!ready) return;

      for (const col of collections) {
        const localeData = {
          ...col,
          _locale: locale,
          seo: {
            metaTitle: col.name,
            metaDescription: col.description?.slice(0, 160) || "",
            canonicalPath: `/collections/${col.slug}`,
          },
        };
        try {
          await writeJson(join(dir, `${col.slug}.json`), localeData);
        } catch (error) {
          if (isCatalogFsWriteError(error)) return;
          throw error;
        }
      }
    } catch (error) {
      if (isCatalogFsWriteError(error)) return;
      throw error;
    }
  }
}

// ── Main sync function ────────────────────────────────────────────────────────

export interface SyncOptions {
  locale?: string;
  autoCreate?: boolean;
  dryRun?: boolean;
}

/**
 * Full product-to-collection synchronization.
 * 1. Loads all products and collections from disk.
 * 2. Evaluates collection rule matches for every product.
 * 3. Detects orphan products and ambiguous matches.
 * 4. Optionally auto-creates missing collections.
 * 5. Returns a full SyncReport with warnings and product statuses.
 */
export async function syncCollections(options: SyncOptions = {}): Promise<SyncReport> {
  const locale = await normalizeCatalogLocaleCode(options.locale ?? "");
  const autoCreate = options.autoCreate ?? false;
  const dryRun = options.dryRun ?? false;

  const rawCollections = await loadCollectionsFromDisk();
  const rawProducts = await loadAllProductsFromDisk(locale);

  const engineProducts: EngineProduct[] = rawProducts.map(({ slug, product }) =>
    catalogProductToCollectionProduct(slug, product),
  );

  const localizedCollections = rawCollections.map(collectionToLocalized);
  const bySlug = collectionMapFromList(localizedCollections);

  // Validation warnings
  const warnings: ValidationWarning[] = [
    ...validateCollectionRules(rawCollections),
    ...detectCircularHierarchy(rawCollections),
    ...detectFuzzySlugCollisions(rawCollections),
  ];

  // Orphan and ambiguity detection
  const orphanInfos = detectOrphanProducts(engineProducts, localizedCollections);
  const ambiguousInfos = detectAmbiguousMatches(engineProducts, localizedCollections);
  const ambiguousSlugs = new Set(ambiguousInfos.map((a) => a.productSlug));

  for (const orphan of orphanInfos) {
    warnings.push({
      code: "ORPHAN_PRODUCT",
      message: `Product "${orphan.slug}" does not match any collection`,
      context: { slug: orphan.slug, brand: orphan.brand, category: orphan.category, categories: orphan.categories },
    });
  }

  for (const ambig of ambiguousInfos) {
    warnings.push({
      code: "AMBIGUOUS_MATCH",
      message: ambig.reason,
      context: {
        productSlug: ambig.productSlug,
        candidates: ambig.candidateCollections.map((c) => c.slug),
      },
    });
  }

  // Auto-create missing collections if requested
  let newlyCreated: Collection[] = [];
  if (autoCreate && orphanInfos.length > 0 && !dryRun) {
    const orphanEngines = engineProducts.filter((p) =>
      orphanInfos.some((o) => o.slug === p.slug),
    );
    const { created } = await autoCreateMissingCollections(orphanEngines, rawCollections);
    newlyCreated = created;

    if (created.length > 0) {
      const merged = [...rawCollections, ...created];
      await saveCollectionsToDisk(merged);
      for (const loc of await getCatalogLocaleCodes()) {
        await writeLocaleCollectionFiles(created, loc);
      }
    }
  }

  // Build product statuses
  const countsMap = buildCollectionProductCounts(engineProducts, localizedCollections);

  const productStatuses: ProductSyncStatus[] = engineProducts.map((p) => {
    const matches = getCollectionsMatchingProduct(p, localizedCollections);
    return {
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      category: p.category,
      categories: p.categories ?? [],
      matchedCollections: matches.map((m) => ({
        slug: m.slug,
        name: m.name,
        depth: collectionDepth(m, bySlug),
      })),
      isOrphan: matches.length === 0,
      hasAmbiguity: ambiguousSlugs.has(p.slug),
    };
  });

  const collectionCounts: Record<string, number> = {};
  for (const [slug, count] of countsMap.entries()) {
    collectionCounts[slug] = count;
  }

  // Detect empty collections
  for (const col of localizedCollections) {
    if ((collectionCounts[col.slug] ?? 0) === 0) {
      warnings.push({
        code: "EMPTY_COLLECTION",
        message: `Collection "${col.slug}" (${col.name}) has no matching products`,
        context: { collectionSlug: col.slug, collectionName: col.name },
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    locale,
    totalProducts: engineProducts.length,
    totalCollections: rawCollections.length,
    orphanProducts: orphanInfos.length,
    ambiguousMatches: ambiguousInfos.length,
    newCollectionsCreated: newlyCreated.length,
    warnings,
    productStatuses,
    collectionCounts,
  };
}

// ── Per-product sync (called after product save) ──────────────────────────────

export interface ProductSyncResult {
  productSlug: string;
  matchedCollections: Array<{ slug: string; name: string }>;
  isOrphan: boolean;
  warnings: ValidationWarning[];
}

/**
 * Lightweight sync for a single product after it is saved.
 * Returns which collections it matched so the caller can report back.
 */
export async function syncSingleProduct(
  slug: string,
  product: CatalogProduct,
): Promise<ProductSyncResult> {
  const collections = await loadCollectionsFromDisk();
  const localizedCollections = collections.map(collectionToLocalized);
  const engineProduct = catalogProductToCollectionProduct(slug, product);
  const matches = getCollectionsMatchingProduct(engineProduct, localizedCollections);
  const warnings: ValidationWarning[] = [];

  if (matches.length === 0) {
    warnings.push({
      code: "ORPHAN_PRODUCT",
      message: `Product "${slug}" does not match any collection`,
      context: { slug, brand: product.brand, category: product.category, categories: product.categories },
    });
  }

  return {
    productSlug: slug,
    matchedCollections: matches.map((m) => ({ slug: m.slug, name: m.name })),
    isOrphan: matches.length === 0,
    warnings,
  };
}

// ── Rebuild validation report ─────────────────────────────────────────────────

/**
 * Validates the entire collection + product graph without writing any data.
 * Used for the "Validate" button in admin UI.
 */
export async function validateSync(locale?: string): Promise<SyncReport> {
  const loc = await normalizeCatalogLocaleCode(locale ?? "");
  return syncCollections({ locale: loc, autoCreate: false, dryRun: true });
}

// ── Persisted sync report (admin product counts) ─────────────────────────────

export function trimSyncReportForPersistence(report: SyncReport): PersistedSyncReport {
  const { productStatuses: _omit, ...trimmed } = report;
  void _omit;
  return trimmed;
}

export async function savePersistedSyncReport(report: SyncReport): Promise<void> {
  const payload = trimSyncReportForPersistence(report);
  const { jsonStoreService } = await import("@/features/storage/json-store.service");
  await jsonStoreService.set(SYNC_REPORT_NAMESPACE,
    SYNC_REPORT_KEY,
    payload as unknown as Prisma.InputJsonValue, { revalidate: true });
}

export async function loadPersistedSyncReport(): Promise<PersistedSyncReport | null> {
  try {
    const { jsonStoreService } = await import("@/features/storage/json-store.service");
    const stored = await jsonStoreService.get<PersistedSyncReport>(
      SYNC_REPORT_NAMESPACE,
      SYNC_REPORT_KEY,
    );
    if (!stored || typeof stored !== "object" || !stored.generatedAt) return null;
    return stored;
  } catch {
    return null;
  }
}

export function persistedReportToSyncReport(report: PersistedSyncReport): SyncReport {
  return { ...report, productStatuses: [] };
}
