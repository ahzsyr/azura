import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getDefaultThemeTokens } from "@/features/theme/default-theme-tokens";
import { themeConfigToTokens, tokensToThemeConfig } from "@/lib/theme/migration-adapters";

describe("migration adapters preset mapping", () => {
  it("maps siteDefaultPresetId into nested theme config", () => {
    const tokens = {
      ...getDefaultThemeTokens(),
      siteDefaultPresetId: "networking",
      activePresetId: "legacy-travel",
    };
    const config = tokensToThemeConfig(tokens);
    assert.equal(config.presets.siteDefaultPresetId, "networking");
  });

  it("writes legacy alias from canonical siteDefaultPresetId", () => {
    const config = tokensToThemeConfig({
      ...getDefaultThemeTokens(),
      siteDefaultPresetId: "networking",
      activePresetId: null,
    });
    const tokens = themeConfigToTokens(config);
    assert.equal(tokens.siteDefaultPresetId, "networking");
    assert.equal(tokens.activePresetId, "networking");
  });
});

describe("migration adapters appearance defaultMode", () => {
  it("maps darkModeEnabled=false to defaultMode=light", () => {
    const config = tokensToThemeConfig({ ...getDefaultThemeTokens(), darkModeEnabled: false });
    assert.equal(config.appearance.defaultMode, "light");
    assert.equal(config.appearance.darkModeEnabled, false);
  });

  it("maps darkModeEnabled=true to defaultMode=system", () => {
    const config = tokensToThemeConfig({ ...getDefaultThemeTokens(), darkModeEnabled: true });
    assert.equal(config.appearance.defaultMode, "system");
    assert.equal(config.appearance.darkModeEnabled, true);
  });

  it("round-trips darkModeEnabled through config", () => {
    for (const flag of [true, false]) {
      const config = tokensToThemeConfig({ ...getDefaultThemeTokens(), darkModeEnabled: flag });
      const tokens = themeConfigToTokens(config);
      assert.equal(tokens.darkModeEnabled, flag);
    }
  });
});
