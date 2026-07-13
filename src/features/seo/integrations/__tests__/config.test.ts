import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mergeSecretFields } from "@/features/seo/integrations/config-merge";

describe("mergeSecretFields", () => {
  it("preserves existing secrets when incoming secret fields are blank", () => {
    const existing = {
      google: {
        enabled: true,
        clientId: "client-id",
        bearerToken: "plain-token",
        refreshToken: "plain-refresh",
      },
    };
    const incoming = {
      google: {
        enabled: true,
        clientId: "client-id",
        bearerToken: undefined,
        refreshToken: undefined,
      },
    };

    const merged = mergeSecretFields(incoming, existing);

    assert.equal(merged.google?.bearerToken, "plain-token");
    assert.equal(merged.google?.refreshToken, "plain-refresh");
  });

  it("does not clear non-secret fields when incoming values are undefined", () => {
    const existing = {
      google: {
        enabled: true,
        siteUrl: "https://example.com",
        clientId: "saved-client-id",
        tokenExpiresAt: "2026-01-01T00:00:00.000Z",
      },
      indexnow: {
        enabled: false,
        endpoint: "https://api.indexnow.org/indexnow",
      },
    };
    const incoming = {
      google: {
        enabled: false,
        siteUrl: undefined,
        clientId: undefined,
        bearerToken: undefined,
      },
      bing: {
        enabled: false,
        siteUrl: undefined,
        apiKey: undefined,
      },
      indexnow: {
        enabled: false,
        siteUrl: undefined,
        apiKey: undefined,
      },
    };

    const merged = mergeSecretFields(incoming, existing);

    assert.equal(merged.google?.siteUrl, "https://example.com");
    assert.equal(merged.google?.clientId, "saved-client-id");
    assert.equal(merged.google?.tokenExpiresAt, "2026-01-01T00:00:00.000Z");
    assert.equal(merged.indexnow?.endpoint, "https://api.indexnow.org/indexnow");
    assert.equal(merged.google?.enabled, false);
  });

  it("falls back to sealed secrets when unsealed current values are missing", () => {
    const sealedBlob = "sealed:v1:abc123";
    const existing = {
      google: {
        enabled: true,
        clientId: "client-id",
      },
    };
    const sealedExisting = {
      google: {
        bearerToken: sealedBlob,
        refreshToken: sealedBlob,
        clientSecret: sealedBlob,
      },
    };
    const incoming = {
      google: {
        enabled: true,
        clientId: "client-id",
        bearerToken: undefined,
        refreshToken: undefined,
        clientSecret: undefined,
      },
    };

    const merged = mergeSecretFields(incoming, existing, sealedExisting);

    assert.equal(merged.google?.bearerToken, sealedBlob);
    assert.equal(merged.google?.refreshToken, sealedBlob);
    assert.equal(merged.google?.clientSecret, sealedBlob);
  });

  it("applies new secret values from incoming when provided", () => {
    const existing = {
      google: {
        bearerToken: "old-token",
      },
    };
    const incoming = {
      google: {
        bearerToken: "new-token",
      },
    };

    const merged = mergeSecretFields(incoming, existing);

    assert.equal(merged.google?.bearerToken, "new-token");
  });
});
