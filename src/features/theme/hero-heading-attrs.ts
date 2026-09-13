export const SITE_TEXT_EFFECT_SOURCE_ATTR = "data-text-effect-source";
export const SITE_TEXT_EFFECT_SOURCE_VALUE = "site";

/** DOM targets that inherit the site-wide text effect (hero headings + header brand). */
export const SITE_TEXT_EFFECT_TARGET_SELECTOR =
  '[data-block-type="hero"] h1, [data-block-type="hero"] h2, [data-hero-title], [data-text-effect-target="heading"], [data-text-effect-target="brand"]';

/** SSR-safe attrs for site-wide text effect targets (matches effects-runtime tagging). */
export function siteHeroHeadingAttrs(
  textEffect: string | null | undefined,
): Record<string, string> | undefined {
  if (!textEffect || textEffect === "none") return undefined;
  return {
    "data-text-effect": textEffect,
    [SITE_TEXT_EFFECT_SOURCE_ATTR]: SITE_TEXT_EFFECT_SOURCE_VALUE,
  };
}
