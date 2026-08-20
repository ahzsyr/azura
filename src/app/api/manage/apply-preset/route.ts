import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncPresetIdentityFields } from "@/features/theme/preset-identity";
import { themeRepository } from "@/repositories/theme.repository";
import { loadPresetJson, resolvePresetTheme } from "@/features/theme/preset-resolver.server";
import { parseTypography } from "@/features/theme/theme-config";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      presetId?: string;
      overrides?: {
        primaryColor?: string;
        secondaryColor?: string;
        cursorEffect?: string | null;
        backgroundEffect?: string | null;
        textEffect?: string | null;
      };
    };
    const { presetId, overrides } = body;
    if (!presetId) {
      return NextResponse.json({ error: "Missing presetId" }, { status: 400 });
    }

    const preset = await loadPresetJson(presetId);
    if (!preset) {
      return NextResponse.json({ error: `Preset "${presetId}" not found` }, { status: 404 });
    }

    const resolved = await resolvePresetTheme(presetId);
    if (!resolved) {
      return NextResponse.json({ error: "Failed to resolve preset" }, { status: 500 });
    }

    const draft = await themeRepository.getDraft();
    const draftBrandConfig =
      draft && "brandConfig" in draft
        ? (draft as { brandConfig?: unknown }).brandConfig
        : undefined;

    const draftTypography = parseTypography(draft?.typography);
    const presetFonts = preset.fonts;
    const typography = presetFonts
      ? {
          ...draftTypography,
          bodyFont: presetFonts.body ?? draftTypography.bodyFont,
          headingFont: presetFonts.display ?? draftTypography.headingFont,
        }
      : draftTypography;

    const cursorEffect =
      overrides?.cursorEffect !== undefined ? overrides.cursorEffect : resolved.cursorEffect;
    const backgroundEffect =
      overrides?.backgroundEffect !== undefined
        ? overrides.backgroundEffect
        : resolved.backgroundEffect;
    const textEffect =
      overrides?.textEffect !== undefined ? overrides.textEffect : resolved.textEffect;

    const presetIdentity = syncPresetIdentityFields(presetId);

    const defaultEffectSettings = { intensity: 1, opacity: 1 };

    await themeRepository.upsertDraft({
      id: "draft",
      preset: draft?.preset ?? "CUSTOM",
      siteDefaultPresetId: presetIdentity.siteDefaultPresetId,
      activePresetId: presetIdentity.activePresetId,
      primaryColor: overrides?.primaryColor ?? resolved.primaryColor,
      secondaryColor: overrides?.secondaryColor ?? resolved.secondaryColor,
      cursorEffect,
      backgroundEffect,
      textEffect,
      cursorEffectEnabled: Boolean(cursorEffect),
      backgroundEffectEnabled: Boolean(backgroundEffect),
      textEffectEnabled: Boolean(textEffect),
      cardStyle: resolved.cardStyle,
      borderStyle: resolved.borderStyle,
      typography,
      faviconUrl: draft?.faviconUrl,
      logoUrl: draft?.logoUrl,
      brandConfig: (draftBrandConfig ?? {}) as object,
      headerConfig: draft?.headerConfig ?? {},
      footerConfig: draft?.footerConfig ?? {},
      animationsEnabled: draft?.animationsEnabled ?? true,
      animationSpeed: draft?.animationSpeed ?? 1,
      lazyLoadEnabled: draft?.lazyLoadEnabled ?? true,
      darkModeEnabled: draft?.darkModeEnabled ?? false,
      spacingScale: draft?.spacingScale ?? 1,
      customCss: draft?.customCss,
      backgroundEffectSettings: defaultEffectSettings,
      cursorEffectSettings: defaultEffectSettings,
      textEffectSettings: defaultEffectSettings,
      motionSettings: defaultEffectSettings,
      mobileBrowserConfig: (draft?.mobileBrowserConfig ?? {}) as object,
      themeProvenance: {
        sourcePresetId: presetId,
        appliedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      preset: { id: presetId, name: preset.name },
      colors: preset.colors,
      cursor: preset.cursor ?? null,
      backgroundEffect: preset.backgroundEffect ?? null,
      textEffect: preset.textEffect ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to apply preset";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
