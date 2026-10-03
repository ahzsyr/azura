/**
 * Static + unit guards for Feature Grid cardClickable → overlay link
 * (illegal a>a would trigger React #418 HTML hydration mismatch).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { prepareFeatureGridDescriptionHtml } from "@/features/builder/blocks/marketing/lib/prepare-feature-grid-html";

async function readCardSrc(): Promise<string> {
  return readFile(new URL("../components/feature-grid-card.tsx", import.meta.url), "utf8");
}

describe("feature grid cardClickable hydration (React #418)", () => {
  it("uses stretched overlay Link instead of wrapping card content in <a>", async () => {
    const src = await readCardSrc();
    assert.match(src, /absolute inset-0 z-0/);
    assert.match(src, /aria-hidden="true"/);
    assert.match(src, /tabIndex=\{-1\}/);
    assert.match(src, /pointer-events-none/);
    assert.match(src, /\[&_a\]:pointer-events-auto/);
    assert.match(src, /\[&_button\]:pointer-events-auto/);
    // Must not wrap {inner} as children of the card Link anymore.
    assert.doesNotMatch(
      src,
      /if \(cardHref\) \{[\s\S]*?<Link[\s\S]*?>\s*\{inner\}\s*<\/Link>/,
    );
  });

  it("keeps stopPropagation on inner CTA Links", async () => {
    const src = await readCardSrc();
    const stopCount = (src.match(/e\.stopPropagation\(\)/g) ?? []).length;
    assert.ok(stopCount >= 3, `expected stopPropagation on link/button/footer, got ${stopCount}`);
  });

  it("sanitizes description HTML once before the expandable island", async () => {
    const cardSrc = await readCardSrc();
    assert.match(cardSrc, /prepareFeatureGridDescriptionHtml/);
    assert.match(cardSrc, /prepare-feature-grid-html/);
    const expandable = await readFile(
      new URL("../components/feature-grid-expandable-html.tsx", import.meta.url),
      "utf8",
    );
    assert.doesNotMatch(expandable, /sanitizeHtml/);
    assert.doesNotMatch(expandable, /adaptRichTextHtmlColors/);
    const prep = await readFile(
      new URL("../lib/prepare-feature-grid-html.ts", import.meta.url),
      "utf8",
    );
    // Must stay string-only — isomorphic-dompurify diverges SSR vs client (#418).
    assert.match(prep, /sanitizeHtmlStructural/);
    assert.doesNotMatch(prep, /sanitizeHtml\(/);
  });

  it("prepareFeatureGridDescriptionHtml unwraps nested anchors (outer wins)", () => {
    const out = prepareFeatureGridDescriptionHtml(
      '<p>See <a href="/outer">outer <a href="/inner">inner</a> text</a></p>',
    );
    assert.ok(!/<a[^>]*>[\s\S]*<a[\s>]/i.test(out), `still nested: ${out}`);
    assert.match(out, /href="\/outer"/);
    assert.doesNotMatch(out, /href="\/inner"/);
    assert.match(out, /inner/);
  });
});
