import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateAdminEmailMfaConfigured } from "@/features/auth/admin-auth-delivery.helpers";

describe("admin email MFA delivery gate", () => {
  it("false when no Email Accounts", () => {
    assert.equal(
      evaluateAdminEmailMfaConfigured({
        accountCount: 0,
        otpEmailAccountId: "acc_1",
        accountExists: true,
        accountConfigured: true,
        providerResolved: true,
      }),
      false,
    );
  });

  it("false when otpEmailAccountId unset", () => {
    assert.equal(
      evaluateAdminEmailMfaConfigured({
        accountCount: 1,
        otpEmailAccountId: "",
        accountExists: false,
        accountConfigured: false,
        providerResolved: false,
      }),
      false,
    );
  });

  it("false when account row missing", () => {
    assert.equal(
      evaluateAdminEmailMfaConfigured({
        accountCount: 1,
        otpEmailAccountId: "acc_1",
        accountExists: false,
        accountConfigured: false,
        providerResolved: false,
      }),
      false,
    );
  });

  it("false when account incomplete (not sendable)", () => {
    assert.equal(
      evaluateAdminEmailMfaConfigured({
        accountCount: 1,
        otpEmailAccountId: "acc_1",
        accountExists: true,
        accountConfigured: false,
        providerResolved: false,
      }),
      false,
    );
  });

  it("false when provider config cannot resolve", () => {
    assert.equal(
      evaluateAdminEmailMfaConfigured({
        accountCount: 1,
        otpEmailAccountId: "acc_1",
        accountExists: true,
        accountConfigured: true,
        providerResolved: false,
      }),
      false,
    );
  });

  it("true when selected account exists and is sendable", () => {
    assert.equal(
      evaluateAdminEmailMfaConfigured({
        accountCount: 2,
        otpEmailAccountId: "acc_1",
        accountExists: true,
        accountConfigured: true,
        providerResolved: true,
      }),
      true,
    );
  });
});
