import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  shouldSkipPresetSurfaces,
  hasVisitorThemeOverrides,
} from "@/features/theme/engine";
import {
  clearPresetSession,
  persistPresetSession,
} from "@/features/theme/engine/preset-session";

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  clear() {
    this.map.clear();
  }
}

// --- shouldSkipPresetSurfaces (surface-skip parity with theme-init.js) ---

describe("shouldSkipPresetSurfaces", () => {
  it("returns true in dark mode when the preset background is light", () => {
    // Light preset (#ffffff) + dark appearance → should skip surface vars,
    // matching the theme-init.js `skipSurface` guard.
    assert.equal(
      shouldSkipPresetSurfaces({ primary: "#0066cc", accent: "#0066cc", background: "#ffffff" }, "dark"),
      true,
    );
  });

  it("returns false in dark mode when the preset background is dark", () => {
    assert.equal(
      shouldSkipPresetSurfaces({ primary: "#06b6d4", accent: "#f97316", background: "#020c12" }, "dark"),
      false,
    );
  });

  it("returns false in light mode even with a light background", () => {
    assert.equal(
      shouldSkipPresetSurfaces({ primary: "#0066cc", accent: "#0066cc", background: "#ffffff" }, "light"),
      false,
    );
  });

  it("returns false when background is absent (no surface info)", () => {
    assert.equal(
      shouldSkipPresetSurfaces({ primary: "#0066cc", accent: "#0066cc" }, "dark"),
      false,
    );
  });
});

// --- hasVisitorThemeOverrides + restorePresetColorsFromStorage gating ---

describe("hasVisitorThemeOverrides", () => {
  beforeEach(() => {
    const storage = new MemoryStorage();
    (globalThis as { window?: object }).window = {};
    (globalThis as { localStorage?: Storage }).localStorage = storage as unknown as Storage;
    clearPresetSession();
  });

  it("returns false when no visitor data is stored", () => {
    assert.equal(hasVisitorThemeOverrides(), false);
  });

  it("returns true after a preset session is persisted", () => {
    persistPresetSession({
      presetId: "travel",
      colors: { primary: "#06b6d4", accent: "#f97316" },
      cursor: null,
      backgroundEffect: null,
      textEffect: null,
      cardStyle: null,
      borderStyle: null,
    });
    assert.equal(hasVisitorThemeOverrides(), true);
  });

  it("returns false after clearing the session", () => {
    persistPresetSession({
      presetId: "networking",
      colors: { primary: "#00d4ff", accent: "#00ffea" },
      cursor: "neon-dot",
      backgroundEffect: "grid",
      textEffect: "neon-glow",
      cardStyle: "glassmorphism",
      borderStyle: "neon",
    });
    clearPresetSession();
    assert.equal(hasVisitorThemeOverrides(), false);
  });
});
