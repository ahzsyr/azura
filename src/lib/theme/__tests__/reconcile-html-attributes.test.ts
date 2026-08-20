import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { reconcileSiteHtmlAttributes } from "@/lib/theme/reconcile-html-attributes";
import { clearPresetSession, persistPresetSession } from "@/features/theme/engine/preset-session";

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

function installDom(initial: Record<string, string> = {}) {
  const dataset: Record<string, string> = { ...initial };
  const html = {
    dataset,
  };
  (globalThis as { document?: { documentElement: typeof html } }).document = {
    documentElement: html,
  };
  return html;
}

describe("reconcileSiteHtmlAttributes", () => {
  beforeEach(() => {
    const storage = new MemoryStorage();
    (globalThis as { window?: object }).window = {};
    (globalThis as { localStorage?: Storage }).localStorage = storage as unknown as Storage;
    clearPresetSession();
  });

  it("does not overwrite data-theme or data-theme-mode established by boot", () => {
    const html = installDom({ theme: "dark", themeMode: "dark" });
    reconcileSiteHtmlAttributes({
      "data-theme": "light",
      "data-theme-mode": "light",
      "data-card-style": "glassmorphism",
    });
    assert.equal(html.dataset.theme, "dark");
    assert.equal(html.dataset.themeMode, "dark");
    assert.equal(html.dataset.cardStyle, "glassmorphism");
  });

  it("no-ops when non-theme attribute already matches", () => {
    const html = installDom({ cardStyle: "glassmorphism" });
    reconcileSiteHtmlAttributes({
      "data-card-style": "glassmorphism",
    });
    assert.equal(html.dataset.cardStyle, "glassmorphism");
  });

  it("skips entirely when visitor preset overrides exist", () => {
    persistPresetSession({
      presetId: "travel",
      colors: { primary: "#06b6d4", accent: "#f97316" },
      cursor: null,
      backgroundEffect: null,
      textEffect: null,
      cardStyle: null,
      borderStyle: null,
    });
    const html = installDom({ cardStyle: "flat" });
    reconcileSiteHtmlAttributes({
      "data-card-style": "glassmorphism",
    });
    assert.equal(html.dataset.cardStyle, "flat");
  });
});
