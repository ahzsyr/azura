import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { handleAccountPath, parseAccountPath } from "@/features/account/account-middleware";
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
    assert.deepEqual(parseAccountPath("/account", ["en", "ar"], "en"), {
      locale: "en",
      sub: "",
    });
    assert.deepEqual(parseAccountPath("/account/login", ["en", "ar"], "en"), {
      locale: "en",
      sub: "login",
    });
    assert.equal(parseAccountPath("/admin", ["en"]), null);
  });
});

describe("account verify-email routing", () => {
  // Regression: admins were redirected to the admin dashboard before the
  // verify-email page could POST its token, so email-change links never
  // consumed and the address silently never changed.
  const intl = (req: NextRequest) => {
    const res = new Response(null, { status: 204 });
    Object.defineProperty(res, "xUrl", { value: req.url });
    return res as unknown as import("next/server").NextResponse;
  };
  // The real pipeline passes `request.nextUrl.pathname` (no query string).
  const run = (url: string, session: unknown) => {
    const nextRequest = new NextRequest(new URL(url, "https://brt-me.com"));
    const { pathname } = nextRequest.nextUrl;
    return handleAccountPath(
      nextRequest,
      pathname,
      ["en", "ar"],
      { registrationEnabled: true },
      async () => session as never,
      intl as never,
      "en",
    );
  };

  it("lets a signed-in admin reach verify-email with a token", async () => {
    const res = await run(
      "/account/verify-email?token=abc123",
      { user: { role: "SUPER_ADMIN" } },
    );
    assert.ok(res, "must not be short-circuited");
    assert.ok(!res.headers.get("location"), "must not redirect to the admin portal");
  });

  it("still redirects a signed-in admin away from other account pages", async () => {
    const res = await run("/account/security", { user: { role: "SUPER_ADMIN" } });
    assert.ok(res?.headers.get("location"), "admin account pages redirect");
  });

  it("verify-email without a token keeps the normal auth-page flow", async () => {
    const res = await run("/account/verify-email", null);
    assert.ok(res);
    assert.ok(!res.headers.get("location"));
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
      "/account",
    );
    assert.equal(
      resolvePostLoginRedirect({
        role: "ADMIN",
        locale: "en",
        callbackUrl: "/account",
      }),
      "/admin",
    );
  });
});
