import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canonicalSiteDefaultPresetId,
  syncPresetIdentityFields,
} from "@/features/theme/preset-identity";

describe("preset identity contract", () => {
  it("normalizes canonical preset id", () => {
    assert.equal(canonicalSiteDefaultPresetId(" networking "), "networking");
    assert.equal(canonicalSiteDefaultPresetId(""), null);
    assert.equal(canonicalSiteDefaultPresetId(null), null);
  });

  it("syncs legacy activePresetId with canonical field on writes", () => {
    assert.deepEqual(syncPresetIdentityFields("travel"), {
      siteDefaultPresetId: "travel",
      activePresetId: "travel",
    });
    assert.deepEqual(syncPresetIdentityFields(null), {
      siteDefaultPresetId: null,
      activePresetId: null,
    });
  });
});
