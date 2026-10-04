import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assertWebhookSigningConfig, parseInfraEnv } from "@/lib/env-infra";

describe("parseInfraEnv", () => {
  it("defaults MEDIA_STORAGE to local", () => {
    const result = parseInfraEnv({ NODE_ENV: "test" });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.data.MEDIA_STORAGE, "local");
  });

  it("accepts supabase and s3", () => {
    assert.equal(parseInfraEnv({ MEDIA_STORAGE: "supabase" }).ok, true);
    assert.equal(parseInfraEnv({ MEDIA_STORAGE: "s3" }).ok, true);
  });

  it("rejects unknown MEDIA_STORAGE", () => {
    const result = parseInfraEnv({ MEDIA_STORAGE: "gcs" });
    assert.equal(result.ok, false);
  });
});

describe("assertWebhookSigningConfig", () => {
  it("fails closed in production with endpoints but no secret", () => {
    assert.throws(
      () =>
        assertWebhookSigningConfig({
          MEDIA_STORAGE: "local",
          NODE_ENV: "production",
          WEBHOOK_ENDPOINTS: "https://hooks.example.com/x",
        }),
      /WEBHOOK_SIGNING_SECRET/,
    );
  });

  it("allows production when secret present", () => {
    assert.doesNotThrow(() =>
      assertWebhookSigningConfig({
        MEDIA_STORAGE: "local",
        NODE_ENV: "production",
        WEBHOOK_ENDPOINTS: "https://hooks.example.com/x",
        WEBHOOK_SIGNING_SECRET: "s",
      }),
    );
  });
});
