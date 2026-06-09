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
  it("overlay renders skeleton with visible contrast tokens", async () => {
    const transition = await readSrc("../../../components/motion/marketing-page-transition.tsx");
    const skeleton = await readSrc("../../../components/layout/page-loading-skeleton.tsx");
    const css = await readSrc("../../../styles/route-loading.css");
    assert.match(transition, /\{overlaySkeleton\}/);
    assert.match(transition, /route-loading-overlay--skeleton/);
    assert.match(skeleton, /bg-muted-foreground\/20/);
    assert.match(css, /\.route-loading-overlay--skeleton[\s\S]*background:\s*transparent/);
  });
});

describe("console warnings documentation", () => {
  it("documents harmless GA and lazy-image console messages", async () => {
    const ga = await readSrc("../../../components/analytics/google-analytics.tsx");
    const img = await readSrc("../../../components/ui/optimized-image.tsx");
    assert.match(ga, /ERR_BLOCKED_BY_CLIENT/);
    assert.match(img, /Images loaded lazily/);
  });
});
