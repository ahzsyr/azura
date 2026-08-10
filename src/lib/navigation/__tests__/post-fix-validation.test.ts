/**
 * Static post-fix validation checks supporting manual QA checklists.
 * Run: npx tsx --test src/lib/navigation/__tests__/post-fix-validation.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function readSrc(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

describe("builder post-fix validation (static)", () => {
  it("addBlock uses structuredClone to isolate BLOCK_DEFAULTS", async () => {
    const source = await readSrc("../../../features/builder/components/block-editor.tsx");
    assert.match(source, /structuredClone\(BLOCK_DEFAULTS/);
    assert.match(source, /migrateBlocksToBlockSystem|createBlock/);
  });

  it("display settings use safeParse fallbacks", async () => {
    const catalog = await readSrc("../../../schemas/catalog/display-settings.ts");
    const content = await readSrc("../../../schemas/content/display-settings.ts");
    assert.match(catalog, /safeParse/);
    assert.match(content, /safeParse/);
  });
});

describe("marketing post-fix validation (static)", () => {
  it("CmsPageRenderer wraps locale and translation fetches with fallbacks", async () => {
    const source = await readSrc("../../../features/cms/components/cms-page-renderer.tsx");
    assert.match(source, /FALLBACK_LOCALES/);
    assert.match(source, /listEnabledLocales/);
    assert.match(source, /pageTranslations/);
  });

  it("block renderers use safeParseProps in parse modules", async () => {
    const discovery = await readSrc("../../../features/discovery-blocks/lib/parse-block-props.ts");
    const media = await readSrc("../../../features/media-blocks/lib/parse-block-props.ts");
    const product = await readSrc("../../../features/product-blocks/lib/parse-block-props.ts");
    assert.match(discovery, /safeParseProps/);
    assert.match(media, /safeParseProps/);
    assert.match(product, /safeParseProps/);
  });

  it("strip migration does not throw on corrupt enums", async () => {
    const strip = await readSrc("../../../features/builder/migration/migrate-legacy-strip-block.ts");
    const upgrade = await readSrc("../../../features/builder/migration/upgrade-blocks.ts");
    assert.match(strip, /safeParseProps/);
    assert.match(upgrade, /try\s*\{[\s\S]*migrateLegacyStripBlocks/);
  });
});

describe("loading UX post-fix validation (static)", () => {
  it("uses stale-page hold with content-ready gating during navigation", async () => {
    const transition = await readSrc("../../../components/motion/marketing-page-transition.tsx");
    const preloader = await readSrc("../../../components/layout/site-preloader.tsx");
    const preloaderCss = await readSrc("../../../styles/site-preloader.css");
    const heroMotion = await readSrc("../../../styles/hero-motion.css");
    const css = await readSrc("../../../styles/route-loading.css");
    assert.doesNotMatch(transition, /overlaySkeleton/);
    assert.match(transition, /route-page-layer--stale/);
    assert.match(transition, /containsPartialRouteContent/);
    assert.doesNotMatch(transition, /runWithViewTransition\(commit/);
    assert.match(transition, /route-page-layer--active/);
    assert.match(transition, /isShellPreloading/);
    assert.match(preloader, /ROUTE_CONTENT_READY_EVENT/);
    assert.doesNotMatch(preloaderCss, /site-preloading \.site-shell/);
    assert.match(heroMotion, /\.hero-anim-entrance/);
    assert.match(heroMotion, /html\.hero-motion-armed/);
    assert.match(css, /route-page-enter 220ms cubic-bezier\(0\.22, 1, 0\.36, 1\)/);
  });
});

describe("console warnings documentation", () => {
  it("documents harmless GA and lazy-image console messages", async () => {
    const ga = await readSrc("../../../components/analytics/google-analytics.tsx");
    const img = await readSrc("../../../components/ui/optimized-image.tsx");
    assert.match(ga, /ERR_BLOCKED_BY_CLIENT/);
    assert.match(img, /Images loaded lazily/);
    assert.match(img, /preloaded resource was not used/);
  });
});

describe("carousel touch stability (static)", () => {
  it("updates arrow disabled state on settle, not select during drag", async () => {
    const carousel = await readSrc("../../../components/ui/carousel.tsx");
    assert.match(carousel, /api\.on\("settle", syncScrollButtons\)/);
    assert.doesNotMatch(carousel, /api\.on\("select", syncScrollButtons\)/);
    assert.doesNotMatch(carousel, /api\.on\("select", onSelect\)/);
    assert.match(carousel, /CarouselViewportContext/);
    assert.match(carousel, /api\.on\("pointerDown", onPointerDown\)/);
    assert.match(carousel, /useCarouselViewport\(\)/);
    assert.match(carousel, /prevButtonRef\.current\.disabled/);
    assert.doesNotMatch(carousel, /setCanScrollPrev/);
  });

  it("uses native scroll track on touch/tablet viewports in overflow sliders", async () => {
    const overflow = await readSrc("../../../features/builder/components/responsive-overflow-layout.tsx");
    const nativeHook = await readSrc("../../../lib/hooks/use-prefer-native-slider-track.ts");
    const stableHook = await readSrc("../../../lib/hooks/use-stable-device-breakpoint.ts");
    assert.match(overflow, /usePreferNativeSliderTrack/);
    assert.match(overflow, /useNativeTrack/);
    assert.match(overflow, /useStableDeviceBreakpoint/);
    assert.match(overflow, /useSimpleTrack \?\? true/);
    assert.match(nativeHook, /maxTouchPoints/);
    assert.match(nativeHook, /any-pointer: coarse/);
    assert.match(nativeHook, /SLIDER_NATIVE_MAX_PX/);
    assert.match(stableHook, /useActiveDeviceBreakpoint/);
  });

  it("defaults marketing overflow sliders to carousel arrow track", async () => {
    const marketing = await readSrc("../../../features/builder/components/marketing-items-overflow.tsx");
    assert.match(marketing, /useSimpleSliderTrack = false/);
  });

  it("compare slider drag avoids per-frame React setState", async () => {
    const compare = await readSrc(
      "../../../features/builder/blocks/marketing/components/compare-slider.tsx",
    );
    assert.match(compare, /applyPosition/);
    assert.doesNotMatch(compare, /setPosition/);
    assert.match(compare, /--compare-pos/);
  });

  it("native slider track CSS allows horizontal touch scrolling", async () => {
    const css = await readSrc("../../../styles/block-overflow.css");
    assert.match(css, /touch-action: pan-x/);
  });
});

describe("touch crash + preload policy (static)", () => {
  it("limits grid image preloads to a single LCP candidate", async () => {
    const grid = await readSrc("../../../features/products/components/listing/product-listing-grid.tsx");
    assert.match(grid, /GRID_PRIORITY_CARD_COUNT = 1/);
  });

  it("avoids duplicate header logo preloads from SSR shell", async () => {
    const shell = await readSrc("../../../components/layout/site-header-shell.tsx");
    assert.doesNotMatch(shell, /priority/);
  });

  it("optimized image only preloads when priority is explicit or unset aboveFold", async () => {
    const optimized = await readSrc("../../../components/ui/optimized-image.tsx");
    assert.match(optimized, /resolvedPriority = props\.priority/);
    assert.doesNotMatch(optimized, /priority=\{aboveFold \? true : props\.priority\}/);
  });

  it("keeps PDP gallery slide DOM stable during active changes", async () => {
    const gallery = await readSrc("../../../features/products/components/pdp/product-gallery.tsx");
    assert.match(gallery, /prd-gallery__asset-shared/);
    assert.doesNotMatch(gallery, /<SharedElementMarker/);
    assert.match(gallery, /requestAnimationFrame/);
  });

  it("product card media avoids keyed image remount on swipe", async () => {
    const card = await readSrc("../../../features/products/card-design/components/product-card-media.tsx");
    assert.doesNotMatch(card, /key=\{imageSrc\}/);
  });

  it("defers route commit while pointer gesture is active", async () => {
    const transition = await readSrc("../../../components/motion/marketing-page-transition.tsx");
    const gesture = await readSrc("../../../lib/hooks/use-pointer-gesture-active.ts");
    assert.match(transition, /usePointerGestureActive/);
    assert.match(transition, /runWhenGestureIdle/);
    assert.match(gesture, /pointerdown/);
  });
});
