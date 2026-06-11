import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mergeDisplaySettings as mergeCatalog } from "@/schemas/catalog/display-settings";
import { mergeDisplaySettings as mergeContent } from "@/schemas/content/display-settings";
import { DEFAULT_DISPLAY_SETTINGS as catalogDefaults } from "@/schemas/catalog/display-settings";

/** Mirrors blankDefaultStrings key rules in src/schemas/builder/index.ts */
const BLANKABLE_DEFAULT_KEYS = new Set([
  "title",
  "subtitle",
  "content",
  "body",
  "html",
  "markdown",
  "description",
  "message",
  "incentive",
  "caption",
  "alt",
  "emptyMessage",
  "badge",
  "ctaLabel",
  "secondaryCtaLabel",
  "button",
  "secondaryButton",
  "promoBadge",
  "promoText",
  "countdownLabel",
  "beforeLabel",
  "afterLabel",
  "label",
  "name",
  "placeholder",
  "excerpt",
  "primaryButton",
]);

function shouldBlankDefaultString(key: string): boolean {
  if (key.endsWith("En") || key.endsWith("Ar")) return true;
  return BLANKABLE_DEFAULT_KEYS.has(key);
}

function blankDefaultStrings<T>(value: T, key?: string): T {
  if (typeof value === "string") {
    return key && shouldBlankDefaultString(key) ? ("" as T) : value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => blankDefaultStrings(entry)) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([entryKey, entry]) => [
        entryKey,
        blankDefaultStrings(entry, entryKey),
      ])
    ) as T;
  }
  return value;
}

describe("mergeDisplaySettings safeParse fallback", () => {
  it("catalog: invalid empty enum strings fall back to defaults without throwing", () => {
    const result = mergeCatalog({ cardVariant: "", layoutMode: "" });
    assert.equal(result.cardVariant, "default");
    assert.equal(result.layoutMode, "grid");
  });

  it("catalog: null partial uses defaults", () => {
    const result = mergeCatalog(null);
    assert.equal(result.cardVariant, catalogDefaults.cardVariant);
    assert.equal(result.layoutMode, catalogDefaults.layoutMode);
  });

  it("content: invalid empty enum strings fall back to defaults without throwing", () => {
    const result = mergeContent({ cardVariant: "", layoutMode: "" });
    assert.equal(result.cardVariant, "default");
    assert.equal(result.layoutMode, "grid");
  });
});

describe("blankDefaultStrings preserves enum and config fields", () => {
  const catalogFixture = {
    source: "packages",
    titleEn: "Catalog",
    titleAr: "العروض",
    layout: "centered",
    displaySettings: {
      cardVariant: "default",
      layoutMode: "grid",
    },
  };

  it("blanks translatable text but keeps enums and nested displaySettings", () => {
    const blanked = blankDefaultStrings(catalogFixture);
    assert.equal(blanked.titleEn, "");
    assert.equal(blanked.titleAr, "");
    assert.equal(blanked.source, "packages");
    assert.equal(blanked.layout, "centered");
    assert.equal(blanked.displaySettings.cardVariant, "default");
    assert.equal(blanked.displaySettings.layoutMode, "grid");
  });
});

describe("structuredClone isolates block default props", () => {
  it("clones do not share references with the source defaults object", () => {
    const defaults = {
      source: "packages",
      titleEn: "",
      displaySettings: { cardVariant: "default", layoutMode: "grid" },
    };
    const blockA = structuredClone(defaults);
    const blockB = structuredClone(defaults);
    assert.notEqual(blockA, defaults);
    assert.notEqual(blockA, blockB);
    assert.notEqual(blockA.displaySettings, defaults.displaySettings);
    blockA.titleEn = "Changed";
    assert.equal(defaults.titleEn, "");
    assert.equal(blockB.titleEn, "");
  });
});
