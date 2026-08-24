import assert from "node:assert/strict";
import test from "node:test";
import { mapSeoConfigToConnectorSnapshots } from "../integrations/seo-config-map";

test("Search Ops connectors hydrate from Admin Google config", () => {
  const snapshots = mapSeoConfigToConnectorSnapshots({
    tracking: {
      enabled: true,
      gtagEnabled: true,
      measurementId: "G-P5050R27J8",
      gtmEnabled: true,
      gtmContainerId: "GTM-NWHL27PK",
    },
    integrations: {
      google: {
        enabled: true,
        analyticsEnabled: true,
        siteUrl: "https://brt-me.com/",
        bearerToken: "ya29.test",
        refreshToken: "1//test",
        ga4PropertyId: "543434575",
      },
    },
  });

  const byId = Object.fromEntries(snapshots.map((s) => [s.id, s]));
  assert.equal(byId.search_console?.state, "ready");
  assert.match(byId.search_console?.message ?? "", /GSC/);
  assert.equal(byId.analytics?.state, "ready");
  assert.match(byId.analytics?.message ?? "", /G-P5050R27J8|GTM-NWHL27PK|543434575/);
  assert.equal(byId.search_console?.testable, true);
  assert.equal(byId.merchant_center?.state, "disconnected");
});

test("disconnected when Google OAuth missing", () => {
  const snapshots = mapSeoConfigToConnectorSnapshots({
    tracking: {},
    integrations: {
      google: { enabled: true, siteUrl: "https://brt-me.com/" },
    },
  });
  const gsc = snapshots.find((s) => s.id === "search_console");
  assert.ok(gsc);
  assert.notEqual(gsc.state, "ready");
  assert.equal(gsc.configureHref, "/admin/seo/google?tab=search-console");
});
