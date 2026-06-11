/**
 * Verifies JSON-on-disk catalog and prebuilt product indexes.
 */
import { access, readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function countProductJson(locale: string): Promise<number> {
  const dir = join(ROOT, "src", "data", locale, "products");
  let count = 0;
  async function walk(d: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.isFile() && e.name.endsWith(".json")) count++;
    }
  }
  await walk(dir);
  return count;
}

async function readListingIndexCount(locale: string): Promise<number | null> {
  const path = join(ROOT, "src", "data", "products-index", locale, "product-listing-index.json");
  try {
    const raw = JSON.parse(await readFile(path, "utf-8")) as { records?: unknown[] };
    return Array.isArray(raw.records) ? raw.records.length : null;
  } catch {
    return null;
  }
}

async function main() {
  const errors: string[] = [];
  const warns: string[] = [];

  const collectionsPath = join(ROOT, "src", "data", "collections.json");
  if (!(await exists(collectionsPath))) {
    errors.push("Missing src/data/collections.json — run: npm run catalog:copy");
  } else {
    const raw = JSON.parse(await readFile(collectionsPath, "utf-8")) as unknown;
    const n = Array.isArray(raw) ? raw.length : 0;
    console.log(`collections.json: ${n} collections`);
    if (n === 0) errors.push("collections.json is empty");
  }

  const mediaMeta = join(ROOT, "src", "data", "media-library.json");
  if (!(await exists(mediaMeta))) {
    warns.push("Missing src/data/media-library.json (optional until first upload)");
  }

  for (const locale of ["en-us", "ar-ae"]) {
    const fileCount = await countProductJson(locale);
    const indexCount = await readListingIndexCount(locale);
    console.log(`${locale} products: ${fileCount} JSON files`);
    if (indexCount != null) {
      console.log(`${locale} listing index: ${indexCount} records`);
      if (indexCount !== fileCount) {
        warns.push(
          `${locale} index count (${indexCount}) differs from filesystem count (${fileCount}) — run: npm run catalog:index`,
        );
      }
    } else if (locale === "en-us" && fileCount > 0) {
      warns.push(`Missing product listing index for ${locale} — run: npm run catalog:index`);
    }
    if (locale === "en-us" && fileCount === 0) {
      errors.push(`No products under src/data/${locale}/products`);
    }
  }

  const manifestPath = join(ROOT, "src", "data", "products-index", "manifest.json");
  if (await exists(manifestPath)) {
    const manifest = JSON.parse(await readFile(manifestPath, "utf-8")) as {
      generatedAt?: string;
      counts?: Record<string, number>;
    };
    console.log(`products-index manifest: ${manifest.generatedAt ?? "unknown"}`);
    for (const [locale, count] of Object.entries(manifest.counts ?? {})) {
      console.log(`  manifest ${locale}: ${count}`);
    }
  }

  const uploads = join(ROOT, "public", "uploads");
  if (!(await exists(uploads))) {
    warns.push("Missing public/uploads — run catalog:copy or upload media");
  } else {
    const s = await stat(uploads);
    console.log(`public/uploads: exists (dir)`);
    void s;
  }

  const assets = join(ROOT, "public", "assets");
  if (!(await exists(assets))) {
    warns.push("Missing public/assets");
  }

  for (const w of warns) console.log(`WARN: ${w}`);
  for (const e of errors) console.log(`ERROR: ${e}`);

  if (errors.length > 0) process.exit(1);
  console.log("\nCatalog verification passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
