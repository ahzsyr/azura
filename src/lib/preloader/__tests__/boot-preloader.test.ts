import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DEFAULT_SITE_PRELOADER } from "@/features/preloader/site-preloader.schema";
import type { ResolvedSitePreloader } from "@/features/preloader/resolve-site-preloader";
import {
  buildBootPreloaderCenterHtml,
  buildBootTintedLogoHtml,
} from "@/lib/preloader/boot-preloader";

function settings(
  overrides: Partial<ResolvedSitePreloader> = {},
): ResolvedSitePreloader {
  return {
    ...DEFAULT_SITE_PRELOADER,
    resolvedLogoUrl: "/assets/brand-logo.svg",
    ...overrides,
  };
}

describe("boot preloader themed logo", () => {
  it("tints the boot logo with a CSS mask so first paint tracks --primary", () => {
    const html = buildBootPreloaderCenterHtml(settings());
    assert.match(html, /brand-logo-tint/);
    assert.match(html, /--pre-logo-mask:url\(/);
    assert.match(html, /brand-logo-tint__sizer/);
    assert.doesNotMatch(html, /<img src="\/assets\/brand-logo\.svg" alt="" width="80" height="80" \/>/);
  });

  it("escapes logo URLs used as CSS masks", () => {
    const html = buildBootTintedLogoHtml("/assets/logo.svg");
    assert.match(html, /--pre-logo-mask:url\(&quot;\/assets\/logo\.svg&quot;\)/);
  });

  it("does not mutate the boot preloader node (React #418)", () => {
    const applyBoot = readFileSync(
      new URL("../../../lib/locale-boot/apply-locale-boot.ts", import.meta.url),
      "utf8",
    );
    assert.match(applyBoot, /site-preloading-done/);
    assert.doesNotMatch(applyBoot, /azura-boot-preloader[\s\S]*classList\.add\("hidden"\)/);
    assert.doesNotMatch(applyBoot, /setAttribute\("aria-hidden"/);
  });
});
