import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ASSERT_SCRIPT,
  GENERATE_SCRIPT,
  ensureSelectedDeploymentProfile,
} from "../ensure-selected-deployment-profile.mjs";

describe("ensureSelectedDeploymentProfile", () => {
  it("rejects AZURA_PROFILE_FILE with zero runner calls", () => {
    const calls = [];
    const result = ensureSelectedDeploymentProfile({
      env: {
        AZURA_PROFILE: "enterprise",
        AZURA_PROFILE_FILE: "performance-reports/profile-boundary/enterprise-minus-marketing.yaml",
      },
      runNode: (script, _env) => {
        calls.push(script);
        return { status: 0 };
      },
      log: () => {},
    });
    assert.equal(result.ok, false);
    assert.equal(calls.length, 0);
    assert.match(result.reason, /AZURA_PROFILE_FILE/);
  });

  it("rejects unknown AZURA_PROFILE with zero runner calls", () => {
    const calls = [];
    const result = ensureSelectedDeploymentProfile({
      env: { AZURA_PROFILE: "not-a-profile" },
      runNode: (script) => {
        calls.push(script);
        return { status: 0 };
      },
      log: () => {},
    });
    assert.equal(result.ok, false);
    assert.equal(calls.length, 0);
    assert.match(result.reason, /Unknown AZURA_PROFILE/);
  });

  it("runs generate then assert on success", () => {
    const calls = [];
    const result = ensureSelectedDeploymentProfile({
      env: { AZURA_PROFILE: "enterprise" },
      runNode: (script) => {
        calls.push(script);
        return { status: 0 };
      },
      log: () => {},
    });
    assert.equal(result.ok, true);
    assert.deepEqual(calls, [GENERATE_SCRIPT, ASSERT_SCRIPT]);
    assert.equal(result.profileId, "enterprise");
  });

  it("does not call assert when generate fails", () => {
    const calls = [];
    const result = ensureSelectedDeploymentProfile({
      env: { AZURA_PROFILE: "marketing" },
      runNode: (script) => {
        calls.push(script);
        if (script === GENERATE_SCRIPT) return { status: 7 };
        return { status: 0 };
      },
      log: () => {},
    });
    assert.equal(result.ok, false);
    assert.deepEqual(calls, [GENERATE_SCRIPT]);
    assert.equal(result.code, 7);
  });

  it("returns nonzero when assert fails after generate", () => {
    const calls = [];
    const result = ensureSelectedDeploymentProfile({
      env: { AZURA_PROFILE: "agency" },
      runNode: (script) => {
        calls.push(script);
        if (script === ASSERT_SCRIPT) return { status: 3 };
        return { status: 0 };
      },
      log: () => {},
    });
    assert.equal(result.ok, false);
    assert.deepEqual(calls, [GENERATE_SCRIPT, ASSERT_SCRIPT]);
    assert.equal(result.code, 3);
  });
});
