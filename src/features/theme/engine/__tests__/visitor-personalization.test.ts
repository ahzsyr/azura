import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clearPresetSession,
  persistPresetSession,
  readVisitorPersonalization,
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

describe("visitor personalization runtime model", () => {
  beforeEach(() => {
    const storage = new MemoryStorage();
    (globalThis as { window?: object }).window = {};
    (globalThis as { localStorage?: Storage }).localStorage = storage as unknown as Storage;
    clearPresetSession();
  });

  it("reads a unified visitor personalization payload from storage", () => {
    persistPresetSession({
      presetId: "networking",
      colors: { primary: "#00d4ff", accent: "#00ffea" },
      cursor: "neon-dot",
      backgroundEffect: "grid",
      textEffect: "neon-glow",
      cardStyle: "glassmorphism",
      borderStyle: "neon",
    });
    const personalization = readVisitorPersonalization("system");
    assert.equal(personalization.visitorPresetId, "networking");
    assert.equal(personalization.appearanceMode, "system");
    assert.equal(personalization.cursorEffect, "neon-dot");
    assert.equal(personalization.backgroundEffect, "grid");
    assert.equal(personalization.textEffect, "neon-glow");
  });

  it("reset clears visitor personalization state", () => {
    persistPresetSession({
      presetId: "travel",
      colors: { primary: "#06b6d4", accent: "#f97316" },
    });
    clearPresetSession();
    const personalization = readVisitorPersonalization("light");
    assert.equal(personalization.visitorPresetId, null);
    assert.equal(personalization.cursorEffect, null);
    assert.equal(personalization.backgroundEffect, null);
    assert.equal(personalization.textEffect, null);
  });
});
