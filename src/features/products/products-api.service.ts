import "server-only";

import type { Product } from "@/features/products/types";
import { catalogLocaleFromParam } from "@/features/products/fs/product-fs-scan";
import { productJsonPath } from "@/features/products/fs/product-fs-paths";
import { normalizeProductPayload } from "@/features/products/lib/product-payload-normalize";
import { adminLocale } from "@/features/catalog/admin/catalog-admin-config";
import { productsDataService } from "@/features/products/products-data.service";
import { verifyProductEntityParity } from "@/features/entities/pilot/product-entity-parity";
import { localeService } from "@/features/i18n/locale.service";
import {
  patchProductIndexesAfterDelete,
  patchProductIndexesAfterPatch,
  patchProductIndexesAfterSave,
  type CatalogSyncResult,
} from "@/features/products/index/product-index-patcher";
import { catalogSyncOrchestrator } from "@/features/catalog/sync/catalog-sync-orchestrator";
import { saveProductToDb } from "@/features/products/db/product-db-persistence";
import { patchProductToDb } from "@/features/products/db/product-db-patch";
import { fromDbRow } from "@/features/products/db/product-db-mapper";
import { useCatalogProductsDb } from "@/features/products/products-source";
import { isEmptyPatch } from "@/lib/patch";
import { productRepository } from "@/repositories/product.repository";
import { seoTriggerService } from "@/features/seo/triggers/seo-trigger.service";
import { productPath } from "@/features/seo/triggers/path-resolver";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseLocale(raw: string | null): string {
  const value = raw?.trim().toLowerCase();
  return value && value.length > 0 ? value : adminLocale.code;
}

async function resolveAdminLocale(input: string, strict = false): Promise<string> {
  const locales = await localeService.listForAdmin();
  const normalized = input.trim().toLowerCase();
  const defaultLocaleCode =
    locales.find((locale) => locale.isDefault)?.code?.toLowerCase() ??
    locales[0]?.code?.toLowerCase() ??
    adminLocale.code;

  if (!normalized) return defaultLocaleCode;

  const match = locales.find(
    (locale) =>
      locale.code.toLowerCase() === normalized ||
      locale.urlPrefix.toLowerCase() === normalized,
  );
  if (match) return match.code.toLowerCase();

  if (strict) {
    throw new Error("Invalid locale");
  }
  return defaultLocaleCode;
}

function formatSyncResponse(sync: CatalogSyncResult | null) {
  if (!sync) return null;
  return {
    ok: sync.ok,
    indexSync: sync.indexSync,
    searchSync: sync.searchSync,
    errors: sync.errors,
    warnings: sync.warnings,
    collectionSync: sync.collectionSync
      ? {
          matchedCollections: sync.collectionSync.matchedCollections,
          isOrphan: sync.collectionSync.isOrphan,
          warnings: sync.collectionSync.warnings,
        }
      : null,
  };
}

export const productsApiService = {
  async getProducts(url: URL) {
    const locale = await resolveAdminLocale(parseLocale(url.searchParams.get("locale")), true);

    if (url.searchParams.get("parity") === "1") {
      const parity = await verifyProductEntityParity(locale);
      return { parity };
    }

    const slug = url.searchParams.get("slug");
    if (slug) {
      const safeSlug = slugify(slug);
      if (!safeSlug) {
        return { error: "Invalid slug", status: 400 as const };
      }
      const loaded = await productsDataService.getProduct(locale, safeSlug);
      if (!loaded) {
        return { error: "Product not found", status: 404 as const };
      }
      if (loaded.issues.some((i) => i.kind === "validation" || i.kind === "invalid_json")) {
        return {
          error: "Invalid JSON or validation failed for this product file",
          status: 422 as const,
          catalogIssues: loaded.issues,
        };
      }
      return {
        slug: safeSlug,
        product: loaded.product,
        sourceLocale: locale,
        ...(loaded.issues.length ? { catalogIssues: loaded.issues } : {}),
      };
    }

    const { products, issues } = await productsDataService.getAllProducts(locale);
    return {
      products,
      ...(issues.length ? { catalogIssues: issues } : {}),
    };
  },

  async createProduct(body: {
    locale?: string;
    slug?: string;
    originalSlug?: string;
    product?: Product;
  }) {
    const locale = await resolveAdminLocale(
      typeof body.locale === "string" ? body.locale.trim().toLowerCase() : "",
      true,
    );
    if (!body.product || typeof body.product !== "object") {
      return { error: "Missing product payload", status: 400 as const };
    }

    const candidate =
      body.slug || body.product.id || body.product.productTitle || body.product.name || "";
    const slug = slugify(String(candidate));
    if (!slug) {
      return { error: "Missing valid slug", status: 400 as const };
    }

    if (!useCatalogProductsDb()) {
      return {
        error: "Product save requires database catalog mode (Supabase PostgreSQL)",
        status: 501 as const,
      };
    }

    const catalogLocale = await catalogLocaleFromParam(locale);
    const product = normalizeProductPayload(body.product, slug);

    const originalSlugRaw = body.originalSlug ? slugify(body.originalSlug) : "";
    let oldSlug: string | undefined;
    const mtimeMs = Date.now();

    const existingSlug = originalSlugRaw || slug;
    const existingRow = await productRepository.resolveByLocalizedSlug(catalogLocale, existingSlug);
    if (existingRow && existingSlug !== slug) {
      oldSlug = existingSlug;
      await productRepository.delete(existingRow.canonicalSlug);
    }

    await saveProductToDb(slug, product, {
      sourceType: "manual",
      localeCode: catalogLocale,
      localizedSlug: slug,
    });
    const targetPath = catalogSyncOrchestrator.relPathFromAbs(
      productJsonPath(catalogLocale, slug),
    );

    productsDataService.invalidateIndex();

    let sync: CatalogSyncResult | null = null;
    try {
      sync = await patchProductIndexesAfterSave(locale, slug, product, {
        relPath: catalogSyncOrchestrator.relPathFromAbs(targetPath),
        mtimeMs,
        oldSlug,
      });
    } catch (e) {
      sync = {
        ok: false,
        collectionSync: null,
        indexSync: null,
        searchSync: null,
        errors: [e instanceof Error ? e.message : String(e)],
        warnings: [],
      };
    }
    if (oldSlug) {
      await seoTriggerService.handle({
        type: "content.slugChanged",
        entityType: "PRODUCT",
        locale,
        oldPath: productPath(locale, oldSlug),
        newPath: productPath(locale, slug),
      });
    } else {
      await seoTriggerService.handle({
        type: "content.published",
        entityType: "PRODUCT",
        locale,
        path: productPath(locale, slug),
      });
    }

    return {
      slug,
      locale,
      product,
      ...(oldSlug ? { renamedFrom: oldSlug } : {}),
      sync: formatSyncResponse(sync),
    };
  },

  async patchProduct(url: URL, body: { changes?: Record<string, unknown>; originalSlug?: string }) {
    const locale = await resolveAdminLocale((url.searchParams.get("locale") || "").trim().toLowerCase(), true);
    const slugParam = slugify(url.searchParams.get("slug") || "");
    if (!slugParam) {
      return { error: "Missing slug query parameter", status: 400 as const };
    }

    if (!body.changes || typeof body.changes !== "object") {
      return { error: "Missing changes payload", status: 400 as const };
    }

    if (!useCatalogProductsDb()) {
      return {
        error: "Product patch requires database catalog mode (Supabase PostgreSQL)",
        status: 501 as const,
      };
    }

    const catalogLocale = await catalogLocaleFromParam(locale);
    const originalSlugRaw = body.originalSlug ? slugify(body.originalSlug) : slugParam;
    const existingRow = await productRepository.resolveByLocalizedSlug(catalogLocale, originalSlugRaw);
    if (!existingRow) {
      return { error: "Product not found", status: 404 as const };
    }

    if (isEmptyPatch(body.changes)) {
      return {
        slug: slugParam,
        locale,
        product: fromDbRow(existingRow),
        noop: true,
        appliedPaths: [],
        sync: null,
      };
    }

    const patchResult = await patchProductToDb(existingRow.canonicalSlug, body.changes, {
      sourceType: "manual",
      localeCode: catalogLocale,
      localizedSlug: slugParam,
    });

    if (!patchResult.ok) {
      return { error: patchResult.error, status: 400 as const };
    }

    if (patchResult.noop) {
      return {
        slug: slugParam,
        locale,
        product: patchResult.product,
        noop: true,
        appliedPaths: [],
        sync: null,
      };
    }

    const mtimeMs = Date.now();
    const targetPath = catalogSyncOrchestrator.relPathFromAbs(
      productJsonPath(catalogLocale, patchResult.canonicalSlug),
    );

    productsDataService.invalidateIndex();

    let sync: CatalogSyncResult | null = null;
    try {
      sync = await patchProductIndexesAfterPatch(
        locale,
        slugParam,
        patchResult.product,
        patchResult.appliedPaths,
        {
          relPath: catalogSyncOrchestrator.relPathFromAbs(targetPath),
          mtimeMs,
          oldSlug: originalSlugRaw !== slugParam ? originalSlugRaw : undefined,
        },
      );
    } catch (e) {
      sync = {
        ok: false,
        collectionSync: null,
        indexSync: null,
        searchSync: null,
        errors: [e instanceof Error ? e.message : String(e)],
        warnings: [],
      };
    }
    const finalSlug = patchResult.canonicalSlug;
    if (finalSlug !== slugParam) {
      await seoTriggerService.handle({
        type: "content.slugChanged",
        entityType: "PRODUCT",
        locale,
        oldPath: productPath(locale, slugParam),
        newPath: productPath(locale, finalSlug),
      });
    } else {
      await seoTriggerService.handle({
        type: "content.sitemapChanged",
        entityType: "PRODUCT",
        locale,
        path: productPath(locale, slugParam),
      });
    }

    return {
      slug: slugParam,
      locale,
      product: patchResult.product,
      appliedPaths: patchResult.appliedPaths,
      sync: formatSyncResponse(sync),
    };
  },

  async deleteProduct(url: URL) {
    const locale = await resolveAdminLocale(parseLocale(url.searchParams.get("locale")), true);
    const slug = slugify(url.searchParams.get("slug") || "");
    if (!slug) {
      return { error: "Missing slug", status: 400 as const };
    }

    const catalogLocale = await catalogLocaleFromParam(locale);
    let sync: CatalogSyncResult | null = null;

    if (!useCatalogProductsDb()) {
      return {
        error: "Product delete requires database catalog mode (Supabase PostgreSQL)",
        status: 501 as const,
      };
    }

    const row = await productRepository.resolveByLocalizedSlug(catalogLocale, slug);
    if (!row) {
      return { error: "Product not found", status: 404 as const };
    }

    await productRepository.delete(row.canonicalSlug);
    productsDataService.invalidateIndex();
    try {
      sync = await patchProductIndexesAfterDelete(locale, slug);
    } catch (e) {
      sync = {
        ok: false,
        collectionSync: null,
        indexSync: null,
        searchSync: null,
        errors: [e instanceof Error ? e.message : String(e)],
        warnings: [],
      };
    }
    await seoTriggerService.handle({
      type: "content.deleted",
      entityType: "PRODUCT",
      locale,
      path: productPath(locale, slug),
    });
    return { removed: true, slug, locale, sync: formatSyncResponse(sync) };
  },
};
