/**
 * Administrator controls over another user's MFA, and a customer's control
 * over their own.
 *
 * Isolation is the core requirement: every write is scoped by the target user
 * id, and the admin path applies the role hierarchy before touching the row.
 * These tests drive the real service functions against an in-memory Prisma
 * stand-in and assert on the stored rows.
 */
import "server-only";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { __resetFakePrisma, __table } from "@/lib/prisma";
import { __resetJsonStore } from "@/features/storage/json-store.service";
import {
  allowMfaSelfService,
  confirmAuthenticatorEnrollment,
  beginAuthenticatorEnrollment,
  disableMfaAsAdmin,
  enableEmailOtpMfa,
  enableEmailOtpMfaAsAdmin,
  getMfaStatusForUser,
  verifyAuthenticatorCode,
} from "@/features/auth/mfa-totp.service";
import { resolveMfaState, canSelfManageMfa } from "@/features/auth/mfa-policy.helpers";
import { requiresSecondFactorForUser } from "@/features/auth/mfa-policy";

function seedUser(input: {
  id: string;
  email: string;
  role?: "ADMIN" | "SUPER_ADMIN" | "CUSTOMER";
  mfaMethod?: "AUTHENTICATOR" | "EMAIL_OTP" | null;
  totpEnabled?: boolean;
  totpSecret?: string | null;
  mfaDisabledByAdminAt?: Date | null;
}) {
  const row = {
    name: "User",
    role: "CUSTOMER",
    passwordHash: "test$hash",
    disabledAt: null,
    mfaMethod: null,
    totpEnabled: false,
    totpSecret: null,
    mfaDisabledByAdminAt: null,
    mfaEnrolledAt: null,
    sessionVersion: 0,
    ...input,
  };
  __table("user").push(row);
  return row;
}

function userById(id: string) {
  return __table("user").find((row) => row.id === id)!;
}

beforeEach(() => {
  __resetFakePrisma();
  __resetJsonStore();
});

describe("each user's MFA is stored separately", () => {
  it("enabling email-code MFA for one customer leaves every other account alone", async () => {
    seedUser({ id: "u-alice", email: "alice@example.com" });
    seedUser({ id: "u-bob", email: "bob@example.com" });
    seedUser({ id: "u-admin", email: "admin@example.com", role: "ADMIN" });

    await enableEmailOtpMfa("u-alice");

    assert.equal(userById("u-alice").mfaMethod, "EMAIL_OTP");
    assert.equal(userById("u-bob").mfaMethod, null);
    assert.equal(userById("u-admin").mfaMethod, null);

    // Sign-in now challenges Alice and only Alice.
    assert.equal(
      requiresSecondFactorForUser({ role: "CUSTOMER", mfaMethod: "EMAIL_OTP" }),
      true,
    );
    assert.equal(requiresSecondFactorForUser({ role: "CUSTOMER", mfaMethod: null }), false);
  });

  it("a user's authenticator secret is unique to that user", async () => {
    seedUser({ id: "u-a", email: "a@example.com" });
    seedUser({ id: "u-b", email: "b@example.com" });

    const alice = await beginAuthenticatorEnrollment("u-a");
    const bob = await beginAuthenticatorEnrollment("u-b");
    assert.notEqual(alice.secret, bob.secret);

    // Alice's code cannot complete Bob's enrollment.
    const code = await currentTotpCode(alice.secret);
    const wrongUser = await confirmAuthenticatorEnrollment("u-b", code).catch((error) => error);
    assert.ok(wrongUser instanceof Error);

    const confirmed = await confirmAuthenticatorEnrollment("u-a", code);
    assert.equal(confirmed.recoveryCodes.length, 10);
    assert.equal(userById("u-a").mfaMethod, "AUTHENTICATOR");
    assert.equal(userById("u-a").totpEnabled, true);
    // Bob is still mid-enrollment (secret stored, not active).
    assert.equal(resolveMfaState({ role: "CUSTOMER", ...userById("u-b") }).enrolled, false);
    assert.equal(
      __table("mfaRecoveryCode").filter((row) => row.userId === "u-b").length,
      0,
    );
  });

  it("turning MFA off for one account does not touch another's", async () => {
    seedUser({ id: "u-a", email: "a@example.com", mfaMethod: "EMAIL_OTP" });
    seedUser({ id: "u-b", email: "b@example.com", mfaMethod: "EMAIL_OTP" });

    await disableMfaAsAdmin("u-a", { id: "u-super", role: "SUPER_ADMIN" });

    assert.equal(userById("u-a").mfaMethod, null);
    assert.equal(userById("u-b").mfaMethod, "EMAIL_OTP");
  });
});

describe("authenticator verification", () => {
  it("accepts a live code and consumes a recovery code exactly once", async () => {
    seedUser({ id: "u-a", email: "a@example.com" });
    const { secret } = await beginAuthenticatorEnrollment("u-a");
    const { recoveryCodes } = await confirmAuthenticatorEnrollment(
      "u-a",
      await currentTotpCode(secret),
    );

    assert.equal((await verifyAuthenticatorCode("u-a", await currentTotpCode(secret))).ok, true);

    const recovery = recoveryCodes[0];
    const first = await verifyAuthenticatorCode("u-a", recovery);
    assert.deepEqual(first, { ok: true, usedRecoveryCode: true });
    const second = await verifyAuthenticatorCode("u-a", recovery);
    assert.deepEqual(second, { ok: false });
  });

  it("rejects codes for an account without authenticator enrollment", async () => {
    seedUser({ id: "u-a", email: "a@example.com" });
    const result = await verifyAuthenticatorCode("u-a", "123456");
    assert.deepEqual(result, { ok: false });
  });
});

describe("an admin switch-off blocks self-service until lifted", () => {
  it("the user cannot re-enroll while the admin lock is set", async () => {
    seedUser({ id: "u-a", email: "a@example.com", mfaMethod: "EMAIL_OTP" });
    await disableMfaAsAdmin("u-a", { id: "u-admin", role: "ADMIN" });

    const locked = userById("u-a");
    assert.ok(locked.mfaDisabledByAdminAt instanceof Date);
    assert.equal(canSelfManageMfa({ role: "CUSTOMER", ...locked }).ok, false);
    await assert.rejects(() => enableEmailOtpMfa("u-a"));

    await allowMfaSelfService("u-a", { id: "u-admin", role: "ADMIN" });
    assert.equal(userById("u-a").mfaDisabledByAdminAt, null);
    await enableEmailOtpMfa("u-a");
    assert.equal(userById("u-a").mfaMethod, "EMAIL_OTP");
  });

  it("admin actions on one account never set the lock on another", async () => {
    seedUser({ id: "u-a", email: "a@example.com", mfaMethod: "EMAIL_OTP" });
    seedUser({ id: "u-b", email: "b@example.com", mfaMethod: "EMAIL_OTP" });
    await enableEmailOtpMfaAsAdmin("u-a", { id: "u-admin", role: "ADMIN" });
    await disableMfaAsAdmin("u-a", { id: "u-admin", role: "ADMIN" });
    assert.equal(userById("u-b").mfaDisabledByAdminAt, null);
    const b = await getMfaStatusForUser("u-b");
    assert.equal(b?.enrolled, true);
  });
});

/** The TOTP code a user's authenticator app would show right now. */
async function currentTotpCode(base32: string): Promise<string> {
  const OTPAuth = await import("otpauth");
  const totp = new OTPAuth.TOTP({
    issuer: "Test",
    label: "user@example.com",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(base32),
  });
  return totp.generate();
}
