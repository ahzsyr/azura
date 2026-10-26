import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

describe("llms.txt publication contract", () => {
  it("generates drafts from the published sitemap pipeline, not draft tables", async () => {
    const service = await read("../llms.service.ts");
    assert.match(service, /generateSitemap\(/);
    assert.doesNotMatch(service, /status:\s*"DRAFT"/);
    assert.doesNotMatch(service, /prisma\.(contentItem|post|cmsPage)\.findMany/);
  });

  it("serves the saved document through the cached public service", async () => {
    const route = await read("../../../../app/api/seo/llms/route.ts");
    assert.match(route, /loadPublicLlmsTxt/);
    assert.match(route, /text\/plain/);
    assert.match(route, /status === "disabled"/);
    assert.match(route, /buildLlmsTxtEmergencyBody/);
  });

  it("rewrites /llms.txt to the SEO API route", async () => {
    const config = await read("../../../../../next.config.ts");
    assert.match(config, /source:\s*"\/llms\.txt"/);
    assert.match(config, /destination:\s*"\/api\/seo\/llms"/);
  });
});
