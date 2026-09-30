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
  });
});

describe("site-glass-effect surface coverage", () => {
  it("targets real UI classes instead of missing data-slot attrs", () => {
    const cssPath = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../../styles/site-glass-effect.css",
    );
    const css = readFileSync(cssPath, "utf8");
    assert.match(css, /\.dialog-content/);
    assert.match(css, /\.sheet-content/);
    assert.match(css, /\.dropdown-menu-content/);
    assert.match(css, /\.tooltip-content/);
    assert.match(css, /\.az-ab/);
    assert.match(css, /\.pl-table-wrap/);
    assert.match(css, /--az-site-glass-tint/);
    assert.match(css, /data-glass-transition="cheap"/);
    assert.doesNotMatch(css, /data-slot="dialog-content"/);
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
