/**
 * buildPageBundleRefs must accept Page AST envelopes (persisted composition JSON).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import Module from "node:module";

const originalLoad = (Module as unknown as { _load: (...args: unknown[]) => unknown })._load;
(Module as unknown as { _load: (...args: unknown[]) => unknown })._load = function load(
  request: string,
  ...args: unknown[]
) {
  if (request === "server-only") return {};
  if (request.endsWith("/prisma") || request === "@/lib/prisma") {
    return { prisma: {} };
  }
  return originalLoad.call(this, request, ...args);
};

describe("buildPageBundleRefs Page AST envelope", () => {
  it("unwraps PageAstDocument without throwing on regions.top", async () => {
    const { buildPageBundleRefs } = await import(
      "@/features/translation/translation-bundle"
    );
    const envelope = {
      version: 1,
      composition: {
        version: 1,
        layout: { type: "full" },
        regions: {
          top: [{ id: "b-top", type: "richText", props: {} }],
          primary: [{ id: "b-main", type: "richText", props: {} }],
          asideStart: [],
          asideEnd: [],
        },
        hiddenRegions: {
          top: [],
          primary: [],
          asideStart: [],
          asideEnd: [],
        },
        metadata: {},
      },
      blocks: [{ id: "b-main", type: "richText", props: {} }],
    };

    const refs = buildPageBundleRefs("ContentItem", "item-1", envelope);
    assert.ok(refs.some((r) => r.entityType === "ContentItem" && r.entityId === "item-1"));
    assert.ok(refs.length >= 2, "expected parent + block entity refs");
  });

  it("tolerates envelope with missing regions", async () => {
    const { buildPageBundleRefs } = await import(
      "@/features/translation/translation-bundle"
    );
    const refs = buildPageBundleRefs("ContentItem", "item-2", {
      version: 1,
      composition: { version: 1, layout: { type: "full" } },
    });
    assert.deepEqual(refs, [{ entityType: "ContentItem", entityId: "item-2" }]);
  });
});
