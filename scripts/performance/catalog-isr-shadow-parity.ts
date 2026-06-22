import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import type {
  CatalogListingPagePayload,
  CatalogPageSlug,
} from "@/features/catalog/load-catalog-listing-page";

const require = createRequire(import.meta.url);

function installRequireCacheMock(resolvedPath: string, exports: unknown): void {
  const cache = require.cache as Record<string, unknown>;
  cache[resolvedPath] = {
    id: resolvedPath,
    filename: resolvedPath,
    loaded: true,
    exports,
    children: [],
    paths: [],
  };
}

try {
  const serverOnlyPath = require.resolve("server-only");
  // #region agent log
  void fetch("http://127.0.0.1:7249/ingest/39015276-3520-45ed-aa0e-f49ed49423a8", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "12383e" }, body: JSON.stringify({ sessionId: "12383e", runId: "pre-fix", hypothesisId: "H1,H2", location: "scripts/performance/catalog-isr-shadow-parity.ts:12", message: "installing server-only require cache shim", data: { serverOnlyPath }, timestamp: Date.now() }) }).catch(() => {});
  // #endregion
  installRequireCacheMock(serverOnlyPath, {});
} catch {
  /* server-only is optional in script context */
}

try {
  const fontGooglePath = require.resolve("next/font/google");
  const fontMock = () => ({ className: "", variable: "" });
  // #region agent log
  void fetch("http://127.0.0.1:7249/ingest/39015276-3520-45ed-aa0e-f49ed49423a8", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "12383e" }, body: JSON.stringify({ sessionId: "12383e", runId: "pre-fix", hypothesisId: "H2,H5", location: "scripts/performance/catalog-isr-shadow-parity.ts:27", message: "installing next/font/google require cache shim", data: { fontGooglePath }, timestamp: Date.now() }) }).catch(() => {});
  // #endregion
  installRequireCacheMock(fontGooglePath, {
    Amiri: fontMock,
    Plus_Jakarta_Sans: fontMock,
  });
} catch {
  /* next/font is optional in script context */
}

try {
  const nextCachePath = require.resolve("next/cache");
  installRequireCacheMock(nextCachePath, {
    unstable_cache: (fn: unknown) => fn,
    revalidatePath: () => undefined,
    revalidateTag: () => undefined,
  });
} catch {
  /* next/cache is optional in script context */
}

const root = process.cwd();
const outFile = path.join(root, "performance-reports", "catalog-isr-shadow-parity.json");
const locale = process.env.PERF_LOCALE ?? "en";
const pages: CatalogPageSlug[] = ["products", "collections"];

function listingSignature(payload: CatalogListingPagePayload) {
  return {
    total: payload.listing.total ?? payload.listing.records.length,
    totalPages: payload.listing.totalPages ?? 1,
    recordIds: payload.listing.records.slice(0, 24).map((record) => record.id ?? record.slug),
    facetKeys: Object.keys(payload.listing.facets ?? {}).sort(),
    collectionCount: payload.collections.length,
    listingMode: payload.listingMode,
    pageDir: payload.pageDir,
  };
}

function diffSignatures(
  current: ReturnType<typeof listingSignature>,
  shadow: ReturnType<typeof listingSignature>,
) {
  const diffs: string[] = [];
  if (current.total !== shadow.total) diffs.push(`total ${current.total} !== ${shadow.total}`);
  if (current.totalPages !== shadow.totalPages) {
    diffs.push(`totalPages ${current.totalPages} !== ${shadow.totalPages}`);
  }
  if (current.collectionCount !== shadow.collectionCount) {
    diffs.push(`collectionCount ${current.collectionCount} !== ${shadow.collectionCount}`);
  }
  if (current.listingMode !== shadow.listingMode) {
    diffs.push(`listingMode ${current.listingMode} !== ${shadow.listingMode}`);
  }
  if (current.pageDir !== shadow.pageDir) diffs.push(`pageDir ${current.pageDir} !== ${shadow.pageDir}`);
  if (current.recordIds.join("|") !== shadow.recordIds.join("|")) {
    diffs.push("first-page record order differs");
  }
  if (current.facetKeys.join("|") !== shadow.facetKeys.join("|")) {
    diffs.push("facet keys differ");
  }
  return diffs;
}

async function main() {
  const [{ loadCatalogListingPage }, { filterStateFromSearchParams }] = await Promise.all([
    import("@/features/catalog/load-catalog-listing-page"),
    import("@/features/products/listing/url-state"),
  ]);
  const rows = [];
  const defaultFilter = filterStateFromSearchParams(new URLSearchParams());

  for (const pageSlug of pages) {
    const current = await loadCatalogListingPage(locale, pageSlug, defaultFilter);
    const shadow = await loadCatalogListingPage(locale, pageSlug);
    const currentSignature = listingSignature(current);
    const shadowSignature = listingSignature(shadow);
    const diffs = diffSignatures(currentSignature, shadowSignature);
    rows.push({
      locale,
      pageSlug,
      passed: diffs.length === 0,
      diffs,
      current: currentSignature,
      shadow: shadowSignature,
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    locale,
    passed: rows.every((row) => row.passed),
    rows,
  };

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2) + "\n");
  console.log(`Catalog ISR shadow parity: ${report.passed ? "passed" : "failed"}`);
  console.log(path.relative(root, outFile));

  if (!report.passed) process.exit(1);
}

main().catch((error) => {
  console.error("Catalog ISR shadow parity failed:", error);
  process.exit(1);
});
