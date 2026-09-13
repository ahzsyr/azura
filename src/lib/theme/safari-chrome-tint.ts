/**
 * Safari 26+ (iOS) ignores `<meta name="theme-color">` and samples
 * fixed/sticky edge backgrounds instead. Keep a CSS var + edge anchors
 * in sync with the Theme Color projection so Liquid Glass toolbars match.
 *
 * Spec still uses theme-color for Chromium; this layer is Safari-only paint.
 */
export const SAFARI_CHROME_TINT_VAR = "--az-browser-chrome-tint";
export const SAFARI_CHROME_TINT_LIGHT_VAR = "--az-browser-chrome-tint-light";
export const SAFARI_CHROME_TINT_DARK_VAR = "--az-browser-chrome-tint-dark";
export const SAFARI_CHROME_TOP_ID = "az-safari-chrome-top";
export const SAFARI_CHROME_BOTTOM_ID = "az-safari-chrome-bottom";

export type SyncSafariChromeTintOptions = {
  lightColor?: string;
  darkColor?: string;
};

function ensureTintAnchor(id: string, edge: "top" | "bottom"): HTMLElement | null {
  if (typeof document === "undefined") return null;
  let el = document.getElementById(id);
  if (el) return el;
  el = document.createElement("div");
  el.id = id;
  el.setAttribute("aria-hidden", "true");
  el.setAttribute("data-safari-chrome-tint", edge);
  document.body?.appendChild(el);
  return el;
}

function setRootVar(root: HTMLElement, name: string, value: string): void {
  if (root.style.getPropertyValue(name) !== value) {
    root.style.setProperty(name, value);
  }
}

/**
 * Project the active Theme Color onto Safari-sampled paint surfaces.
 * Inline anchor colors so tint updates in the same frame as appearance flips
 * (CSS-var-only updates can lag a frame behind header paint).
 */
export function syncSafariChromeTint(
  color: string,
  options?: SyncSafariChromeTintOptions,
): void {
  if (typeof document === "undefined") return;
  const tint = color.trim();
  if (!tint) return;

  const root = document.documentElement;
  setRootVar(root, SAFARI_CHROME_TINT_VAR, tint);

  const light = options?.lightColor?.trim();
  const dark = options?.darkColor?.trim();
  if (light) setRootVar(root, SAFARI_CHROME_TINT_LIGHT_VAR, light);
  if (dark) setRootVar(root, SAFARI_CHROME_TINT_DARK_VAR, dark);

  if (!document.body) return;
  const top = ensureTintAnchor(SAFARI_CHROME_TOP_ID, "top");
  const bottom = ensureTintAnchor(SAFARI_CHROME_BOTTOM_ID, "bottom");
  if (top?.style && top.style.backgroundColor !== tint) {
    top.style.backgroundColor = tint;
  }
  if (bottom?.style && bottom.style.backgroundColor !== tint) {
    bottom.style.backgroundColor = tint;
  }
}
