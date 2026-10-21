import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAzuraCspPolicy,
  buildCspHeaderEntries,
  cspSha256Token,
  resolveCspMode,
} from "@/lib/security/csp-headers";

describe("CSP header rollout", () => {
  it("defaults to report mode for unset, empty, and unknown values", () => {
    assert.equal(resolveCspMode(undefined), "report");
    assert.equal(resolveCspMode(""), "report");
    assert.equal(resolveCspMode("report"), "report");
    assert.equal(resolveCspMode("REPORT"), "report");
    assert.equal(resolveCspMode("something-else"), "report");
  });

  it("enables enforce only for explicit enforce", () => {
    assert.equal(resolveCspMode("enforce"), "enforce");
    assert.equal(resolveCspMode(" Enforce "), "enforce");
  });

  it("report mode emits Report-Only only", () => {
    const policy = buildAzuraCspPolicy();
    const headers = buildCspHeaderEntries("report", policy);
    assert.deepEqual(
      headers.map((h) => h.key),
      ["Content-Security-Policy-Report-Only"],
    );
    assert.equal(headers[0]?.value, policy);
    assert.ok(policy.includes("'unsafe-inline'"));
    assert.ok(policy.includes("'unsafe-eval'"));
  });

  it("enforce mode emits enforcing CSP plus Report-Only for telemetry", () => {
    const policy = buildAzuraCspPolicy();
    const headers = buildCspHeaderEntries("enforce", policy);
    assert.deepEqual(
      headers.map((h) => h.key),
      ["Content-Security-Policy", "Content-Security-Policy-Report-Only"],
    );
    assert.equal(headers[0]?.value, policy);
    assert.equal(headers[1]?.value, policy);
  });

  it("keeps third-party script hosts in the shared policy body", () => {
    const policy = buildAzuraCspPolicy();
    assert.ok(policy.includes("https://www.googletagmanager.com"));
    assert.ok(policy.includes("https://connect.facebook.net"));
    assert.ok(policy.includes("report-to csp-endpoint"));
  });

  it("milestone helpers can add script hashes and drop unsafe flags without changing default", () => {
    const token = cspSha256Token("console.log(1)");
    assert.match(token, /^'sha256-[A-Za-z0-9+/=]+'$/);
    const hardened = buildAzuraCspPolicy({
      scriptAuthTokens: [token],
      allowUnsafeEval: false,
      allowUnsafeInlineScript: false,
    });
    assert.ok(hardened.includes(token));
    assert.equal(hardened.includes("'unsafe-eval'"), false);
    assert.equal(/script-src[^;]*'unsafe-inline'/.test(hardened), false);
    // Default production policy remains permissive until milestones flip flags.
    const current = buildAzuraCspPolicy();
    assert.ok(current.includes("'unsafe-eval'"));
    assert.ok(current.includes("'unsafe-inline'"));
  });
});
