import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("theme-init boot order", () => {
  const source = readFileSync(
    join(process.cwd(), "public", "theme-init.js"),
    "utf8",
  );

  it("applies SSR data-theme before the first chrome projection paint", () => {
    const firstPaint = source.indexOf('var firstPaint = ssrTheme === "dark"');
    const firstSync = source.indexOf("syncThemeColorMetaFromProjection(false)");
    assert.ok(firstPaint > 0, "must derive firstPaint from SSR");
    assert.ok(firstSync > 0, "must call pre-hydration chrome sync");
    assert.ok(
      firstPaint < firstSync,
      "SSR firstPaint must precede syncThemeColorMetaFromProjection(false)",
    );
  });

  it("clears leaked visitor presets before painting chrome", () => {
    const clearCall = source.indexOf("clearLeakedVisitorPreset()");
    const firstSync = source.indexOf("syncThemeColorMetaFromProjection(false)");
    assert.ok(clearCall > 0);
    assert.ok(clearCall < firstSync);
  });

  it("pre-paint chrome resolves from browserProjection, not visitor storage", () => {
    assert.match(source, /Active chrome always from published browserProjection/);
    assert.match(source, /function resolveForcedChromeBg\(mode\)/);
    assert.match(source, /var color = projectionColor\(mode\);/);
  });

  it("splits glass tint from browser chrome tint", () => {
    assert.match(source, /--az-site-glass-tint/);
    assert.match(source, /paintSafariChromeTint\(browserColor, glassColor\)/);
  });

  it("post-hydrate sync does not mutate theme-color metas or call visitorChromeColor", () => {
    assert.doesNotMatch(source, /visitorChromeColor\s*\(/);
    assert.match(source, /if \(mutateHead\) return;/);
    assert.match(
      source,
      /Mutating Next-owned theme-color metas during\/after hydrate caused #418/,
    );
  });

  it("runAfterHydration waits for data-hydrated and does not race load+rAF", () => {
    assert.match(source, /root\.dataset\.hydrated !== "true"/);
    assert.match(source, /azura:hydrated/);
    assert.doesNotMatch(source, /addEventListener\(\s*["']load["']/);
  });
});
