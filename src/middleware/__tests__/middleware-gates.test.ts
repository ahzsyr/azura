import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseAccountPath } from "@/features/account/account-middleware";
import { profileDisabledResponse } from "@/middleware/profile-gate";
import {
  resolveLoginEntryPath,
  resolvePostLoginRedirect,
} from "@/features/auth/portal";

describe("account-middleware", () => {
  it("parseAccountPath matches locale account routes", () => {
    assert.deepEqual(parseAccountPath("/en/account", ["en", "ar"]), {
      locale: "en",
      sub: "",
    });
    assert.deepEqual(parseAccountPath("/en/account/login", ["en", "ar"]), {
      locale: "en",
      sub: "login",
    });
    assert.equal(parseAccountPath("/admin", ["en"]), null);
  });
});

describe("profile-gate", () => {
  it("profileDisabledResponse returns 404", () => {
    const res = profileDisabledResponse();
    assert.equal(res.status, 404);
  });
});

describe("portal middleware destinations", () => {
  it("unauthenticated admin path preserves callback through login entry", () => {
    const entry = resolveLoginEntryPath({
      locale: "ar",
      callbackUrl: "/admin/products",
    });
    assert.match(entry, /^\/ar\/account\/login\?/);
    assert.equal(
      decodeURIComponent(entry.split("callbackUrl=")[1]!),
      "/admin/products",
    );
  });

  it("wrong-portal bounce uses resolver", () => {
    assert.equal(
      resolvePostLoginRedirect({
        role: "CUSTOMER",
        locale: "en",
        callbackUrl: "/admin/products",
      }),
      "/en/account",
    );
    assert.equal(
      resolvePostLoginRedirect({
        role: "ADMIN",
        locale: "en",
        callbackUrl: "/en/account",
      }),
      "/admin",
    );
  });
});
