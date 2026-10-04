import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  assertSafeOutboundUrl,
  isPrivateOrReservedIp,
  validateWebhookDestination,
} from "@/lib/ssrf-guard";

describe("SSRF private IP detection", () => {
  it("blocks loopback, RFC1918, link-local, metadata", () => {
    assert.equal(isPrivateOrReservedIp("127.0.0.1"), true);
    assert.equal(isPrivateOrReservedIp("10.0.0.1"), true);
    assert.equal(isPrivateOrReservedIp("192.168.1.1"), true);
    assert.equal(isPrivateOrReservedIp("172.16.0.1"), true);
    assert.equal(isPrivateOrReservedIp("169.254.169.254"), true);
    assert.equal(isPrivateOrReservedIp("::1"), true);
    assert.equal(isPrivateOrReservedIp("8.8.8.8"), false);
  });

  it("blocks localhost hostname sync", () => {
    const result = assertSafeOutboundUrl("http://localhost/hook");
    assert.equal(result.ok, false);
  });
});

describe("validateWebhookDestination", () => {
  it("rejects private literal IP destinations", async () => {
    await assert.rejects(
      () => validateWebhookDestination("http://127.0.0.1/hook"),
      /Forbidden|SSRF|Private/i,
    );
  });
});
