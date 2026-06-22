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

function tagHeroHeadings(textEffect: string | null) {
  document.querySelectorAll("[data-block-heading-effect]").forEach((el) => {
    if (el.hasAttribute("data-text-effect-off")) return;
    const effect = el.getAttribute("data-block-heading-effect");
    if (effect) {
      el.setAttribute("data-text-effect", effect);
      el.setAttribute(SITE_TEXT_EFFECT_SOURCE, "block");
    }
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
): string {
  return animationsEnabled && textEffect && textEffect !== "none"
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
    lastAppliedAppearance = appearance;
    return;
  }

  const textEffectSignature = buildTextEffectSignature(textEffect, animationsEnabled);
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

  const { policy } = getCapabilities();
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

  const allowCustomCursor = policy.allowCustomCursor;
  if (
    animationsEnabled &&
    allowCustomCursor &&
    cursorEffect &&
    cursorEffect !== "default" &&
    cursorEffect !== "none"
  ) {
    initCursor(cursorEffect);
  } else {
    initCursor("default");
  }

  tagHeroHeadings(textEffect);
  if (textEffect && textEffect !== "none" && animationsEnabled) {
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
  tagHeroHeadings(textEffect);
  initTextEffects(textEffect);
}

export function clearVisualEffects() {
  if (typeof document === "undefined") return;
  lastAppliedAppearance = null;
  lastTextEffectSignature = null;
  resetTextEffects();
  clearSiteTaggedHeroTextEffects();
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
