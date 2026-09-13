import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isAdminRole,
  isCustomerRole,
  remapLocalePrefixedAdmin,
  resolveLoginEntryPath,
  resolvePortalLocale,
  resolvePostLoginRedirect,
  sanitizeInternalPath,
} from "@/features/auth/portal";

describe("isAdminRole / isCustomerRole", () => {
  it("isAdminRole accepts ADMIN and SUPER_ADMIN only", () => {
    assert.equal(isAdminRole("ADMIN"), true);
    assert.equal(isAdminRole("SUPER_ADMIN"), true);
    assert.equal(isAdminRole("admin"), true);
    assert.equal(isAdminRole("CUSTOMER"), false);
    assert.equal(isAdminRole(""), false);
    assert.equal(isAdminRole(null), false);
  });

  it("isCustomerRole accepts CUSTOMER only", () => {
    assert.equal(isCustomerRole("CUSTOMER"), true);
    assert.equal(isCustomerRole("customer"), true);
    assert.equal(isCustomerRole("ADMIN"), false);
    assert.equal(isCustomerRole("SUPER_ADMIN"), false);
  });
});

describe("sanitizeInternalPath", () => {
  it("preserves legitimate admin application paths", () => {
    assert.equal(sanitizeInternalPath("/admin/products"), "/admin/products");
    assert.equal(
      sanitizeInternalPath("/admin/products/ubiquiti"),
      "/admin/products/ubiquiti",
    );
    assert.equal(
      sanitizeInternalPath("/admin/settings/account"),
      "/admin/settings/account",
    );
    assert.equal(sanitizeInternalPath("/admin"), "/admin");
  });

  it("preserves customer account paths", () => {
    assert.equal(sanitizeInternalPath("/account"), "/account");
    assert.equal(sanitizeInternalPath("/en/account"), "/en/account");
    assert.equal(
      sanitizeInternalPath("/account/inquiries"),
      "/account/inquiries",
    );
  });

  it("rejects external and protocol-relative URLs", () => {
    assert.equal(sanitizeInternalPath("https://evil.com"), null);
    assert.equal(sanitizeInternalPath("http://evil.com"), null);
    assert.equal(sanitizeInternalPath("//evil.com"), null);
    assert.equal(sanitizeInternalPath("/\\evil.com"), null);
  });

  it("rejects encoded structure bypasses", () => {
    assert.equal(sanitizeInternalPath("/%2F%2Fevil.com"), null);
    assert.equal(sanitizeInternalPath("/%2e%2e/admin"), null);
    assert.equal(sanitizeInternalPath("/admin%2F.."), null);
    assert.equal(sanitizeInternalPath("/%2E%2E/admin"), null);
  });

  it("rejects empty and non-path values", () => {
    assert.equal(sanitizeInternalPath(""), null);
    assert.equal(sanitizeInternalPath("   "), null);
    assert.equal(sanitizeInternalPath(null), null);
    assert.equal(sanitizeInternalPath("admin"), null);
    assert.equal(sanitizeInternalPath("account/login"), null);
  });

  it("allows /admin/login as a sanitizable path (classification forbids as final)", () => {
    assert.equal(sanitizeInternalPath("/admin/login"), "/admin/login");
  });
});

describe("remapLocalePrefixedAdmin", () => {
  it("maps locale-prefixed admin lookalikes to canonical /admin", () => {
    assert.equal(remapLocalePrefixedAdmin("/ar/admin/products"), "/admin/products");
    assert.equal(remapLocalePrefixedAdmin("/en/admin"), "/admin");
    assert.equal(remapLocalePrefixedAdmin("/ar/admin/settings/account"), "/admin/settings/account");
  });

  it("returns null for non lookalike paths", () => {
    assert.equal(remapLocalePrefixedAdmin("/admin/products"), null);
    assert.equal(remapLocalePrefixedAdmin("/ar/account"), null);
  });
});

describe("resolvePostLoginRedirect", () => {
  it("ADMIN + /admin/products → /admin/products", () => {
    assert.equal(
      resolvePostLoginRedirect({
        role: "ADMIN",
        locale: "en",
        callbackUrl: "/admin/products",
      }),
      "/admin/products",
    );
  });

  it("SUPER_ADMIN matches ADMIN for admin callbacks", () => {
    assert.equal(
      resolvePostLoginRedirect({
        role: "SUPER_ADMIN",
        locale: "en",
        callbackUrl: "/admin/products/ubiquiti",
      }),
      "/admin/products/ubiquiti",
    );
  });

  it("CUSTOMER + /admin/products → /account", () => {
    assert.equal(
      resolvePostLoginRedirect({
        role: "CUSTOMER",
        locale: "en",
        callbackUrl: "/admin/products",
      }),
      "/account",
    );
  });

  it("CUSTOMER + /account/inquiries → same path", () => {
    assert.equal(
      resolvePostLoginRedirect({
        role: "CUSTOMER",
        locale: "en",
        callbackUrl: "/account/inquiries",
      }),
      "/account/inquiries",
    );
  });

  it("CUSTOMER + legacy /en/account/inquiries → same path", () => {
    assert.equal(
      resolvePostLoginRedirect({
        role: "CUSTOMER",
        locale: "en",
        callbackUrl: "/en/account/inquiries",
      }),
      "/en/account/inquiries",
    );
  });

  it("ADMIN + /en/account/inquiries → /admin", () => {
    assert.equal(
      resolvePostLoginRedirect({
        role: "ADMIN",
        locale: "en",
        callbackUrl: "/en/account/inquiries",
      }),
      "/admin",
    );
  });

  it("locale-prefixed admin: ADMIN → remapped, CUSTOMER → account", () => {
    assert.equal(
      resolvePostLoginRedirect({
        role: "ADMIN",
        locale: "ar",
        callbackUrl: "/ar/admin/products",
      }),
      "/admin/products",
    );
    assert.equal(
      resolvePostLoginRedirect({
        role: "CUSTOMER",
        locale: "ar",
        callbackUrl: "/ar/admin/products",
      }),
      "/ar/account",
    );
  });

  it("rejects unsafe callbacks to role default", () => {
    for (const bad of [
      "https://evil.com",
      "//evil.com",
      "/%2F%2Fevil.com",
      "/%2e%2e/admin",
      "/admin%2F..",
      "/\\evil.com",
    ]) {
      assert.equal(
        resolvePostLoginRedirect({ role: "ADMIN", locale: "en", callbackUrl: bad }),
        "/admin",
        bad,
      );
      assert.equal(
        resolvePostLoginRedirect({ role: "CUSTOMER", locale: "en", callbackUrl: bad }),
        "/account",
        bad,
      );
    }
  });

  it("/admin/login is never a final destination", () => {
    assert.equal(
      resolvePostLoginRedirect({
        role: "ADMIN",
        locale: "en",
        callbackUrl: "/admin/login",
      }),
      "/admin",
    );
    assert.equal(
      resolvePostLoginRedirect({
        role: "CUSTOMER",
        locale: "en",
        callbackUrl: "/admin/login",
      }),
      "/account",
    );
  });

  it("empty callback → role default", () => {
    assert.equal(
      resolvePostLoginRedirect({ role: "ADMIN", locale: "ar", callbackUrl: null }),
      "/admin",
    );
    assert.equal(
      resolvePostLoginRedirect({ role: "CUSTOMER", locale: "ar" }),
      "/ar/account",
    );
  });

  it("public auth pages are not final destinations", () => {
    assert.equal(
      resolvePostLoginRedirect({
        role: "CUSTOMER",
        locale: "en",
        callbackUrl: "/account/login",
      }),
      "/account",
    );
  });
});

describe("resolveLoginEntryPath", () => {
  it("preserves admin callback through login round trip", () => {
    const path = resolveLoginEntryPath({
      locale: "ar",
      callbackUrl: "/admin/products",
    });
    assert.equal(path.startsWith("/ar/account/login?"), true);
    assert.equal(path.includes("callbackUrl="), true);
    assert.equal(decodeURIComponent(path.split("callbackUrl=")[1]!), "/admin/products");
  });

  it("omits unsafe or login-surface callbacks", () => {
    assert.equal(
      resolveLoginEntryPath({ locale: "en", callbackUrl: "https://evil.com" }),
      "/account/login",
    );
    assert.equal(
      resolveLoginEntryPath({ locale: "en", callbackUrl: "/admin/login" }),
      "/account/login",
    );
    assert.equal(resolveLoginEntryPath({ locale: "en" }), "/account/login");
  });
});

describe("resolvePortalLocale", () => {
  it("prefers path locale, then cookie, then default", () => {
    assert.equal(
      resolvePortalLocale({ pathname: "/ar/account", locales: ["en", "ar"] }),
      "ar",
    );
    assert.equal(
      resolvePortalLocale({
        pathname: "/admin/products",
        cookieLocale: "ar",
        locales: ["en", "ar"],
      }),
      "ar",
    );
    assert.equal(
      resolvePortalLocale({ pathname: "/admin", locales: ["en", "ar"] }),
      "en",
    );
  });
});
