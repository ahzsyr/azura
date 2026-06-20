import { describe, it } from "node:test";
import assert from "node:assert/strict";
import Module from "node:module";

const originalLoad = (Module as unknown as { _load: (...args: unknown[]) => unknown })._load;
(Module as unknown as { _load: (...args: unknown[]) => unknown })._load = function load(
  request: string,
  ...args: unknown[]
) {
  if (request === "server-only") return {};
  return originalLoad.call(this, request, ...args);
};

async function loadComparisonShellModule() {
  return import("@/features/comparison/load-comparison-shell-props");
}

describe("comparison shell fallback", () => {
  it("provides safe labels with no comparable content types", async () => {
    const { createFallbackComparisonShellProps } = await loadComparisonShellModule();

    const fallback = createFallbackComparisonShellProps();

    assert.deepEqual(fallback.comparableTypes, []);
    assert.equal(fallback.labels.drawerTitle, "Compare");
    assert.equal(fallback.labels.compareNow.length > 0, true);
    assert.equal(fallback.labels.viewComparison.length > 0, true);
  });
});
