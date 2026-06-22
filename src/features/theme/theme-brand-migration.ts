import type { Prisma } from "@prisma/client";
import { themeRepository } from "@/repositories/theme.repository";
import { navigationService } from "@/features/navigation/navigation.service";
import { parseBrandConfig } from "@/features/theme/theme-config";
import { DEFAULT_TAGLINE, isDefaultBrandName } from "@/config/site";
import { normalizeBranding } from "@/features/navigation/branding-defaults";

/** Copy header workspace branding into theme draft brandConfig when empty. */
export async function migrateBrandConfigFromHeaderIfNeeded(): Promise<void> {
  const draft = await themeRepository.getDraft();
  if (!draft) return;

  const existing = parseBrandConfig((draft as { brandConfig?: unknown }).brandConfig);
  const isDefault =
    isDefaultBrandName(existing.brandName) &&
    !existing.logoImageLightUrl &&
    !existing.logoImageDarkUrl &&
    existing.logoMode === "text";

  if (!isDefault) return;

  const headerWs = await navigationService.getWorkspace();
  const headerBranding = normalizeBranding(headerWs.branding);
  const headerCustomized =
    !isDefaultBrandName(headerBranding.brandName) ||
    headerBranding.logoImageLightUrl ||
    headerBranding.logoImageDarkUrl ||
    headerBranding.tagline !== DEFAULT_TAGLINE;

  if (!headerCustomized) return;

  await themeRepository.upsertDraft({
    id: "draft",
    preset: draft.preset,
    siteDefaultPresetId:
      ("siteDefaultPresetId" in draft
        ? (draft as { siteDefaultPresetId?: string | null }).siteDefaultPresetId
        : null) ?? draft.activePresetId,
    primaryColor: draft.primaryColor,
    secondaryColor: draft.secondaryColor,
    typography: draft.typography as Prisma.InputJsonValue,
    faviconUrl: draft.faviconUrl,
    logoUrl: draft.logoUrl,
    brandConfig: headerBranding as unknown as Prisma.InputJsonValue,
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
    backgroundEffectSettings: draft.backgroundEffectSettings as Prisma.InputJsonValue,
    cardStyle: draft.cardStyle,
    borderStyle: draft.borderStyle,
    themeProvenance:
      ("themeProvenance" in draft
        ? ((draft as { themeProvenance?: Prisma.InputJsonValue }).themeProvenance ?? {})
        : {}) as Prisma.InputJsonValue,
  });
}
