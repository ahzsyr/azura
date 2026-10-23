import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  decideJwtRefresh,
  hasSessionUserId,
  isSessionVersionCurrent,
  publicSessionFromToken,
  type SessionUserRow,
} from "@/lib/session-revocation";

function row(overrides: Partial<SessionUserRow> = {}): SessionUserRow {
  return {
    id: "u1",
    role: "ADMIN",
    sessionVersion: 3,
    mustChangePassword: false,
    totpEnabled: false,
    email: "admin@example.com",
    disabledAt: null,
    ...overrides,
  };
}

describe("session revocation: version compare", () => {
  it("equal versions match", () => {
    assert.equal(isSessionVersionCurrent(3, 3), true);
  });

  it("bumped DB version (sign-out-everywhere) mismatches", () => {
    assert.equal(isSessionVersionCurrent(3, 4), false);
  });

  it("missing versions compare as 0 (legacy tokens)", () => {
    assert.equal(isSessionVersionCurrent(undefined, null), true);
    assert.equal(isSessionVersionCurrent(undefined, 1), false);
  });

  it("a token must never be upgraded to the DB version", () => {
    // Regression guard for the original bug: auth.ts wrote row.sessionVersion
    // back onto the token, so a revoked JWT re-validated on its next hop.
    const tokenVersion = 3;
    const dbVersion = 4;
    assert.equal(isSessionVersionCurrent(tokenVersion, dbVersion), false);
    // After the fix the callback must NOT produce a refreshed version at all.
    const decision = decideJwtRefresh(tokenVersion, row({ sessionVersion: dbVersion }));
    assert.equal(decision.action, "revoke");
    assert.equal("sessionVersion" in decision, false);
  });
});

describe("session revocation: JWT refresh decision", () => {
  it("matching version refreshes role and lifecycle claims", () => {
    const decision = decideJwtRefresh(3, row({ role: "SUPER_ADMIN", mustChangePassword: true, totpEnabled: true }));
    assert.deepEqual(decision, {
      action: "refresh",
      role: "SUPER_ADMIN",
      mustChangePassword: true,
      totpEnabled: true,
      email: "admin@example.com",
    });
    assert.equal("sessionVersion" in decision, false, "version must not be refreshed");
  });

  it("disabled user is revoked even when the version matches", () => {
    const decision = decideJwtRefresh(3, row({ disabledAt: new Date() }));
    assert.deepEqual(decision, { action: "revoke" });
  });

  it("deleted user is revoked", () => {
    assert.deepEqual(decideJwtRefresh(3, null), { action: "revoke" });
  });

  it("version mismatch is revoked and claims are NOT refreshed", () => {
    const decision = decideJwtRefresh(1, row({ sessionVersion: 2, role: "SUPER_ADMIN" }));
    assert.deepEqual(decision, { action: "revoke" });
    assert.equal("role" in decision, false);
  });

  it("a disabled user's old token never gains the new role", () => {
    // ADMIN token promoted to SUPER_ADMIN then disabled: must not refresh.
    const decision = decideJwtRefresh(3, row({ role: "SUPER_ADMIN", disabledAt: new Date() }));
    assert.equal(decision.action, "revoke");
  });
});

describe("session revocation: identity and unreadable rows", () => {
  it("role or email without a user id is not a session", () => {
    assert.equal(hasSessionUserId(""), false);
    assert.equal(hasSessionUserId(undefined), false);
    assert.equal(publicSessionFromToken({ role: "ADMIN", email: "a@b.com" }), null);
    assert.equal(publicSessionFromToken({ id: "", role: "ADMIN" }), null);
    assert.equal(publicSessionFromToken({ id: "u1", role: "ADMIN" })?.id, "u1");
  });

  it("session gates do not skip a missing sessionVersion column", async () => {
    const fs = await import("node:fs/promises");
    const files = [
      "src/lib/auth.ts",
      "src/lib/api-auth.ts",
      "src/app/admin/(dashboard)/layout.tsx",
      "src/app/[locale]/(marketing)/account/layout.tsx",
    ];
    for (const file of files) {
      const src = await fs.readFile(new URL(`../../../../${file}`, import.meta.url), "utf8");
      assert.doesNotMatch(src, /isPrismaMissingColumnError/, file);
    }
  });
});

describe("defineApiRoute admin wrappers (static contract)", () => {
  it("whatsapp, personalization, and icons/delete are admin-gated", async () => {
    const fs = await import("node:fs/promises");
    const files = [
      "src/app/api/whatsapp-settings/route.ts",
      "src/app/api/personalization-settings/route.ts",
      "src/app/api/icons/delete/route.ts",
    ];
    for (const file of files) {
      const src = await fs.readFile(new URL(`../../../../${file}`, import.meta.url), "utf8");
      assert.match(src, /defineApiRoute\(/, file);
      assert.match(src, /access:\s*"admin"/, `${file} must be admin-gated`);
      assert.doesNotMatch(src, /access:\s*"public"/, `${file} must not be public`);
    }
  });
});
