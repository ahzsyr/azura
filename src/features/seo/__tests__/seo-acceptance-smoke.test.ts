/**
 * Staging acceptance criteria (static source checks).
 * Run: npx tsx --test src/features/seo/__tests__/seo-acceptance-smoke.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function readSrc(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

describe("SEO staging acceptance (static)", () => {
  it("Yoast head API is public and returns html/json/status shape", async () => {
    const head = await readSrc("../../../app/api/seo/head/route.ts");
    assert.doesNotMatch(head, /requireAdmin/);
    assert.match(head, /serializeYoastHead/);
    assert.match(head, /searchParams\.get\("url"\)/);
  });

  it("wp-json Yoast alias rewrites to /api/seo/head", async () => {
    const config = await readSrc("../../../../next.config.ts");
    assert.match(config, /\/wp-json\/yoast\/v1\/get_head/);
    assert.match(config, /destination:\s*"\/api\/seo\/head"/);
  });

  it("analyze and debug routes require admin session", async () => {
    const analyze = await readSrc("../../../app/api/seo/analyze/route.ts");
    const debug = await readSrc("../../../app/api/seo/debug/route.ts");
    for (const src of [analyze, debug]) {
      assert.match(src, /requireAdmin/);
      assert.match(src, /status:\s*401/);
    }
  });

  it("robots.txt references sitemap_index and blocks admin/api", async () => {
    const robots = await readSrc("../../../app/robots.ts");
    assert.match(robots, /sitemap_index\.xml/);
    assert.match(robots, /\/admin\//);
    assert.match(robots, /\/api\//);
  });

  it("sitemap index route always returns 200 XML on failure", async () => {
    const index = await readSrc("../../../app/sitemap_index.xml/route.ts");
    const child = await readSrc("../../../app/sitemaps/[file]/route.ts");
    const service = await readSrc("../sitemap-index.service.ts");
    assert.match(index, /formatSitemapIndexXml/);
    assert.match(index, /SITEMAP_XML_HEADERS/);
    assert.match(index, /maxDuration/);
    assert.match(index, /minimalSitemapIndexXml/);
    assert.match(index, /status:\s*200/);
    assert.doesNotMatch(index, /status:\s*503/);
    assert.match(child, /maxDuration/);
    assert.match(child, /emptySitemapUrlsetXml/);
    assert.match(child, /status:\s*200/);
    assert.doesNotMatch(child, /status:\s*503/);
    assert.match(service, /noindex,\s*follow/);
    assert.match(service, /-sitemap\.xml/);
    assert.doesNotMatch(service, /resolveSeoDocument/);
  });

  it("legacy monolithic sitemap.ts is removed", async () => {
    const { access } = await import("node:fs/promises");
    await assert.rejects(
      access(new URL("../../../app/sitemap.ts", import.meta.url)),
      /ENOENT/,
    );
  });

  it("sitemap.xml redirects to sitemap_index", async () => {
    const config = await readSrc("../../../../next.config.ts");
    assert.match(config, /source:\s*"\/sitemap\.xml"/);
    assert.match(config, /sitemap_index\.xml/);
  });

  it("Search Appearance admin form persists seo-appearance JsonStore", async () => {
    const form = await readSrc("../admin/search-appearance-form.tsx");
    const constants = await readSrc("../constants.ts");
    assert.match(form, /search-appearance-form|SearchAppearance/);
    assert.match(constants, /SEO_APPEARANCE_NAMESPACE|seo-appearance/);
  });

  it("SEO triggers revalidate affected paths after save", async () => {
    const trigger = await readSrc("../triggers/seo-trigger.service.ts");
    assert.match(trigger, /revalidatePath/);
  });

  it("production routes use seoService.resolveMetadata not buildMetadata", async () => {
    const home = await readSrc("../../../app/[locale]/(marketing)/page.tsx");
    assert.match(home, /seoService\.resolveMetadata|resolveMetadata/);
    assert.doesNotMatch(home, /buildMetadata\(/);
    assert.match(home, /fallback:\s*homeFallback|fallback:\s*\{/);
    assert.match(home, /path:\s*"\/"/);
  });

  it("seoService never falls back to empty title", async () => {
    const service = await readSrc("../seo.service.ts");
    assert.match(service, /resolveSafeMetadataFallback|absoluteTitle/);
    assert.match(service, /title:\s*\{\s*absolute:/);
    assert.doesNotMatch(service, /title:\s*params\.fallback\?\.title\s*\|\|\s*""/);
  });

  it("documentToMetadata emits absolute titles", async () => {
    const doc = await readSrc("../core/document-to-metadata.ts");
    assert.match(doc, /absolute:\s*doc\.title/);
  });

  it("parseMarketingPath treats / as English home", async () => {
    const parser = await readSrc("../platform/schema-pipeline/context/parse-marketing-path.ts");
    assert.match(parser, /pageKey:\s*"home"/);
    assert.match(parser, /defaultLocalePrefix/);
    assert.doesNotMatch(parser, /if\s*\(!segments\.length\)\s*return\s*null/);
  });
});
