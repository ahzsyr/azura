import { NextResponse } from "next/server";
import type { Product } from "@/features/products/types";
import {
  catalogLocaleFromParam,
} from "@/features/products/fs/product-fs-scan";
import { productJsonPath } from "@/features/products/fs/product-fs-paths";
import { normalizeProductPayload } from "@/features/products/lib/product-payload-normalize";
import {
  adminLocale,
} from "@/features/catalog/admin/catalog-admin-config";
import { requireCatalogAdmin } from "@/lib/catalog-api-auth";
import { productsDataService } from "@/features/products/products-data.service";
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

export async function GET(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  let locale: string;
  try {
    locale = await resolveAdminLocale(parseLocale(url.searchParams.get("locale")), true);
  } catch {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }
  const slug = url.searchParams.get("slug");

  try {
    if (slug) {
      const safeSlug = slugify(slug);
      if (!safeSlug) {
        return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
      }
      const loaded = await productsDataService.getProduct(locale, safeSlug);
      if (!loaded) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }
      if (loaded.issues.some((i) => i.kind === "validation" || i.kind === "invalid_json")) {
        return NextResponse.json(
          {
            error: "Invalid JSON or validation failed for this product file",
            catalogIssues: loaded.issues,
          },
          { status: 422 },
        );
      }
      return NextResponse.json({
        slug: safeSlug,
        product: loaded.product,
        sourceLocale: locale,
        ...(loaded.issues.length ? { catalogIssues: loaded.issues } : {}),
      });
    }

    const { products, issues } = await productsDataService.getAllProducts(locale);
    return NextResponse.json({
      products,
      ...(issues.length ? { catalogIssues: issues } : {}),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed loading products" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json()) as {
      locale?: string;
      slug?: string;
      originalSlug?: string;
      product?: Product;
    };

    let locale: string;
    try {
      locale = await resolveAdminLocale(
        typeof body.locale === "string" ? body.locale.trim().toLowerCase() : "",
        true,
      );
    } catch {
      return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
    }
    if (!body.product || typeof body.product !== "object") {
      return NextResponse.json({ error: "Missing product payload" }, { status: 400 });
    }

    const candidate =
      body.slug || body.product.id || body.product.productTitle || body.product.name || "";
    const slug = slugify(String(candidate));
    if (!slug) {
      return NextResponse.json({ error: "Missing valid slug" }, { status: 400 });
    }

    if (!useCatalogProductsDb()) {
      return NextResponse.json(
        { error: "Product save requires database catalog mode (Supabase PostgreSQL)" },
        { status: 501 },
      );
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

    return NextResponse.json({
      slug,
      locale,
      product,
      ...(oldSlug ? { renamedFrom: oldSlug } : {}),
      sync: formatSyncResponse(sync),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Save failed" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  try {
    const url = new URL(request.url);
    let locale: string;
    try {
      locale = await resolveAdminLocale((url.searchParams.get("locale") || "").trim().toLowerCase(), true);
    } catch {
      return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
    }
    const slugParam = slugify(url.searchParams.get("slug") || "");
    if (!slugParam) {
      return NextResponse.json({ error: "Missing slug query parameter" }, { status: 400 });
    }

    const body = (await request.json()) as {
      changes?: Record<string, unknown>;
      originalSlug?: string;
    };

    if (!body.changes || typeof body.changes !== "object") {
      return NextResponse.json({ error: "Missing changes payload" }, { status: 400 });
    }

    if (!useCatalogProductsDb()) {
      return NextResponse.json(
        { error: "Product patch requires database catalog mode (Supabase PostgreSQL)" },
        { status: 501 },
      );
    }

    const catalogLocale = await catalogLocaleFromParam(locale);
    const originalSlugRaw = body.originalSlug ? slugify(body.originalSlug) : slugParam;
    const existingRow = await productRepository.resolveByLocalizedSlug(catalogLocale, originalSlugRaw);
    if (!existingRow) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (isEmptyPatch(body.changes)) {
      return NextResponse.json({
        slug: slugParam,
        locale,
        product: fromDbRow(existingRow),
        noop: true,
        appliedPaths: [],
        sync: null,
      });
    }

    const patchResult = await patchProductToDb(existingRow.canonicalSlug, body.changes, {
      sourceType: "manual",
      localeCode: catalogLocale,
      localizedSlug: slugParam,
    });

    if (!patchResult.ok) {
      return NextResponse.json({ error: patchResult.error }, { status: 400 });
    }

    if (patchResult.noop) {
      return NextResponse.json({
        slug: slugParam,
        locale,
        product: patchResult.product,
        noop: true,
        appliedPaths: [],
        sync: null,
      });
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

    return NextResponse.json({
      slug: slugParam,
      locale,
      product: patchResult.product,
      appliedPaths: patchResult.appliedPaths,
      sync: formatSyncResponse(sync),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Patch failed" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  let locale: string;
  try {
    locale = await resolveAdminLocale(parseLocale(url.searchParams.get("locale")), true);
  } catch {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }
  const slug = slugify(url.searchParams.get("slug") || "");
  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  try {
    const catalogLocale = await catalogLocaleFromParam(locale);
    let sync: CatalogSyncResult | null = null;

    if (!useCatalogProductsDb()) {
      return NextResponse.json(
        { error: "Product delete requires database catalog mode (Supabase PostgreSQL)" },
        { status: 501 },
      );
    }

    const row = await productRepository.resolveByLocalizedSlug(catalogLocale, slug);
    if (!row) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const removed = await productRepository.delete(row.canonicalSlug);
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
    return NextResponse.json({ removed: true, slug, locale, sync: formatSyncResponse(sync) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Delete failed" },
      { status: 500 },
    );
  }
}
