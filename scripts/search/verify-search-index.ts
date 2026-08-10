import {
  validateCatalogConsistency,
  validateSearchIndexConsistency,
} from "@/features/catalog/sync/catalog-validation";

async function main() {
  const catalog = await validateCatalogConsistency();
  const search = await validateSearchIndexConsistency();

  console.log("Catalog validation:", catalog.generatedAt);
  for (const w of catalog.warnings) console.warn(`  [${w.code}] ${w.message}`);
  for (const e of catalog.errors) console.error(`  [${e.code}] ${e.message}`);

  console.log("\nSearch validation:", search.generatedAt);
  console.log(`  stale catalog docs: ${search.staleCatalogDocs}`);
  for (const w of search.warnings) console.warn(`  [${w.code}] ${w.message}`);
  for (const e of search.errors) console.error(`  [${e.code}] ${e.message}`);

  const issues = catalog.errors.length + catalog.warnings.length + search.errors.length + search.warnings.length;
  if (issues > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
