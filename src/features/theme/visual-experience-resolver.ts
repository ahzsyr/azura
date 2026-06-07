import type { PageVisualSettings } from "@/schemas/visual-settings";
import type { ThemeTokens } from "@/types/theme";

export type ResolvedVisualExperience = {
  cursorEffect: string | null;
  backgroundEffect: string | null;
  textEffect: string | null;
  animationsEnabled: boolean;
  cardStyle: string | null;
  borderStyle: string | null;
  cursorEnabled: boolean;
  backgroundEnabled: boolean;
  textEnabled: boolean;
};

type ResolveInput = {
  site: ThemeTokens;
  page?: PageVisualSettings | null;
};

function resolveEffectLayer(
  mode: "inherit" | "off" | "custom" | undefined,
  siteEnabled: boolean,
  siteValue: string | null,
  customValue: string | null | undefined,
): { enabled: boolean; value: string | null } {
  const effectiveMode = mode ?? "inherit";
  if (effectiveMode === "off") {
    return { enabled: false, value: null };
  }
  if (effectiveMode === "custom") {
    const value = customValue?.trim() || null;
    return { enabled: Boolean(value && value !== "none" && value !== "default"), value };
  }
  if (!siteEnabled) {
    return { enabled: false, value: null };
  }
  const value = siteValue?.trim() || null;
  if (!value || value === "none" || value === "default") {
    return { enabled: false, value: null };
  }
  return { enabled: true, value };
}

export function resolveVisualExperience({ site, page }: ResolveInput): ResolvedVisualExperience {
  const siteCursorEnabled = site.cursorEffectEnabled !== false;
  const siteBgEnabled = site.backgroundEffectEnabled !== false;
  const siteTextEnabled = site.textEffectEnabled !== false;

  const cursor = resolveEffectLayer(
    page?.siteEffects?.cursor,
    siteCursorEnabled,
    site.cursorEffect,
    page?.cursorEffect,
  );
  const background = resolveEffectLayer(
    page?.siteEffects?.background,
    siteBgEnabled,
    site.backgroundEffect,
    page?.backgroundEffect,
  );
  const text = resolveEffectLayer(
    page?.siteEffects?.text,
    siteTextEnabled,
    site.textEffect,
    page?.textEffect,
  );

  const animationsEnabled =
    page?.animationsEnabled === null || page?.animationsEnabled === undefined
      ? site.animationsEnabled
      : page.animationsEnabled;

  return {
    cursorEffect: cursor.enabled ? cursor.value : null,
    backgroundEffect: background.enabled ? background.value : null,
    textEffect: text.enabled ? text.value : null,
    animationsEnabled,
    cardStyle: site.cardStyle ?? null,
    borderStyle: site.borderStyle ?? null,
    cursorEnabled: cursor.enabled,
    backgroundEnabled: background.enabled,
    textEnabled: text.enabled,
  };
}

export function resolveBlockHeadingTextEffect(
  blockVisual: { headingTextEffect?: string; textEffect?: string | null; siteEffects?: { text?: string } } | null | undefined,
  siteTextEffect: string | null,
): string | null {
  const mode = blockVisual?.siteEffects?.text ?? "inherit";
  const heading = blockVisual?.headingTextEffect;

  if (heading && heading !== "inherit") {
    if (heading === "none") return null;
    return heading;
  }

  if (mode === "off") return null;
  if (mode === "custom") {
    const v = blockVisual?.textEffect?.trim();
    return v && v !== "none" ? v : null;
  }
  return siteTextEffect;
}
