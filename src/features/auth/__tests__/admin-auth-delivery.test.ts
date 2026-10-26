import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateAdminEmailMfaConfigured } from "@/features/auth/admin-auth-delivery.helpers";

describe("email code delivery gate", () => {
  it("false when no account was resolved", () => {
    assert.equal(
      evaluateAdminEmailMfaConfigured({
        accountExists: false,
        accountConfigured: false,
        providerResolved: false,
      }),
      false,
    );
  });

  it("false when the account is incomplete (not sendable)", () => {
    assert.equal(
      evaluateAdminEmailMfaConfigured({
        accountExists: true,
        accountConfigured: false,
        providerResolved: false,
      }),
      false,
    );
  });

  it("false when the provider config cannot resolve", () => {
    assert.equal(
      evaluateAdminEmailMfaConfigured({
        accountExists: true,
        accountConfigured: true,
        providerResolved: false,
      }),
      false,
    );
  });

  it("true only when a sendable account was resolved (any role, any purpose)", () => {
    assert.equal(
      evaluateAdminEmailMfaConfigured({
        accountExists: true,
        accountConfigured: true,
        providerResolved: true,
      }),
      true,
    );
  });
});
