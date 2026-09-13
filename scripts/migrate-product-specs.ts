/**
 * CLI: backfill canonical_specs on product DB payloads.
 * Usage:
 *   npx tsx scripts/migrate-product-specs.ts
 *   npx tsx scripts/migrate-product-specs.ts --dry-run
 */
import { migrateProductSpecs } from "@/features/specifications/migration/migrate-product-specs";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : undefined;

  console.log(`Migrating product specifications${dryRun ? " (dry-run)" : ""}…`);
  const report = await migrateProductSpecs({ dryRun, limit });
  console.log(JSON.stringify(report, null, 2));
  if (report.errors.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
