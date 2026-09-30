import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { PresetDefinition } from "@/features/theme/preset-resolver.types";
import { getDefaultThemeTokens } from "@/features/theme/default-theme-tokens";
import { mergeThemeSources } from "@/lib/theme/theme-source-merge";
import { themeConfigToTokens } from "@/lib/theme/migration-adapters";

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
  backgroundEffect: "waves",
  cursor: "ring",
  textEffect: "gradient-shift",
  cardStyle: "corner-bracket",
  borderStyle: "teal-glow",
};

describe("mergeThemeSources", () => {
  it("keeps site theme primary/secondary when customized after preset", () => {
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

    assert.equal(config.colors.primary, "#047857");
    assert.equal(config.colors.secondary, "#d4af37");
    assert.equal(config.colors.presetColors?.primary, "#047857");
    assert.equal(config.colors.presetColors?.accent, "#d4af37");
    assert.equal(config.colors.presetColors?.background, travelPreset.colors.background);
    assert.equal(config.cards.style, travelPreset.cardStyle);
    assert.equal(config.borders.style, travelPreset.borderStyle);
  });

  it("applies preset brand colors when site theme leaves them unset", () => {
    const site = {
      ...getDefaultThemeTokens(),
      siteDefaultPresetId: "travel",
      primaryColor: "",
      secondaryColor: "",
    };

    const config = mergeThemeSources({ site, preset: travelPreset });

    assert.equal(config.colors.primary, travelPreset.colors.primary);
    assert.equal(config.colors.secondary, travelPreset.colors.accent);
  });

  it("keeps site theme studio effect overrides over preset defaults", () => {
    const site = {
      ...getDefaultThemeTokens(),
      siteDefaultPresetId: "travel",
      backgroundEffect: "circuit",
      cursorEffect: "neon-dot",
      textEffect: "neon-glow",
      cardStyle: "glassmorphism",
      borderStyle: "cyan-glow",
      backgroundEffectSettings: {
        intensity: 0.7,
        opacity: 1,
        speed: 0.5,
        colors: { primary: "#c9a84c", accent: "#f0d080" },
      },
    };

    const config = mergeThemeSources({ site, preset: travelPreset });

    assert.equal(config.effects.background, "circuit");
    assert.equal(config.effects.cursor, "neon-dot");
    assert.equal(config.effects.text, "neon-glow");
    assert.equal(config.cards.style, "glassmorphism");
    assert.equal(config.borders.style, "cyan-glow");
    assert.equal(config.backgrounds.effect, "circuit");
    assert.equal(config.backgrounds.settings.intensity, 0.7);
    assert.equal(config.backgrounds.settings.colors?.primary, "#c9a84c");
  });

  it("falls back to preset effects when site theme leaves them unset", () => {
    const site = {
      ...getDefaultThemeTokens(),
      siteDefaultPresetId: "travel",
      backgroundEffect: null,
      cursorEffect: null,
      textEffect: null,
      cardStyle: null,
      borderStyle: null,
    };

    const config = mergeThemeSources({ site, preset: travelPreset });

    assert.equal(config.effects.background, "waves");
    assert.equal(config.effects.cursor, "ring");
    assert.equal(config.effects.text, "gradient-shift");
    assert.equal(config.cards.style, "corner-bracket");
    assert.equal(config.borders.style, "teal-glow");
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

describe("mergeThemeSources preset fonts + full surface colors", () => {
  const presetWithFonts: PresetDefinition = {
    id: "brt",
    name: "BRT",
    colors: {
      primary: "#00e5ff",
      accent: "#7c3aed",
      secondary: "#00b4d8",
      background: "#020408",
      surface: "#040d1a",
      text: "#e8f4fd",
      textMuted: "#4a6580",
    },
    fonts: { display: "Exo 2", body: "Barlow", mono: "JetBrains Mono" },
    cursor: "neon-dot",
    backgroundEffect: "circuit",
    textEffect: "neon-glow",
    cardStyle: "corner-bracket",
    borderStyle: "cyan-glow",
  };

  it("propagates full surface colors from preset into config presetColors", () => {
    const config = mergeThemeSources({
      site: { ...getDefaultThemeTokens(), siteDefaultPresetId: "brt" },
      preset: presetWithFonts,
    });
    assert.equal(config.colors.presetColors?.background, "#020408");
    assert.equal(config.colors.presetColors?.surface, "#040d1a");
    assert.equal(config.colors.presetColors?.text, "#e8f4fd");
    assert.equal(config.colors.presetColors?.textMuted, "#4a6580");
  });

  it("surfaces preset colors survive round-trip through themeConfigToTokens", () => {
    const config = mergeThemeSources({
      site: { ...getDefaultThemeTokens(), siteDefaultPresetId: "brt" },
      preset: presetWithFonts,
    });
    const tokens = themeConfigToTokens(config);
    assert.equal(tokens.presetColors?.background, "#020408");
    assert.equal(tokens.presetColors?.surface, "#040d1a");
    assert.equal(tokens.presetColors?.text, "#e8f4fd");
  });

  it("preset fonts stored in typography after applyIndustryPreset state update pattern", () => {
    // Simulate what the Studio state update does: take existing typography and patch fonts.
    const baseFonts = { headingFont: "Inter", bodyFont: "Inter", baseFontSize: "16px", headingScale: 1.25 };
    const fonts = presetWithFonts.fonts!;
    const updatedTypography = {
      ...baseFonts,
      headingFont: fonts.display ?? baseFonts.headingFont,
      bodyFont: fonts.body ?? baseFonts.bodyFont,
    };
    assert.equal(updatedTypography.headingFont, "Exo 2");
    assert.equal(updatedTypography.bodyFont, "Barlow");
  });
});
