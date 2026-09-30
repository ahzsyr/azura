import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { WebsiteBuilder } from "@/features/seo/platform/schema-pipeline/builders/website.builder";
import { createHomeContextFixture } from "@/features/seo/platform/schema-pipeline/__tests__/fixtures";

describe("WebsiteBuilder SearchAction", () => {
  it("uses unprefixed /search for default English locale", () => {
    const ctx = createHomeContextFixture();
    ctx.runtime.siteOrigin = "https://brt-me.com";
    ctx.runtime.publicSearchEnabled = true;

    const [node] = WebsiteBuilder.build(ctx);
    const action = node?.potentialAction as
      | { target?: { urlTemplate?: string } }
      | undefined;

    assert.equal(
      action?.target?.urlTemplate,
      "https://brt-me.com/search?q={search_term_string}",
    );
  });

  it("keeps locale prefix for non-default locales", () => {
    const ctx = createHomeContextFixture();
    ctx.runtime.siteOrigin = "https://brt-me.com";
    ctx.runtime.localePrefix = "ar";
    ctx.runtime.locale = "ar";
    ctx.runtime.publicSearchEnabled = true;

    const [node] = WebsiteBuilder.build(ctx);
    const action = node?.potentialAction as
      | { target?: { urlTemplate?: string } }
      | undefined;

    assert.equal(
      action?.target?.urlTemplate,
      "https://brt-me.com/ar/search?q={search_term_string}",
    );
  });
});
