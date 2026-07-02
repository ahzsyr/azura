import { NextResponse, after } from "next/server";
import { requireCatalogAdmin } from "@/lib/catalog-api-auth";
import {
  runProductImportPipeline,
  finalizeProductImportSync,
  type ProductImportOptions,
  type ImportItem,
} from "@/features/products/lib/product-import-pipeline";
import { pairImportFileEntries } from "@/features/products/import/product-file-pairing";
import { assertCatalogProductTableReady } from "@/features/products/db/product-db-persistence";
import { useCatalogProductsDb as catalogProductsDbEnabled } from "@/features/products/products-source";

export const maxDuration = 300;

function scheduleProductImportFinalization(locales: string[]): void {
  after(async () => {
    try {
      await finalizeProductImportSync(locales);
    } catch (e) {
      console.warn("[import] catalog sync after import failed", e);
    }
  });
}

function collectMultipartFiles(form: FormData): File[] {
  const out: File[] = [];
  for (const key of ["files", "file"]) {
    for (const entry of form.getAll(key)) {
      if (entry instanceof File && entry.size > 0) out.push(entry);
    }
  }
  return out;
}

function defaultPipelineOpts(
  locale: string,
  overrides?: Partial<ProductImportOptions>,
): ProductImportOptions {
  return {
    dryRun: false,
    sourceLocale: locale,
    targetLocales: [locale],
    duplicatePolicy: "overwrite",
    localizedOverwrite: false,
    onlyMissingLocales: true,
    autoGenerateStubs: false,
    slugConflict: "suffix",
    skipCollectionSync: false,
    ...overrides,
  };
}

/** Bulk product import (JSON items + options, or multipart JSON/CSV file pairs). */
export async function POST(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  if (catalogProductsDbEnabled()) {
    const tableCheck = await assertCatalogProductTableReady();
    if (!tableCheck.ok) {
      return NextResponse.json({ error: tableCheck.message }, { status: 503 });
    }
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const locale = String(form.get("locale") ?? "en-us");
      const dryRun = form.get("dryRun") === "true";
      const duplicatePolicy =
        form.get("duplicatePolicy")?.toString() === "skip" ? "skip" : "overwrite";

      const files = collectMultipartFiles(form);
      if (files.length === 0) {
        return NextResponse.json({ error: "Missing file(s) in form data" }, { status: 400 });
      }

      const entries = await Promise.all(
        files.map(async (file) => ({ name: file.name, content: await file.text() })),
      );
      const paired = pairImportFileEntries(entries);

      if (!paired.hasImportableProducts) {
        return NextResponse.json(
          {
            error:
              paired.csvOnlyCount > 0
                ? "CSV-only upload — include companion .json files for each product"
                : "No valid JSON products found in upload",
            pairing: {
              skipped: paired.skipped,
              csvOnlyCount: paired.csvOnlyCount,
            },
          },
          { status: 400 },
        );
      }

      const items: ImportItem[] = paired.products.map((p) => ({
        sourceFile: p.sourceFile,
        pairedCsv: p.pairedCsv,
        product: p.product,
      }));

      const result = await runProductImportPipeline(
        items,
        defaultPipelineOpts(locale, { dryRun, duplicatePolicy }),
      );

      if (!dryRun && result.summary.ok > 0) {
        scheduleProductImportFinalization([locale]);
      }

      return NextResponse.json({
        ...result,
        pairing: {
          previews: paired.previews,
          skipped: paired.skipped,
          csvOnlyCount: paired.csvOnlyCount,
        },
      });
    }

    const body = (await request.json()) as {
      items?: ImportItem[];
      options?: Partial<ProductImportOptions> & { finalizeImport?: boolean };
      finalizeImport?: boolean;
    } & Partial<ProductImportOptions>;

    const opts = body.options ?? body;
    const items = body.items ?? [];

    const result = await runProductImportPipeline(items, {
      dryRun: opts.dryRun === true,
      sourceLocale: opts.sourceLocale ?? "en-us",
      targetLocales: opts.targetLocales ?? ["en-us"],
      duplicatePolicy: opts.duplicatePolicy ?? "skip",
      localizedOverwrite: opts.localizedOverwrite ?? false,
      onlyMissingLocales: opts.onlyMissingLocales ?? true,
      autoGenerateStubs: opts.autoGenerateStubs ?? false,
      slugConflict: opts.slugConflict ?? "suffix",
      skipCollectionSync: opts.skipCollectionSync ?? false,
    });

    if (!opts.dryRun && opts.finalizeImport !== false && result.summary.ok > 0) {
      const locales = new Set<string>();
      locales.add(opts.sourceLocale ?? "en-us");
      const targets = opts.targetLocales ?? ["en-us"];
      if (targets === "all") {
        const { configuredLocaleCodes } = await import("@/features/products/lib/i18n/config");
        for (const code of configuredLocaleCodes) locales.add(code);
      } else {
        for (const t of targets) locales.add(t);
      }
      scheduleProductImportFinalization([...locales]);
    }

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Import failed" },
      { status: 500 },
    );
  }
}
