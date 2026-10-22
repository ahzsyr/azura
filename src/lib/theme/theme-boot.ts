import {
  ADMIN_THEME_KEY,
  PRESET_COLORS_STORAGE_KEY,
  PRESET_EFFECTS_STORAGE_KEY,
  PRESET_ORIGIN_STORAGE_KEY,
  PRESET_STORAGE_KEY,
  PRESET_VISUAL_STORAGE_KEY,
  PUBLIC_THEME_KEY,
  USER_PRESETS_STORAGE_KEY,
} from "@/features/theme/engine/constants";
import { ALL_PRESETS } from "@/features/theme/presets-catalog";
import { getPresetMetricsBootPayload } from "./preset-metrics";
import type { BrowserProjection } from "./browser-chrome-projection";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BROWSER_CHROME_FALLBACK } from "./browser-chrome-projection";
import { PRELOADER_HARD_CAP_MS } from "@/lib/preloader/preloader-timing";

const PUBLISHED_PRESET_IDS = ALL_PRESETS.map((p) => p.id);

let themeInitSource: string | null = null;

/** public/theme-init.js, cached for the process. Inlined so Next does not preload the URL. */
function readThemeInitSource(): string {
  if (themeInitSource != null) return themeInitSource;
  const candidates = [
    join(process.cwd(), "public", "theme-init.js"),
    join(dirname(fileURLToPath(import.meta.url)), "../../../public/theme-init.js"),
  ];
  for (const path of candidates) {
    try {
      themeInitSource = readFileSync(path, "utf8").replace(/<\//g, "<\\/");
      return themeInitSource;
    } catch {
      /* try the next path */
    }
  }
  throw new Error("public/theme-init.js is missing");
}

/** Site Liquid Glass boot hints — paint data-glass-effect + CSS vars before hydration. */
export type ThemeBootGlassPayload = {
  enabled: boolean;
  intensity: number;
  opacity: number;
};

/** Serializable boot payload consumed by theme-init.js before hydration. */
export type ThemeBootPayload = {
  metricsKeys: readonly string[];
  metricsFieldMap: Record<string, string>;
  storageKeys: {
    publicTheme: string;
    adminTheme: string;
    presetId: string;
    presetColors: string;
    presetVisual: string;
    presetEffects: string;
    presetOrigin: string;
    userPresets: string;
  };
  /** Same colors as generateViewport theme-color — paints Safari anchors before hydration. */
  browserProjection: Pick<
    BrowserProjection,
    | "themeColorLight"
    | "themeColorDark"
    | "backgroundColor"
    | "chromeTintStyle"
    | "chromeTintOpacity"
    | "chromeGradientLight"
    | "chromeGradientDark"
    | "glassTintLight"
    | "glassTintDark"
  >;
  /** Site Liquid Glass — SSR attr + vars before React mounts the controller. */
  glassEffect: ThemeBootGlassPayload;
  /** Catalog ids allowed as intentional visitor personalization. */
  publishedPresetIds: readonly string[];
  /** Mirrors html[data-edge-to-edge] so the fixed layers match SSR. */
  edgeToEdge: "on" | "off";
  /** Mirrors html[data-has-site-header] from header visibility, before hydration. */
  hasSiteHeader: boolean;
};

export type ThemeBootOptions = {
  glassEffect?: ThemeBootGlassPayload;
  edgeToEdge?: "on" | "off";
  hasSiteHeader?: boolean;
};

const DEFAULT_GLASS_BOOT: ThemeBootGlassPayload = {
  enabled: false,
  intensity: 1,
  opacity: 0.45,
};

export function buildThemeBootPayload(
  projection: BrowserProjection = BROWSER_CHROME_FALLBACK,
  options: ThemeBootOptions = {},
): ThemeBootPayload {
  const { keys, fieldMap } = getPresetMetricsBootPayload();
  const glass = options.glassEffect ?? DEFAULT_GLASS_BOOT;
  return {
    metricsKeys: keys,
    metricsFieldMap: fieldMap,
    storageKeys: {
      publicTheme: PUBLIC_THEME_KEY,
      adminTheme: ADMIN_THEME_KEY,
      presetId: PRESET_STORAGE_KEY,
      presetColors: PRESET_COLORS_STORAGE_KEY,
      presetVisual: PRESET_VISUAL_STORAGE_KEY,
      presetEffects: PRESET_EFFECTS_STORAGE_KEY,
      presetOrigin: PRESET_ORIGIN_STORAGE_KEY,
      userPresets: USER_PRESETS_STORAGE_KEY,
    },
    browserProjection: {
      themeColorLight: projection.themeColorLight,
      themeColorDark: projection.themeColorDark,
      backgroundColor: projection.backgroundColor,
      chromeTintStyle: projection.chromeTintStyle,
      chromeTintOpacity: projection.chromeTintOpacity,
      chromeGradientLight: projection.chromeGradientLight,
      chromeGradientDark: projection.chromeGradientDark,
      glassTintLight: projection.glassTintLight,
      glassTintDark: projection.glassTintDark,
    },
    glassEffect: {
      enabled: glass.enabled === true,
      intensity: Number.isFinite(glass.intensity) ? glass.intensity : 1,
      opacity: Number.isFinite(glass.opacity) ? glass.opacity : 0.45,
    },
    publishedPresetIds: PUBLISHED_PRESET_IDS,
    edgeToEdge: options.edgeToEdge === "off" ? "off" : "on",
    hasSiteHeader: options.hasSiteHeader !== false,
  };
}

/**
 * Minimal inline script — sets window.__AZ_THEME_BOOT and paints Safari edge
 * anchors for the SSR appearance BEFORE first paint.
 *
 * Must NOT flip data-theme / .dark from localStorage here: that raced theme-init
 * (which then read the flipped value as "SSR") and caused React #418 remounts.
 * ThemeEngineProvider applies stored preference after hydrate.
 *
 * Also hydrates Liquid Glass attr + intensity/opacity CSS vars early.
 * theme-init.js is appended here. An external beforeInteractive src is preloaded
 * by React on every navigation and never executed again, which Chrome reports as
 * an unused preload.
 */
export function generateThemeBootInlineScript(
  projection: BrowserProjection = BROWSER_CHROME_FALLBACK,
  options: ThemeBootOptions = {},
): string {
  const payload = buildThemeBootPayload(projection, options);
  const light = JSON.stringify(projection.themeColorLight);
  const dark = JSON.stringify(projection.themeColorDark);
  const glassLight = JSON.stringify(projection.glassTintLight);
  const glassDark = JSON.stringify(projection.glassTintDark);
  return `window.__AZ_THEME_BOOT=${JSON.stringify(payload)};
(function(){try{
  var boot=window.__AZ_THEME_BOOT||{};
  var proj=boot.browserProjection||{};
  var glass=boot.glassEffect||{};
  var root=document.documentElement;
  try{if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){root.classList.add("site-preloading-done");root.classList.remove("site-preloading");root.setAttribute("data-page-transition","none");root.setAttribute("data-page-transition-enabled","false");}}catch(e){}
  // Freeze SSR appearance before any later script can overwrite data-theme.
  var ssr=root.getAttribute("data-ssr-theme")||root.getAttribute("data-theme")||"light";
  if(ssr!=="dark"&&ssr!=="light")ssr="light";
  root.setAttribute("data-ssr-theme",ssr);
  var color=ssr==="dark"?(proj.themeColorDark||${dark}):(proj.themeColorLight||${light});
  // Site glass fill is a surface-role tint — never mirror OS theme-color / page canvas.
  var glassTint=ssr==="dark"?(proj.glassTintDark||${glassDark}):(proj.glassTintLight||${glassLight});
  if(color){
    root.style.setProperty("--az-browser-chrome-tint",color);
    root.style.colorScheme=ssr;
    var top=document.getElementById("az-safari-chrome-top");
    var bottom=document.getElementById("az-safari-chrome-bottom");
    if(top)top.style.backgroundColor=color;
    if(bottom)bottom.style.backgroundColor=color;
  }
  if(glassTint){
    root.style.setProperty("--az-site-glass-tint",glassTint);
  }
  var tintStyle=proj.chromeTintStyle||"glass";
  if(tintStyle==="transparent"||tintStyle==="glass"||tintStyle==="solid"||tintStyle==="gradient"){
    root.setAttribute("data-chrome-tint-style",tintStyle);
  }
  if(boot.edgeToEdge==="on"||boot.edgeToEdge==="off"){
    root.setAttribute("data-edge-to-edge",boot.edgeToEdge);
  }
  if(boot.hasSiteHeader===true||boot.hasSiteHeader===false){
    root.setAttribute("data-has-site-header",boot.hasSiteHeader?"true":"false");
  }
  var tintOp=typeof proj.chromeTintOpacity==="number"?proj.chromeTintOpacity:0.7;
  if(tintOp<0)tintOp=0;if(tintOp>1)tintOp=1;
  root.style.setProperty("--az-chrome-tint-opacity",String(tintOp));
  // Do NOT write --az-chrome-tint-mix from browser opacity — site header fill
  // uses --az-site-glass-fill-alpha / CSS data-chrome-tint-style rules only.
  var gLight=proj.chromeGradientLight||"";
  var gDark=proj.chromeGradientDark||"";
  if(gLight)root.style.setProperty("--az-browser-chrome-gradient-light",gLight);
  if(gDark)root.style.setProperty("--az-browser-chrome-gradient-dark",gDark);
  var gActive=ssr==="dark"?(gDark||gLight):(gLight||gDark);
  if(gActive)root.style.setProperty("--az-browser-chrome-gradient",gActive);
  var ssrGlass=root.getAttribute("data-glass-effect");
  var glassOn=glass.enabled===true||ssrGlass==="liquid";
  root.setAttribute("data-glass-effect",glassOn?"liquid":"off");
  var gi=typeof glass.intensity==="number"?glass.intensity:1;
  var go=typeof glass.opacity==="number"?glass.opacity:0.45;
  root.style.setProperty("--glass-effect-intensity",String(gi));
  root.style.setProperty("--glass-effect-opacity",String(go));
  root.style.setProperty("--az-site-glass-fill-alpha",String(go));
  window.setTimeout(function(){try{if(!root.classList.contains("site-preloading-done")){root.classList.add("site-preloading-done");root.classList.remove("site-preloading");}}catch(e){}},${PRELOADER_HARD_CAP_MS});
}catch(e){}})();
${readThemeInitSource()}`;
}
