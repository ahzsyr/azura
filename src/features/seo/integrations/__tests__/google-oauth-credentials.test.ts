import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  findMissingOAuthRedirectUri,
  normalizeOAuthRedirectUri,
  oauthRedirectUriMatches,
  parseGoogleOAuthCredentialsJson,
} from "@/features/seo/integrations/google-oauth-credentials";

describe("parseGoogleOAuthCredentialsJson", () => {
  const sampleWebExport = {
    web: {
      client_id: "144847907068-example.apps.googleusercontent.com",
      project_id: "theta-totem-500610-h1",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_secret: "GOCSPX-example-secret",
      redirect_uris: [
        "https://brt-me.com/api/seo/analytics/google/oauth/callback",
        "https://brt-me.net/api/seo/analytics/google/oauth/callback",
      ],
      javascript_origins: ["https://brt-me.com"],
    },
  };

  it("parses Google Cloud web client JSON exports", () => {
    const parsed = parseGoogleOAuthCredentialsJson(sampleWebExport);

    assert.equal(parsed.clientId, "144847907068-example.apps.googleusercontent.com");
    assert.equal(parsed.clientSecret, "GOCSPX-example-secret");
    assert.equal(parsed.projectId, "theta-totem-500610-h1");
    assert.deepEqual(parsed.redirectUris, [
      "https://brt-me.com/api/seo/analytics/google/oauth/callback",
      "https://brt-me.net/api/seo/analytics/google/oauth/callback",
    ]);
    assert.deepEqual(parsed.javascriptOrigins, ["https://brt-me.com"]);
  });

  it("parses installed client JSON exports", () => {
    const parsed = parseGoogleOAuthCredentialsJson({
      installed: {
        client_id: "installed-id.apps.googleusercontent.com",
        client_secret: "GOCSPX-installed",
      },
    });

    assert.equal(parsed.clientId, "installed-id.apps.googleusercontent.com");
    assert.equal(parsed.clientSecret, "GOCSPX-installed");
  });

  it("parses a bare credential object", () => {
    const parsed = parseGoogleOAuthCredentialsJson({
      client_id: "bare-id.apps.googleusercontent.com",
      client_secret: "GOCSPX-bare",
    });

    assert.equal(parsed.clientId, "bare-id.apps.googleusercontent.com");
    assert.equal(parsed.clientSecret, "GOCSPX-bare");
  });

  it("throws for invalid JSON shapes", () => {
    assert.throws(
      () => parseGoogleOAuthCredentialsJson({ web: { client_id: "only-id" } }),
      /missing client_id or client_secret/,
    );
    assert.throws(
      () => parseGoogleOAuthCredentialsJson({ foo: "bar" }),
      /Unrecognized OAuth client JSON/,
    );
  });
});

describe("oauthRedirectUriMatches", () => {
  it("matches callback URIs with trailing slash differences", () => {
    assert.equal(
      oauthRedirectUriMatches(
        "https://brt-me.com/api/seo/analytics/google/oauth/callback/",
        "https://brt-me.com/api/seo/analytics/google/oauth/callback",
      ),
      true,
    );
    assert.equal(
      normalizeOAuthRedirectUri("https://brt-me.com/api/seo/analytics/google/oauth/callback/"),
      "https://brt-me.com/api/seo/analytics/google/oauth/callback",
    );
  });

  it("detects missing redirect URIs", () => {
    assert.equal(
      findMissingOAuthRedirectUri(
        ["https://example.com/api/seo/analytics/google/oauth/callback"],
        "https://brt-me.com/api/seo/analytics/google/oauth/callback",
      ),
      true,
    );
    assert.equal(
      findMissingOAuthRedirectUri(
        ["https://brt-me.com/api/seo/analytics/google/oauth/callback/"],
        "https://brt-me.com/api/seo/analytics/google/oauth/callback",
      ),
      false,
    );
  });
});
