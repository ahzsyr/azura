import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createGoogleConnectionManager,
  mergeConnectionSnapshot,
} from "../../google-platform/connection-manager";
import { emptyPlatformState } from "../../google-platform/types";
import { evaluateTrafficDropCandidates } from "../traffic-drop.service";
import { inspectionSucceeded } from "../inspection-cap";

describe("Phase 3 Inspection Queue Enhancements", () => {
  it("preserves matchedGscSiteUrl and propertyKind when connecting/re-verifying", () => {
    const existing = {
      connected: true,
      verified: true,
      matchedGscSiteUrl: "sc-domain:example.com",
      propertyKind: "domain" as const,
    };

    const updated = mergeConnectionSnapshot(
      {
        state: "connected",
        grantedScopes: [],
        missingScopes: [],
        matchedGscSiteUrl: existing.matchedGscSiteUrl,
        propertyKind: existing.propertyKind,
      },
      {
        state: "connected",
        grantedScopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
        missingScopes: [],
        message: "Connected",
      },
    );

    assert.equal(updated.matchedGscSiteUrl, "sc-domain:example.com");
    assert.equal(updated.propertyKind, "domain");

    const initial = emptyPlatformState();
    initial.services.search_console = {
      configuration: {},
      policy: {},
      connection: {
        state: "connected",
        grantedScopes: [],
        missingScopes: [],
        matchedGscSiteUrl: "sc-domain:example.com",
        propertyKind: "domain",
      },
      schemaVersion: 1,
      migrationVersion: 1,
    };
    const manager = createGoogleConnectionManager(initial);
    manager.connect("search_console", { method: "oauth", scopes: ["scope-a"] });
    manager.markVerified("search_console", true, "ok");
    const connection = manager.snapshot().services.search_console?.connection;
    assert.equal(connection?.matchedGscSiteUrl, "sc-domain:example.com");
    assert.equal(connection?.propertyKind, "domain");
  });

  it("correctly identifies URLs with >=50% traffic drop and prior impressions >= 20", () => {
    const prior = [
      { url: "https://example.com/drop", impressions: 100, clicks: 10 },
      { url: "https://example.com/stable", impressions: 100, clicks: 10 },
      { url: "https://example.com/low-vol", impressions: 10, clicks: 1 },
    ];

    const current = [
      { url: "https://example.com/drop", impressions: 40, clicks: 2 },
      { url: "https://example.com/stable", impressions: 90, clicks: 9 },
      { url: "https://example.com/low-vol", impressions: 0, clicks: 0 },
    ];

    const candidates = evaluateTrafficDropCandidates(prior, current);

    assert.equal(candidates.length, 1);
    assert.equal(candidates[0]?.url, "https://example.com/drop");
    // Impression drop 60%, click drop 80% → report the larger qualifying drop
    assert.equal(candidates[0]?.dropPercentage, 80);
  });

  it("counts only HTTP 200 inspections against the daily cap", () => {
    assert.equal(inspectionSucceeded({ ok: true, status: 200 }), true);
    assert.equal(inspectionSucceeded({ ok: false, status: 429 }), false);
    assert.equal(inspectionSucceeded({ ok: false, status: 500 }), false);
    assert.equal(inspectionSucceeded(null), false);
  });
});
