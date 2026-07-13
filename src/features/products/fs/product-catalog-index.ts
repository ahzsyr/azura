import "server-only";

import { readFile } from "node:fs/promises";
import { join, sep } from "node:path";
import {
  normalizeCatalogLocaleCode,
  prefixToCatalogLocaleCode,
} from "@/features/catalog/locales";
import { catalogSeedRoot } from "@/lib/catalog-seed-paths";
import {
  legacyProductsDir,
  localeProductsDir,
  walkProductJsonFiles,
} from "./product-fs-scan";
import {
  hasProductListingIndex,
  invalidateProductIndexLoaderCache,
  loadListingRecords,
  loadSlugPathIndex,
} from "@/features/products/index/product-index-loader";
import { listingRecordToRuleMeta } from "@/features/products/listing/record-from-product";
import { listJsonStoreProducts } from "@/features/products/products-persistence";
import { productJsonPath } from "./product-fs-paths";
import { useCatalogProductsDb } from "@/features/products/products-source";
import { productRepository } from "@/repositories/product.repository";
import { fromDbRow } from "@/features/products/db/product-db-mapper";

/** Lightweight fields for collection rule matching without full product parse. */
export type ProductRuleMatchMeta = {
  slug: string;
  id: string;
  name: string;
  brand: string;
  category: string;
  categories: string[];
  tags: string[];
  status: string;
  stock: string;
};

export type ProductIndexEntry = {
  absPath: string;
  /** Canonical URL slug (from JSON `slug` when present). */
  slug: string;
  fileSlug: string;
  localeKey: string;
  catalogLocale: string | null;
  ruleMeta: ProductRuleMatchMeta;
};

export type ProductCatalogIndex = Map<string, ProductIndexEntry>;

async function localeCandidatesFromPrefix(urlPrefix: string): Promise<string[]> {
  const p = urlPrefix.trim().toLowerCase();
  const defaultCode = await normalizeCatalogLocaleCode("");
  if (!p) return [defaultCode];
  const code = await prefixToCatalogLocaleCode(p);
  const codes = new Set<string>([code.toLowerCase()]);
  codes.add(defaultCode);
  return [...codes];
}

function extractSlugFromJsonRaw(raw: string, fileSlug: string): string {
  try {
    const parsed = JSON.parse(raw) as { slug?: string };
    const fromJson = typeof parsed.slug === "string" ? parsed.slug.trim() : "";
    if (fromJson) return fromJson;
  } catch {
    /* fall through */
  }
  return fileSlug;
}

function normalizeStockLabel(stockStatus?: string, availability?: string): string {
  if (stockStatus === "out_of_stock" || availability === "OutOfStock") return "out-of-stock";
  if (stockStatus === "preorder" || availability === "PreOrder") return "low-stock";
  return "in-stock";
}

function buildRuleMeta(
  canonicalSlug: string,
  raw: Record<string, unknown>,
): ProductRuleMatchMeta {
  const name = String(
    raw.productTitle ?? raw.name ?? raw.title ?? canonicalSlug,
  ).trim();
  const category = raw.category != null ? String(raw.category).trim() : "";
  const catSet = new Set<string>();
  if (category) catSet.add(category);
  for (const c of (raw.categories as string[] | undefined) ?? []) {
    const s = typeof c === "string" ? c.trim() : "";
    if (s) catSet.add(s);
  }
  const categories = [...catSet];
  const tagSet = new Set<string>(categories);
  for (const t of (raw.tags as string[] | undefined) ?? []) {
    const s = typeof t === "string" ? t.trim() : "";
    if (s) tagSet.add(s);
  }

  return {
    slug: canonicalSlug,
    id: String(raw.id ?? canonicalSlug).trim() || canonicalSlug,
    name,
    brand: String(raw.brand ?? "").trim(),
    category,
    categories,
    tags: [...tagSet],
    status: String(raw.availability ?? "").trim(),
    stock: normalizeStockLabel(
      raw.stock_status as string | undefined,
      raw.availability as string | undefined,
    ),
  };
}

type CacheRow = {
  index: ProductCatalogIndex;
  uniqueEntries: ProductIndexEntry[];
  signature: string;
};

const indexCache = new Map<string, CacheRow>();

async function dirSignature(paths: string[]): Promise<string> {
  const { stat } = await import("node:fs/promises");
  const parts: string[] = [];
  for (const dir of paths) {
    try {
      const s = await stat(dir);
      parts.push(`${dir}:${s.mtimeMs}`);
    } catch {
      parts.push(`${dir}:missing`);
    }
  }
  return parts.join("|");
}

function registerAlias(
  index: ProductCatalogIndex,
  key: string,
  entry: ProductIndexEntry,
): void {
  const k = key.trim().toLowerCase();
  if (!k || index.has(k)) return;
  index.set(k, entry);
}

async function buildIndexFromListingFiles(
  urlPrefix: string,
  catalogLocale: string,
): Promise<{ index: ProductCatalogIndex; uniqueEntries: ProductIndexEntry[]; signature: string }> {
  const records = await loadListingRecords(urlPrefix);
  const pathIndex = await loadSlugPathIndex(urlPrefix);
  const dataRoot = catalogSeedRoot();

  const index: ProductCatalogIndex = new Map();
  const uniqueEntries: ProductIndexEntry[] = [];

  for (const record of records) {
    const relPath =
      pathIndex?.paths[record.slug] ?? `${catalogLocale}/products/${record.slug}.json`;
    const absPath = join(dataRoot, relPath.replace(/\//g, sep));
    const entry: ProductIndexEntry = {
      absPath,
      slug: record.slug,
      fileSlug: record.slug,
      localeKey: catalogLocale,
      catalogLocale,
      ruleMeta: listingRecordToRuleMeta(record),
    };
    uniqueEntries.push(entry);
    registerAlias(index, record.slug, entry);
  }

  uniqueEntries.sort((a, b) =>
    a.slug.localeCompare(b.slug, undefined, { sensitivity: "base" }),
  );

  const signature = pathIndex
    ? `index:${pathIndex.version}:${records.length}`
    : `listing:${records.length}`;

  return { index, uniqueEntries, signature };
}

async function mergeJsonStoreIntoCatalogIndex(
  urlPrefix: string,
  catalogLocale: string,
  index: ProductCatalogIndex,
  uniqueEntries: ProductIndexEntry[],
): Promise<{ index: ProductCatalogIndex; uniqueEntries: ProductIndexEntry[] }> {
  const overlays = await listJsonStoreProducts(catalogLocale);
  if (overlays.length === 0) {
    return { index, uniqueEntries };
  }

  const mergedIndex = new Map(index);
  const mergedEntries = [...uniqueEntries];
  const seen = new Set(uniqueEntries.map((e) => e.slug.toLowerCase()));

  for (const { locale, slug, product } of overlays) {
    const canonKey = slug.toLowerCase();
    if (seen.has(canonKey)) continue;
    seen.add(canonKey);

    const absPath = productJsonPath(locale, slug);
    const entry: ProductIndexEntry = {
      absPath,
      slug,
      fileSlug: slug,
      localeKey: locale,
      catalogLocale,
      ruleMeta: buildRuleMeta(slug, product as unknown as Record<string, unknown>),
    };
    mergedEntries.push(entry);
    registerAlias(mergedIndex, slug, entry);
  }

  mergedEntries.sort((a, b) =>
    a.slug.localeCompare(b.slug, undefined, { sensitivity: "base" }),
  );

  return { index: mergedIndex, uniqueEntries: mergedEntries };
}

async function buildProductCatalogIndexLegacy(urlPrefix: string): Promise<{
  index: ProductCatalogIndex;
  uniqueEntries: ProductIndexEntry[];
  signature: string;
}> {
  const catalogLocale = await prefixToCatalogLocaleCode(urlPrefix);
  const localeDirs = (await localeCandidatesFromPrefix(urlPrefix)).map((lc) =>
    join(catalogSeedRoot(), lc, "products"),
  );
  const legacyDir = legacyProductsDir();
  const signature = await dirSignature([...localeDirs, legacyDir]);

  const index: ProductCatalogIndex = new Map();
  const uniqueByPath = new Map<string, ProductIndexEntry>();
  const seenCanonical = new Set<string>();

  const addFile = async (
    absPath: string,
    fileSlug: string,
    localeKey: string,
    entryCatalogLocale: string | null,
  ) => {
    let rawText = "";
    let parsed: Record<string, unknown> = {};
    try {
      rawText = await readFile(absPath, "utf-8");
      parsed = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      return;
    }

    const canonicalSlug = extractSlugFromJsonRaw(rawText, fileSlug);
    const canonKey = canonicalSlug.toLowerCase();
    if (seenCanonical.has(canonKey)) return;
    seenCanonical.add(canonKey);

    const entry: ProductIndexEntry = {
      absPath,
      slug: canonicalSlug,
      fileSlug,
      localeKey,
      catalogLocale: entryCatalogLocale,
      ruleMeta: buildRuleMeta(canonicalSlug, parsed),
    };

    uniqueByPath.set(absPath, entry);
    registerAlias(index, canonicalSlug, entry);
    if (fileSlug.toLowerCase() !== canonKey) {
      registerAlias(index, fileSlug, entry);
    }
  };

  const addFromDir = async (
    productsRoot: string,
    localeKey: string,
    entryCatalogLocale: string | null,
  ) => {
    for await (const { absPath, slug: fileSlug } of walkProductJsonFiles(productsRoot)) {
      await addFile(absPath, fileSlug, localeKey, entryCatalogLocale);
    }
  };

  for (const lc of await localeCandidatesFromPrefix(urlPrefix)) {
    await addFromDir(
      localeProductsDir(lc),
      lc,
      lc,
    );
  }

  await addFromDir(legacyDir, "default", null);

  const uniqueEntries = [...uniqueByPath.values()].sort((a, b) =>
    a.slug.localeCompare(b.slug, undefined, { sensitivity: "base" }),
  );

  return { index, uniqueEntries, signature };
}

async function buildIndexFromDb(
  urlPrefix: string,
  catalogLocale: string,
): Promise<{ index: ProductCatalogIndex; uniqueEntries: ProductIndexEntry[]; signature: string }> {
  const rows = await productRepository.findAll();
  const index: ProductCatalogIndex = new Map();
  const uniqueEntries: ProductIndexEntry[] = [];

  for (const row of rows) {
    const product = fromDbRow(row);
    const absPath = productJsonPath(catalogLocale, row.canonicalSlug);
    const entry: ProductIndexEntry = {
      absPath,
      slug: row.canonicalSlug,
      fileSlug: row.canonicalSlug,
      localeKey: catalogLocale,
      catalogLocale,
      ruleMeta: buildRuleMeta(row.canonicalSlug, product as unknown as Record<string, unknown>),
    };
    uniqueEntries.push(entry);
    registerAlias(index, row.canonicalSlug, entry);
  }

  uniqueEntries.sort((a, b) =>
    a.slug.localeCompare(b.slug, undefined, { sensitivity: "base" }),
  );

  return {
    index,
    uniqueEntries,
    signature: `db:${catalogLocale}:${rows.length}`,
  };
}

async function buildProductCatalogIndex(urlPrefix: string): Promise<{
  index: ProductCatalogIndex;
  uniqueEntries: ProductIndexEntry[];
}> {
  const catalogLocale = await prefixToCatalogLocaleCode(urlPrefix);
  const cacheKey = `${urlPrefix}:${catalogLocale}`;

  if (useCatalogProductsDb()) {
    const cached = indexCache.get(cacheKey);
    const built = await buildIndexFromDb(urlPrefix, catalogLocale);
    if (cached && cached.signature === built.signature) {
      return { index: cached.index, uniqueEntries: cached.uniqueEntries };
    }
    indexCache.set(cacheKey, {
      index: built.index,
      uniqueEntries: built.uniqueEntries,
      signature: built.signature,
    });
    return { index: built.index, uniqueEntries: built.uniqueEntries };
  }

  let built: {
    index: ProductCatalogIndex;
    uniqueEntries: ProductIndexEntry[];
    signature?: string;
  };

  if (await hasProductListingIndex(urlPrefix)) {
    const cached = indexCache.get(cacheKey);
    built = await buildIndexFromListingFiles(urlPrefix, catalogLocale);
    if (built.uniqueEntries.length === 0) {
      const legacy = await buildProductCatalogIndexLegacy(urlPrefix);
      if (legacy.uniqueEntries.length > 0) {
        built = legacy;
      }
    }
    if (cached && cached.signature === built.signature) {
      const merged = await mergeJsonStoreIntoCatalogIndex(
        urlPrefix,
        catalogLocale,
        cached.index,
        cached.uniqueEntries,
      );
      return merged;
    }
  } else {
    built = await buildProductCatalogIndexLegacy(urlPrefix);
    const cached = indexCache.get(cacheKey);
    if (cached && cached.signature === built.signature) {
      const merged = await mergeJsonStoreIntoCatalogIndex(
        urlPrefix,
        catalogLocale,
        cached.index,
        cached.uniqueEntries,
      );
      return merged;
    }
  }

  const merged = await mergeJsonStoreIntoCatalogIndex(
    urlPrefix,
    catalogLocale,
    built.index,
    built.uniqueEntries,
  );
  indexCache.set(cacheKey, {
    index: merged.index,
    uniqueEntries: merged.uniqueEntries,
    signature: built.signature ?? `merged:${merged.uniqueEntries.length}`,
  });
  return merged;
}

export async function getProductCatalogIndex(urlPrefix: string): Promise<ProductCatalogIndex> {
  const { index } = await buildProductCatalogIndex(urlPrefix);
  return index;
}

export async function getUniqueProductIndexEntries(
  urlPrefix: string,
): Promise<ProductIndexEntry[]> {
  const { uniqueEntries } = await buildProductCatalogIndex(urlPrefix);
  return uniqueEntries;
}

export function resolveIndexEntry(
  index: ProductCatalogIndex,
  slug: string,
): ProductIndexEntry | null {
  const key = slug.trim().toLowerCase();
  if (!key) return null;
  return index.get(key) ?? null;
}

export async function resolveIndexEntryForLocale(
  urlPrefix: string,
  slug: string,
): Promise<ProductIndexEntry | null> {
  const index = await getProductCatalogIndex(urlPrefix);
  return resolveIndexEntry(index, slug);
}

export async function listIndexSlugs(urlPrefix: string): Promise<string[]> {
  const entries = await getUniqueProductIndexEntries(urlPrefix);
  return entries.map((e) => e.slug);
}

export function invalidateProductCatalogIndex(): void {
  indexCache.clear();
  invalidateProductIndexLoaderCache();
}
