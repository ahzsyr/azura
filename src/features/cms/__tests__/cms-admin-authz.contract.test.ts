/**
 * Phase 5 authz contracts — privileged mutations reject unauth/non-admin.
 * UI visibility is not the security boundary.
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import Module from "node:module";

type Outcome = "ok" | "unauthorized" | "forbidden";
let adminOutcome: Outcome = "ok";

const stubAsync = async () => undefined;
const stubOk = async () => ({ success: true });

const originalLoad = (Module as unknown as { _load: (...args: unknown[]) => unknown })._load;
(Module as unknown as { _load: (...args: unknown[]) => unknown })._load = function load(
  request: string,
  ...args: unknown[]
) {
  if (request === "server-only") return {};
  if (request.endsWith("/guards") || request === "@/features/auth/guards") {
    return {
      requireAdmin: async () => {
        if (adminOutcome === "unauthorized") throw new Error("Unauthorized");
        if (adminOutcome === "forbidden") throw new Error("Forbidden");
        return { user: { id: "admin-1", role: "ADMIN" } };
      },
    };
  }
  if (request.endsWith("/prisma") || request === "@/lib/prisma") {
    return {
      prisma: {
        mediaAsset: {
          findMany: async () => [
            {
              id: "asset-1",
              url: "/uploads/a.png",
              storageBackend: "local",
              bucket: "local",
              objectKey: "images/a.png",
            },
          ],
        },
        searchDocument: { deleteMany: async () => ({ count: 0 }) },
      },
    };
  }
  if (
    request.endsWith("/media.repository") ||
    request === "@/repositories/media.repository"
  ) {
    return {
      mediaRepository: {
        deleteAssets: async () => ({ count: 1 }),
      },
    };
  }
  if (request.endsWith("/media-storage") || request === "@/lib/media-storage") {
    return { deleteStoredAsset: async () => true };
  }
  if (request.includes("revalidate") || request.includes("search-cache")) {
    return { revalidateSearch: stubAsync, revalidatePath: stubAsync };
  }
  if (
    request.endsWith("/revision-selection") ||
    request === "@/features/cms/revision-selection"
  ) {
    return {
      publishCmsPageAtomically: async () => ({
        page: {
          id: "p1",
          slug: "about",
          status: "PUBLISHED",
          publishedRevisionId: "r1",
          workingRevisionId: "r1",
        },
      }),
    };
  }
  if (request.endsWith("/auth") || request === "@/lib/auth") {
    return { auth: async () => ({ user: { id: "admin-1" } }) };
  }
  // Broad stubs for publishCmsPage side effects
  const stubs: Record<string, unknown> = {
    startSavePipelineMetrics: () => ({}),
    incrementSavePipelineMetric: stubAsync,
    isAsyncSearchIndexingEnabled: () => false,
    enqueueSearchIndexJob: stubAsync,
    searchIndexer: { indexCmsPage: stubAsync },
    syncCmsPageCache: stubAsync,
    revalidateCmsEntity: stubAsync,
    seoTriggerService: { handle: stubAsync },
    runSeoOnCmsPagePublish: stubAsync,
    cmsPagePaths: async () => ["/about"],
    dispatchWebhookFireAndForget: () => undefined,
    revalidatePath: stubAsync,
  };
  if (
    request.includes("save-pipeline") ||
    request.includes("search-indexer") ||
    request.includes("page-cache-sync") ||
    request.includes("publish-revalidate") ||
    request.includes("seo") ||
    request.includes("webhooks/dispatch") ||
    request.includes("cms-page-path")
  ) {
    return new Proxy(stubs, {
      get: (t, prop) => (prop in t ? t[prop as string] : stubOk),
    });
  }
  return originalLoad.call(this, request, ...args);
};

describe("Privileged mutation authz matrix", () => {
  beforeEach(() => {
    adminOutcome = "ok";
  });

  it("deleteMediaAssets: unauthenticated → reject", async () => {
    adminOutcome = "unauthorized";
    const { deleteMediaAssets } = await import("@/features/media/actions");
    const result = await deleteMediaAssets(["asset-1"]);
    assert.equal(result.success, false);
    assert.match(String(result.error), /Unauthorized/i);
  });

  it("deleteMediaAssets: non-admin → reject", async () => {
    adminOutcome = "forbidden";
    const { deleteMediaAssets } = await import("@/features/media/actions");
    const result = await deleteMediaAssets(["asset-1"]);
    assert.equal(result.success, false);
    assert.match(String(result.error), /Forbidden/i);
  });

  it("deleteMediaAssets: admin → succeed", async () => {
    adminOutcome = "ok";
    const { deleteMediaAssets } = await import("@/features/media/actions");
    const result = await deleteMediaAssets(["asset-1"]);
    assert.equal(result.success, true);
  });

  it("publishCmsPage: unauthenticated → throws", async () => {
    adminOutcome = "unauthorized";
    const mod = await import("@/features/cms/actions");
    await assert.rejects(() => mod.publishCmsPage("p1"), /Unauthorized/);
  });

  it("publishCmsPage: non-admin → throws", async () => {
    adminOutcome = "forbidden";
    const mod = await import("@/features/cms/actions");
    await assert.rejects(() => mod.publishCmsPage("p1"), /Forbidden/);
  });
});
