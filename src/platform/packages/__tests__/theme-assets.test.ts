import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { typographySchema } from "@/schemas/theme";
import { parseTypography } from "@/features/theme/theme-config";
import {
  decideThemePackageImport,
  parseAndValidateThemeTokensJson,
} from "@/platform/packages/theme-token-package";
import type { PackageManifest } from "@/platform/packages/manifest";
import {
  MAX_FONT_FACES,
  MAX_THEME_ASSET_BINARIES,
  validateThemeZipPass1,
} from "@/platform/packages/theme-asset-limits";
import { runThemeAssetMaterialize } from "@/platform/packages/theme-asset-materialize";
import { resolveThemeTokenAssetRefs } from "@/platform/packages/theme-asset-resolve";
import { mergeThemeTokenPatchOntoPublished } from "@/platform/packages/theme-package-apply";
import {
  escapeCssFontFamily,
  formatPackageFontFaceCss,
  isAllowedPackageFontUrl,
} from "@/lib/theme/package-font-face-css";
import { mimeTypeForUpload } from "@/lib/local-media-storage";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

const emptyContrib = {
  adminNavItemIds: [],
  adminRoutePrefixes: [],
  blockTypes: [],
};

function themeManifest(id = "demo-theme-assets"): PackageManifest {
  return {
    id,
    version: "1.0.0",
    kind: "theme",
    azuraCompatibility: ">=0.1.0",
    requiredPackages: [],
    requiredCapabilities: [],
    requiredPresets: [],
    permissions: [],
    label: "Demo Theme Assets",
    contributions: emptyContrib,
  };
}

describe("typography.fontFaces schema anti-strip", () => {
  it("retains fontFaces through typographySchema and parseTypography", () => {
    const faces = [
      { family: "BrandSans", url: "/uploads/documents/1-BrandSans.woff2", format: "woff2" as const },
    ];
    const parsed = typographySchema.parse({
      bodyFont: "BrandSans",
      headingFont: "BrandSans",
      baseFontSize: "16px",
      headingScale: 1.25,
      fontFaces: faces,
    });
    assert.equal(parsed.fontFaces?.length, 1);
    assert.equal(parsed.fontFaces?.[0]?.family, "BrandSans");

    const fromParse = parseTypography({
      bodyFont: "BrandSans",
      headingFont: "BrandSans",
      baseFontSize: "16px",
      headingScale: 1.25,
      fontFaces: faces,
    });
    assert.equal(fromParse.fontFaces?.length, 1);
    assert.equal(fromParse.fontFaces?.[0]?.url, faces[0].url);
  });
});

describe("token patch assets-only", () => {
  it("accepts logoUrl faviconUrl fontFaces; rejects themeProvenance", () => {
    const ok = parseAndValidateThemeTokensJson(
      Buffer.from(
        JSON.stringify({
          primaryColor: "#111111",
          logoUrl: "package:assets/logo.png",
          faviconUrl: "package:assets/favicon.svg",
          typography: {
            bodyFont: "BrandSans",
            fontFaces: [{ family: "BrandSans", src: "package:fonts/BrandSans.woff2" }],
          },
        }),
      ),
    );
    assert.equal(ok.ok, true);

    const provenance = parseAndValidateThemeTokensJson(
      Buffer.from(
        JSON.stringify({ primaryColor: "#111111", themeProvenance: { sourcePackageId: "x" } }),
      ),
    );
    assert.equal(provenance.ok, false);
    if (!provenance.ok) assert.match(provenance.errors.join(" "), /themeProvenance/);
  });

  it("rejects missing package: ZIP entry", () => {
    const decision = decideThemePackageImport({
      manifest: themeManifest(),
      entryNames: ["azura-package.json", "theme-tokens.json"],
      themeTokensBytes: Buffer.from(
        JSON.stringify({ logoUrl: "package:assets/logo.png", primaryColor: "#abcdef" }),
      ),
    });
    assert.equal(decision.action, "reject");
  });

  it("auto-binds logo when asset present and logoUrl omitted", () => {
    const decision = decideThemePackageImport({
      manifest: themeManifest(),
      entryNames: ["azura-package.json", "theme-tokens.json", "assets/logo.png"],
      themeTokensBytes: Buffer.from(JSON.stringify({ primaryColor: "#abcdef" })),
    });
    assert.equal(decision.action, "installed");
    if (decision.action === "installed") {
      assert.equal(decision.patch.logoUrl, "package:assets/logo.png");
    }
  });
});

describe("ZIP pass-1 limits", () => {
  it("rejects oversize uncompressed before any upload", () => {
    const result = validateThemeZipPass1({
      compressedBytes: 100,
      entries: [
        { name: "azura-package.json", uncompressedBytes: 10 },
        { name: "theme-tokens.json", uncompressedBytes: 20 },
        { name: "fonts/Huge.woff2", uncompressedBytes: 30 * 1024 * 1024 },
      ],
    });
    assert.equal(result.ok, false);
  });

  it("derives asset cap from MAX_FONT_FACES", () => {
    assert.equal(MAX_THEME_ASSET_BINARIES, 2 + MAX_FONT_FACES);
    const names = [
      "azura-package.json",
      "theme-tokens.json",
      "assets/logo.png",
      "assets/favicon.png",
      ...Array.from({ length: MAX_FONT_FACES + 1 }, (_, i) => `fonts/F${i}.woff2`),
    ];
    const result = validateThemeZipPass1({
      compressedBytes: 1000,
      entries: names.map((name) => ({ name, uncompressedBytes: 10 })),
    });
    assert.equal(result.ok, false);
  });
});

describe("mime map for fonts", () => {
  it("maps woff2 to font/woff2", () => {
    assert.equal(mimeTypeForUpload("BrandSans.woff2", "", "DOCUMENT"), "font/woff2");
    assert.equal(mimeTypeForUpload("BrandSans.woff", "", "DOCUMENT"), "font/woff");
  });
});

describe("materialize orchestrator compensation", () => {
  it("deletes all created on mid-batch failure", async () => {
    const deleted: string[] = [];
    let stores = 0;
    const result = await runThemeAssetMaterialize(
      [
        { name: "assets/logo.png", data: Buffer.from("png") },
        { name: "fonts/A.woff2", data: Buffer.from("font") },
      ],
      {
        storeFile: async () => {
          stores += 1;
          if (stores === 2) throw new Error("assertMediaStorageReady boom");
          return {
            url: `/uploads/images/${stores}.png`,
            storage: "local",
            bucket: "local",
            objectKey: `images/${stores}.png`,
          };
        },
        persistRow: async () => ({ id: `media-${stores}` }),
        deleteAsset: async (identity) => {
          deleted.push(identity.mediaId);
          return true;
        },
      },
    );
    assert.equal(result.ok, false);
    assert.deepEqual(deleted, ["media-1"]);
    assert.equal(stores, 2);
  });
});

describe("resolve at activate + merge", () => {
  it("resolves package refs and merges logo + fontFaces", () => {
    const patch = {
      primaryColor: "#abcdef",
      logoUrl: "package:assets/logo.png",
      typography: {
        bodyFont: "BrandSans",
        fontFaces: [{ family: "BrandSans", src: "package:fonts/BrandSans.woff2" }],
      },
    };
    const resolved = resolveThemeTokenAssetRefs(patch, [
      {
        zipPath: "assets/logo.png",
        mediaId: "m1",
        url: "/uploads/images/1-logo.png",
        sha256: "a",
        byteLength: 1,
        mediaType: "IMAGE",
        storageBackend: "local",
        bucket: "local",
        objectKey: "images/1-logo.png",
      },
      {
        zipPath: "fonts/BrandSans.woff2",
        mediaId: "m2",
        url: "/uploads/documents/2-BrandSans.woff2",
        sha256: "b",
        byteLength: 2,
        mediaType: "DOCUMENT",
        storageBackend: "local",
        bucket: "local",
        objectKey: "documents/2-BrandSans.woff2",
      },
    ]);
    assert.equal(resolved.ok, true);
    if (!resolved.ok) return;

    const merged = mergeThemeTokenPatchOntoPublished(
      {
        preset: "CLASSIC",
        siteDefaultPresetId: null,
        activePresetId: null,
        primaryColor: "#047857",
        secondaryColor: "#d4af37",
        typography: {},
        logoUrl: null,
        faviconUrl: null,
        darkModeEnabled: false,
        animationsEnabled: true,
        lazyLoadEnabled: true,
        animationSpeed: 1,
        spacingScale: 1,
        themeProvenance: {},
      },
      resolved.patch,
      "demo-theme-assets",
      "1.0.0",
      { resolvedFontFaces: resolved.resolvedFontFaces },
    );
    assert.equal(merged.logoUrl, "/uploads/images/1-logo.png");
    const typo = merged.typography as { fontFaces?: Array<{ family: string; url: string }> };
    assert.equal(typo.fontFaces?.[0]?.family, "BrandSans");
    assert.equal(typo.fontFaces?.[0]?.url, "/uploads/documents/2-BrandSans.woff2");
  });
});

describe("font-face CSS escaping", () => {
  it("escapes family and rejects bad URL / family", () => {
    assert.equal(escapeCssFontFamily("Brand Sans"), '"Brand Sans"');
    assert.equal(escapeCssFontFamily('Bad;drop'), null);
    assert.equal(isAllowedPackageFontUrl("/uploads/documents/a.woff2"), true);
    assert.equal(isAllowedPackageFontUrl("https://evil.example/a.woff2"), false);
    const css = formatPackageFontFaceCss([
      { family: "BrandSans", url: "/uploads/documents/a.woff2", format: "woff2" },
      { family: "Evil", url: "javascript:alert(1)" },
    ]);
    assert.match(css, /@font-face/);
    assert.match(css, /BrandSans/);
    assert.doesNotMatch(css, /javascript/);
  });
});

describe("static wiring pins", () => {
  it("installer uses materialize orchestrator and export omits binaries", () => {
    const installer = readFileSync(path.join(ROOT, "src/platform/packages/installer.ts"), "utf8");
    assert.match(installer, /runThemeAssetMaterialize/);
    assert.match(installer, /storeUploadedFile/);
    assert.match(installer, /persistMediaUpload/);
    assert.match(installer, /pendingGc/);
    const exportFn = installer.slice(installer.indexOf("export async function exportPackageZip"));
    const beforeReturn = exportFn.slice(0, exportFn.indexOf("return writeStoreZip"));
    assert.doesNotMatch(beforeReturn, /themeAssets/);
    assert.doesNotMatch(beforeReturn, /fonts\//);
  });

  it("activate resolves package refs via resolveThemeTokenAssetRefs", () => {
    const source = readFileSync(
      path.join(ROOT, "src/platform/packages/theme-package-activate.ts"),
      "utf8",
    );
    assert.match(source, /resolveThemeTokenAssetRefs/);
    assert.match(source, /pendingGcThemeAssets/);
  });
});
