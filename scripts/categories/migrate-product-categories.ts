/**
 * CLI: migrate PRODUCT CatalogCollection + product category strings → Category.
 * Usage: npx tsx scripts/categories/migrate-product-categories.ts
 */
import { migrateProductCategories } from "@/features/categories/migration/migrate-product-categories";

async function main() {
  console.log("Migrating PRODUCT categories…");
  const report = await migrateProductCategories();
  console.log(JSON.stringify(report, null, 2));
  if (report.errors.length) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
