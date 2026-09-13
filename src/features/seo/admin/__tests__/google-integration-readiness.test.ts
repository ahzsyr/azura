import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { googleHealthMessage, isGoogleIntegrationHealthy } from "../google-integration-readiness";

describe("google-integration-readiness", () => {
  const baseConfig = {
    enabled: true,
    analyticsEnabled: true,
    siteUrl: "https://brt-me.com",
    ga4PropertyId: "123456789",
    bearerToken: "token",
  };

  it("reports configured locally before API verification", () => {
    assert.match(googleHealthMessage(baseConfig), /GSC sitemap configured/);
    assert.match(googleHealthMessage(baseConfig), /GA4 configured/);
  });

  it("reports API access issues after verification", () => {
    assert.match(
      googleHealthMessage(baseConfig, {
        gscSiteAccessible: false,
        availableGscSites: ["https://other.example/"],
      }),
      /https:\/\/brt-me\.com is not in your Search Console account/,
    );
    assert.match(
      googleHealthMessage(baseConfig, {
        gscSiteAccessible: false,
        availableGscSites: ["sc-domain:brt-me.net", "https://other.example/"],
      }),
      /Properties on this account: sc-domain:brt-me\.net or https:\/\/other\.example\//,
    );
  });

  it("reports connected when configured URL-prefix matches a domain property", () => {
    assert.match(
      googleHealthMessage(baseConfig, {
        gscSiteAccessible: true,
        matchedGscSiteUrl: "sc-domain:brt-me.com",
      }),
      /GSC sitemap connected/,
    );
    assert.equal(
      isGoogleIntegrationHealthy(baseConfig, {
        gscSiteAccessible: true,
        matchedGscSiteUrl: "sc-domain:brt-me.com",
      }),
      true,
    );
  });

  it("marks integration unhealthy when verification fails", () => {
    assert.equal(
      isGoogleIntegrationHealthy(baseConfig, {
        gscSiteAccessible: false,
      }),
      false,
    );
  });
});
