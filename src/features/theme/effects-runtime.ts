import { applyEffectSettingsCssVars } from "@/features/theme/apply-effect-settings-css-vars";
import {
  applyGlassSiteOverlay,
  applySiteBackground,
} from "@/features/theme/backgrounds/background-system";
import { getCapabilities } from "@/lib/theme/effects/capability-engine";
import { initCursor } from "@/features/theme/effects/cursors";
import { initTextEffects, resetTextEffects } from "@/features/theme/effects/text";
import {
  SITE_TEXT_EFFECT_SOURCE_ATTR,
  SITE_TEXT_EFFECT_SOURCE_VALUE,
  SITE_TEXT_EFFECT_TARGET_SELECTOR,
} from "@/features/theme/hero-heading-attrs";
import type { ResolvedVisualExperience } from "@/features/theme/visual-experience-resolver";

const SITE_TEXT_EFFECT_SOURCE = SITE_TEXT_EFFECT_SOURCE_ATTR;

const HERO_HEADING_SELECTOR = SITE_TEXT_EFFECT_TARGET_SELECTOR;

let lastAppliedAppearance: ResolvedAppearance | null = null;
let lastTextEffectSignature: string | null = null;

type ResolvedAppearance = "light" | "dark";

function currentDocumentAppearance(): ResolvedAppearance {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function clearSiteTaggedHeroTextEffects(): void {
  document
    .querySelectorAll<HTMLElement>(`[${SITE_TEXT_EFFECT_SOURCE}="${SITE_TEXT_EFFECT_SOURCE_VALUE}"]`)
    .forEach((el) => {
      el.removeAttribute("data-text-effect");
      el.removeAttribute(SITE_TEXT_EFFECT_SOURCE);
    });
}

function clearBlockTaggedTextEffects(): void {
  document
    .querySelectorAll<HTMLElement>(`[${SITE_TEXT_EFFECT_SOURCE}="block"]`)
    .forEach((el) => {
      el.removeAttribute("data-text-effect");
      el.removeAttribute(SITE_TEXT_EFFECT_SOURCE);
    });
}

function tagHeroHeadings(textEffect: string | null) {
  // Clear previously block-tagged headings so re-tagging is always fresh.
  clearBlockTaggedTextEffects();

  document.querySelectorAll("[data-block-heading-effect]").forEach((blockEl) => {
    if (blockEl.hasAttribute("data-text-effect-off")) return;
    const effect = blockEl.getAttribute("data-block-heading-effect");
    if (!effect) return;
    // Tag actual heading nodes inside the block — never the block shell itself.
    // Putting data-text-effect on the shell causes glitch/CSS effects to operate
    // on the entire section's textContent, creating offset accent-colored ghost layers.
    blockEl
      .querySelectorAll<HTMLElement>('h1, h2, h3, h4, [data-text-effect-target="heading"]')
      .forEach((heading) => {
        if (heading.hasAttribute("data-text-effect-off")) return;
        if (heading.closest("[data-text-effect-off]")) return;
        heading.setAttribute("data-text-effect", effect);
        heading.setAttribute(SITE_TEXT_EFFECT_SOURCE, "block");
      });
  });

  if (!textEffect || textEffect === "none") {
    clearSiteTaggedHeroTextEffects();
    return;
  }

  document.querySelectorAll(HERO_HEADING_SELECTOR).forEach((el) => {
    if (el.hasAttribute("data-text-effect-off")) return;
    if (el.closest("[data-text-effect-off]")) return;
    if (el.classList.contains("hero-anim-typewriter")) return;
    const explicit = el.getAttribute("data-text-effect");
    const source = el.getAttribute(SITE_TEXT_EFFECT_SOURCE);
    if (source === "block") return;
    if (
      source === SITE_TEXT_EFFECT_SOURCE_VALUE &&
      explicit &&
      explicit !== "inherit"
    ) {
      return;
    }
    if (!explicit || explicit === "inherit") {
      el.setAttribute("data-text-effect", textEffect);
      el.setAttribute(SITE_TEXT_EFFECT_SOURCE, SITE_TEXT_EFFECT_SOURCE_VALUE);
    }
  });
}

function isGlassCardStyle(cardStyle: string | null | undefined): boolean {
  return cardStyle === "glassmorphism" || cardStyle === "liquid-glass";
}

function buildTextEffectSignature(
  textEffect: string | null | undefined,
  animationsEnabled: boolean,
  allowTextAnimation: boolean,
): string {
  return animationsEnabled && allowTextAnimation && textEffect && textEffect !== "none"
    ? textEffect
    : "none";
}

export type ApplyVisualEffectsOptions = {
  /** Skip canvas/cursor/text remount — appearance color refresh only. */
  colorsOnly?: boolean;
};

/** Apply pre-resolved visual experience (direct DOM/canvas — learn parity). */
export function applyVisualEffects(
  resolved: ResolvedVisualExperience,
  options?: ApplyVisualEffectsOptions,
) {
  if (typeof document === "undefined") return;

  const html = document.documentElement;
  const body = document.body;
  const {
    backgroundEffect,
    textEffect,
    animationsEnabled,
    cardStyle,
    backgroundEnabled,
    cursorEnabled,
  } = resolved;
  const cursorEffect = cursorEnabled ? resolved.cursorEffect : null;

  const appearance = currentDocumentAppearance();
  const appearanceChanged =
    lastAppliedAppearance !== null && lastAppliedAppearance !== appearance;

  if (options?.colorsOnly) {
    applyEffectSettingsCssVars(resolved);
    lastAppliedAppearance = appearance;
    return;
  }

  applyEffectSettingsCssVars(resolved);

  const { policy } = getCapabilities();
  const textEffectSignature = buildTextEffectSignature(
    textEffect,
    animationsEnabled,
    policy.allowTextAnimation,
  );
  const textEffectChanged = lastTextEffectSignature !== textEffectSignature;

  if (textEffectChanged) {
    resetTextEffects();
  }

  if (cardStyle) {
    html.dataset.cardStyle = cardStyle;
  } else {
    delete html.dataset.cardStyle;
  }

  const borderStyle = resolved.borderStyle;
  if (borderStyle) {
    html.dataset.borderStyle = borderStyle;
  } else {
    delete html.dataset.borderStyle;
  }

  if (textEffect) {
    html.dataset.textEffectTheme = textEffect;
  } else {
    delete html.dataset.textEffectTheme;
  }

  html.dataset.siteCursorEffects =
    cursorEffect && cursorEffect !== "default" && cursorEffect !== "none" ? "on" : "off";

  if (cursorEffect) {
    body.dataset.cursor = cursorEffect;
  } else {
    delete body.dataset.cursor;
  }

  applyGlassSiteOverlay(isGlassCardStyle(cardStyle));

  lastAppliedAppearance = appearance;

  // Site canvas lifecycle is owned by SiteBackgroundLayer — sync body dataset only.
  if (backgroundEnabled && backgroundEffect && backgroundEffect !== "none") {
    applySiteBackground(backgroundEffect, {
      animationsEnabled,
      force: appearanceChanged,
    });
  } else {
    applySiteBackground("none", { force: appearanceChanged });
  }

  if (
    animationsEnabled &&
    policy.allowCustomCursor &&
    cursorEffect &&
    cursorEffect !== "default" &&
    cursorEffect !== "none"
  ) {
    initCursor(cursorEffect);
  } else {
    initCursor("default");
  }

  tagHeroHeadings(textEffect);
  if (textEffect && textEffect !== "none" && animationsEnabled && policy.allowTextAnimation) {
    initTextEffects(textEffect);
  }
  lastTextEffectSignature = textEffectSignature;
}

/** Re-tag and apply text effects for targets mounted after the initial effects pass. */
export function rescanTextEffects(
  textEffect: string | null | undefined,
  animationsEnabled = true,
): void {
  if (typeof document === "undefined") return;
  if (!textEffect || textEffect === "none" || !animationsEnabled) return;
  const { policy } = getCapabilities();
  if (!policy.allowTextAnimation) return;
  tagHeroHeadings(textEffect);
  initTextEffects(textEffect);
}

export function clearVisualEffects() {
  if (typeof document === "undefined") return;
  lastAppliedAppearance = null;
  lastTextEffectSignature = null;
  resetTextEffects();
  clearSiteTaggedHeroTextEffects();
  clearBlockTaggedTextEffects();
  applySiteBackground("none", { force: true });
  applyGlassSiteOverlay(false);
  initCursor("default");
  delete document.body.dataset.cursor;
  delete document.body.dataset.bgEffect;
  delete document.documentElement.dataset.textEffectTheme;
  delete document.documentElement.dataset.siteCursorEffects;
  delete document.documentElement.dataset.cardStyle;
  delete document.documentElement.dataset.borderStyle;
}
