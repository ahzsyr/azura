import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveSubmissionJobFix } from "../resolve-submission-job-fix";

describe("resolveSubmissionJobFix", () => {
  it("explains IndexNow Invalid URL failures", () => {
    const fix = resolveSubmissionJobFix({
      provider: "indexnow",
      kind: "URL",
      status: "FAILED",
      lastError: "Invalid URL",
    });
    assert.ok(fix);
    assert.match(fix.suggestion, /does not accept sitemap\.xml/i);
    assert.match(fix.suggestion, /www vs non-www/i);
    assert.equal(fix.fixHref, "/admin/seo/integrations?tab=configure&provider=indexnow");
  });

  it("explains IndexNow keyLocation host mismatches", () => {
    const fix = resolveSubmissionJobFix({
      provider: "indexnow",
      kind: "URL",
      status: "FAILED",
      lastError:
        '{"errorCode":"InvalidRequestParameters","message":"One or more URLs are not related to your site verified through the keylocation parameter. Please verify URLs before submitting.","details":null}',
    });
    assert.ok(fix);
    assert.match(fix.suggestion, /\{your-key\}\.txt/i);
    assert.equal(fix.fixHref, "/admin/seo/integrations?tab=configure&provider=indexnow");
    assert.equal(fix.fixLabel, "Open IndexNow");
  });

  it("explains leftover IndexNow sitemap skips as a host/kind mismatch", () => {
    const fix = resolveSubmissionJobFix({
      provider: "indexnow",
      kind: "SITEMAP",
      status: "FAILED",
      lastError: "Invalid URL",
    });
    assert.ok(fix);
    assert.match(fix.suggestion, /Bing or Google Search Console/i);
  });
});
