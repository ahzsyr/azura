/**
 * Static guard: storefront client surfaces must not format dates/money with
 * browser-default Intl (React #418 text mismatches).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function readSrc(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

describe("hydration text acceptance (static)", () => {
  it("compare workspace does not read localStorage during initial state", async () => {
    const src = await readSrc(
      "../../../features/comparison/components/compare-workspace.tsx",
    );
    assert.match(src, /useState<string\[\]>\(\[\]\)/);
    assert.doesNotMatch(src, /useState<string\[\]>\(initialBuckets\)/);
    assert.doesNotMatch(src, /useState<string \| null>\(\(\) =>\s*pickActiveSlug\(initialBuckets/);
  });

  it("dynamic form resume link uses usePathname, not typeof window", async () => {
    const src = await readSrc(
      "../../../features/builder/blocks/conversion/components/dynamic-form-view.tsx",
    );
    assert.match(src, /usePathname/);
    assert.doesNotMatch(
      src,
      /typeof window !== "undefined" \? `\$\{window\.location\.pathname\}/,
    );
  });

  it("storefront date/money formatters use hydration-safe helpers", async () => {
    const reviews = await readSrc(
      "../../../features/products/components/pdp/product-reviews-section.tsx",
    );
    const status = await readSrc(
      "../../../features/builder/blocks/portal/components/status-dashboard-view.tsx",
    );
    const cardPrice = await readSrc(
      "../../../features/products/card-design/product-card-price.ts",
    );
    assert.match(reviews, /formatHydrationSafeDate/);
    assert.doesNotMatch(reviews, /toLocaleDateString\(/);
    assert.match(status, /formatHydrationSafeDateTime/);
    assert.match(cardPrice, /formatHydrationSafeCurrency/);
  });
});
