import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  nextAppearanceMode,
  resolveAppearance,
} from "@/features/theme/engine/appearance";

describe("nextAppearanceMode", () => {
  it("toggles light to dark", () => {
    assert.equal(nextAppearanceMode("light"), "dark");
  });

  it("toggles dark to light", () => {
    assert.equal(nextAppearanceMode("dark"), "light");
  });

  it("from system jumps to opposite of resolved appearance", () => {
    assert.equal(nextAppearanceMode("system", "dark"), "light");
    assert.equal(nextAppearanceMode("system", "light"), "dark");
  });

  it("never returns system from the primary toggle", () => {
    assert.notEqual(nextAppearanceMode("light"), "system");
    assert.notEqual(nextAppearanceMode("dark"), "system");
    assert.notEqual(nextAppearanceMode("system", "light"), "system");
    assert.notEqual(nextAppearanceMode("system", "dark"), "system");
  });
});

describe("resolveAppearance", () => {
  it("returns light and dark for forced modes", () => {
    assert.equal(resolveAppearance("light"), "light");
    assert.equal(resolveAppearance("dark"), "dark");
  });

  it("uses prefersDark on server for system mode", () => {
    assert.equal(resolveAppearance("system", { prefersDark: true }), "dark");
    assert.equal(resolveAppearance("system", { prefersDark: false }), "light");
  });
});
