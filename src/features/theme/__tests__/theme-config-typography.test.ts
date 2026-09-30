import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseTypography } from "@/features/theme/theme-config";
import { collectThemeFonts } from "@/lib/theme/locale-fonts";

describe("parseTypography", () => {
  it("parses global typography without localeFonts", () => {
    const parsed = parseTypography({
      bodyFont: "Inter",
      headingFont: "Playfair Display",
      baseFontSize: "16px",
      headingScale: 1.2,
    });

    assert.equal(parsed.bodyFont, "Inter");
    assert.equal(parsed.headingFont, "Playfair Display");
    assert.equal(parsed.localeFonts, undefined);
  });

  it("parses and normalizes localeFonts overrides", () => {
    const parsed = parseTypography({
      bodyFont: "Plus Jakarta Sans",
      headingFont: "Amiri",
      localeFonts: {
        ar: { bodyFont: "Cairo", headingFont: "Noto Naskh Arabic" },
        en: { bodyFont: "", headingFont: "Inter" },
        empty: {},
      },
    });

    assert.deepEqual(parsed.localeFonts, {
      ar: { bodyFont: "Cairo", headingFont: "Noto Naskh Arabic" },
      en: { headingFont: "Inter" },
    });
  });

  it("preserves htmlLang on locale font overrides", () => {
    const parsed = parseTypography({
      bodyFont: "Plus Jakarta Sans",
      headingFont: "Amiri",
      localeFonts: {
        ar: { bodyFont: "Cairo", htmlLang: "ar" },
      },
    });

    assert.deepEqual(parsed.localeFonts, {
      ar: { bodyFont: "Cairo", htmlLang: "ar" },
    });
  });
});

describe("font-registry locale fonts", () => {
  it("collects fonts from locale overrides", () => {
    const typography = parseTypography({
      bodyFont: "Plus Jakarta Sans",
      headingFont: "Amiri",
      localeFonts: {
        ar: { bodyFont: "Cairo", headingFont: "Tajawal" },
      },
    });

    assert.deepEqual(collectThemeFonts(typography).sort(), [
      "Amiri",
      "Cairo",
      "Plus Jakarta Sans",
      "Tajawal",
    ]);
  });
});
