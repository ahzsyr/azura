import type {
  BlockEffectOverrides,
  EffectRuntimeConfig,
  InheritanceMode,
  PageEffectOverrides,
  SiteEffectSource,
} from "./types";

function normalizeMode(mode: InheritanceMode | undefined): InheritanceMode {
  if (mode === "disabled") return "off";
  if (mode === "override") return "custom";
  return mode ?? "inherit";
}

function resolveLayer(
  mode: InheritanceMode | undefined,
  siteEnabled: boolean,
  siteValue: string | null,
  customValue: string | null | undefined,
): { enabled: boolean; effectId: string | null } {
  const effectiveMode = normalizeMode(mode);

  if (effectiveMode === "off") {
    return { enabled: false, effectId: null };
  }

  if (effectiveMode === "custom") {
    const value = customValue?.trim() || null;
    const active = Boolean(value && value !== "none" && value !== "default");
    return { enabled: active, effectId: active ? value : null };
  }

  if (!siteEnabled) {
    return { enabled: false, effectId: null };
  }

  const value = siteValue?.trim() || null;
  if (!value || value === "none" || value === "default") {
    return { enabled: false, effectId: null };
  }

  return { enabled: true, effectId: value };
}

/** Resolve site → page effect inheritance into a plain runtime config. */
export function resolvePageEffectConfig(
  site: SiteEffectSource,
  page?: PageEffectOverrides | null,
  options?: { glassOverlay?: boolean },
): EffectRuntimeConfig {
  const cursor = resolveLayer(
    page?.siteEffects?.cursor,
    site.cursorEnabled,
    site.cursorEffect,
    page?.cursorEffect,
  );
  const background = resolveLayer(
    page?.siteEffects?.background,
    site.backgroundEnabled,
    site.backgroundEffect,
    page?.backgroundEffect,
  );
  const text = resolveLayer(
    page?.siteEffects?.text,
    site.textEnabled,
    site.textEffect,
    page?.textEffect,
  );

  const animationsEnabled =
    page?.animationsEnabled === null || page?.animationsEnabled === undefined
      ? site.animationsEnabled
      : page.animationsEnabled;

  return {
    cursor,
    background,
    text,
    animationsEnabled,
    glassOverlay: options?.glassOverlay ?? false,
  };
}

/** Resolve block-level text effect against site/page defaults. */
export function resolveBlockTextEffect(
  block: BlockEffectOverrides | null | undefined,
  inheritedTextEffect: string | null,
): string | null {
  const mode = block?.siteEffects?.text ?? "inherit";
  const heading = block?.headingTextEffect;

  if (heading && heading !== "inherit") {
    return heading === "none" ? null : heading;
  }

  if (mode === "off" || mode === "disabled") return null;

  if (mode === "custom" || mode === "override") {
    const value = block?.textEffect?.trim();
    return value && value !== "none" ? value : null;
  }

  return inheritedTextEffect;
}

/** Map legacy ResolvedVisualExperience shape to EffectRuntimeConfig. */
export function mapVisualExperienceToEffectConfig(input: {
  cursorEffect: string | null;
  backgroundEffect: string | null;
  textEffect: string | null;
  animationsEnabled: boolean;
  cursorEnabled: boolean;
  backgroundEnabled: boolean;
  textEnabled: boolean;
  cardStyle?: string | null;
}): EffectRuntimeConfig {
  return {
    cursor: {
      enabled: input.cursorEnabled,
      effectId: input.cursorEffect,
    },
    background: {
      enabled: input.backgroundEnabled,
      effectId: input.backgroundEffect,
    },
    text: {
      enabled: input.textEnabled,
      effectId: input.textEffect,
    },
    animationsEnabled: input.animationsEnabled,
    glassOverlay: input.cardStyle === "glassmorphism" || input.cardStyle === "liquid-glass",
  };
}
