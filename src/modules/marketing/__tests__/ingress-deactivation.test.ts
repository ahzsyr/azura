import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NextRequest, NextResponse } from "next/server";
import {
  decideMarketingIngress,
  marketingIngressSkipBody,
  marketingWebhookInactiveGetResponse,
} from "@/modules/marketing/ingress-decision";
import { handleMarketingShortLink } from "@/modules/marketing/ingress/short-link";
import { CAMPAIGN_ENTRY_COOKIE } from "@/modules/marketing/tracking-urls/build-url";
import {
  handleMarketingJobsIngress,
  handleMarketingOAuthCallbackIngress,
  handleMarketingOAuthStartIngress,
  handleMarketingWebhookGetIngress,
  handleMarketingWebhookPostIngress,
  runMarketingBeaconIngress,
} from "@/modules/marketing/ingress/handlers";

function request(url: string) {
  return new NextRequest(new URL(url, "https://example.com"));
}

describe("decideMarketingIngress", () => {
  it("allows when module active and env enabled", () => {
    assert.deepEqual(
      decideMarketingIngress({ moduleAccess: "active", envCoreEnabled: true }),
      { allow: true },
    );
  });

  it("denies profile-omitted", () => {
    assert.deepEqual(
      decideMarketingIngress({ moduleAccess: "profile_omitted", envCoreEnabled: true }),
      { allow: false, reason: "profile_omitted" },
    );
  });

  it("denies runtime-inactive", () => {
    assert.deepEqual(
      decideMarketingIngress({ moduleAccess: "runtime_inactive", envCoreEnabled: true }),
      { allow: false, reason: "runtime_inactive" },
    );
  });

  it("fails closed on ledger unavailable", () => {
    assert.deepEqual(
      decideMarketingIngress({ moduleAccess: "ledger_unavailable", envCoreEnabled: true }),
      { allow: false, reason: "ledger_unavailable" },
    );
  });

  it("denies env_disabled even when module active", () => {
    assert.deepEqual(
      decideMarketingIngress({ moduleAccess: "active", envCoreEnabled: false }),
      { allow: false, reason: "env_disabled" },
    );
  });
});

describe("short-link inactive behavior", () => {
  it("redirects home with no cookie and no campaign read when runtime-inactive", async () => {
    let campaignReads = 0;
    const res = await handleMarketingShortLink(request("https://example.com/a?test"), {
      resolveAccess: async () => ({ allow: false, reason: "runtime_inactive" }),
      findCampaignByInternalId: async () => {
        campaignReads += 1;
        return {
          internalId: "test",
          landingPagePath: "/products",
          trackingUrls: [],
        };
      },
      getDefaultLocale: () => "en",
      resolveRedirectOrigin: () => "https://example.com",
    });
    assert.equal(res.status, 302);
    assert.equal(new URL(res.headers.get("location")!).pathname, "/");
    assert.equal(res.cookies.get(CAMPAIGN_ENTRY_COOKIE), undefined);
    assert.equal(campaignReads, 0);
  });

  it("redirects home with no cookie on ledger failure", async () => {
    let campaignReads = 0;
    const res = await handleMarketingShortLink(request("https://example.com/a?camp1"), {
      resolveAccess: async () => ({ allow: false, reason: "ledger_unavailable" }),
      findCampaignByInternalId: async () => {
        campaignReads += 1;
        return null;
      },
      getDefaultLocale: () => "en",
      resolveRedirectOrigin: () => "https://example.com",
    });
    assert.equal(res.status, 302);
    assert.equal(res.cookies.get(CAMPAIGN_ENTRY_COOKIE), undefined);
    assert.equal(campaignReads, 0);
  });

  it("sets attribution cookie when active", async () => {
    const res = await handleMarketingShortLink(request("https://example.com/a?test"), {
      resolveAccess: async () => ({ allow: true }),
      findCampaignByInternalId: async () => ({
        internalId: "test",
        landingPagePath: "/products",
        trackingUrls: [{ utmSource: "meta", baseUrl: "/products" }],
      }),
      getDefaultLocale: () => "en",
      resolveRedirectOrigin: () => "https://example.com",
    });
    assert.equal(res.status, 302);
    assert.ok(res.cookies.get(CAMPAIGN_ENTRY_COOKIE)?.value);
    assert.match(res.headers.get("location") ?? "", /\/en\/products|\/products/);
  });

  it("profile-omitted matches runtime-inactive observable deny on /a", async () => {
    const res = await handleMarketingShortLink(request("https://example.com/a?x"), {
      resolveAccess: async () => ({ allow: false, reason: "profile_omitted" }),
      findCampaignByInternalId: async () => {
        throw new Error("must not read");
      },
      getDefaultLocale: () => "en",
      resolveRedirectOrigin: () => "https://example.com",
    });
    assert.equal(res.status, 302);
    assert.equal(res.cookies.get(CAMPAIGN_ENTRY_COOKIE), undefined);
  });
});

describe("attribution and events beacon ingress", () => {
  it("attribution inactive does not invoke capture writer", async () => {
    let writes = 0;
    const result = await runMarketingBeaconIngress(
      async () => ({ allow: false, reason: "runtime_inactive" }),
      async () => {
        writes += 1;
        return { visitorId: "v1" };
      },
    );
    assert.deepEqual(result, marketingIngressSkipBody("runtime_inactive"));
    assert.equal(writes, 0);
  });

  it("events ledger failure does not persist and returns skip body", async () => {
    let writes = 0;
    const result = await runMarketingBeaconIngress(
      async () => ({ allow: false, reason: "ledger_unavailable" }),
      async () => {
        writes += 1;
        return { event: { id: "e1" } };
      },
    );
    assert.deepEqual(result, { skipped: true, reason: "ledger_unavailable" });
    assert.equal(writes, 0);
  });

  it("active beacon runs the writer", async () => {
    const result = await runMarketingBeaconIngress(
      async () => ({ allow: true }),
      async () => ({ ok: true, id: "1" }),
    );
    assert.deepEqual(result, { ok: true, id: "1" });
  });
});

describe("webhook GET and POST independently", () => {
  it("GET inactive does not complete Meta challenge", async () => {
    let challengeCalls = 0;
    const res = await handleMarketingWebhookGetIngress({
      resolveAccess: async () => ({ allow: false, reason: "runtime_inactive" }),
      completeChallenge: async () => {
        challengeCalls += 1;
        return new NextResponse("challenge-token", { status: 200 });
      },
    });
    assert.equal(challengeCalls, 0);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.deepEqual(body, { ok: false, skipped: true, reason: "runtime_inactive" });
  });

  it("GET active can complete challenge", async () => {
    const res = await handleMarketingWebhookGetIngress({
      resolveAccess: async () => ({ allow: true }),
      completeChallenge: async () => new NextResponse("abc", { status: 200 }),
    });
    assert.equal(res.status, 200);
    assert.equal(await res.text(), "abc");
  });

  it("POST inactive does not ingest or enqueue", async () => {
    let ingestCalls = 0;
    const res = await handleMarketingWebhookPostIngress({
      resolveAccess: async () => ({ allow: false, reason: "profile_omitted" }),
      ingest: async () => {
        ingestCalls += 1;
        return { id: "evt", status: "RECEIVED" };
      },
    });
    assert.equal(ingestCalls, 0);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), {
      ok: true,
      skipped: true,
      reason: "profile_omitted",
    });
  });

  it("POST active preserves ingest path including signature failures as 400", async () => {
    const res = await handleMarketingWebhookPostIngress({
      resolveAccess: async () => ({ allow: true }),
      ingest: async () => {
        throw new Error("invalid signature");
      },
    });
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { ok: false, error: "invalid signature" });
  });
});

describe("OAuth start and callback", () => {
  it("start blocks inactive before provider bootstrap work", async () => {
    let started = 0;
    const res = await handleMarketingOAuthStartIngress({
      resolveAccess: async () => ({ allow: false, reason: "runtime_inactive" }),
      inactiveRedirect: (reason) =>
        NextResponse.redirect(`https://example.com/admin/marketing/platforms?error=${reason}`),
      start: async () => {
        started += 1;
        return NextResponse.redirect("https://provider.example/oauth");
      },
    });
    assert.equal(started, 0);
    assert.equal(res.status, 307);
    assert.match(res.headers.get("location") ?? "", /runtime_inactive/);
  });

  it("callback validates CSRF before inactive deny and clears cookies", async () => {
    let exchanged = 0;
    let cleared = 0;
    const res = await handleMarketingOAuthCallbackIngress({
      resolveAccess: async () => ({ allow: false, reason: "runtime_inactive" }),
      validateState: () => "ok",
      stateInvalidRedirect: () =>
        NextResponse.redirect("https://example.com/admin/marketing/platforms?error=oauth_state"),
      inactiveRedirect: (reason) =>
        NextResponse.redirect(
          `https://example.com/admin/marketing/platforms?error=marketing_inactive&reason=${reason}`,
        ),
      clearOAuthCookies: () => {
        cleared += 1;
      },
      exchangeAndPersist: async () => {
        exchanged += 1;
        return NextResponse.redirect("https://example.com/connected");
      },
    });
    assert.equal(exchanged, 0);
    assert.equal(cleared, 1);
    assert.match(res.headers.get("location") ?? "", /marketing_inactive/);
  });

  it("callback with bad state never checks access exchange path", async () => {
    let accessCalls = 0;
    let exchanged = 0;
    const res = await handleMarketingOAuthCallbackIngress({
      resolveAccess: async () => {
        accessCalls += 1;
        return { allow: true };
      },
      validateState: () => "oauth_state",
      stateInvalidRedirect: () =>
        NextResponse.redirect("https://example.com/admin/marketing/platforms?error=oauth_state"),
      inactiveRedirect: () => NextResponse.redirect("https://example.com/inactive"),
      clearOAuthCookies: () => undefined,
      exchangeAndPersist: async () => {
        exchanged += 1;
        return NextResponse.redirect("https://example.com/connected");
      },
    });
    assert.equal(accessCalls, 0);
    assert.equal(exchanged, 0);
    assert.match(res.headers.get("location") ?? "", /oauth_state/);
  });
});

describe("jobs skip", () => {
  it("skips job execution when runtime-inactive", async () => {
    let ran = 0;
    const res = await handleMarketingJobsIngress({
      authorize: async () => "ok",
      resolveAccess: async () => ({ allow: false, reason: "runtime_inactive" }),
      run: async () => {
        ran += 1;
        return { scheduled: 1, processed: 2, results: [{ id: "j1" }] };
      },
    });
    assert.equal(ran, 0);
    assert.deepEqual(await res.json(), {
      ok: true,
      skipped: true,
      reason: "runtime_inactive",
    });
  });

  it("skips on ledger failure (fail closed)", async () => {
    let ran = 0;
    const res = await handleMarketingJobsIngress({
      authorize: async () => "ok",
      resolveAccess: async () => ({ allow: false, reason: "ledger_unavailable" }),
      run: async () => {
        ran += 1;
        return { scheduled: null, processed: 0, results: [] };
      },
    });
    assert.equal(ran, 0);
    assert.equal((await res.json()).reason, "ledger_unavailable");
  });

  it("runs when active after auth", async () => {
    const res = await handleMarketingJobsIngress({
      authorize: async () => "ok",
      resolveAccess: async () => ({ allow: true }),
      run: async () => ({ scheduled: null, processed: 1, results: [{ ok: true }] }),
    });
    assert.deepEqual(await res.json(), {
      ok: true,
      scheduled: null,
      processed: 1,
      results: [{ ok: true }],
    });
  });

  it("unauthorized before access check", async () => {
    let accessCalls = 0;
    const res = await handleMarketingJobsIngress({
      authorize: async () => "unauthorized",
      resolveAccess: async () => {
        accessCalls += 1;
        return { allow: true };
      },
      run: async () => ({ scheduled: null, processed: 0, results: [] }),
    });
    assert.equal(res.status, 401);
    assert.equal(accessCalls, 0);
  });
});

describe("response helpers", () => {
  it("webhook inactive GET helper is 404 skip", async () => {
    const res = marketingWebhookInactiveGetResponse("runtime_inactive");
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), {
      ok: false,
      skipped: true,
      reason: "runtime_inactive",
    });
  });
});
