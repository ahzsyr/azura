import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PUBLIC_FORM_BODY_MAX_BYTES,
  classifyContentLength,
  resolveTrustedClientIp,
  resolveTurnstileMissingKeyPolicy,
} from "@/lib/security/abuse-controls";
import {
  formUploadKindMatches,
  sniffFormUploadKind,
} from "@/lib/security/upload-magic-bytes";
import {
  FORM_SUBMIT_RATE_LIMIT,
  formSubmitRateLimitKey,
} from "@/features/forms/platform/handlers/spam-rules";

const trusted = {
  trustProxyHeaders: true,
  trustForwardedFor: false,
  trustedProxyCount: 1,
};

describe("trusted client IP", () => {
  it("ignores forwarding headers until the proxy is explicitly trusted", () => {
    assert.equal(
      resolveTrustedClientIp({
        realIp: "203.0.113.7",
        forwardedFor: "9.9.9.9",
        trustProxyHeaders: false,
        trustForwardedFor: true,
        trustedProxyCount: 1,
      }),
      "unknown",
    );
  });

  it("honors x-real-ip only after AZURA_TRUST_PROXY_HEADERS", () => {
    assert.equal(
      resolveTrustedClientIp({
        realIp: "203.0.113.7",
        forwardedFor: "1.2.3.4, 5.6.7.8",
        ...trusted,
      }),
      "203.0.113.7",
    );
  });

  it("ignores X-Forwarded-For unless the chain boundary is set", () => {
    assert.equal(
      resolveTrustedClientIp({
        realIp: null,
        forwardedFor: "9.9.9.9, 198.51.100.2",
        trustProxyHeaders: true,
        trustForwardedFor: false,
        trustedProxyCount: 1,
      }),
      "unknown",
    );
    assert.equal(
      resolveTrustedClientIp({
        realIp: null,
        forwardedFor: "9.9.9.9, 198.51.100.2",
        trustProxyHeaders: true,
        trustForwardedFor: true,
        trustedProxyCount: 0,
      }),
      "unknown",
    );
  });

  it("takes the client that many hops from the right", () => {
    assert.equal(
      resolveTrustedClientIp({
        realIp: null,
        forwardedFor: "203.0.113.8, 198.51.100.2",
        trustProxyHeaders: true,
        trustForwardedFor: true,
        trustedProxyCount: 1,
      }),
      "198.51.100.2",
    );
    assert.equal(
      resolveTrustedClientIp({
        realIp: null,
        forwardedFor: "203.0.113.8, 198.51.100.2",
        trustProxyHeaders: true,
        trustForwardedFor: true,
        trustedProxyCount: 2,
      }),
      "203.0.113.8",
    );
  });

  it("x-real-ip wins over XFF when both are trusted", () => {
    assert.equal(
      resolveTrustedClientIp({
        realIp: "203.0.113.7",
        forwardedFor: "9.9.9.9",
        trustProxyHeaders: true,
        trustForwardedFor: true,
        trustedProxyCount: 1,
      }),
      "203.0.113.7",
    );
  });

  it("falls back to unknown", () => {
    assert.equal(
      resolveTrustedClientIp({ realIp: "", forwardedFor: null, ...trusted }),
      "unknown",
    );
  });
});

describe("public body size gate", () => {
  it("rejects a missing or oversized Content-Length", () => {
    assert.equal(classifyContentLength(null, PUBLIC_FORM_BODY_MAX_BYTES), "missing");
    assert.equal(classifyContentLength("  ", PUBLIC_FORM_BODY_MAX_BYTES), "missing");
    assert.equal(classifyContentLength("nope", PUBLIC_FORM_BODY_MAX_BYTES), "missing");
    assert.equal(classifyContentLength(String(PUBLIC_FORM_BODY_MAX_BYTES + 1), PUBLIC_FORM_BODY_MAX_BYTES), "too_large");
    assert.equal(classifyContentLength(String(PUBLIC_FORM_BODY_MAX_BYTES), PUBLIC_FORM_BODY_MAX_BYTES), "ok");
  });
});

describe("Turnstile fail-closed policy", () => {
  it("production without secret denies", () => {
    assert.equal(resolveTurnstileMissingKeyPolicy("production"), "deny");
  });

  it("development without secret stays open", () => {
    assert.equal(resolveTurnstileMissingKeyPolicy("development"), "allow");
    assert.equal(resolveTurnstileMissingKeyPolicy("test"), "allow");
    assert.equal(resolveTurnstileMissingKeyPolicy(undefined), "allow");
  });
});

describe("form upload magic bytes", () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
  const gif = Buffer.from("GIF89a....", "latin1");
  const webp = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0, 0, 0, 0]), Buffer.from("WEBP")]);
  const pdf = Buffer.from("%PDF-1.7\n...", "latin1");

  it("sniffs each allowed type", () => {
    assert.equal(sniffFormUploadKind(png), "png");
    assert.equal(sniffFormUploadKind(jpeg), "jpeg");
    assert.equal(sniffFormUploadKind(gif), "gif");
    assert.equal(sniffFormUploadKind(webp), "webp");
    assert.equal(sniffFormUploadKind(pdf), "pdf");
  });

  it("rejects disallowed/unknown content", () => {
    assert.equal(sniffFormUploadKind(Buffer.from("<script>alert(1)</script>")), null);
    assert.equal(sniffFormUploadKind(Buffer.from("<?php echo 1;")), null);
    assert.equal(sniffFormUploadKind(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>")), null);
    assert.equal(sniffFormUploadKind(Buffer.alloc(0)), null);
  });

  it("rejects a .png that actually contains script (extension spoof)", () => {
    const spoof = Buffer.from("<?php system($_GET['c']); ?>");
    assert.equal(sniffFormUploadKind(spoof), null);
  });

  it("rejects mismatched extension", () => {
    assert.equal(formUploadKindMatches("png", { name: "photo.jpg" }), false);
    assert.equal(formUploadKindMatches("png", { name: "photo.png" }), true);
    assert.equal(formUploadKindMatches("pdf", { name: "doc.pdf" }), true);
    assert.equal(formUploadKindMatches("pdf", { name: "doc.png" }), false);
  });

  it("rejects a MIME that contradicts the bytes", () => {
    assert.equal(formUploadKindMatches("png", { name: "a.png", type: "image/jpeg" }), false);
    assert.equal(formUploadKindMatches("png", { name: "a.png", type: "image/png" }), true);
    assert.equal(formUploadKindMatches("png", { name: "a.png", type: "" }), true);
    assert.equal(formUploadKindMatches("png", { name: "a.png", type: "application/octet-stream" }), true);
  });
});

describe("shared form rate limiter", () => {
  it("has a bounded budget", () => {
    assert.equal(FORM_SUBMIT_RATE_LIMIT.limit, 10);
    assert.equal(FORM_SUBMIT_RATE_LIMIT.windowMs, 10 * 60 * 1000);
  });

  it("keys the shared bucket per client IP", () => {
    assert.equal(formSubmitRateLimitKey("203.0.113.7"), "forms-submit-budget:203.0.113.7");
    assert.equal(formSubmitRateLimitKey("  "), "forms-submit-budget:unknown");
  });

  it("is async and shared (no per-process Map)", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile(
      new URL("../../../features/forms/platform/handlers/spam-handler.ts", import.meta.url),
      "utf8",
    );
    assert.doesNotMatch(src, /new Map</, "in-memory limiter must be gone");
    assert.match(src, /enforceRateLimit/, "must use the shared DB limiter");
    assert.match(src, /isHoneypotTriggered/, "honeypot must be kept");
  });
});
