/**
 * Phase 5 storage identity contracts — delete by identity, never remote URL parse.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import Module from "node:module";

const deleted: Array<{ storageBackend: string; bucket: string; objectKey: string }> = [];

const originalLoad = (Module as unknown as { _load: (...args: unknown[]) => unknown })._load;
(Module as unknown as { _load: (...args: unknown[]) => unknown })._load = function load(
  request: string,
  ...args: unknown[]
) {
  if (request === "server-only") return {};
  if (
    request.endsWith("/storage-providers") ||
    request === "@/lib/storage-providers"
  ) {
    return {
      createStorageProvider: () => ({
        backend: "local",
        bucket: "local",
        upload: async () => ({
          url: "/uploads/images/x.png",
          storage: "local",
          bucket: "local",
          objectKey: "images/x.png",
        }),
        deleteObject: async (id: {
          storageBackend: string;
          bucket: string;
          objectKey: string;
        }) => {
          deleted.push({ ...id });
          return true;
        },
        getSignedUrl: async () => null,
      }),
      providerForBackend: (backend: string) => ({
        backend: backend === "s3" ? "s3" : backend === "supabase" ? "supabase" : "local",
        bucket: backend === "local" ? "local" : "media",
        upload: async () => {
          throw new Error("unused");
        },
        deleteObject: async (id: {
          storageBackend: string;
          bucket: string;
          objectKey: string;
        }) => {
          deleted.push({ ...id });
          return true;
        },
        getSignedUrl: async () => null,
      }),
    };
  }
  return originalLoad.call(this, request, ...args);
};

describe("MediaAsset storage identity contracts", () => {
  before(() => {
    deleted.length = 0;
  });

  after(() => {
    deleted.length = 0;
  });

  it("deleteStoredAsset removes by storageBackend+bucket+objectKey", async () => {
    deleted.length = 0;
    const { deleteStoredAsset } = await import("@/lib/media-storage");
    const ok = await deleteStoredAsset({
      storageBackend: "local",
      bucket: "local",
      objectKey: "images/canonical.png",
    });
    assert.equal(ok, true);
    assert.equal(deleted.length, 1);
    assert.deepEqual(deleted[0], {
      storageBackend: "local",
      bucket: "local",
      objectKey: "images/canonical.png",
    });
  });

  it("empty objectKey is a no-op (does not invent identity from url)", async () => {
    deleted.length = 0;
    const { deleteStoredAsset } = await import("@/lib/media-storage");
    const ok = await deleteStoredAsset({
      storageBackend: "supabase",
      bucket: "media",
      objectKey: "",
    });
    assert.equal(ok, false);
    assert.equal(deleted.length, 0);
  });

  it("deleteStoredUpload cannot delete remote urls by parsing them", async () => {
    deleted.length = 0;
    const { deleteStoredUpload } = await import("@/lib/media-storage");
    const ok = await deleteStoredUpload(
      "https://cdn.example.com/storage/v1/object/public/media/images/x.png",
    );
    assert.equal(ok, false);
    assert.equal(deleted.length, 0);
  });

  it("local /uploads/ url may map to local identity (legacy path only)", async () => {
    deleted.length = 0;
    const { deleteStoredUpload } = await import("@/lib/media-storage");
    const ok = await deleteStoredUpload("/uploads/images/legacy.png");
    assert.equal(ok, true);
    assert.equal(deleted[0]?.objectKey, "images/legacy.png");
    assert.equal(deleted[0]?.storageBackend, "local");
  });
});
