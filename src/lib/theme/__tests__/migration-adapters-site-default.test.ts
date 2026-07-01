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
