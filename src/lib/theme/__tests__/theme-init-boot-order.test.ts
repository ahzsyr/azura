import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("theme-init boot order", () => {
  const source = readFileSync(
    join(process.cwd(), "public", "theme-init.js"),
    "utf8",
  );

  it("applies data-theme before the first chrome projection paint", () => {
    const themeAttr = source.indexOf('setAttribute("data-theme"');
    const firstSync = source.indexOf("syncThemeColorMetaFromProjection(false)");
    assert.ok(themeAttr > 0, "must set data-theme");
    assert.ok(firstSync > 0, "must call pre-hydration chrome sync");
    assert.ok(
      themeAttr < firstSync,
      "data-theme must precede syncThemeColorMetaFromProjection(false)",
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

  it("post-hydrate sync does not write tint vars or call visitorChromeColor", () => {
    assert.doesNotMatch(source, /visitorChromeColor\s*\(/);
    // mutateHead true: metas only — paintSafariChromeTint gated behind !mutateHead
    assert.match(
      source,
      /if \(!mutateHead\) \{\s*paintSafariChromeTint/s,
    );
    assert.match(
      source,
      /do NOT rewrite tint vars/,
    );
  });
});
