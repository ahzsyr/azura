import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  buildThemeBootPayload,
  generateThemeBootInlineScript,
} from "@/lib/theme/theme-boot";
import { BROWSER_CHROME_FALLBACK } from "@/lib/theme/browser-chrome-projection";

describe("theme boot Liquid Glass", () => {
  it("includes glassEffect in boot payload defaults", () => {
    const payload = buildThemeBootPayload(BROWSER_CHROME_FALLBACK);
    assert.equal(payload.glassEffect.enabled, false);
    assert.equal(payload.glassEffect.intensity, 1);
    assert.equal(payload.glassEffect.opacity, 0.45);
    assert.equal(payload.browserProjection.chromeTintSource, "surface");
    assert.equal(payload.browserProjection.iosStatusBarStyle, "black-translucent");
    assert.ok(Array.isArray(payload.publishedPresetIds));
    assert.ok(payload.publishedPresetIds.length > 0);
    assert.equal(payload.storageKeys.presetOrigin, "devi-user-preset-origin");
  });

  it("serializes enabled glass settings into boot payload", () => {
    const payload = buildThemeBootPayload(BROWSER_CHROME_FALLBACK, {
      glassEffect: { enabled: true, intensity: 1.2, opacity: 0.33 },
    });
    assert.equal(payload.glassEffect.enabled, true);
    assert.equal(payload.glassEffect.intensity, 1.2);
    assert.equal(payload.glassEffect.opacity, 0.33);
  });

  it("inline boot script sets data-glass-effect and CSS vars", () => {
    const script = generateThemeBootInlineScript(BROWSER_CHROME_FALLBACK, {
      glassEffect: { enabled: true, intensity: 0.9, opacity: 0.4 },
    });
    assert.match(script, /glassEffect/);
    assert.match(script, /data-glass-effect/);
    assert.match(script, /--glass-effect-intensity/);
    assert.match(script, /--glass-effect-opacity/);
    assert.match(script, /--az-site-glass-tint/);
    assert.match(script, /--az-site-glass-fill-alpha/);
    assert.match(script, /glassTintLight|proj\.glassTint/);
    assert.match(script, /data-chrome-tint-source/);
    assert.match(script, /data-ios-status-bar/);
    assert.match(script, /tintStyle==="solid"/);
    assert.doesNotMatch(script, /setProperty\("--az-chrome-tint-mix"/);
    assert.match(script, /site-preloading-done/);
    assert.match(script, /runAfterHydration/);
  });
});

describe("safari chrome anchor contract", () => {
  it("clips the page only for solid and edge-to-edge off", () => {
    const cssPath = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../../styles/safari-chrome-tint.css",
    );
    const css = readFileSync(cssPath, "utf8");
    assert.match(css, /data-chrome-tint-style="transparent"/);
    assert.match(css, /data-chrome-tint-style="glass"/);
    assert.match(css, /data-chrome-tint-style="solid"/);
    assert.match(css, /data-chrome-tint-style="gradient"/);
    assert.match(css, /data-ios-status-bar="black"/);
    assert.match(css, /data-ios-status-bar="default"/);
    assert.match(css, /data-edge-to-edge="off"\] body/);
    assert.match(
      css,
      /html\[data-safari-edge="on"\]\[data-chrome-tint-style="solid"\] #az-page-paint,\s*html\[data-safari-edge="on"\]\[data-edge-to-edge="off"\] #az-page-paint/,
    );
  });

  it("tints the status bar from the site bar for transparent and glass", () => {
    const stylesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../styles");
    const css = readFileSync(path.join(stylesDir, "safari-chrome-tint.css"), "utf8");
    const edge = readFileSync(path.join(stylesDir, "edge-to-edge.css"), "utf8");
    assert.doesNotMatch(css, /data-chrome-tint-style="glass"\][^{]*#az-safari-chrome-[a-z]+[^{]*\{[^}]*color-mix/);
    assert.doesNotMatch(css, /data-chrome-tint-style="glass"\][^{]*\{[^}]*backdrop-filter: blur/);
    assert.match(
      css,
      /html:is\(\[data-chrome-tint-style="transparent"\], \[data-chrome-tint-style="glass"\]\)[^{]*#az-safari-chrome-top \{[^}]*height: max\(var\(--az-top-band-min, 12px\), env\(safe-area-inset-top, 0px\)\);[^}]*background-color: var\(--az-status-bar-tint/,
    );
    assert.match(
      css,
      /\[data-chrome-tint-source="primary"\] \{\s*--az-status-bar-tint: color-mix\(\s*in srgb,\s*var\(--primary/,
    );
    assert.doesNotMatch(edge, /\.header-root\[data-chrome-tint-source="primary"\] \.site-header/);
    assert.match(
      edge,
      /html\[data-chrome-tint-style="glass"\] \.az-chrome-scroll-edge,\s*html\[data-chrome-tint-style="transparent"\] \.az-chrome-scroll-edge \{\s*display: none;/,
    );
    assert.doesNotMatch(css, /#az-safari-chrome-top \{\s*display: none;\s*\}\s*\n\s*html:is/);
    assert.match(css, /\) body \{\s*background-color: transparent;/);
    assert.match(
      edge,
      /html\[data-chrome-tint-style="transparent"\] \.az-chrome-tint-zone,\s*html\[data-chrome-tint-style="glass"\] \.az-chrome-tint-zone \{\s*display: none;/,
    );
  });
});

describe("site-glass-effect surface coverage", () => {
  it("targets functional chrome classes instead of missing data-slot attrs", () => {
    const cssPath = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../../styles/site-glass-effect.css",
    );
    const css = readFileSync(cssPath, "utf8");
    assert.match(css, /\.dialog-content/);
    assert.match(css, /\.sheet-content/);
    assert.match(css, /\.dropdown-menu-content/);
    assert.match(css, /\.tooltip-content/);
    assert.match(css, /\.header-root \.site-header/);
    assert.match(css, /--az-site-glass-tint/);
    assert.match(css, /data-glass-transition="cheap"/);
    assert.doesNotMatch(css, /data-slot="dialog-content"/);
    // Content-layer surfaces must not receive Liquid Glass fill (Apple materials).
    assert.doesNotMatch(
      css,
      /\[data-glass-effect="liquid"\] \.pl-table-wrap,\s*\n\[data-glass-effect="liquid"\]/,
    );
    assert.doesNotMatch(
      css,
      /\[data-glass-effect="liquid"\] \.az-form-surface,\s*\n\[data-glass-effect="liquid"\]/,
    );
  });
});

describe("visual-effects-coordinator glass signature", () => {
  it("includes glassEffectEnabled and glass settings in signature source", async () => {
    const srcPath = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "../visual-effects-coordinator.ts",
    );
    const source = readFileSync(srcPath, "utf8");
    assert.match(source, /resolved\.glassEffectEnabled/);
    assert.match(source, /visualEffectSettingsSignature\(resolved\.glassEffectSettings\)/);
  });
});
