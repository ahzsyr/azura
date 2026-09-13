import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveCapabilityAvailability,
  CAPABILITY_DEPENDENCIES,
} from "@/modules/marketing/core/capabilities";
import {
  canTransitionLifecycle,
  nextLifecycleOnHealth,
} from "@/modules/marketing/core/lifecycle";
import {
  clearProviders,
  findByCapability,
  listCapabilities,
  listProviders,
  registerProvider,
  supports,
} from "@/modules/marketing/core/registry";
import { clearProviderManifests, registerProviderManifest } from "@/modules/marketing/core/manifests";
import { metaProviderManifest } from "@/modules/marketing/providers/meta/manifest";
import { linkedinProviderManifest } from "@/modules/marketing/providers/linkedin/manifest";
import type { MarketingProviderAdapter } from "@/modules/marketing/core/registry/types";
import { providerQuotaService } from "@/modules/marketing/core/quota";
import { marketingEventBus } from "@/modules/marketing/core/events";
import { isProviderVersionCompatible } from "@/modules/marketing/core/versioning";
import { mapMetaWebhook } from "@/modules/marketing/providers/meta/mapper";
import { mapLinkedInOrgToCanonicalAsset } from "@/modules/marketing/providers/linkedin/mapper";
import { validateMediaForProvider } from "@/modules/marketing/media/pipeline";
import { buildPermissionEntries, summarizePermissions } from "@/modules/marketing/core/permissions";

function stubAdapter(manifest: typeof metaProviderManifest): MarketingProviderAdapter {
  return {
    id: manifest.id,
    manifest,
    capabilities: () => manifest.capabilities,
  };
}

describe("marketing capabilities", () => {
  it("requires connection for publishing", () => {
    assert.deepEqual(CAPABILITY_DEPENDENCIES.publishing, ["connection"]);
    const blocked = resolveCapabilityAvailability({
      capability: "publishing",
      supported: ["publishing"],
      enabled: ["publishing"],
    });
    assert.equal(blocked.available, false);
    assert.equal(blocked.reason, "missingDependency");
  });

  it("allows publishing when connection is present", () => {
    const ok = resolveCapabilityAvailability({
      capability: "publishing",
      supported: ["connection", "publishing"],
      enabled: ["connection", "publishing"],
    });
    assert.equal(ok.available, true);
  });
});

describe("marketing provider registry", () => {
  it("registers meta and linkedin with discovery APIs", () => {
    clearProviders();
    clearProviderManifests();
    registerProviderManifest(metaProviderManifest);
    registerProviderManifest(linkedinProviderManifest);
    registerProvider(stubAdapter(metaProviderManifest));
    registerProvider(stubAdapter(linkedinProviderManifest));

    assert.equal(listProviders().length, 2);
    assert.ok(supports("meta", "tracking"));
    assert.equal(supports("linkedin", "tracking"), false);
    assert.ok(findByCapability("publishing").some((p) => p.id === "meta"));
    assert.ok(listCapabilities().includes("connection"));
  });
});

describe("marketing lifecycle", () => {
  it("validates transitions and health-driven updates", () => {
    assert.equal(canTransitionLifecycle("configured", "connected"), true);
    assert.equal(canTransitionLifecycle("retired", "connected"), false);
    assert.equal(nextLifecycleOnHealth(true, "connected"), "healthy");
    assert.equal(nextLifecycleOnHealth(false, "healthy"), "degraded");
  });
});

describe("marketing quota and versioning", () => {
  it("tracks remaining quota and backoff", () => {
    providerQuotaService.clear();
    assert.equal(providerQuotaService.canProceed("meta"), true);
    providerQuotaService.consume("meta", 1);
    assert.ok(providerQuotaService.get("meta").remaining < providerQuotaService.get("meta").dailyLimit);
    assert.ok(providerQuotaService.adaptiveBackoffMs(3) >= 1000);
  });

  it("checks provider version compatibility", () => {
    assert.equal(
      isProviderVersionCompatible("v21.0", metaProviderManifest.version),
      true,
    );
    assert.equal(
      isProviderVersionCompatible("v10.0", metaProviderManifest.version),
      false,
    );
  });
});

describe("marketing events and mappers", () => {
  it("emits typed events", async () => {
    let seen = "";
    const off = marketingEventBus.on("WEBHOOK_RECEIVED", (payload) => {
      seen = payload.providerId;
    });
    await marketingEventBus.emit("WEBHOOK_RECEIVED", {
      providerId: "meta",
      eventType: "page",
      webhookEventId: "evt_1",
    });
    off();
    assert.equal(seen, "meta");
  });

  it("maps provider payloads to canonical DTOs", () => {
    const webhook = mapMetaWebhook({ object: "page", entry: [{ id: "123", time: 1700000000 }] });
    assert.equal(webhook?.providerId, "meta");
    const asset = mapLinkedInOrgToCanonicalAsset({ id: 99, localizedName: "Acme" });
    assert.equal(asset.kind, "company");
  });
});

describe("marketing permissions and media", () => {
  it("summarizes permission gaps", () => {
    const entries = buildPermissionEntries(
      ["pages_manage_posts", "leads_retrieval"],
      ["pages_manage_posts"],
      [],
    );
    const summary = summarizePermissions(entries);
    assert.deepEqual(summary.granted, ["pages_manage_posts"]);
    assert.deepEqual(summary.missing, ["leads_retrieval"]);
    assert.equal(summary.reconnectRequired, true);
  });

  it("validates media inputs", () => {
    assert.equal(
      validateMediaForProvider({
        url: "https://cdn.example.com/a.jpg",
        providerId: "meta",
      }).ok,
      true,
    );
    assert.equal(
      validateMediaForProvider({
        url: "https://cdn.example.com/a.txt",
        providerId: "meta",
      }).ok,
      false,
    );
  });
});
