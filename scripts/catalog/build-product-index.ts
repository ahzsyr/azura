#!/usr/bin/env tsx
/**
 * Build precomputed product listing indexes for all catalog locales.
 *
 * Usage:
 *   npm run catalog:index
 *   npm run catalog:index:force
 */
import { CATALOG_LOCALES } from "@/features/catalog/locales";
import { buildAllProductIndexes } from "@/features/products/index/product-index-builder";

async function main() {
  const force = process.argv.includes("--force");
  console.log(`Building product indexes${force ? " (force)" : ""}…`);

  const manifest = await buildAllProductIndexes({
    locales: [...CATALOG_LOCALES],
    force,
    gzip: true,
  });

  console.log("\nProduct index build complete:");
  for (const locale of manifest.locales) {
    console.log(`  ${locale}: ${manifest.counts[locale] ?? 0} products`);
  }
  console.log(`  manifest: src/data/products-index/manifest.json`);

  if (process.env.SKIP_SEARCH_INDEX_SYNC !== "1") {
    try {
      const { frameworkSearchIndexer } = await import("@/features/search-framework");
      await frameworkSearchIndexer.syncCatalogIndexes();
      console.log("  search: catalog products/collections/categories synced to SearchDocument");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn("  search: catalog sync skipped —", message.split("\n")[0]);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
