import { access, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { NextResponse } from "next/server";
import type { Product } from "@/features/products/types";
import {
  catalogLocaleFromParam,
  resolveProductJsonPath,
  localeProductsDir,
} from "@/features/products/fs/product-fs-scan";
import { productJsonPath } from "@/features/products/fs/product-fs-paths";
import { slugFromProductJsonFilename } from "@/features/products/fs/product-fs-parse";
import { normalizeProductPayload } from "@/features/products/lib/product-payload-normalize";
import {
  adminLocale,
  isConfiguredLocaleCode,
  resolveConfiguredLocaleCode,
} from "@/features/catalog/admin/catalog-admin-config";
import { requireCatalogAdmin } from "@/lib/catalog-api-auth";
import { productsDataService } from "@/features/products/products-data.service";
import {
  patchProductIndexesAfterDelete,
  patchProductIndexesAfterSave,
  type CatalogSyncResult,
} from "@/features/products/index/product-index-patcher";
import { catalogSyncOrchestrator } from "@/features/catalog/sync/catalog-sync-orchestrator";

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

function parseLocale(raw: string | null): string {
  return resolveConfiguredLocaleCode(raw || "", adminLocale.code);
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
  const locale = parseLocale(url.searchParams.get("locale"));
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

    const rawLc = typeof body.locale === "string" ? body.locale.trim().toLowerCase() : "";
    if (rawLc && !isConfiguredLocaleCode(rawLc)) {
      return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
    }
    const locale = rawLc || adminLocale.code;
    if (!body.product || typeof body.product !== "object") {
      return NextResponse.json({ error: "Missing product payload" }, { status: 400 });
    }

    const candidate =
      body.slug || body.product.id || body.product.productTitle || body.product.name || "";
    const slug = slugify(String(candidate));
    if (!slug) {
      return NextResponse.json({ error: "Missing valid slug" }, { status: 400 });
    }

    const catalogLocale = catalogLocaleFromParam(locale);
    const product = normalizeProductPayload(body.product, slug);
    const dir = localeProductsDir(catalogLocale);
    await mkdir(dir, { recursive: true });

    const originalSlugRaw = body.originalSlug ? slugify(body.originalSlug) : "";
    const existingPath = await resolveProductJsonPath(catalogLocale, originalSlugRaw || slug);
    const oldSlugFromPath =
      existingPath != null
        ? slugFromProductJsonFilename(basename(existingPath))
        : originalSlugRaw || null;
    const oldSlug =
      oldSlugFromPath && oldSlugFromPath !== slug ? oldSlugFromPath : undefined;

    const targetPath = existingPath ?? productJsonPath(catalogLocale, slug);
    await writeFile(targetPath, JSON.stringify(product, null, 2), "utf-8");

    if (oldSlug && oldSlug !== slug) {
      const oldPath = await resolveProductJsonPath(catalogLocale, oldSlug);
      if (oldPath && oldPath !== targetPath && (await fileExists(oldPath))) {
        await rm(oldPath);
      }
    }

    let mtimeMs = Date.now();
    try {
      mtimeMs = (await stat(targetPath)).mtimeMs;
    } catch {
      /* ignore */
    }

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

export async function DELETE(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const locale = parseLocale(url.searchParams.get("locale"));
  const slug = slugify(url.searchParams.get("slug") || "");
  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  try {
    const catalogLocale = catalogLocaleFromParam(locale);
    const resolved = await resolveProductJsonPath(catalogLocale, slug);
    let sync: CatalogSyncResult | null = null;

    if (resolved) {
      await rm(resolved);
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
      return NextResponse.json({ removed: true, slug, locale, sync: formatSyncResponse(sync) });
    }

    const flatPath = productJsonPath(catalogLocale, slug);
    if (await fileExists(flatPath)) {
      await rm(flatPath);
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
      return NextResponse.json({ removed: true, slug, locale, sync: formatSyncResponse(sync) });
    }

    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Delete failed" },
      { status: 500 },
    );
  }
}
