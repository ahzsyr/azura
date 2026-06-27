import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { PresetDefinition } from "@/features/theme/preset-resolver.types";
import { getDefaultThemeTokens } from "@/features/theme/default-theme-tokens";
import { mergeThemeSources } from "@/lib/theme/theme-source-merge";

const travelPreset: PresetDefinition = {
  id: "travel",
  name: "Travel & Tourism",
  colors: {
    primary: "#06b6d4",
    accent: "#f97316",
    secondary: "#0891b2",
    background: "#020c12",
    surface: "#041820",
    text: "#ecfeff",
    textMuted: "#4e7a8a",
  },
  cardStyle: "corner-bracket",
  borderStyle: "teal-glow",
};

describe("mergeThemeSources", () => {
  it("applies preset colors even when legacy provenance marks customizedAfterPreset", () => {
    const site = {
      ...getDefaultThemeTokens(),
      siteDefaultPresetId: "travel",
      primaryColor: "#047857",
      secondaryColor: "#d4af37",
      themeProvenance: {
        sourcePresetId: "travel",
        appliedAt: "2026-01-01T00:00:00.000Z",
        customizedAfterPreset: true,
        presetLockMode: "unlocked" as const,
      },
    };

    const config = mergeThemeSources({ site, preset: travelPreset });

    assert.equal(config.colors.primary, travelPreset.colors.primary);
    assert.equal(config.colors.secondary, travelPreset.colors.accent);
    assert.equal(config.colors.presetColors?.background, travelPreset.colors.background);
    assert.equal(config.cards.style, travelPreset.cardStyle);
    assert.equal(config.borders.style, travelPreset.borderStyle);
  });

  it("does not apply preset when no preset definition is provided", () => {
    const site = {
      ...getDefaultThemeTokens(),
      siteDefaultPresetId: "travel",
      primaryColor: "#047857",
      secondaryColor: "#d4af37",
    };

    const config = mergeThemeSources({ site });

    assert.equal(config.colors.primary, "#047857");
    assert.equal(config.colors.secondary, "#d4af37");
  });
});
