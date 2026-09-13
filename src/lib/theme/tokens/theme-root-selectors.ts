/**
 * Published theme CSS must match or beat globals.css fallbacks.
 *
 * globals.css uses unlayered `:root` / `.dark` (specificity 0,1,0).
 * A bare `html` block (0,0,1) loses in light mode; `html.dark` (0,1,1) wins in dark.
 * Using `:root, html` / `:root.dark, html.dark` keeps light and dark in sync with the active preset.
 */
export const THEME_ROOT_SELECTOR = ":root, html";
export const THEME_ROOT_DARK_SELECTOR = ":root.dark, html.dark";

/**
 * Rewrite published theme / preset CSS so variables apply to a scoped preview root
 * (Theme Studio light/dark toggle) instead of the document element.
 */
export function scopeThemeCssToSelector(css: string, scope: string): string {
  if (!css.trim()) return css;
  return css
    .replaceAll(THEME_ROOT_DARK_SELECTOR, `${scope}.dark`)
    .replaceAll("html.dark", `${scope}.dark`)
    .replaceAll(":root.dark", `${scope}.dark`)
    .replaceAll(THEME_ROOT_SELECTOR, scope)
    .replaceAll(":root", scope)
    .replace(/(^|})\s*html(?=[\s{.[:#])/gm, `$1${scope}`);
}
