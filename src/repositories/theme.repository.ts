import { syncPresetIdentityFields } from "@/features/theme/preset-identity";
import { ensureSiteThemeEffectColumns } from "@/features/theme/ensure-site-theme-effect-columns.server";
import { prisma } from "@/lib/prisma";
import type { Prisma, SiteTheme } from "@prisma/client";

/**
 * Return true when a Prisma/MySQL error is caused by an unknown column — which
 * means `mobileBrowserConfig` (or another new column) has not yet been added to
 * the live DB. The caller can force-ensure, then retry.
 */
function isUnknownColumnError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return /unknown column|column.*doesn't exist/i.test(err.message);
}

async function withColumnFallback<T>(op: () => Promise<T>): Promise<T> {
  try {
    return await op();
  } catch (err) {
    if (!isUnknownColumnError(err)) throw err;
    // Force a fresh ensure (bypass the process-level cache) then retry once.
    await ensureSiteThemeEffectColumnsForce();
    return op();
  }
}

async function ensureSiteThemeEffectColumnsForce(): Promise<void> {
  // Reset the process-level cache so the ensure logic re-runs even if it
  // previously completed (the column was missing despite the earlier attempt).
  const g = globalThis as unknown as { siteThemeEffectColumnsEnsured?: boolean };
  g.siteThemeEffectColumnsEnsured = false;
  await ensureSiteThemeEffectColumns();
}

export const themeRepository = {
  async getPublished(): Promise<SiteTheme | null> {
    await ensureSiteThemeEffectColumns();
    return withColumnFallback(() =>
      prisma.siteTheme.findUnique({ where: { id: "published" } }),
    );
  },

  async getDraft(): Promise<SiteTheme | null> {
    await ensureSiteThemeEffectColumns();
    return withColumnFallback(() =>
      prisma.siteTheme.findUnique({ where: { id: "draft" } }),
    );
  },

  async upsertDraft(data: Prisma.SiteThemeCreateInput) {
    await ensureSiteThemeEffectColumns();
    const { id: _id, ...rest } = data;
    return withColumnFallback(() =>
      prisma.siteTheme.upsert({
        where: { id: "draft" },
        create: { id: "draft", ...rest },
        update: rest,
      }),
    );
  },

  async publishFromDraft() {
    await ensureSiteThemeEffectColumns();
    const draft = await withColumnFallback(() =>
      prisma.siteTheme.findUnique({ where: { id: "draft" } }),
    );
    if (!draft) throw new Error("No draft theme");
    const presetIdentity = syncPresetIdentityFields(draft.siteDefaultPresetId);
    const data: Prisma.SiteThemeCreateInput = {
      id: "published",
      preset: draft.preset,
      siteDefaultPresetId: presetIdentity.siteDefaultPresetId,
      activePresetId: presetIdentity.activePresetId,
      primaryColor: draft.primaryColor,
      secondaryColor: draft.secondaryColor,
      typography: draft.typography as Prisma.InputJsonValue,
      faviconUrl: draft.faviconUrl,
      logoUrl: draft.logoUrl,
      brandConfig: (draft.brandConfig ?? {}) as Prisma.InputJsonValue,
      headerConfig: draft.headerConfig as Prisma.InputJsonValue,
      footerConfig: draft.footerConfig as Prisma.InputJsonValue,
      animationsEnabled: draft.animationsEnabled,
      animationSpeed: draft.animationSpeed,
      lazyLoadEnabled: draft.lazyLoadEnabled,
      darkModeEnabled: draft.darkModeEnabled,
      spacingScale: draft.spacingScale,
      customCss: draft.customCss,
      cursorEffect: draft.cursorEffect,
      backgroundEffect: draft.backgroundEffect,
      textEffect: draft.textEffect,
      cursorEffectEnabled: draft.cursorEffectEnabled,
      backgroundEffectEnabled: draft.backgroundEffectEnabled,
      textEffectEnabled: draft.textEffectEnabled,
      backgroundEffectSettings: (draft.backgroundEffectSettings ?? {}) as Prisma.InputJsonValue,
      cursorEffectSettings: (draft.cursorEffectSettings ?? {}) as Prisma.InputJsonValue,
      textEffectSettings: (draft.textEffectSettings ?? {}) as Prisma.InputJsonValue,
      motionSettings: (draft.motionSettings ?? {}) as Prisma.InputJsonValue,
      cardStyle: draft.cardStyle,
      borderStyle: draft.borderStyle,
      themeProvenance: (draft.themeProvenance ?? {}) as Prisma.InputJsonValue,
      mobileBrowserConfig: (draft.mobileBrowserConfig ?? {}) as Prisma.InputJsonValue,
    };
    const { id: _id, ...updateData } = data;
    return withColumnFallback(() =>
      prisma.siteTheme.upsert({
        where: { id: "published" },
        create: data,
        update: updateData,
      }),
    );
  },
};
