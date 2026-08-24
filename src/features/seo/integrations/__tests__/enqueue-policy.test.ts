import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  shouldEnqueueProviderJob,
  skippedProviderJobMessage,
  sitemapEnqueueEmptyMessage,
} from "@/features/seo/integrations/enqueue-policy";

describe("shouldEnqueueProviderJob", () => {
  it("skips Google for URL jobs", () => {
    assert.equal(shouldEnqueueProviderJob("google", "URL"), false);
  });

  it("allows Google sitemap jobs", () => {
    assert.equal(shouldEnqueueProviderJob("google", "SITEMAP"), true);
  });

  it("allows IndexNow and Bing URL jobs", () => {
    assert.equal(shouldEnqueueProviderJob("indexnow", "URL"), true);
    assert.equal(shouldEnqueueProviderJob("bing", "URL"), true);
  });

  it("skips IndexNow for sitemap jobs", () => {
    assert.equal(shouldEnqueueProviderJob("indexnow", "SITEMAP"), false);
    assert.equal(shouldEnqueueProviderJob("bing", "SITEMAP"), true);
  });

  it("skips Google Indexing API for sitemap jobs", () => {
    assert.equal(shouldEnqueueProviderJob("google_indexing", "SITEMAP"), false);
    assert.equal(shouldEnqueueProviderJob("google_indexing", "URL"), true);
  });

  it("explains skipped IndexNow sitemap jobs", () => {
    assert.match(
      skippedProviderJobMessage("indexnow", "SITEMAP") ?? "",
      /page URLs only/i,
    );
    assert.equal(skippedProviderJobMessage("indexnow", "URL"), null);
  });

  it("explains empty sitemap enqueue when only IndexNow is configured", () => {
    assert.match(
      sitemapEnqueueEmptyMessage({
        indexNowConfigured: true,
        bingConfigured: false,
        googleConfigured: false,
      }),
      /does not accept sitemap\.xml/i,
    );
  });
});
