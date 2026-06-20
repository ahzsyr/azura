import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

const STORAGE_KEY = "az_catalog_compare";

function createLocalStorageMock() {
  const bag: Record<string, string> = {};
  return {
    getItem(key: string) {
      return bag[key] ?? null;
    },
    setItem(key: string, value: string) {
      bag[key] = value;
    },
    removeItem(key: string) {
      delete bag[key];
    },
    clear() {
      for (const k of Object.keys(bag)) delete bag[k];
    },
  };
}

describe("comparison store", () => {
  let store: typeof import("@/features/comparison/comparison-store");

  beforeEach(async () => {
    const ls = createLocalStorageMock();
    (globalThis as { window?: Window }).window = {
      localStorage: ls as unknown as Storage,
      dispatchEvent: () => true,
    } as unknown as Window;
    (globalThis as { document?: Document }).document = {
      documentElement: { dataset: {} as DOMStringMap },
    } as unknown as Document;

    store = await import("@/features/comparison/comparison-store");
    store.clearCompareList();
  });

  afterEach(() => {
    store.clearCompareList();
  });

  it("normalizes legacy packages slug to catalog-items", () => {
    store.toggleCompareList("packages", "id-1", 4);

    assert.deepEqual(store.getCompareIdsForType("catalog-items"), ["id-1"]);
    assert.deepEqual(store.getCompareIdsForType("packages"), ["id-1"]);
    assert.equal(store.isInCompareList("packages", "id-2"), false);

    const raw = (globalThis.window as Window).localStorage.getItem(STORAGE_KEY);
    assert.ok(raw);
    const parsed = JSON.parse(raw!) as Record<string, string[]>;
    assert.deepEqual(parsed["catalog-items"], ["id-1"]);
    assert.equal(parsed.packages, undefined);
  });

  it("migrates pre-seeded legacy packages key on read", () => {
    (globalThis.window as Window).localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ packages: ["legacy-id"] })
    );

    assert.deepEqual(store.getCompareIdsForType("catalog-items"), ["legacy-id"]);
    const raw = (globalThis.window as Window).localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw!) as Record<string, string[]>;
    assert.deepEqual(parsed["catalog-items"], ["legacy-id"]);
    assert.equal(parsed.packages, undefined);
  });

  it("isolates catalog-items and listings buckets", () => {
    store.toggleCompareList("catalog-items", "pkg-1", 4);
    store.toggleCompareList("catalog-items", "pkg-2", 4);
    store.toggleCompareList("listings", "hotel-1", 4);

    assert.deepEqual(store.getCompareIdsForType("catalog-items"), ["pkg-1", "pkg-2"]);
    assert.deepEqual(store.getCompareIdsForType("listings"), ["hotel-1"]);
    const summary = store.getCompareBucketsSummary();
    assert.equal(summary.length, 2);
  });

  it("normalizes hotels legacy slug to listings", () => {
    store.toggleCompareList("hotels", "h1", 4);
    assert.deepEqual(store.getCompareIdsForType("listings"), ["h1"]);
  });

  it("enforces max items per type", () => {
    assert.equal(store.toggleCompareList("t", "a", 2), "added");
    assert.equal(store.toggleCompareList("t", "b", 2), "added");
    assert.equal(store.toggleCompareList("t", "c", 2), "full");
    assert.deepEqual(store.getCompareIdsForType("t"), ["a", "b"]);
  });

  it("persists JSON under storage key", () => {
    store.toggleCompareList("vehicles", "v1", 5);
    const raw = (globalThis.window as Window).localStorage.getItem(STORAGE_KEY);
    assert.ok(raw);
    const parsed = JSON.parse(raw!) as Record<string, string[]>;
    assert.deepEqual(parsed.vehicles, ["v1"]);
  });

  it("clearCompareList without slug removes all buckets", () => {
    store.toggleCompareList("packages", "p1", 4);
    store.toggleCompareList("listings", "l1", 4);
    store.clearCompareList();
    assert.deepEqual(store.getCompareStore(), {});
    assert.deepEqual(store.getCompareBucketsSummary(), []);
  });

  it("getCompareBucketsSummary returns non-empty buckets only", () => {
    store.toggleCompareList("a", "1", 4);
    store.toggleCompareList("b", "2", 4);
    const summary = store.getCompareBucketsSummary();
    assert.equal(summary.length, 2);
    assert.ok(summary.some((b) => b.contentTypeSlug === "a" && b.count === 1));
    store.clearCompareList("a");
    assert.deepEqual(store.getCompareBucketsSummary(), [
      { contentTypeSlug: "b", count: 1 },
    ]);
  });
});
