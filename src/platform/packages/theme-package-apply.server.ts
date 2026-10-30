import "server-only";

import type { Prisma, SiteTheme, ThemePreset } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureSiteThemeEffectColumns } from "@/features/theme/ensure-site-theme-effect-columns.server";
import { themeRepository } from "@/repositories/theme.repository";
import {
  DIRTY_DRAFT_MESSAGE,
  isDraftDirtyVersusPublished,
  mergeThemeTokenPatchOntoPublished,
  type PublishedThemeFields,
} from "@/platform/packages/theme-package-apply";
import type { ThemeTokenPatch } from "@/platform/packages/theme-token-package";
import { ThemePackageActivateError } from "@/platform/packages/theme-package-activate";

function rowToPublishedFields(row: SiteTheme): PublishedThemeFields {
  return {
    preset: row.preset,
    siteDefaultPresetId: row.siteDefaultPresetId ?? null,
    activePresetId: row.activePresetId ?? null,
    primaryColor: row.primaryColor,
    secondaryColor: row.secondaryColor,
    typography: row.typography,
    logoUrl: row.logoUrl ?? null,
    faviconUrl: row.faviconUrl ?? null,
    customCss: row.customCss ?? null,
    brandConfig: row.brandConfig,
    headerConfig: row.headerConfig,
    footerConfig: row.footerConfig,
    mobileBrowserConfig: row.mobileBrowserConfig,
    motionSettings: row.motionSettings,
    glassEffectSettings: row.glassEffectSettings,
    cursorEffectSettings: row.cursorEffectSettings,
    textEffectSettings: row.textEffectSettings,
    backgroundEffectSettings: row.backgroundEffectSettings,
    cursorEffect: row.cursorEffect ?? null,
    backgroundEffect: row.backgroundEffect ?? null,
    textEffect: row.textEffect ?? null,
    cursorEffectEnabled: row.cursorEffectEnabled,
    backgroundEffectEnabled: row.backgroundEffectEnabled,
    textEffectEnabled: row.textEffectEnabled,
    glassEffectEnabled: row.glassEffectEnabled,
    cardStyle: row.cardStyle ?? null,
    borderStyle: row.borderStyle ?? null,
    darkModeEnabled: row.darkModeEnabled,
    animationsEnabled: row.animationsEnabled,
    lazyLoadEnabled: row.lazyLoadEnabled,
    animationSpeed: row.animationSpeed,
    spacingScale: row.spacingScale,
    themeProvenance:
      row.themeProvenance && typeof row.themeProvenance === "object" && !Array.isArray(row.themeProvenance)
        ? (row.themeProvenance as PublishedThemeFields["themeProvenance"])
        : {},
  };
}

/** Columns written on theme package activate (M7–M7.3). Source-pin in tests. */
export const THEME_PACKAGE_PUBLISHED_WRITE_COLUMNS = [
  "preset",
  "siteDefaultPresetId",
  "activePresetId",
  "primaryColor",
  "secondaryColor",
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
  "darkModeEnabled",
  "animationsEnabled",
  "lazyLoadEnabled",
  "animationSpeed",
  "spacingScale",
  "themeProvenance",
] as const;

function publishedFieldsToUpdate(fields: PublishedThemeFields): Prisma.SiteThemeUpdateInput {
  const data: Prisma.SiteThemeUpdateInput = {
    preset: fields.preset,
    siteDefaultPresetId: fields.siteDefaultPresetId,
    activePresetId: fields.activePresetId,
    primaryColor: fields.primaryColor,
    secondaryColor: fields.secondaryColor,
    typography: fields.typography as Prisma.InputJsonValue,
    darkModeEnabled: fields.darkModeEnabled,
    animationsEnabled: fields.animationsEnabled,
    lazyLoadEnabled: fields.lazyLoadEnabled,
    animationSpeed: fields.animationSpeed,
    spacingScale: fields.spacingScale,
    themeProvenance: fields.themeProvenance as Prisma.InputJsonValue,
  };
  if (fields.logoUrl !== undefined) data.logoUrl = fields.logoUrl;
  if (fields.faviconUrl !== undefined) data.faviconUrl = fields.faviconUrl;
  if (fields.customCss !== undefined) data.customCss = fields.customCss;
  if (fields.brandConfig !== undefined) data.brandConfig = fields.brandConfig as Prisma.InputJsonValue;
  if (fields.headerConfig !== undefined) data.headerConfig = fields.headerConfig as Prisma.InputJsonValue;
  if (fields.footerConfig !== undefined) data.footerConfig = fields.footerConfig as Prisma.InputJsonValue;
  if (fields.mobileBrowserConfig !== undefined) {
    data.mobileBrowserConfig = fields.mobileBrowserConfig as Prisma.InputJsonValue;
  }
  if (fields.motionSettings !== undefined) {
    data.motionSettings = fields.motionSettings as Prisma.InputJsonValue;
  }
  if (fields.glassEffectSettings !== undefined) {
    data.glassEffectSettings = fields.glassEffectSettings as Prisma.InputJsonValue;
  }
  if (fields.cursorEffectSettings !== undefined) {
    data.cursorEffectSettings = fields.cursorEffectSettings as Prisma.InputJsonValue;
  }
  if (fields.textEffectSettings !== undefined) {
    data.textEffectSettings = fields.textEffectSettings as Prisma.InputJsonValue;
  }
  if (fields.backgroundEffectSettings !== undefined) {
    data.backgroundEffectSettings = fields.backgroundEffectSettings as Prisma.InputJsonValue;
  }
  if (fields.cursorEffect !== undefined) data.cursorEffect = fields.cursorEffect;
  if (fields.backgroundEffect !== undefined) data.backgroundEffect = fields.backgroundEffect;
  if (fields.textEffect !== undefined) data.textEffect = fields.textEffect;
  if (fields.cursorEffectEnabled !== undefined) data.cursorEffectEnabled = fields.cursorEffectEnabled;
  if (fields.backgroundEffectEnabled !== undefined) {
    data.backgroundEffectEnabled = fields.backgroundEffectEnabled;
  }
  if (fields.textEffectEnabled !== undefined) data.textEffectEnabled = fields.textEffectEnabled;
  if (fields.glassEffectEnabled !== undefined) data.glassEffectEnabled = fields.glassEffectEnabled;
  if (fields.cardStyle !== undefined) data.cardStyle = fields.cardStyle;
  if (fields.borderStyle !== undefined) data.borderStyle = fields.borderStyle;
  return data;
}

const DEFAULT_PUBLISHED: PublishedThemeFields = {
  preset: "CLASSIC" as ThemePreset,
  siteDefaultPresetId: null,
  activePresetId: null,
  primaryColor: "#047857",
  secondaryColor: "#d4af37",
  typography: {},
  logoUrl: null,
  faviconUrl: null,
  customCss: null,
  darkModeEnabled: false,
  animationsEnabled: true,
  lazyLoadEnabled: true,
  animationSpeed: 1,
  spacingScale: 1,
  themeProvenance: {},
};

export async function assertThemeDraftClean(): Promise<void> {
  await ensureSiteThemeEffectColumns();
  const [published, draft] = await Promise.all([
    themeRepository.getPublished(),
    themeRepository.getDraft(),
  ]);
  if (isDraftDirtyVersusPublished(published ?? undefined, draft ?? undefined)) {
    throw new ThemePackageActivateError(DIRTY_DRAFT_MESSAGE);
  }
}

export async function snapshotPublishedTheme(): Promise<PublishedThemeFields> {
  await ensureSiteThemeEffectColumns();
  const published = await themeRepository.getPublished();
  return published ? rowToPublishedFields(published) : { ...DEFAULT_PUBLISHED };
}

export async function writePublishedThemeFields(fields: PublishedThemeFields): Promise<void> {
  await ensureSiteThemeEffectColumns();
  const data = publishedFieldsToUpdate(fields);
  await prisma.siteTheme.upsert({
    where: { id: "published" },
    create: { ...(data as Prisma.SiteThemeCreateInput), id: "published" },
    update: data,
  });
}

export async function restorePublishedThemeFields(snapshot: PublishedThemeFields): Promise<void> {
  await writePublishedThemeFields(snapshot);
}

export function mergePublishedWithPackagePatch(
  published: PublishedThemeFields,
  patch: ThemeTokenPatch,
  packageId: string,
  packageVersion: string,
  options?: Parameters<typeof mergeThemeTokenPatchOntoPublished>[4],
): PublishedThemeFields {
  return mergeThemeTokenPatchOntoPublished(published, patch, packageId, packageVersion, options);
}

/** Demote other active themes and mark this package active in one transaction. */
export async function commitThemeLedgerActive(packageId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.packageInstallation.updateMany({
      where: { kind: "theme", status: "active", NOT: { packageId } },
      data: { status: "inactive" },
    });
    await tx.packageInstallation.update({
      where: { packageId },
      data: { status: "active" },
    });
  });
}

/**
 * Soft-deactivate a theme package: clear applied-source provenance when it matches
 * this package id. Published colors/tokens stay (live look unchanged).
 */
export async function clearThemePackageProvenance(packageId: string): Promise<void> {
  await ensureSiteThemeEffectColumns();
  const published = await themeRepository.getPublished();
  if (!published) return;
  const provenance =
    published.themeProvenance &&
    typeof published.themeProvenance === "object" &&
    !Array.isArray(published.themeProvenance)
      ? (published.themeProvenance as PublishedThemeFields["themeProvenance"])
      : {};
  if (provenance.sourcePackageId !== packageId) return;
  const fields = rowToPublishedFields(published);
  fields.themeProvenance = {
    sourcePresetId: provenance.sourcePresetId ?? null,
    sourcePackageId: null,
    sourcePackageVersion: null,
    appliedAt: null,
  };
  await writePublishedThemeFields(fields);
}
