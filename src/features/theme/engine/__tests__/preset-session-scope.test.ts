import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clearPresetSession,
  persistPresetSession,
  shouldClearLeakedVisitorPreset,
  isEditorThemeRoute,
  resolvePresetSessionScope,
} from "@/features/theme/engine/preset-session";
import {
  PRESET_COLORS_STORAGE_KEY,
  PRESET_ORIGIN_STORAGE_KEY,
  PRESET_STORAGE_KEY,
} from "@/features/theme/engine/constants";
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

const SAMPLE_PAYLOAD = {
  presetId: "networking",
  colors: { primary: "#00d4ff", accent: "#00ffea", background: "#010409" },
};

describe("preset session scope", () => {
  beforeEach(() => {
    const storage = new MemoryStorage();
    (globalThis as { window?: object }).window = {
      location: { pathname: "/" },
    };
    (globalThis as { localStorage?: Storage }).localStorage =
      storage as unknown as Storage;
    clearPresetSession();
  });

  it("isEditorThemeRoute detects admin and preview paths", () => {
    assert.equal(isEditorThemeRoute("/admin/studio"), true);
    assert.equal(isEditorThemeRoute("/preview/preset"), true);
    assert.equal(isEditorThemeRoute("/en"), false);
    assert.equal(isEditorThemeRoute("/"), false);
  });

  it("resolvePresetSessionScope defaults to editor on admin routes", () => {
    assert.equal(resolvePresetSessionScope(undefined, "/admin/theme"), "editor");
    assert.equal(resolvePresetSessionScope(undefined, "/en/services"), "visitor");
    assert.equal(resolvePresetSessionScope("visitor", "/admin"), "visitor");
  });

  it("applying a catalog preset from the editor does not write devi-user-preset", () => {
    // applyPresetToDocument → persistPresetSession({ scope: "editor" })
    persistPresetSession(SAMPLE_PAYLOAD, { scope: "editor" });
    assert.equal(localStorage.getItem(PRESET_STORAGE_KEY), null);
    assert.equal(localStorage.getItem(PRESET_COLORS_STORAGE_KEY), null);
    assert.equal(localStorage.getItem(PRESET_ORIGIN_STORAGE_KEY), null);

    // Auto-detect from /admin pathname (Theme Studio / preview leakage path)
    (globalThis as { window?: { location: { pathname: string } } }).window = {
      location: { pathname: "/admin/studio" },
    };
    persistPresetSession(SAMPLE_PAYLOAD);
    assert.equal(localStorage.getItem(PRESET_STORAGE_KEY), null);
  });

  it("visitor scope persists preset id, colors, and origin marker", () => {
    persistPresetSession(SAMPLE_PAYLOAD, { scope: "visitor" });
    assert.equal(localStorage.getItem(PRESET_STORAGE_KEY), "networking");
    assert.ok(localStorage.getItem(PRESET_COLORS_STORAGE_KEY));
    assert.equal(localStorage.getItem(PRESET_ORIGIN_STORAGE_KEY), "visitor");
  });

  it("shouldClearLeakedVisitorPreset drops missing origin (legacy editor leak)", () => {
    assert.equal(
      shouldClearLeakedVisitorPreset({
        presetId: "networking",
        origin: null,
        publishedPresetIds: ["networking", "travel"],
      }),
      true,
    );
  });

  it("shouldClearLeakedVisitorPreset keeps intentional catalog visitor picks", () => {
    assert.equal(
      shouldClearLeakedVisitorPreset({
        presetId: "networking",
        origin: "visitor",
        publishedPresetIds: ["networking", "travel"],
      }),
      false,
    );
  });

  it("shouldClearLeakedVisitorPreset drops ids outside the published catalog", () => {
    assert.equal(
      shouldClearLeakedVisitorPreset({
        presetId: "theme-studio-draft-purple",
        origin: "visitor",
        publishedPresetIds: ["networking", "travel"],
      }),
      true,
    );
  });

  it("shouldClearLeakedVisitorPreset keeps user-created presets", () => {
    assert.equal(
      shouldClearLeakedVisitorPreset({
        presetId: "user-123",
        origin: "visitor",
        publishedPresetIds: ["networking"],
        userPresetIds: ["user-123"],
      }),
      false,
    );
  });
});
