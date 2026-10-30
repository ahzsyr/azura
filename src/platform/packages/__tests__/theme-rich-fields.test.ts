import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseAndValidateThemeTokensJson,
  THEME_TOKENS_MAX_BYTES,
} from "@/platform/packages/theme-token-package";
import {
  CUSTOM_CSS_MAX_BYTES,
  decodeCssEscapesForDetection,
  validateThemePackageCustomCss,
} from "@/platform/packages/theme-custom-css-policy";
import {
  CLEAR_FOOTER_CONFIG,
  CLEAR_HEADER_CONFIG,
  CLEAR_MOBILE_BROWSER_CONFIG,
  clearBrandConfig,
} from "@/platform/packages/theme-token-clear-values";
import { mergeThemeTokenPatchOntoPublished } from "@/platform/packages/theme-package-apply";
import { normalizeBranding } from "@/features/navigation/branding-defaults";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

const completeBrand = {
  logoMode: "text" as const,
  logoText: "Azura",
  logoImageLightUrl: "",
  logoImageDarkUrl: "",
  brandName: "Azura",
  tagline: "Hello",
  showTagline: true,
  areaStyle: "default" as const,
  brandLayoutMobile: "logo-and-text" as const,
  brandLayoutDesktop: "logo-and-text" as const,
  logoSizing: {
    mode: "fixed" as const,
    heightMobile: 40,
    heightTablet: 44,
    heightDesktop: 48,
    adaptiveMin: 32,
    adaptiveMax: 56,
  },
  brandNameTypography: {
    fontSource: "heading" as const,
    customFont: "",
    sizeMobile: "1rem",
    sizeDesktop: "1.125rem",
    fontWeight: 800 as const,
  },
  brandTaglineTypography: {
    fontSource: "body" as const,
    customFont: "",
    sizeMobile: "0.65rem",
    sizeDesktop: "0.7rem",
    fontWeight: 400 as const,
  },
};

const completeHeader = {
  showLogo: true,
  showNav: true,
  showSearch: true,
  showCta: true,
  sticky: true,
  ctaLabel: "Contact",
  ctaHref: "/contact",
  enabled: true,
  visibilityMode: "all" as const,
  pagePaths: [] as string[],
};

function basePublished() {
  return {
    preset: "CLASSIC" as const,
    siteDefaultPresetId: null,
    activePresetId: null,
    primaryColor: "#047857",
    secondaryColor: "#d4af37",
    typography: {},
    logoUrl: null,
    faviconUrl: null,
    customCss: null,
    brandConfig: { old: true },
    headerConfig: { ...completeHeader, ctaLabel: "Old" },
    footerConfig: CLEAR_FOOTER_CONFIG,
    darkModeEnabled: false,
    animationsEnabled: true,
    lazyLoadEnabled: true,
    animationSpeed: 1,
    spacingScale: 1,
    themeProvenance: {},
  };
}

describe("caps", () => {
  it("raises theme-tokens file cap to 256 KiB", () => {
    assert.equal(THEME_TOKENS_MAX_BYTES, 256 * 1024);
    assert.equal(CUSTOM_CSS_MAX_BYTES, 48 * 1024);
  });
});

describe("customCss policy", () => {
  it("accepts clean CSS unchanged", () => {
    const css = "body{color:red}";
    const result = validateThemePackageCustomCss(css);
    assert.equal(result.ok, true);
  });

  it("rejects @import and remote url()", () => {
    assert.equal(validateThemePackageCustomCss('@import url("https://x.test/a.css");').ok, false);
    assert.equal(
      validateThemePackageCustomCss('div{background:url("https://evil.test/x.png")}').ok,
      false,
    );
    assert.equal(validateThemePackageCustomCss('div{background:url("//evil.test/x")}').ok, false);
  });

  it("rejects obfuscated @im\\port via detection decode", () => {
    const css = "@im\\70ort url(/uploads/x.css);";
    assert.equal(decodeCssEscapesForDetection("im\\70ort").toLowerCase(), "import");
    assert.equal(validateThemePackageCustomCss(css).ok, false);
  });

  it("allows decoded root-relative url with escaped slash", () => {
    const css = "div{background:url(\\2f uploads/images/x.png)}";
    const result = validateThemePackageCustomCss(css);
    assert.equal(result.ok, true);
  });

  it("rejects decoded protocol-relative escaped url", () => {
    const css = "div{background:url(\\2f\\2f evil.example/x.png)}";
    assert.equal(validateThemePackageCustomCss(css).ok, false);
  });

  it("rejects </style in string content", () => {
    assert.equal(validateThemePackageCustomCss('div{content:"</style>"}').ok, false);
  });

  it("rejects oversize decoded UTF-8 customCss", () => {
    const css = "a{x:" + "字".repeat(CUSTOM_CSS_MAX_BYTES) + "}";
    assert.ok(Buffer.byteLength(css, "utf8") > CUSTOM_CSS_MAX_BYTES);
    assert.equal(validateThemePackageCustomCss(css).ok, false);
  });

  it("rejects expression(", () => {
    assert.equal(validateThemePackageCustomCss("div{width:expression(1)}").ok, false);
  });
});

describe("strict nested schemas", () => {
  it("rejects unknown header key and partial header", () => {
    const unknown = parseAndValidateThemeTokensJson(
      Buffer.from(
        JSON.stringify({
          headerConfig: { ...completeHeader, extra: true },
        }),
      ),
    );
    assert.equal(unknown.ok, false);

    const partial = parseAndValidateThemeTokensJson(
      Buffer.from(JSON.stringify({ headerConfig: { showLogo: true } })),
    );
    assert.equal(partial.ok, false);
  });

  it("rejects incomplete brandConfig and javascript: logo URL", () => {
    const incomplete = parseAndValidateThemeTokensJson(
      Buffer.from(JSON.stringify({ brandConfig: { logoMode: "text" } })),
    );
    assert.equal(incomplete.ok, false);

    const badUrl = parseAndValidateThemeTokensJson(
      Buffer.from(
        JSON.stringify({
          brandConfig: {
            ...completeBrand,
            logoImageLightUrl: "javascript:alert(1)",
          },
        }),
      ),
    );
    assert.equal(badUrl.ok, false);
  });

  it("accepts complete brandConfig", () => {
    const ok = parseAndValidateThemeTokensJson(
      Buffer.from(JSON.stringify({ brandConfig: completeBrand })),
    );
    assert.equal(ok.ok, true);
  });

  it("rejects themeProvenance", () => {
    const result = parseAndValidateThemeTokensJson(
      Buffer.from(JSON.stringify({ primaryColor: "#111111", themeProvenance: {} })),
    );
    assert.equal(result.ok, false);
  });
});

describe("merge whole-replace + clears + provenance", () => {
  it("replaces header entirely and re-stamps provenance", () => {
    const before = Date.now();
    const merged = mergeThemeTokenPatchOntoPublished(
      basePublished(),
      { headerConfig: completeHeader },
      "rich-theme",
      "2.0.0",
    );
    assert.deepEqual(merged.headerConfig, completeHeader);
    assert.equal(merged.themeProvenance.sourcePackageId, "rich-theme");
    assert.equal(merged.themeProvenance.sourcePackageVersion, "2.0.0");
    assert.equal(merged.themeProvenance.sourcePresetId, null);
    assert.ok(merged.themeProvenance.appliedAt);
    assert.ok(Date.parse(merged.themeProvenance.appliedAt!) >= before);
  });

  it("null clears use pinned Studio fallbacks", () => {
    const merged = mergeThemeTokenPatchOntoPublished(
      basePublished(),
      {
        customCss: null,
        brandConfig: null,
        headerConfig: null,
        footerConfig: null,
        mobileBrowserConfig: null,
        backgroundEffectSettings: null,
        glassEffectSettings: null,
      },
      "rich-theme",
      "2.0.0",
    );
    assert.equal(merged.customCss, null);
    assert.deepEqual(merged.brandConfig, clearBrandConfig());
    assert.deepEqual(merged.brandConfig, normalizeBranding({}));
    assert.deepEqual(merged.headerConfig, CLEAR_HEADER_CONFIG);
    assert.deepEqual(merged.footerConfig, CLEAR_FOOTER_CONFIG);
    assert.deepEqual(merged.mobileBrowserConfig, CLEAR_MOBILE_BROWSER_CONFIG);
    assert.deepEqual(merged.backgroundEffectSettings, { intensity: 1, opacity: 1 });
    assert.deepEqual(merged.glassEffectSettings, { intensity: 1, opacity: 0.45 });
  });

  it("absent rich keys leave published unchanged", () => {
    const published = basePublished();
    const merged = mergeThemeTokenPatchOntoPublished(
      published,
      { primaryColor: "#abcdef" },
      "rich-theme",
      "2.0.0",
    );
    assert.equal(merged.primaryColor, "#abcdef");
    assert.deepEqual(merged.headerConfig, published.headerConfig);
    assert.deepEqual(merged.brandConfig, published.brandConfig);
  });
});

describe("static wiring pins", () => {
  it("token parse imports CSS policy; server writes rich columns", () => {
    const tokens = readFileSync(
      path.join(ROOT, "src/platform/packages/theme-token-package.ts"),
      "utf8",
    );
    assert.match(tokens, /validateThemePackageCustomCss/);
    assert.match(tokens, /from "postcss"|theme-custom-css-policy/);
    const policy = readFileSync(
      path.join(ROOT, "src/platform/packages/theme-custom-css-policy.ts"),
      "utf8",
    );
    assert.match(policy, /from "postcss"/);
    const server = readFileSync(
      path.join(ROOT, "src/platform/packages/theme-package-apply.server.ts"),
      "utf8",
    );
    assert.match(server, /THEME_PACKAGE_PUBLISHED_WRITE_COLUMNS/);
    assert.match(server, /customCss/);
    assert.match(server, /brandConfig/);
    assert.match(server, /headerConfig/);
  });
});
