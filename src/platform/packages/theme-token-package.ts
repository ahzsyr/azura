/**
 * Pure validators for Option C token theme packages (M7–M7.3).
 * Tokens are a ZIP sibling file — never PackageContributions.themeTokens.
 */
import { createHash } from "node:crypto";
import type { PackageManifest } from "@/platform/packages/manifest";
import {
  isThemeAssetZipPath,
  MAX_FONT_FACES,
  validateThemeZipPass1,
} from "@/platform/packages/theme-asset-limits";
import { validateThemePackageCustomCss } from "@/platform/packages/theme-custom-css-policy";
import {
  packageBrandConfigSchema,
  packageFooterConfigSchema,
  packageHeaderConfigSchema,
  packageMobileBrowserConfigSchema,
  packageMotionSettingsSchema,
  packageVisualEffectSettingsSchema,
  type PackageBrandConfig,
  type PackageFooterConfig,
  type PackageHeaderConfig,
  type PackageMobileBrowserConfig,
  type PackageVisualEffectSettings,
} from "@/platform/packages/theme-token-rich-schemas";

export const AZURA_THEME_TOKENS = "theme-tokens.json";
export const THEME_TOKENS_MAX_BYTES = 256 * 1024;

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const PRESETS = new Set(["CLASSIC", "MODERN", "LUXURY", "CUSTOM"]);
const PACKAGE_REF = /^package:(assets\/logo\.(png|jpe?g|webp|svg)|assets\/favicon\.(png|webp|svg|ico)|fonts\/[A-Za-z0-9._-]+\.(woff2|woff|ttf|otf))$/;
const ROOT_RELATIVE_URL = /^\/(uploads|assets|images)\//;
const HTTPS_URL = /^https:\/\//;
/** Family charset for package fontFaces (no quotes/semicolons). */
export const FONT_FAMILY_CHARSET = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,63}$/;

export const THEME_TOKEN_PATCH_KEYS = [
  "primaryColor",
  "secondaryColor",
  "darkModeEnabled",
  "animationsEnabled",
  "lazyLoadEnabled",
  "animationSpeed",
  "spacingScale",
  "preset",
  "siteDefaultPresetId",
  "typography",
  "logoUrl",
  "faviconUrl",
  "customCss",
  "brandConfig",
  "headerConfig",
  "footerConfig",
  "mobileBrowserConfig",
  "motionSettings",
  "glassEffectSettings",
  "cursorEffectSettings",
  "textEffectSettings",
  "backgroundEffectSettings",
  "cursorEffect",
  "backgroundEffect",
  "textEffect",
  "cursorEffectEnabled",
  "backgroundEffectEnabled",
  "textEffectEnabled",
  "glassEffectEnabled",
  "cardStyle",
  "borderStyle",
] as const;

export type ThemeTokenPatchKey = (typeof THEME_TOKEN_PATCH_KEYS)[number];

const TYPOGRAPHY_KEYS = new Set([
  "bodyFont",
  "headingFont",
  "baseFontSize",
  "headingScale",
  "fontFaces",
]);

export type ThemeTokenFontFaceSource = {
  family: string;
  /** Unresolved package ref until activate. */
  src: string;
};

export type ThemeTokenPatch = {
  primaryColor?: string;
  secondaryColor?: string;
  darkModeEnabled?: boolean;
  animationsEnabled?: boolean;
  lazyLoadEnabled?: boolean;
  animationSpeed?: number;
  spacingScale?: number;
  preset?: "CLASSIC" | "MODERN" | "LUXURY" | "CUSTOM";
  siteDefaultPresetId?: string | null;
  typography?: {
    bodyFont?: string;
    headingFont?: string;
    baseFontSize?: string;
    headingScale?: number;
    fontFaces?: ThemeTokenFontFaceSource[];
  };
  /** package: ref, root-relative, https, or null to clear */
  logoUrl?: string | null;
  faviconUrl?: string | null;
  customCss?: string | null;
  brandConfig?: PackageBrandConfig | null;
  headerConfig?: PackageHeaderConfig | null;
  footerConfig?: PackageFooterConfig | null;
  mobileBrowserConfig?: PackageMobileBrowserConfig | null;
  motionSettings?: { intensity: number; opacity: number } | null;
  glassEffectSettings?: PackageVisualEffectSettings | null;
  cursorEffectSettings?: PackageVisualEffectSettings | null;
  textEffectSettings?: PackageVisualEffectSettings | null;
  backgroundEffectSettings?: PackageVisualEffectSettings | null;
  cursorEffect?: string | null;
  backgroundEffect?: string | null;
  textEffect?: string | null;
  cursorEffectEnabled?: boolean;
  backgroundEffectEnabled?: boolean;
  textEffectEnabled?: boolean;
  glassEffectEnabled?: boolean;
  cardStyle?: string | null;
  borderStyle?: string | null;
};

export type ThemeTokensMeta = {
  sha256: string;
  byteLength: number;
  packageVersion: string;
  importedAt: string;
};

export type ThemeTokenParseResult =
  | { ok: true; patch: ThemeTokenPatch; meta: Omit<ThemeTokensMeta, "packageVersion" | "importedAt"> }
  | { ok: false; errors: string[] };

/** Server-owned — never accepted from theme-tokens.json. */
const FORBIDDEN_TOP = new Set(["themeProvenance"]);

function appendZodIssues(
  path: string,
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>,
  errors: string[],
): void {
  for (const issue of issues) {
    const loc = issue.path.length ? `${path}.${issue.path.map(String).join(".")}` : path;
    errors.push(`${loc}: ${issue.message}`);
  }
}

function rejectUnknownKeys(
  record: Record<string, unknown>,
  allowed: Set<string>,
  path: string,
  errors: string[],
): void {
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      errors.push(`${path}: unknown key "${key}"`);
    }
  }
}

export function isPackageAssetRef(value: string): boolean {
  return PACKAGE_REF.test(value);
}

export function packageRefToZipPath(ref: string): string | null {
  if (!ref.startsWith("package:")) return null;
  const path = ref.slice("package:".length);
  return isThemeAssetZipPath(path) ? path : null;
}

function validateLogoOrFaviconUrl(
  key: "logoUrl" | "faviconUrl",
  value: unknown,
  errors: string[],
): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string") {
    errors.push(`${key} must be a string, package: ref, or null`);
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    errors.push(`${key} must be a non-empty string or null`);
    return undefined;
  }
  if (
    isPackageAssetRef(trimmed) ||
    ROOT_RELATIVE_URL.test(trimmed) ||
    HTTPS_URL.test(trimmed)
  ) {
    return trimmed;
  }
  errors.push(
    `${key} must be a package: ref, root-relative /uploads|/assets|/images path, or https URL`,
  );
  return undefined;
}

function parseFontFacesSource(
  raw: unknown,
  errors: string[],
): ThemeTokenFontFaceSource[] | undefined {
  if (raw == null) return undefined;
  if (!Array.isArray(raw)) {
    errors.push("typography.fontFaces must be an array");
    return undefined;
  }
  if (raw.length > MAX_FONT_FACES) {
    errors.push(`typography.fontFaces allows at most ${MAX_FONT_FACES} entries`);
  }
  const out: ThemeTokenFontFaceSource[] = [];
  for (let i = 0; i < raw.length; i++) {
    const entry = raw[i];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      errors.push(`typography.fontFaces[${i}] must be an object`);
      continue;
    }
    const record = entry as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      if (key !== "family" && key !== "src") {
        errors.push(`typography.fontFaces[${i}]: unknown key "${key}"`);
      }
    }
    const family = typeof record.family === "string" ? record.family.trim() : "";
    const src = typeof record.src === "string" ? record.src.trim() : "";
    if (!FONT_FAMILY_CHARSET.test(family)) {
      errors.push(
        `typography.fontFaces[${i}].family must match ${FONT_FAMILY_CHARSET}`,
      );
    }
    if (!src.startsWith("package:fonts/") || !isPackageAssetRef(src)) {
      errors.push(
        `typography.fontFaces[${i}].src must be a package:fonts/… ref (no remote URLs)`,
      );
    }
    if (FONT_FAMILY_CHARSET.test(family) && isPackageAssetRef(src)) {
      out.push({ family, src });
    }
  }
  return out.length > 0 ? out.slice(0, MAX_FONT_FACES) : undefined;
}

function parseTypography(raw: unknown, errors: string[]): ThemeTokenPatch["typography"] | undefined {
  if (raw == null) return undefined;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    errors.push("typography must be an object");
    return undefined;
  }
  const record = raw as Record<string, unknown>;
  rejectUnknownKeys(record, TYPOGRAPHY_KEYS, "typography", errors);
  const out: NonNullable<ThemeTokenPatch["typography"]> = {};
  if ("bodyFont" in record) {
    if (typeof record.bodyFont !== "string" || !record.bodyFont.trim()) {
      errors.push("typography.bodyFont must be a non-empty string");
    } else out.bodyFont = record.bodyFont.trim();
  }
  if ("headingFont" in record) {
    if (typeof record.headingFont !== "string" || !record.headingFont.trim()) {
      errors.push("typography.headingFont must be a non-empty string");
    } else out.headingFont = record.headingFont.trim();
  }
  if ("baseFontSize" in record) {
    if (typeof record.baseFontSize !== "string" || !record.baseFontSize.trim()) {
      errors.push("typography.baseFontSize must be a non-empty string");
    } else out.baseFontSize = record.baseFontSize.trim();
  }
  if ("headingScale" in record) {
    if (typeof record.headingScale !== "number" || !Number.isFinite(record.headingScale)) {
      errors.push("typography.headingScale must be a finite number");
    } else if (record.headingScale < 1 || record.headingScale > 1.5) {
      errors.push("typography.headingScale must be between 1 and 1.5");
    } else out.headingScale = record.headingScale;
  }
  if ("fontFaces" in record) {
    out.fontFaces = parseFontFacesSource(record.fontFaces, errors);
  }
  return out;
}

/** Parse and deeply validate theme-tokens.json bytes (no Prisma). */
export function parseAndValidateThemeTokensJson(raw: Buffer | string): ThemeTokenParseResult {
  const buf = typeof raw === "string" ? Buffer.from(raw, "utf8") : raw;
  const errors: string[] = [];
  if (buf.byteLength > THEME_TOKENS_MAX_BYTES) {
    return {
      ok: false,
      errors: [`theme-tokens.json exceeds ${THEME_TOKENS_MAX_BYTES} bytes`],
    };
  }
  if (buf.byteLength === 0) {
    return { ok: false, errors: ["theme-tokens.json is empty"] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(buf.toString("utf8"));
  } catch {
    return { ok: false, errors: ["theme-tokens.json is not valid JSON"] };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, errors: ["theme-tokens.json must be a JSON object"] };
  }

  const record = parsed as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (FORBIDDEN_TOP.has(key)) {
      errors.push(`theme-tokens.json: field "${key}" is not allowed in this slice`);
    }
  }
  const allowed = new Set<string>(THEME_TOKEN_PATCH_KEYS);
  rejectUnknownKeys(record, allowed, "theme-tokens.json", errors);

  const patch: ThemeTokenPatch = {};
  if ("primaryColor" in record) {
    if (typeof record.primaryColor !== "string" || !HEX_COLOR.test(record.primaryColor)) {
      errors.push("primaryColor must be a hex color (#rgb, #rrggbb, or #rrggbbaa)");
    } else patch.primaryColor = record.primaryColor;
  }
  if ("secondaryColor" in record) {
    if (typeof record.secondaryColor !== "string" || !HEX_COLOR.test(record.secondaryColor)) {
      errors.push("secondaryColor must be a hex color (#rgb, #rrggbb, or #rrggbbaa)");
    } else patch.secondaryColor = record.secondaryColor;
  }
  for (const flag of ["darkModeEnabled", "animationsEnabled", "lazyLoadEnabled"] as const) {
    if (flag in record) {
      if (typeof record[flag] !== "boolean") errors.push(`${flag} must be a boolean`);
      else patch[flag] = record[flag] as boolean;
    }
  }
  if ("animationSpeed" in record) {
    if (typeof record.animationSpeed !== "number" || !Number.isFinite(record.animationSpeed)) {
      errors.push("animationSpeed must be a finite number");
    } else patch.animationSpeed = record.animationSpeed;
  }
  if ("spacingScale" in record) {
    if (typeof record.spacingScale !== "number" || !Number.isFinite(record.spacingScale)) {
      errors.push("spacingScale must be a finite number");
    } else patch.spacingScale = record.spacingScale;
  }
  if ("preset" in record) {
    if (typeof record.preset !== "string" || !PRESETS.has(record.preset)) {
      errors.push("preset must be one of CLASSIC, MODERN, LUXURY, CUSTOM");
    } else patch.preset = record.preset as ThemeTokenPatch["preset"];
  }
  if ("siteDefaultPresetId" in record) {
    if (record.siteDefaultPresetId !== null && typeof record.siteDefaultPresetId !== "string") {
      errors.push("siteDefaultPresetId must be a string or null");
    } else patch.siteDefaultPresetId = record.siteDefaultPresetId as string | null;
  }
  if ("typography" in record) {
    patch.typography = parseTypography(record.typography, errors);
  }
  if ("logoUrl" in record) {
    const logo = validateLogoOrFaviconUrl("logoUrl", record.logoUrl, errors);
    if (logo !== undefined) patch.logoUrl = logo;
  }
  if ("faviconUrl" in record) {
    const favicon = validateLogoOrFaviconUrl("faviconUrl", record.faviconUrl, errors);
    if (favicon !== undefined) patch.faviconUrl = favicon;
  }

  if ("customCss" in record) {
    if (record.customCss === null) {
      patch.customCss = null;
    } else if (typeof record.customCss === "string") {
      const cssPolicy = validateThemePackageCustomCss(record.customCss);
      if (!cssPolicy.ok) errors.push(...cssPolicy.errors);
      else patch.customCss = record.customCss;
    } else {
      errors.push("customCss must be a string or null");
    }
  }

  if ("brandConfig" in record) {
    if (record.brandConfig === null) patch.brandConfig = null;
    else {
      const brand = packageBrandConfigSchema.safeParse(record.brandConfig);
      if (brand.success) patch.brandConfig = brand.data;
      else appendZodIssues("brandConfig", brand.error.issues, errors);
    }
  }
  if ("headerConfig" in record) {
    if (record.headerConfig === null) patch.headerConfig = null;
    else {
      const header = packageHeaderConfigSchema.safeParse(record.headerConfig);
      if (header.success) patch.headerConfig = header.data;
      else appendZodIssues("headerConfig", header.error.issues, errors);
    }
  }
  if ("footerConfig" in record) {
    if (record.footerConfig === null) patch.footerConfig = null;
    else {
      const footer = packageFooterConfigSchema.safeParse(record.footerConfig);
      if (footer.success) patch.footerConfig = footer.data;
      else appendZodIssues("footerConfig", footer.error.issues, errors);
    }
  }
  if ("mobileBrowserConfig" in record) {
    if (record.mobileBrowserConfig === null) patch.mobileBrowserConfig = null;
    else {
      const mobile = packageMobileBrowserConfigSchema.safeParse(record.mobileBrowserConfig);
      if (mobile.success) patch.mobileBrowserConfig = mobile.data;
      else appendZodIssues("mobileBrowserConfig", mobile.error.issues, errors);
    }
  }
  for (const key of [
    "backgroundEffectSettings",
    "cursorEffectSettings",
    "textEffectSettings",
    "glassEffectSettings",
  ] as const) {
    if (key in record) {
      if (record[key] === null) patch[key] = null;
      else {
        const parsedFx = packageVisualEffectSettingsSchema.safeParse(record[key]);
        if (parsedFx.success) patch[key] = parsedFx.data;
        else appendZodIssues(key, parsedFx.error.issues, errors);
      }
    }
  }
  if ("motionSettings" in record) {
    if (record.motionSettings === null) patch.motionSettings = null;
    else {
      const motion = packageMotionSettingsSchema.safeParse(record.motionSettings);
      if (motion.success) patch.motionSettings = motion.data;
      else appendZodIssues("motionSettings", motion.error.issues, errors);
    }
  }
  for (const key of ["cursorEffect", "backgroundEffect", "textEffect", "cardStyle", "borderStyle"] as const) {
    if (key in record) {
      if (record[key] === null) patch[key] = null;
      else if (typeof record[key] === "string") patch[key] = record[key] as string;
      else errors.push(`${key} must be a string or null`);
    }
  }
  for (const key of [
    "cursorEffectEnabled",
    "backgroundEffectEnabled",
    "textEffectEnabled",
    "glassEffectEnabled",
  ] as const) {
    if (key in record) {
      if (typeof record[key] !== "boolean") errors.push(`${key} must be a boolean`);
      else patch[key] = record[key] as boolean;
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  if (Object.keys(patch).length === 0) {
    return { ok: false, errors: ["theme-tokens.json must declare at least one allowed field"] };
  }

  return {
    ok: true,
    patch,
    meta: {
      sha256: createHash("sha256").update(buf).digest("hex"),
      byteLength: buf.byteLength,
    },
  };
}

export type ThemePackageImportDecision =
  | {
      action: "installed";
      patch: ThemeTokenPatch;
      tokenMeta: Omit<ThemeTokensMeta, "packageVersion" | "importedAt">;
    }
  | { action: "pending" }
  | { action: "reject"; errors: string[] };

function collectPackageRefs(patch: ThemeTokenPatch): string[] {
  const refs: string[] = [];
  if (typeof patch.logoUrl === "string" && patch.logoUrl.startsWith("package:")) {
    refs.push(patch.logoUrl);
  }
  if (typeof patch.faviconUrl === "string" && patch.faviconUrl.startsWith("package:")) {
    refs.push(patch.faviconUrl);
  }
  for (const face of patch.typography?.fontFaces ?? []) {
    refs.push(face.src);
  }
  return refs;
}

function autoBindBrandUrls(
  patch: ThemeTokenPatch,
  entryNames: string[],
): ThemeTokenPatch {
  const next = { ...patch };
  const logoEntry = entryNames.find((n) => n.startsWith("assets/logo."));
  const faviconEntry = entryNames.find((n) => n.startsWith("assets/favicon."));
  if (logoEntry && next.logoUrl === undefined) {
    next.logoUrl = `package:${logoEntry}`;
  }
  if (faviconEntry && next.faviconUrl === undefined) {
    next.faviconUrl = `package:${faviconEntry}`;
  }
  return next;
}

/**
 * Classify a theme package ZIP after manifest validation.
 * Pass-1 aggregate limits must succeed before materialization (caller).
 */
export function decideThemePackageImport(input: {
  manifest: PackageManifest;
  entryNames: string[];
  themeTokensBytes: Buffer | null;
  /** Optional compressed ZIP size for pass-1; omit in unit tests that only check tokens. */
  compressedBytes?: number;
  entryUncompressedBytes?: Array<{ name: string; uncompressedBytes: number }>;
}): ThemePackageImportDecision {
  if (input.manifest.kind !== "theme") {
    return { action: "reject", errors: ["decideThemePackageImport is only for kind theme"] };
  }

  const contrib = input.manifest.contributions;
  const contribEmpty =
    contrib.adminNavItemIds.length === 0 &&
    contrib.adminRoutePrefixes.length === 0 &&
    contrib.blockTypes.length === 0;
  if (!contribEmpty) {
    return {
      action: "reject",
      errors: ["theme packages in this slice must declare empty contributions"],
    };
  }

  for (const name of input.entryNames) {
    if (name.startsWith("migrations/")) {
      return {
        action: "reject",
        errors: ["theme packages must not include migrations (M5 purge safety)"],
      };
    }
    if (
      name !== "azura-package.json" &&
      name !== AZURA_THEME_TOKENS &&
      !isThemeAssetZipPath(name)
    ) {
      return { action: "reject", errors: [`theme package ZIP entry is not allowed: ${name}`] };
    }
  }

  if (input.compressedBytes != null && input.entryUncompressedBytes) {
    const pass1 = validateThemeZipPass1({
      compressedBytes: input.compressedBytes,
      entries: input.entryUncompressedBytes,
    });
    if (!pass1.ok) return { action: "reject", errors: pass1.errors };
  } else {
    const assetCount = input.entryNames.filter(isThemeAssetZipPath).length;
    if (assetCount > MAX_FONT_FACES + 2) {
      return {
        action: "reject",
        errors: [`theme ZIP has more than ${MAX_FONT_FACES + 2} asset binaries`],
      };
    }
  }

  if (!input.themeTokensBytes) {
    return { action: "pending" };
  }

  const parsed = parseAndValidateThemeTokensJson(input.themeTokensBytes);
  if (!parsed.ok) return { action: "reject", errors: parsed.errors };

  const patch = autoBindBrandUrls(parsed.patch, input.entryNames);
  const entrySet = new Set(input.entryNames);
  for (const ref of collectPackageRefs(patch)) {
    const zipPath = packageRefToZipPath(ref);
    if (!zipPath || !entrySet.has(zipPath)) {
      return {
        action: "reject",
        errors: [`package ref "${ref}" does not match a ZIP entry`],
      };
    }
  }

  return { action: "installed", patch, tokenMeta: parsed.meta };
}
