import assert from "node:assert/strict";
import { describe, it } from "node:test";
import bcrypt from "bcryptjs";
import {
  PASSWORD_REUSE_ERROR,
  isPasswordReused,
  passwordMatchesHash,
} from "@/lib/security/password-reuse";
import {
  adminLifecycleDestination,
  isAdminLifecycleExemptPath,
} from "@/features/auth/admin-lifecycle";

// Cost 4 keeps the unit tests fast; the product uses cost 12.
const CURRENT = "Correct-Horse-Battery";
let currentHash = "";

async function loadHash() {
  if (!currentHash) currentHash = await bcrypt.hash(CURRENT, 4);
  return currentHash;
}

describe("password reuse (current hash only, no history)", () => {
  it("rejects the current password", async () => {
    assert.equal(await isPasswordReused(CURRENT, await loadHash()), true);
  });

  it("allows a different password", async () => {
    assert.equal(await isPasswordReused("Another-Strong-Pass-9", await loadHash()), false);
  });

  it("is exact — case and whitespace matter", async () => {
    const hash = await loadHash();
    assert.equal(await isPasswordReused(CURRENT.toUpperCase(), hash), false);
    assert.equal(await isPasswordReused(` ${CURRENT}`, hash), false);
  });

  it("treats an unusable hash as a non-match without throwing", async () => {
    assert.equal(await passwordMatchesHash(CURRENT, "not-a-bcrypt-hash"), false);
    assert.equal(await passwordMatchesHash(CURRENT, ""), false);
    assert.equal(await passwordMatchesHash("", await loadHash()), false);
  });

  it("there is no history table or expiry job in the guard", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile(new URL("../../../lib/security/password-reuse.ts", import.meta.url), "utf8");
    const server = await fs.readFile(
      new URL("../../../lib/security/password-reuse.server.ts", import.meta.url),
      "utf8",
    );
    assert.match(server, /server-only/);
    assert.doesNotMatch(src, /passwordHistory|previousHash|PasswordHistory|password_history/i);
    assert.match(src, /bcrypt\.compare/);
  });

  it("change, reset, and admin-credentials paths all enforce it", async () => {
    const fs = await import("node:fs/promises");
    const files = [
      "src/app/api/account/profile/route.ts",
      "src/features/account/password-reset.service.ts",
      "src/features/setup/actions/update-admin-credentials.ts",
    ];
    for (const file of files) {
      const src = await fs.readFile(new URL(`../../../../${file}`, import.meta.url), "utf8");
      assert.match(src, /isPasswordReused/, `${file} must reject reuse`);
    }
    assert.equal(PASSWORD_REUSE_ERROR.length > 0, true);
  });
});

describe("admin OTP delivery lifecycle", () => {
  it("password change takes priority over OTP delivery", () => {
    assert.equal(
      adminLifecycleDestination({ mustChangePassword: true, adminOtpUnconfigured: true })?.kind,
      "password_change_required",
    );
  });

  it("unconfigured OTP sends the admin to account settings", () => {
    const block = adminLifecycleDestination({ adminOtpUnconfigured: true, mustChangePassword: false });
    assert.equal(block?.kind, "otp_delivery_unconfigured");
    assert.equal(block?.redirectTo, "/admin/settings/account");
  });

  it("every path except account settings redirects while unconfigured", () => {
    const block = adminLifecycleDestination({ adminOtpUnconfigured: true });
    assert.ok(block);
    for (const path of ["/admin", "/admin/products", "/admin/media", "/admin/settings/general"]) {
      assert.equal(isAdminLifecycleExemptPath(path), false, path);
      assert.equal(block.redirectTo, "/admin/settings/account");
    }
    assert.equal(isAdminLifecycleExemptPath("/admin/settings/account"), true);
  });

  it("configured delivery imposes no block", () => {
    assert.equal(adminLifecycleDestination({ adminOtpUnconfigured: false }), null);
  });

  it("disabled accounts are left to the revoke path", () => {
    assert.equal(adminLifecycleDestination({ adminOtpUnconfigured: true, disabledAt: new Date() }), null);
  });
});
