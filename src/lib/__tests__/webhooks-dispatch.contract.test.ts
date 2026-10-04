/**
 * Phase 5 webhook dispatch contracts — signing, fail-closed, isolation.
 */
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import Module from "node:module";
import { createHmac } from "node:crypto";

const fetches: Array<{ url: string; init: RequestInit }> = [];
let ssrfReject = false;

const originalLoad = (Module as unknown as { _load: (...args: unknown[]) => unknown })._load;
(Module as unknown as { _load: (...args: unknown[]) => unknown })._load = function load(
  request: string,
  ...args: unknown[]
) {
  if (request === "server-only") return {};
  if (request.endsWith("/ssrf-guard") || request === "@/lib/ssrf-guard") {
    return {
      validateWebhookDestination: async (raw: string) => {
        if (ssrfReject) throw new Error("SSRF blocked");
        return new URL(raw);
      },
    };
  }
  return originalLoad.call(this, request, ...args);
};

const originalFetch = globalThis.fetch;
const envBackup = {
  WEBHOOK_ENDPOINTS: process.env.WEBHOOK_ENDPOINTS,
  WEBHOOK_SIGNING_SECRET: process.env.WEBHOOK_SIGNING_SECRET,
  NODE_ENV: process.env.NODE_ENV,
};

describe("dispatchWebhook contracts", () => {
  beforeEach(() => {
    fetches.length = 0;
    ssrfReject = false;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      fetches.push({ url, init: init ?? {} });
      return new Response("ok", { status: 200 });
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.WEBHOOK_ENDPOINTS = envBackup.WEBHOOK_ENDPOINTS;
    process.env.WEBHOOK_SIGNING_SECRET = envBackup.WEBHOOK_SIGNING_SECRET;
    process.env.NODE_ENV = envBackup.NODE_ENV;
  });

  it("no endpoints → no fetch (domain write isolation)", async () => {
    process.env.WEBHOOK_ENDPOINTS = "";
    process.env.WEBHOOK_SIGNING_SECRET = "secret";
    const { dispatchWebhook } = await import("@/lib/webhooks/dispatch");
    await dispatchWebhook({
      type: "cms.page.published",
      occurredAt: new Date().toISOString(),
      data: { id: "p1" },
    });
    assert.equal(fetches.length, 0);
  });

  it("production without signing secret fails closed (no fetch)", async () => {
    process.env.NODE_ENV = "production";
    process.env.WEBHOOK_ENDPOINTS = "https://hooks.example.com/azura";
    delete process.env.WEBHOOK_SIGNING_SECRET;
    const { dispatchWebhook } = await import("@/lib/webhooks/dispatch");
    await dispatchWebhook({
      type: "cms.page.published",
      occurredAt: new Date().toISOString(),
      data: { id: "p1" },
    });
    assert.equal(fetches.length, 0);
  });

  it("signed POST uses HMAC x-azura-signature and redirect error", async () => {
    process.env.NODE_ENV = "test";
    process.env.WEBHOOK_ENDPOINTS = "https://hooks.example.com/azura";
    process.env.WEBHOOK_SIGNING_SECRET = "test-secret";
    const { dispatchWebhook } = await import("@/lib/webhooks/dispatch");
    const payload = {
      type: "media.uploaded" as const,
      occurredAt: "2026-10-04T00:00:00.000Z",
      data: { id: "m1" },
    };
    await dispatchWebhook(payload);
    assert.equal(fetches.length, 1);
    const body = String(fetches[0].init.body);
    const headers = fetches[0].init.headers as Record<string, string>;
    const expected = createHmac("sha256", "test-secret").update(body).digest("hex");
    assert.equal(headers["x-azura-signature"], expected);
    assert.equal(headers["x-azura-event"], "media.uploaded");
    assert.equal(fetches[0].init.redirect, "error");
  });

  it("SSRF rejection does not throw to caller (best-effort)", async () => {
    process.env.NODE_ENV = "test";
    process.env.WEBHOOK_ENDPOINTS = "https://hooks.example.com/azura";
    process.env.WEBHOOK_SIGNING_SECRET = "test-secret";
    ssrfReject = true;
    const { dispatchWebhook } = await import("@/lib/webhooks/dispatch");
    await assert.doesNotReject(() =>
      dispatchWebhook({
        type: "form.submitted",
        occurredAt: new Date().toISOString(),
        data: {},
      }),
    );
  });
});
