import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  accentsFromThemeTokens,
  footerChromeTintAttrs,
} from "@/features/footer/lib/footer-chrome-tint";
import {
  CHROME_TINT_DARK_ATTR,
  CHROME_TINT_LIGHT_ATTR,
} from "@/lib/theme/scroll-chrome-tint";
import {
  DEFAULT_DARK_SURFACES,
  DEFAULT_LIGHT_SURFACES,
} from "@/features/theme/surfaces/theme-surfaces";

describe("footerChromeTintAttrs", () => {
  it("light footer uses theme surface backgrounds", () => {
    const attrs = footerChromeTintAttrs("light");
    assert.equal(attrs[CHROME_TINT_LIGHT_ATTR], DEFAULT_LIGHT_SURFACES.background);
    assert.equal(attrs[CHROME_TINT_DARK_ATTR], DEFAULT_DARK_SURFACES.background);
  });

  it("dark/inherit footers use light surface for light slot (theme-locked)", () => {
    const dark = footerChromeTintAttrs("dark");
    assert.equal(dark[CHROME_TINT_LIGHT_ATTR], DEFAULT_LIGHT_SURFACES.background);
    assert.equal(dark[CHROME_TINT_DARK_ATTR], DEFAULT_DARK_SURFACES.background);

    const inherit = footerChromeTintAttrs("inherit");
    assert.deepEqual(inherit, dark);
  });

  it("accent footer uses theme accents — never hardcoded Tailwind blue", () => {
    const accentLight = "#c9a227";
    const accentDark = "#17120a";
    const attrs = footerChromeTintAttrs("accent", { accentLight, accentDark });

    assert.equal(attrs[CHROME_TINT_LIGHT_ATTR], accentLight);
    assert.equal(attrs[CHROME_TINT_DARK_ATTR], accentDark);
    assert.notEqual(attrs[CHROME_TINT_LIGHT_ATTR], "#dbeafe");
    assert.notEqual(attrs[CHROME_TINT_DARK_ATTR], "#0c1929");
  });

  it("accent footer falls back to secondary when accents omitted", () => {
    const attrs = footerChromeTintAttrs("accent");
    assert.ok(attrs[CHROME_TINT_LIGHT_ATTR]);
    assert.ok(attrs[CHROME_TINT_DARK_ATTR]);
    assert.notEqual(attrs[CHROME_TINT_LIGHT_ATTR], "#dbeafe");
    assert.notEqual(attrs[CHROME_TINT_DARK_ATTR], "#0c1929");
  });

  it("accentsFromThemeTokens prefers preset accent over secondaryColor", () => {
    const pair = accentsFromThemeTokens({
      secondaryColor: "#d4af37",
      presetColors: { accent: "#c9a227" },
    });
    assert.equal(pair.accentLight, "#c9a227");
    assert.equal(pair.accentDark, "#c9a227");
  });
});
