import {
  applyGlassSiteOverlay,
  applySiteBackground,
} from "@/features/theme/backgrounds/background-system";
import { initCursor } from "@/features/theme/effects/cursors";
import { initTextEffects, resetTextEffects } from "@/features/theme/effects/text";
import {
  SITE_TEXT_EFFECT_SOURCE_ATTR,
  SITE_TEXT_EFFECT_SOURCE_VALUE,
} from "@/features/theme/hero-heading-attrs";
import type { ResolvedVisualExperience } from "@/features/theme/visual-experience-resolver";

const SITE_TEXT_EFFECT_SOURCE = SITE_TEXT_EFFECT_SOURCE_ATTR;

const HERO_HEADING_SELECTOR =
  '[data-block-type="hero"] h1, [data-block-type="hero"] h2, [data-hero-title], [data-text-effect-target="heading"]';

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

export function applyVisualEffects(resolved: ResolvedVisualExperience) {
  const html = document.documentElement;
  const body = document.body;
  const {
    cursorEffect,
    backgroundEffect,
    textEffect,
    animationsEnabled,
    cardStyle,
    backgroundEnabled,
  } = resolved;

  resetTextEffects();

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

  applyGlassSiteOverlay(cardStyle === "glassmorphism");

  if (backgroundEnabled && backgroundEffect && backgroundEffect !== "none") {
    applySiteBackground(backgroundEffect, { animationsEnabled });
  } else {
    applySiteBackground("none");
  }

  if (animationsEnabled && cursorEffect && cursorEffect !== "default" && cursorEffect !== "none") {
    initCursor(cursorEffect);
  } else {
    initCursor("default");
  }

  tagHeroHeadings(textEffect);
  if (textEffect && textEffect !== "none" && animationsEnabled) {
    initTextEffects(textEffect);
  }
}

export function clearVisualEffects() {
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
