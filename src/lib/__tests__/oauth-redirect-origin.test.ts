import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import {
  ensureCanonicalOAuthRequest,
  getAppOriginFromHeaders,
  getCanonicalAppOrigin,
  getGoogleOAuthRedirectUri,
  getOAuthOrigin,
  normalizeOAuthHost,
  resolveRequestOrigin,
  rewriteAuthRedirect,
  rewriteBindHostLocation,
} from "@/lib/oauth-redirect-origin";

const ORIGINAL_ENV = { ...process.env };

function restoreEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key];
    }
  }
  Object.assign(process.env, ORIGINAL_ENV);
}

test("getAppOriginFromHeaders uses the request host", () => {
  const headers = new Headers({ host: "domain2.com" });
  assert.equal(getAppOriginFromHeaders(headers), "http://domain2.com");
});

test("getAppOriginFromHeaders prefers x-forwarded headers", () => {
  const headers = new Headers({
    host: "localhost:3000",
    "x-forwarded-host": "domain2.com",
    "x-forwarded-proto": "https",
  });
  assert.equal(getAppOriginFromHeaders(headers), "https://domain2.com");
});

test("getAppOriginFromHeaders falls back to env for invalid hosts", () => {
  restoreEnv();
  process.env.NEXT_PUBLIC_SITE_URL = "https://brt.example.com";

  const headers = new Headers({ host: "0.0.0.0:3000" });
  assert.equal(getAppOriginFromHeaders(headers), "https://brt.example.com");
});

test("getGoogleOAuthRedirectUri uses the request domain", () => {
  restoreEnv();
  process.env.NEXT_PUBLIC_SITE_URL = "https://hostinger.example.com";

  const request = new NextRequest(
    "https://vercel.example.com/api/seo/analytics/google/oauth/start",
  );

  assert.equal(
    getGoogleOAuthRedirectUri(request),
    "https://vercel.example.com/api/seo/analytics/google/oauth/callback",
  );
});

test("resolveRequestOrigin prefers x-forwarded headers", () => {
  const request = new NextRequest("http://localhost:3000/api/seo/analytics/google/oauth/start", {
    headers: {
      "x-forwarded-host": "domain2.com",
      "x-forwarded-proto": "https",
    },
  });

  assert.equal(resolveRequestOrigin(request), "https://domain2.com");
});

test("normalizeOAuthHost maps 0.0.0.0 to localhost when no public site is configured", () => {
  restoreEnv();
  delete process.env.NEXT_PUBLIC_SITE_URL;
  delete process.env.AUTH_URL;
  delete process.env.NEXTAUTH_URL;
  assert.equal(normalizeOAuthHost("https://0.0.0.0:3000"), "https://localhost:3000");
  assert.equal(normalizeOAuthHost("http://0.0.0.0:3000"), "http://localhost:3000");
});

test("normalizeOAuthHost maps 0.0.0.0 to the public site when configured", () => {
  restoreEnv();
  process.env.NEXT_PUBLIC_SITE_URL = "https://brt.example.com";
  assert.equal(normalizeOAuthHost("https://0.0.0.0:3000"), "https://brt.example.com");
  assert.equal(normalizeOAuthHost("http://0.0.0.0:3000"), "https://brt.example.com");
});

test("rewriteAuthRedirect keeps sign-out on the public domain", () => {
  restoreEnv();
  process.env.NEXT_PUBLIC_SITE_URL = "https://brt.example.com";
  assert.equal(
    rewriteAuthRedirect("/account/login", "https://0.0.0.0:3000"),
    "https://brt.example.com/account/login",
  );
  assert.equal(
    rewriteAuthRedirect("https://0.0.0.0:3000/account/login", "https://0.0.0.0:3000"),
    "https://brt.example.com/account/login",
  );
  assert.equal(
    rewriteAuthRedirect("https://evil.example/phish", "https://0.0.0.0:3000"),
    "https://brt.example.com",
  );
  assert.equal(
    rewriteAuthRedirect("/account/login", "https://domain2.com"),
    "https://domain2.com/account/login",
  );
});

test("rewriteAuthRedirect replaces localhost in production", () => {
  restoreEnv();
  process.env.NODE_ENV = "production";
  process.env.NEXT_PUBLIC_SITE_URL = "https://brt.example.com";
  assert.equal(
    rewriteAuthRedirect("/account/login", "http://localhost:3000"),
    "https://brt.example.com/account/login",
  );
  assert.equal(
    rewriteBindHostLocation("http://0.0.0.0:3000/account/login?callbackUrl=%2Fadmin"),
    "https://brt.example.com/account/login?callbackUrl=%2Fadmin",
  );
});

test("getOAuthOrigin falls back to env for invalid request hosts", () => {
  restoreEnv();
  process.env.NEXT_PUBLIC_SITE_URL = "https://brt.example.com";

  const request = new NextRequest(
    "https://0.0.0.0:3000/api/seo/analytics/google/oauth/start",
  );

  assert.equal(getOAuthOrigin(request), "https://brt.example.com");
  assert.equal(
    getGoogleOAuthRedirectUri(request),
    "https://brt.example.com/api/seo/analytics/google/oauth/callback",
  );
});

test("ensureCanonicalOAuthRequest redirects when request host differs from canonical", () => {
  restoreEnv();
  process.env.NEXT_PUBLIC_SITE_URL = "https://brt.example.com";

  const request = new NextRequest(
    "https://0.0.0.0:3000/api/seo/analytics/google/oauth/start",
  );
  const redirect = ensureCanonicalOAuthRequest(request);

  assert.ok(redirect);
  assert.equal(redirect.status, 307);
  assert.equal(
    redirect.headers.get("location"),
    "https://brt.example.com/api/seo/analytics/google/oauth/start",
  );
});

test("ensureCanonicalOAuthRequest does not redirect valid production hosts", () => {
  restoreEnv();
  process.env.NEXT_PUBLIC_SITE_URL = "https://www.brt-me.com";
  process.env.INTERNAL_APP_URL = "http://127.0.0.1:3000";

  const request = new NextRequest(
    "https://brt-me.com/api/seo/analytics/google/oauth/start",
  );

  assert.equal(ensureCanonicalOAuthRequest(request), null);
});

test("getCanonicalAppOrigin ignores INTERNAL_APP_URL", () => {
  restoreEnv();
  delete process.env.NEXT_PUBLIC_SITE_URL;
  process.env.INTERNAL_APP_URL = "http://127.0.0.1:3000";

  assert.equal(getCanonicalAppOrigin(), "http://localhost:3000");
});

test("ensureCanonicalOAuthRequest returns null on valid host", () => {
  restoreEnv();
  process.env.NEXT_PUBLIC_SITE_URL = "https://brt.example.com";

  const request = new NextRequest(
    "https://brt.example.com/api/seo/analytics/google/oauth/start",
  );

  assert.equal(ensureCanonicalOAuthRequest(request), null);
});
