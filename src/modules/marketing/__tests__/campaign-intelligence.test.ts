import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildTrackingUrl } from "../tracking-urls/build-url";
import { mapUtmSourceToKey, classifyTrafficType } from "../sources/keys";

describe("marketing campaign intelligence helpers", () => {
  it("builds tracking URLs with normalized UTM params", () => {
    const url = buildTrackingUrl({
      baseUrl: "/solutions/enterprise-wireless",
      utmSource: "facebook",
      utmMedium: "paid_social",
      utmCampaign: "enterprise_wireless_2026",
      utmContent: "creative_a",
    });
    assert.match(url, /utm_source=facebook/);
    assert.match(url, /utm_medium=paid_social/);
    assert.match(url, /utm_campaign=enterprise_wireless_2026/);
    assert.match(url, /utm_content=creative_a/);
    assert.ok(url.startsWith("/solutions/enterprise-wireless"));
  });

  it("maps click ids and utm sources to MarketingSource keys", () => {
    assert.equal(mapUtmSourceToKey(undefined, "GCLID"), "google_ads");
    assert.equal(mapUtmSourceToKey(undefined, "FBCLID"), "meta_ads");
    assert.equal(mapUtmSourceToKey("linkedin", null), "linkedin_ads");
    assert.equal(mapUtmSourceToKey(undefined, null), "direct");
  });

  it("classifies paid vs organic traffic", () => {
    assert.equal(classifyTrafficType("paid", "cpc"), "paid");
    assert.equal(classifyTrafficType("organic", "organic"), "organic");
    assert.equal(classifyTrafficType("direct", null), "direct");
  });
});
