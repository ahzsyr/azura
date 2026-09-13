/**
 * Hard acceptance criteria for blank-page / loading UX (static source checks).
 * Run: npx tsx --test src/lib/navigation/__tests__/blank-page-acceptance.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function readSrc(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

describe("blank-page acceptance criteria (static)", () => {
  it("does not hide .route-page-layer via visibility:hidden during site-preloading", async () => {
    const css = await readSrc("../../../styles/site-preloader.css");
    assert.doesNotMatch(
      css,
      /site-preloading[\s\S]*\.route-page-layer[\s\S]*visibility:\s*hidden/,
    );
  });

  it("MarketingPageTransition shows pendingFallback and never gates on site-preloading", async () => {
    const transition = await readSrc("../../../components/motion/marketing-page-transition.tsx");
    assert.match(transition, /pendingFallback/);
    assert.match(transition, /PageLoadingSkeleton/);
    assert.match(transition, /isBuildShell/);
    assert.match(transition, /PENDING_PRELOADER_ESCAPE_MS/);
    assert.doesNotMatch(transition, /isShellPreloading/);
    assert.doesNotMatch(transition, /classList\.contains\(["']site-preloading["']\)/);
    assert.doesNotMatch(transition, /return null;/);
  });

  it("home page uses compile-time build shell only, not runtime BUILD_WITHOUT_DB", async () => {
    const home = await readSrc("../../../app/[locale]/(marketing)/page.tsx");
    assert.match(home, /isCompileTimeBuildWithoutDb/);
    assert.doesNotMatch(home, /isBuildWithoutDb\(\)/);
    assert.doesNotMatch(home, /await\s+revalidatePath\(|revalidatePath\(\s*[`'"]/);
  });

  it("locale layout stays force-dynamic until ISR is Hostinger-safe", async () => {
    const layout = await readSrc("../../../app/[locale]/layout.tsx");
    assert.match(layout, /force-dynamic/);
  });

  it("critical layout data does not await tracking/popup/metaPixel", async () => {
    const loader = await readSrc("../../../features/i18n/load-locale-layout-data.ts");
    assert.doesNotMatch(loader, /resolveActiveMetaPixel/);
    assert.doesNotMatch(loader, /resolveSitePopups/);
    assert.doesNotMatch(loader, /getTrackingConfig/);
    assert.match(loader, /loadPublicShellContext/);
  });

  it("preloader default max duration is capped near 4s", async () => {
    const schema = await readSrc("../../../features/preloader/site-preloader.schema.ts");
    const resolve = await readSrc("../../../features/preloader/resolve-site-preloader.ts");
    const applyBoot = await readSrc("../../../lib/locale-boot/apply-locale-boot.ts");
    assert.match(schema, /maxDurationMs:\s*4000/);
    assert.match(resolve, /Math\.min\(settings\.maxDurationMs,\s*4000\)/);
    assert.match(applyBoot, /4000/);
  });

  it("boot preloader logo is CSS-masked to the active theme primary", async () => {
    const boot = await readSrc("../../../lib/preloader/boot-preloader.ts");
    const css = await readSrc("../../../styles/site-preloader.css");
    const localeBootClient = await readSrc("../../../components/layout/locale-boot-client.tsx");
    const applyBoot = await readSrc("../../../lib/locale-boot/apply-locale-boot.ts");
    const themeStyles = await readSrc("../../../components/theme/theme-styles.tsx");
    const sitePreloader = await readSrc("../../../components/layout/site-preloader.tsx");
    const rootLayout = await readSrc("../../../app/layout.tsx");
    assert.match(boot, /buildBootTintedLogoHtml/);
    assert.match(boot, /brand-logo-tint/);
    assert.match(css, /--pre-primary:\s*var\(--primary\)/);
    assert.doesNotMatch(css, /#00d4ff/);
    assert.match(localeBootClient, /useLayoutEffect/);
    assert.match(localeBootClient, /azura:hydrated/);
    assert.match(applyBoot, /site-preloading-done/);
    assert.doesNotMatch(themeStyles, /<link rel="stylesheet"/);
    assert.match(rootLayout, /<head>/);
    assert.match(rootLayout, /resolvePublishedSiteTheme/);
    assert.doesNotMatch(sitePreloader, /showPreloader\(false\)/);
  });

  it("does not inject extra body nodes before hydration", async () => {
    const themeInit = await readFile(
      new URL("../../../../public/theme-init.js", import.meta.url),
      "utf8",
    );
    const applyBoot = await readSrc("../../../lib/locale-boot/apply-locale-boot.ts");
    const rootLayout = await readSrc("../../../app/layout.tsx");
    assert.match(rootLayout, /SAFARI_CHROME_TOP_ID/);
    assert.match(rootLayout, /SAFARI_CHROME_BOTTOM_ID/);
    assert.doesNotMatch(themeInit, /document\.body\.appendChild/);
    assert.match(themeInit, /runAfterHydration/);
    assert.doesNotMatch(themeInit, /setTimeout\(fn,\s*600\)/);
    assert.match(applyBoot, /typeof document === "undefined"/);
  });

  it("public marketing setup resolution prefers durable state before HTTP", async () => {
    const setup = await readSrc("../../../features/setup/setup-middleware.ts");
    assert.match(setup, /resolveSetupStatusForPublicMarketing/);
    assert.match(setup, /hasSetupCompleteCookie/);
    assert.match(setup, /getMiddlewareManifestSetup/);
    const cookieIdx = setup.indexOf("hasSetupCompleteCookie");
    const fetchIdx = setup.indexOf("fetchSetupStatusFromApi");
    assert.ok(cookieIdx > 0 && fetchIdx > cookieIdx);
  });
});
