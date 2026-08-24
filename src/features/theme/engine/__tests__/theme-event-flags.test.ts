import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { ThemeEngineSnapshot } from "@/features/theme/engine/types";

describe("theme event detail contract", () => {
  it("supports appearanceOnly and capabilitiesOnly as distinct flags", () => {
    const appearance: Partial<ThemeEngineSnapshot> = { appearanceOnly: true };
    const capabilities: Partial<ThemeEngineSnapshot> = { capabilitiesOnly: true };

    assert.equal(appearance.appearanceOnly, true);
    assert.equal(appearance.capabilitiesOnly, undefined);
    assert.equal(capabilities.capabilitiesOnly, true);
    assert.equal(capabilities.appearanceOnly, undefined);
  });
});
