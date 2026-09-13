import test from "node:test";
import assert from "node:assert/strict";
import Module from "node:module";

const publishCalls: unknown[] = [];
const store = new Map<string, Record<string, unknown>>();

const originalLoad = (Module as unknown as { _load: (...args: unknown[]) => unknown })._load;
(Module as unknown as { _load: (...args: unknown[]) => unknown })._load = function load(
  request: string,
  ...args: unknown[]
) {
  if (request === "server-only") return {};
  if (request === "next/cache") {
    return {
      revalidatePath: () => undefined,
      revalidateTag: () => undefined,
      unstable_cache: (fn: unknown) => fn,
    };
  }
  if (request === "@/services/publish-propagation") {
    return {
      publishShellChange: async (input: unknown) => {
        publishCalls.push(input);
        return {
          entityType: "site-settings",
          invalidatedPaths: [],
          invalidatedTags: [],
          completedAt: new Date().toISOString(),
          durationMs: 0,
        };
      },
    };
  }
  if (request === "@/repositories/site-settings.repository") {
    return {
      siteSettingsRepository: {
        async get(locale: string) {
          return store.get(locale.toLowerCase()) ?? null;
        },
        async set(locale: string, payload: Record<string, unknown>) {
          store.set(locale.toLowerCase(), payload);
        },
        async markPublished() {
          /* noop */
        },
        async getPublishStatus() {
          return { version: 1, publishedVersion: 0, isLive: false };
        },
      },
    };
  }
  if (request === "@/features/catalog/locales") {
    return {
      normalizeCatalogLocaleCode: async (code: string) => code.trim().toLowerCase() || "en",
      getDefaultCatalogLocaleCode: async () => "en",
    };
  }
  return originalLoad.call(this, request, ...args);
};

test("patchSiteSettingsKey persists without publish; publishSiteSettings publishes", async () => {
  publishCalls.length = 0;
  store.clear();

  const { patchSiteSettingsKey, publishSiteSettings } = await import(
    "@/features/catalog/site-settings.service"
  );

  await patchSiteSettingsKey("en", "search", { enabled: true });
  assert.equal(publishCalls.length, 0);
  assert.deepEqual(store.get("en")?.search, { enabled: true });

  await publishSiteSettings("en");
  assert.equal(publishCalls.length, 1);
  assert.deepEqual(publishCalls[0], { entityType: "site-settings" });
});
