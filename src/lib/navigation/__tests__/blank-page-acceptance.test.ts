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
    assert.match(transition, /forceCommitted/);
    assert.match(transition, /router\.refresh/);
    assert.doesNotMatch(transition, /isRealContent/);
    assert.doesNotMatch(transition, /isShellPreloading/);
    assert.doesNotMatch(transition, /return null;/);
  });

  it("home page uses compile-time build shell only, not runtime BUILD_WITHOUT_DB", async () => {
    const home = await readSrc("../../../app/[locale]/(marketing)/page.tsx");
    assert.match(home, /isCompileTimeBuildWithoutDb/);
    assert.doesNotMatch(home, /<main\b/);
    assert.doesNotMatch(home, /isBuildWithoutDb\(\)/);
    assert.doesNotMatch(home, /await\s+revalidatePath\(|revalidatePath\(\s*[`'"]/);
  });

  it("marketing pages do not nest main landmarks inside the locale layout main", async () => {
    const homeFallback = await readSrc("../../../components/marketing/home/home-fallback-landing.tsx");
    const statusPage = await readSrc("../../../features/cms/components/branded-status-page.tsx");
    assert.doesNotMatch(homeFallback, /<main\b/);
    assert.doesNotMatch(statusPage, /<main\b/);
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

  it("preloader hard cap is a shared 2s constant", async () => {
    const timing = await readSrc("../../../lib/preloader/preloader-timing.ts");
    const resolve = await readSrc("../../../features/preloader/resolve-site-preloader.ts");
    const applyBoot = await readSrc("../../../lib/locale-boot/apply-locale-boot.ts");
    const themeBoot = await readSrc("../../../lib/theme/theme-boot.ts");
    const themeInit = await readFile(
      new URL("../../../../public/theme-init.js", import.meta.url),
      "utf8",
    );
    assert.match(timing, /PRELOADER_HARD_CAP_MS = 2000/);
    assert.match(resolve, /PRELOADER_HARD_CAP_MS/);
    assert.match(applyBoot, /PRELOADER_HARD_CAP_MS/);
    assert.match(themeBoot, /\$\{PRELOADER_HARD_CAP_MS\}/);
    assert.match(themeInit, /syncThemeColorMetaFromProjection\(false\)/);
    assert.match(themeInit, /syncThemeColorMetaFromProjection\(true\)/);
    assert.equal(
      themeInit.match(/syncThemeColorMetaFromProjection\(false\)/g)?.length,
      1,
    );
    assert.equal(
      themeInit.match(/syncThemeColorMetaFromProjection\(true\)/g)?.length,
      1,
    );
    assert.doesNotMatch(themeInit, /document\.body\.appendChild/);
    assert.match(themeInit, /Do not set --primary/);
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
    assert.doesNotMatch(rootLayout, /src="\/theme-init\.js"/);
    assert.doesNotMatch(sitePreloader, /showPreloader\(false\)/);
  });

  it("does not inject extra body nodes before hydration", async () => {
    const themeInit = await readFile(
      new URL("../../../../public/theme-init.js", import.meta.url),
      "utf8",
    );
    const applyBoot = await readSrc("../../../lib/locale-boot/apply-locale-boot.ts");
    const rootLayout = await readSrc("../../../app/layout.tsx");
    const removeBoot = await readSrc("../../../lib/preloader/boot-preloader.ts");
    assert.match(rootLayout, /SAFARI_CHROME_TOP_ID/);
    assert.match(rootLayout, /SAFARI_CHROME_BOTTOM_ID/);
    assert.doesNotMatch(themeInit, /document\.body\.appendChild/);
    assert.match(themeInit, /runAfterHydration/);
    assert.match(themeInit, /syncThemeColorMetaFromProjection\(false\)/);
    assert.match(themeInit, /syncThemeColorMetaFromProjection\(true\)/);
    assert.doesNotMatch(themeInit, /setTimeout\(fn,\s*600\)/);
    assert.match(applyBoot, /typeof document === "undefined"/);
    assert.doesNotMatch(removeBoot, /getElementById\(["']azura-boot-preloader["']\)/);
  });

  it("dismisses the boot preloader from html classes if hydration never runs", async () => {
    const themeBoot = await readSrc("../../../lib/theme/theme-boot.ts");
    assert.match(themeBoot, /site-preloading-done/);
    assert.match(themeBoot, /setTimeout/);
    assert.doesNotMatch(themeBoot, /azura-boot-preloader/);
  });

  it("root document stops a replaceState loop and mounts nuqs once", async () => {
    const layout = await readSrc("../../../app/layout.tsx");
    const shell = await readSrc("../../../capabilities/search/query/search-query-shell.tsx");
    const nuqs = await readSrc("../../../components/providers/nuqs-provider.tsx");
    assert.match(layout, /az-history-loop-guard/);
    assert.match(layout, /HISTORY_LOOP_GUARD_SCRIPT/);
    assert.match(nuqs, /<NuqsAdapter>/);
    assert.doesNotMatch(shell, /<NuqsAdapter>/);
  });

  it("admin chrome does not prefetch routes that redirect back to account settings", async () => {
    const topBar = await readSrc("../../../components/admin/layout/admin-top-bar.tsx");
    const crumbs = await readSrc("../../../components/admin/layout/admin-breadcrumbs.tsx");
    const account = await readSrc("../../../components/admin/admin-account-form.tsx");
    assert.match(topBar, /href="\/admin"\s+prefetch=\{false\}/);
    assert.match(crumbs, /prefetch=\{false\}/);
    assert.match(
      account,
      /isMasterAdmin \? \([\s\S]*href="\/admin\/settings\/portal"\s+prefetch=\{false\}/,
    );
  });

  it("public marketing setup resolution prefers API status for site access", async () => {
    const setup = await readSrc("../../../features/setup/setup-middleware.ts");
    assert.match(setup, /resolveSetupStatusForPublicMarketing/);
    assert.match(setup, /fetchAuthoritativeSetupStatus/);
    const resolveIdx = setup.indexOf("export async function resolveSetupStatus");
    const apiCallIdx = setup.indexOf("fetchAuthoritativeSetupStatus(request)", resolveIdx);
    const cookieFallbackIdx = setup.indexOf("setupStatusFromCookieFallback()", resolveIdx);
    assert.ok(resolveIdx > 0);
    assert.ok(apiCallIdx > resolveIdx);
    assert.ok(cookieFallbackIdx > apiCallIdx);
  });
});
