import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AZURA_THEME_TOKENS,
  decideThemePackageImport,
  parseAndValidateThemeTokensJson,
  THEME_TOKENS_MAX_BYTES,
} from "@/platform/packages/theme-token-package";
import type { PackageManifest } from "@/platform/packages/manifest";
import { validateZipEntryName } from "@/platform/packages/manifest";
import {
  DIRTY_DRAFT_MESSAGE,
  isDraftDirtyVersusPublished,
  mergeThemeTokenPatchOntoPublished,
} from "@/platform/packages/theme-package-apply";
import { runThemePackageActivate } from "@/platform/packages/theme-package-activate";
import {
  envelopeWithThemeTokens,
  readInstallationEnvelope,
  writeInstallationEnvelope,
} from "@/platform/packages/installation-envelope";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const emptyContrib = {
  adminNavItemIds: [],
  adminRoutePrefixes: [],
  blockTypes: [],
};

function themeManifest(id = "demo-theme-tokens"): PackageManifest {
  return {
    id,
    version: "1.0.0",
    kind: "theme",
    azuraCompatibility: ">=0.1.0",
    requiredPackages: [],
    requiredCapabilities: [],
    requiredPresets: [],
    permissions: [],
    label: "Demo Theme",
    contributions: emptyContrib,
  };
}

describe("parseAndValidateThemeTokensJson", () => {
  it("accepts a flat allowlisted patch", () => {
    const raw = Buffer.from(
      JSON.stringify({
        primaryColor: "#112233",
        darkModeEnabled: true,
        typography: { bodyFont: "Inter", headingScale: 1.2 },
      }),
    );
    const result = parseAndValidateThemeTokensJson(raw);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.patch.primaryColor, "#112233");
      assert.equal(result.patch.typography?.bodyFont, "Inter");
      assert.equal(result.meta.byteLength, raw.byteLength);
      assert.match(result.meta.sha256, /^[a-f0-9]{64}$/);
    }
  });

  it("rejects themeProvenance from tokens", () => {
    const result = parseAndValidateThemeTokensJson(
      Buffer.from(
        JSON.stringify({
          primaryColor: "#000000",
          themeProvenance: { sourcePackageId: "x" },
        }),
      ),
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.errors.join(" "), /themeProvenance/);
  });

  it("accepts policy-clean customCss", () => {
    const result = parseAndValidateThemeTokensJson(
      Buffer.from(
        JSON.stringify({
          primaryColor: "#000000",
          customCss: "body{color:red}",
        }),
      ),
    );
    assert.equal(result.ok, true);
  });

  it("rejects unknown nested typography keys", () => {
    const result = parseAndValidateThemeTokensJson(
      Buffer.from(JSON.stringify({ typography: { bodyFont: "A", localeFonts: {} } })),
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.errors.join(" "), /localeFonts/);
  });

  it("rejects oversize payloads", () => {
    const big = Buffer.alloc(THEME_TOKENS_MAX_BYTES + 1, 0x20);
    big.write('{"primaryColor":"#ffffff"}', 0, "utf8");
    const result = parseAndValidateThemeTokensJson(big);
    assert.equal(result.ok, false);
  });
});

describe("decideThemePackageImport", () => {
  it("rejects theme ZIPs that include migrations", () => {
    const decision = decideThemePackageImport({
      manifest: themeManifest(),
      entryNames: ["azura-package.json", "migrations/001.up.sql"],
      themeTokensBytes: Buffer.from(JSON.stringify({ primaryColor: "#abcdef" })),
    });
    assert.equal(decision.action, "reject");
  });

  it("returns pending when theme-tokens.json is missing", () => {
    const decision = decideThemePackageImport({
      manifest: themeManifest(),
      entryNames: ["azura-package.json"],
      themeTokensBytes: null,
    });
    assert.equal(decision.action, "pending");
  });

  it("returns installed for valid tokens", () => {
    const decision = decideThemePackageImport({
      manifest: themeManifest(),
      entryNames: ["azura-package.json", AZURA_THEME_TOKENS],
      themeTokensBytes: Buffer.from(JSON.stringify({ primaryColor: "#abcdef" })),
    });
    assert.equal(decision.action, "installed");
  });

  it("rejects malformed tokens (not pending)", () => {
    const decision = decideThemePackageImport({
      manifest: themeManifest(),
      entryNames: ["azura-package.json", AZURA_THEME_TOKENS],
      themeTokensBytes: Buffer.from("{not-json"),
    });
    assert.equal(decision.action, "reject");
  });
});

describe("ZIP allowlist", () => {
  it("allows theme-tokens.json, theme fonts/assets, and still rejects React sources", () => {
    assert.equal(validateZipEntryName("theme-tokens.json"), true);
    assert.equal(validateZipEntryName("azura-package.json"), true);
    assert.equal(validateZipEntryName("fonts/Inter.woff2"), true);
    assert.equal(validateZipEntryName("assets/logo.png"), true);
    assert.equal(validateZipEntryName("src/app/page.tsx"), false);
  });
});

describe("envelope round-trip", () => {
  it("stores theme token artifacts and exposes package id", () => {
    const manifest = themeManifest();
    const envelope = envelopeWithThemeTokens(
      manifest,
      { primaryColor: "#101010" },
      {
        sha256: "a".repeat(64),
        byteLength: 10,
        packageVersion: "1.0.0",
        importedAt: new Date().toISOString(),
      },
    );
    const json = writeInstallationEnvelope(envelope);
    const read = readInstallationEnvelope(json);
    assert.equal(read?.package.id, "demo-theme-tokens");
    assert.equal(read?.artifacts?.themeTokens.primaryColor, "#101010");
  });
});

describe("dirty draft + merge", () => {
  it("detects dirty draft across all compared columns", () => {
    const published = { primaryColor: "#000000", mobileBrowserConfig: { a: 1 } };
    const draft = { primaryColor: "#000000", mobileBrowserConfig: { a: 2 } };
    assert.equal(isDraftDirtyVersusPublished(published, draft), true);
    assert.equal(isDraftDirtyVersusPublished(published, published), false);
    assert.equal(isDraftDirtyVersusPublished(published, null), false);
  });

  it("merges patch and sets package provenance", () => {
    const merged = mergeThemeTokenPatchOntoPublished(
      {
        preset: "CLASSIC",
        siteDefaultPresetId: null,
        activePresetId: null,
        primaryColor: "#047857",
        secondaryColor: "#d4af37",
        typography: { bodyFont: "Old" },
        darkModeEnabled: false,
        animationsEnabled: true,
        lazyLoadEnabled: true,
        animationSpeed: 1,
        spacingScale: 1,
        themeProvenance: {},
      },
      { primaryColor: "#ff00aa", typography: { bodyFont: "New" } },
      "demo-theme-tokens",
      "1.0.0",
    );
    assert.equal(merged.primaryColor, "#ff00aa");
    assert.equal((merged.typography as { bodyFont: string }).bodyFont, "New");
    assert.equal(merged.themeProvenance.sourcePackageId, "demo-theme-tokens");
    assert.equal(merged.themeProvenance.sourcePackageVersion, "1.0.0");
  });
});

describe("runThemePackageActivate orchestrator", () => {
  it("refuses when draft is dirty", async () => {
    const result = await runThemePackageActivate("demo-theme-tokens", {
      loadEnvelope: async () =>
        envelopeWithThemeTokens(
          themeManifest(),
          { primaryColor: "#111111" },
          {
            sha256: "b".repeat(64),
            byteLength: 1,
            packageVersion: "1.0.0",
            importedAt: "2026-01-01T00:00:00.000Z",
          },
        ),
      assertDraftClean: async () => {
        throw new Error(DIRTY_DRAFT_MESSAGE);
      },
      snapshotPublished: async () => ({ primaryColor: "#000000" }),
      mergePatch: (p) => p,
      writePublished: async () => {},
      commitThemeLedgerActive: async () => {},
      restorePublished: async () => {},
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /unpublished changes/);
  });

  it("compensates when ledger commit fails after published write", async () => {
    const writes: string[] = [];
    const snapshot = { primaryColor: "#000000" };
    const result = await runThemePackageActivate("demo-theme-tokens", {
      loadEnvelope: async () =>
        envelopeWithThemeTokens(
          themeManifest(),
          { primaryColor: "#222222" },
          {
            sha256: "c".repeat(64),
            byteLength: 1,
            packageVersion: "1.0.0",
            importedAt: "2026-01-01T00:00:00.000Z",
          },
        ),
      assertDraftClean: async () => {},
      snapshotPublished: async () => snapshot,
      mergePatch: (_p, patch) => ({ primaryColor: patch.primaryColor ?? "#000000" }),
      writePublished: async (merged) => {
        writes.push(`write:${(merged as { primaryColor: string }).primaryColor}`);
      },
      commitThemeLedgerActive: async () => {
        throw new Error("ledger write failed");
      },
      restorePublished: async (snap) => {
        writes.push(`restore:${(snap as { primaryColor: string }).primaryColor}`);
      },
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.compensated, true);
      assert.match(result.error, /ledger write failed/);
    }
    assert.deepEqual(writes, ["write:#222222", "restore:#000000"]);
  });
});

describe("installer theme branch pin (static)", () => {
  it("activatePackage branches on theme before pending throw", () => {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
    const source = readFileSync(path.join(root, "src/platform/packages/installer.ts"), "utf8");
    const applyServer = readFileSync(
      path.join(root, "src/platform/packages/theme-package-apply.server.ts"),
      "utf8",
    );
    const themeBranch = source.indexOf('kind === "theme"');
    const pendingThrow = source.indexOf("is pending until its code is deployed");
    assert.ok(themeBranch >= 0, "must branch on kind theme");
    assert.ok(pendingThrow >= 0);
    assert.ok(themeBranch < pendingThrow, "theme branch must precede pending throw");
    assert.match(source, /runThemePackageActivate/);
    assert.doesNotMatch(applyServer, /publishFromDraft/);
    assert.doesNotMatch(applyServer, /page\.repository|blockRepository|cmsPage/);
  });
});
