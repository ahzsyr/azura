import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldEnqueueProviderJob } from "@/features/seo/integrations/enqueue-policy";

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
});
