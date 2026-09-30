import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildTrackingUrl,
  buildShortShareUrl,
  buildCleanLandingUrl,
  parseShortCampaignId,
  resolveCampaignParamFromSearchParams,
  resolveBindingIdFromSearchParams,
  buildGoogleAdsFinalUrlSuffix,
} from "../tracking-urls/build-url";
import { mapUtmSourceToKey, classifyTrafficType } from "../sources/keys";
import {
  mergeAttributionSnapshot,
  isGenuineNewCampaignEntry,
  type AttributionSnapshot,
} from "@/features/marketing-attribution/client";
import { parseUserAgent } from "../attribution/ua-geo";
import { classifyGoogleMatch } from "../campaigns/match-google-classify";
import {
  resolveGoogleProviderBindingId,
  shouldRefreshAccessToken,
  resolveCampaignSpendFromBindingRollups,
} from "../campaigns/binding-resolution";
import {
  buildGoogleAdsRequestContext,
  normalizeGoogleAdsCustomerId,
} from "../providers/google-ads/sdk/api";
import { deriveGoogleAdsReadiness } from "../providers/google-ads/readiness";
import { mapOperationalToMarketingContext } from "../providers/google-ads/readiness";

describe("marketing campaign intelligence helpers", () => {
  it("builds short share URLs as /a?identifier", () => {
    assert.equal(
      buildShortShareUrl({ campaignParam: "test", siteOrigin: "https://brt-me.com" }),
      "https://brt-me.com/a?test",
    );
  });

  it("builds clean landing URLs without tracking query params", () => {
    assert.equal(
      buildCleanLandingUrl({
        baseUrl: "/products",
        siteOrigin: "https://brt-me.com",
        localePrefix: "en",
      }),
      "https://brt-me.com/products",
    );
  });

  it("builds clean landing paths without a site origin (redirect-safe)", () => {
    assert.equal(
      buildCleanLandingUrl({
        baseUrl: "/products",
        localePrefix: "en",
      }),
      "/products",
    );
  });

  it("parses short campaign ids from /a?test and /a?a=test", () => {
    assert.equal(
      parseShortCampaignId({
        pathname: "/a",
        searchParams: new URLSearchParams("test"),
      }),
      "test",
    );
    assert.equal(
      parseShortCampaignId({
        pathname: "/a",
        searchParams: new URLSearchParams("a=test"),
      }),
      "test",
    );
    assert.equal(
      parseShortCampaignId({
        pathname: "/a/summer_radio",
        searchParams: new URLSearchParams(),
      }),
      "summer_radio",
    );
  });

  it("builds absolute tracking URLs with a= and campaign=", () => {
    const url = buildTrackingUrl({
      baseUrl: "/contact",
      campaignParam: "campaign1",
      siteOrigin: "https://example.com",
    });
    assert.equal(
      url,
      "https://example.com/contact?a=campaign1&campaign=campaign1",
    );
  });

  it("builds tracking URLs with optional UTMs when provided", () => {
    const url = buildTrackingUrl({
      baseUrl: "/contact",
      campaignParam: "summer_radio",
      siteOrigin: "https://example.com",
      utmSource: "radio",
      utmMedium: "offline",
      utmContent: "spot_a",
    });
    assert.match(url, /^https:\/\/example\.com\/contact\?/);
    assert.match(url, /a=summer_radio/);
    assert.match(url, /campaign=summer_radio/);
    assert.match(url, /utm_source=radio/);
    assert.match(url, /utm_medium=offline/);
    assert.match(url, /utm_campaign=summer_radio/);
    assert.match(url, /utm_content=spot_a/);
  });

  it("defaults utm_campaign when optional UTMs are present", () => {
    const url = buildTrackingUrl({
      baseUrl: "/solutions/enterprise-wireless",
      campaignParam: "enterprise_wireless_2026",
      utmSource: "facebook",
      utmMedium: "paid_social",
    });
    assert.match(url, /campaign=enterprise_wireless_2026/);
    assert.match(url, /a=enterprise_wireless_2026/);
    assert.match(url, /utm_campaign=enterprise_wireless_2026/);
  });

  it("resolves campaign param order: campaign → a → utm_campaign", () => {
    assert.equal(
      resolveCampaignParamFromSearchParams(
        new URLSearchParams("campaign=summer_radio&a=legacy&utm_campaign=utm_label"),
      ),
      "summer_radio",
    );
    assert.equal(
      resolveCampaignParamFromSearchParams(new URLSearchParams("a=legacy&utm_campaign=utm_label")),
      "legacy",
    );
    assert.equal(
      resolveCampaignParamFromSearchParams(new URLSearchParams("utm_campaign=utm_label")),
      "utm_label",
    );
    assert.equal(resolveCampaignParamFromSearchParams(new URLSearchParams("")), null);
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

  it("parses UA into device/browser/os without storing IP", () => {
    const mobile = parseUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    );
    assert.equal(mobile.deviceType, "mobile");
    assert.equal(mobile.browser, "Safari");
    assert.equal(mobile.os, "iOS");

    const desktop = parseUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );
    assert.equal(desktop.deviceType, "desktop");
    assert.equal(desktop.browser, "Chrome");
    assert.equal(desktop.os, "Windows");
  });
});

describe("first-touch attribution persistence", () => {
  const basePrev: AttributionSnapshot = {
    visitorToken: "v1",
    sessionToken: "s1",
    consentStatus: "GRANTED",
    campaignParam: "summer_radio",
    utmSource: "radio",
    utmMedium: "offline",
    utmCampaign: "summer_radio",
    landingPagePath: "/contact",
    entryUrl: "https://example.com/contact?campaign=summer_radio",
    referrer: "https://radio.example/",
  };

  it("does not overwrite first-touch fields on param-less navigation", () => {
    const merged = mergeAttributionSnapshot(
      basePrev,
      {
        visitorToken: "v1",
        sessionToken: "s1",
        consentStatus: "GRANTED",
        landingPagePath: "/products/dmr-radios",
        entryUrl: "https://example.com/products/dmr-radios",
        referrer: undefined,
      },
      { hasGenuineNewEntry: false, urlHasAnyEntryParams: false },
    );
    assert.equal(merged.campaignParam, "summer_radio");
    assert.equal(merged.utmSource, "radio");
    assert.equal(merged.landingPagePath, "/contact");
    assert.equal(merged.entryUrl, "https://example.com/contact?campaign=summer_radio");
    assert.equal(merged.referrer, "https://radio.example/");
  });

  it("keeps first landing when a genuine new campaign arrives (last-touch UTMs update)", () => {
    const merged = mergeAttributionSnapshot(
      basePrev,
      {
        visitorToken: "v1",
        sessionToken: "s2",
        consentStatus: "GRANTED",
        campaignParam: "winter_email",
        utmSource: "email",
        utmMedium: "email",
        utmCampaign: "winter_email",
        landingPagePath: "/promo",
        entryUrl: "https://example.com/promo?campaign=winter_email",
        referrer: "https://mail.example/",
      },
      { hasGenuineNewEntry: true, urlHasAnyEntryParams: true },
    );
    assert.equal(merged.campaignParam, "winter_email");
    assert.equal(merged.utmSource, "email");
    // First-touch landing context preserved
    assert.equal(merged.landingPagePath, "/contact");
    assert.equal(merged.entryUrl, "https://example.com/contact?campaign=summer_radio");
    assert.equal(merged.referrer, "https://radio.example/");
  });

  it("detects genuine new campaign entry vs stored attribution", () => {
    assert.equal(
      isGenuineNewCampaignEntry(new URLSearchParams("campaign=winter_email"), basePrev),
      true,
    );
    assert.equal(
      isGenuineNewCampaignEntry(new URLSearchParams("campaign=summer_radio"), basePrev),
      false,
    );
    assert.equal(isGenuineNewCampaignEntry(new URLSearchParams(""), basePrev), false);
    assert.equal(
      isGenuineNewCampaignEntry(new URLSearchParams("campaign=summer_radio"), null),
      true,
    );
  });

  it("conversion record prefers stored campaign when URL has no params", () => {
    // Simulates attributionToUtmRecord output after cross-page navigation
    const stored = mergeAttributionSnapshot(
      basePrev,
      {
        visitorToken: "v1",
        sessionToken: "s1",
        consentStatus: "GRANTED",
        landingPagePath: "/contact",
        entryUrl: "https://example.com/contact",
      },
      { hasGenuineNewEntry: false, urlHasAnyEntryParams: false },
    );
    assert.equal(stored.campaignParam, "summer_radio");
    assert.equal(stored.utmCampaign, "summer_radio");
    // Fallback chain input for bridge: campaign → a → utm_campaign
    const record = {
      campaign: stored.campaignParam,
      utm_campaign: stored.utmCampaign,
    };
    assert.equal(
      resolveCampaignParamFromSearchParams(record),
      "summer_radio",
    );
  });
});

describe("Google Ads campaign linking contracts", () => {
  it("builds Final URL suffix with campaign= and binding=", () => {
    const suffix = buildGoogleAdsFinalUrlSuffix({
      internalId: "summer_radio",
      bindingId: "bind_123",
    });
    assert.match(suffix, /^\{lpurl\}\?/);
    assert.match(suffix, /campaign=summer_radio/);
    assert.match(suffix, /utm_source=google/);
    assert.match(suffix, /utm_medium=cpc/);
    assert.match(suffix, /utm_campaign=summer_radio/);
    assert.match(suffix, /binding=bind_123/);
  });

  it("resolves binding discriminator from binding= or utm_content", () => {
    assert.equal(
      resolveBindingIdFromSearchParams(new URLSearchParams("binding=b1&utm_content=other")),
      "b1",
    );
    assert.equal(
      resolveBindingIdFromSearchParams(new URLSearchParams("utm_content=b2")),
      "b2",
    );
    assert.equal(resolveBindingIdFromSearchParams(new URLSearchParams("")), null);
  });

  it("attributes providerBindingId for GCLID + single binding only", () => {
    assert.equal(
      resolveGoogleProviderBindingId({
        googleBindingIds: ["b1"],
        isGooglePaid: true,
      }),
      "b1",
    );
    assert.equal(
      resolveGoogleProviderBindingId({
        googleBindingIds: ["b1", "b2"],
        isGooglePaid: true,
      }),
      null,
    );
    assert.equal(
      resolveGoogleProviderBindingId({
        googleBindingIds: ["b1", "b2"],
        discriminator: "b2",
        isGooglePaid: true,
      }),
      "b2",
    );
    assert.equal(
      resolveGoogleProviderBindingId({
        googleBindingIds: ["b1", "b2"],
        discriminator: "missing",
        isGooglePaid: true,
      }),
      null,
    );
  });

  it("classifies Google matches: existing, exact, internalId, fuzzy, ambiguous", () => {
    const internals = [
      { id: "c1", name: "Summer Radio", internalId: "sr_2026" },
      { id: "c2", name: "Winter Push", internalId: "winter_push" },
    ];
    assert.equal(
      classifyGoogleMatch({ googleName: "x", internals, alreadyBound: true }).kind,
      "existing",
    );
    assert.deepEqual(
      classifyGoogleMatch({ googleName: "Summer Radio", internals }),
      { kind: "exact_name", confidence: 1, internalCampaignId: "c1" },
    );
    assert.equal(
      classifyGoogleMatch({
        googleName: "Summer Radio",
        internals: [
          ...internals,
          { id: "c3", name: "Summer Radio", internalId: "dup" },
        ],
      }).kind,
      "ambiguous",
    );
    assert.deepEqual(
      classifyGoogleMatch({ googleName: "sr_2026", internals }),
      { kind: "internal_id", confidence: 0.95, internalCampaignId: "c1" },
    );
    assert.equal(
      classifyGoogleMatch({ googleName: "Summer Radio Search", internals }).kind,
      "fuzzy",
    );
  });

  it("separates customerId from login-customer-id (MCC)", () => {
    assert.equal(normalizeGoogleAdsCustomerId("123-456-7890"), "1234567890");
    const ctx = buildGoogleAdsRequestContext({
      customerId: "111-222-3333",
      loginCustomerId: "999-888-7777",
    });
    assert.equal(ctx.customerId, "1112223333");
    assert.equal(ctx.loginCustomerId, "9998887777");
    const noMcc = buildGoogleAdsRequestContext({ customerId: "1112223333" });
    assert.equal(noMcc.loginCustomerId, "1112223333");
  });

  it("refreshes access token when expired or near expiry", () => {
    const now = 1_000_000;
    assert.equal(shouldRefreshAccessToken(now + 60_000, now), true);
    assert.equal(shouldRefreshAccessToken(now + 10 * 60_000, now), false);
    assert.equal(shouldRefreshAccessToken(now - 1, now), true);
    assert.equal(shouldRefreshAccessToken(null, now), false);
  });

  it("never uses account spend as campaign spend", () => {
    assert.equal(
      resolveCampaignSpendFromBindingRollups([12.5, 7.5], /* accountSpend */ 9999),
      20,
    );
    assert.equal(resolveCampaignSpendFromBindingRollups([], 500), 0);
  });

  it("derives three readiness states: not_connected / setup_incomplete / operational", () => {
    assert.equal(
      deriveGoogleAdsReadiness({
        hasAccessToken: false,
        hasDeveloperToken: false,
        hasLoginCustomerId: false,
      }),
      "not_connected",
    );
    assert.equal(
      deriveGoogleAdsReadiness({
        hasAccessToken: true,
        connectionStatus: "connected",
        hasDeveloperToken: false,
        hasLoginCustomerId: false,
      }),
      "setup_incomplete",
    );
    assert.equal(
      deriveGoogleAdsReadiness({
        hasAccessToken: true,
        connectionStatus: "connected",
        hasDeveloperToken: true,
        hasLoginCustomerId: true,
        selectedCustomerId: "1234567890",
      }),
      "operational",
    );
  });

  it("maps operational context to SEO Marketing context without SEO-only customerId", () => {
    const mkt = mapOperationalToMarketingContext({
      oauthConnected: true,
      operational: false,
      readiness: "setup_incomplete",
      hasAccessToken: true,
      hasDeveloperToken: false,
      hasLoginCustomerId: false,
      accountCount: 0,
      selectedCustomerId: null,
      loginCustomerId: null,
      lastVerifiedAt: null,
      connectionId: "c1",
      connectionStatus: "connected",
      healthChecks: [
        {
          id: "developer_token",
          label: "Developer token",
          ok: false,
          message: "Missing developer token",
          href: "/admin/seo/google?tab=ads#configuration",
          actionLabel: "Configure",
        },
      ],
      legacySeoCustomerIdHint: "2698879313",
      ok: false,
      summary: "Setup incomplete",
    });
    assert.equal(mkt.connected, false);
    assert.equal(mkt.oauthConnected, true);
    assert.equal(mkt.readiness, "setup_incomplete");
    assert.equal(mkt.legacySeoCustomerIdHint, "2698879313");
    assert.equal(mkt.healthChecks?.[0]?.href?.includes("seo/google"), true);
  });
});

describe("parseGoogleAdsCustomerId", () => {
  it("accepts numeric and hyphenated IDs", async () => {
    const { parseGoogleAdsCustomerId } = await import(
      "@/modules/marketing/providers/google-ads/sdk/api"
    );
    assert.equal(parseGoogleAdsCustomerId("123-456-7890"), "1234567890");
    assert.equal(parseGoogleAdsCustomerId("2698879313"), "2698879313");
  });

  it("rejects emails and non-numeric MCC values", async () => {
    const { parseGoogleAdsCustomerId } = await import(
      "@/modules/marketing/providers/google-ads/sdk/api"
    );
    assert.equal(parseGoogleAdsCustomerId("social@brtme.com"), null);
    assert.equal(parseGoogleAdsCustomerId("BRT ME"), null);
    assert.equal(parseGoogleAdsCustomerId(""), null);
  });
});
