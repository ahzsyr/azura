import {
  ADMIN_THEME_KEY,
  PRESET_COLORS_STORAGE_KEY,
  PRESET_EFFECTS_STORAGE_KEY,
  PRESET_STORAGE_KEY,
  PRESET_VISUAL_STORAGE_KEY,
  PUBLIC_THEME_KEY,
} from "@/features/theme/engine/constants";
import { getPresetMetricsBootPayload } from "./preset-metrics";
import type { BrowserProjection } from "./browser-chrome-projection";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BROWSER_CHROME_FALLBACK } from "./browser-chrome-projection";
import { PRELOADER_HARD_CAP_MS } from "@/lib/preloader/preloader-timing";

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
  };
  /** Same colors as generateViewport theme-color — paints Safari anchors before hydration. */
  browserProjection: Pick<
    BrowserProjection,
    "themeColorLight" | "themeColorDark" | "backgroundColor"
  >;
  /** Site Liquid Glass — SSR attr + vars before React mounts the controller. */
  glassEffect: ThemeBootGlassPayload;
};

export type ThemeBootOptions = {
  glassEffect?: ThemeBootGlassPayload;
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
    },
    browserProjection: {
      themeColorLight: projection.themeColorLight,
      themeColorDark: projection.themeColorDark,
      backgroundColor: projection.backgroundColor,
    },
    glassEffect: {
      enabled: glass.enabled === true,
      intensity: Number.isFinite(glass.intensity) ? glass.intensity : 1,
      opacity: Number.isFinite(glass.opacity) ? glass.opacity : 0.45,
    },
  };
}

/**
 * Minimal inline script — sets window.__AZ_THEME_BOOT and paints Safari edge
 * anchors from localStorage / OS preference BEFORE first paint (not SSR-only
 * data-theme, which is often stuck on "light" for system mode).
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
  return `window.__AZ_THEME_BOOT=${JSON.stringify(payload)};
(function(){try{
  var boot=window.__AZ_THEME_BOOT||{};
  var proj=boot.browserProjection||{};
  var sk=boot.storageKeys||{};
  var glass=boot.glassEffect||{};
  var root=document.documentElement;
  try{if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){root.classList.add("site-preloading-done");root.classList.remove("site-preloading");root.setAttribute("data-page-transition","none");root.setAttribute("data-page-transition-enabled","false");}}catch(e){}
  var path=location.pathname||"";
  var isAdmin=path.indexOf("/admin")===0;
  var modeKey=isAdmin?(sk.adminTheme||"admin-theme"):(sk.publicTheme||"devi-theme-mode");
  var stored=null;
  try{stored=localStorage.getItem(modeKey);}catch(e){}
  var ssr=root.getAttribute("data-theme")||"light";
  var mode=ssr;
  if(stored==="dark"||stored==="light")mode=stored;
  else if(stored==="system"||(!stored&&root.getAttribute("data-theme-mode")==="system")){
    mode=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";
  }
  var color=mode==="dark"?(proj.themeColorDark||${dark}):(proj.themeColorLight||${light});
  if(color){
    root.style.setProperty("--az-browser-chrome-tint",color);
    root.style.setProperty("--az-site-glass-tint",color);
    root.style.colorScheme=mode;
    if(mode==="dark"){root.classList.add("dark");root.setAttribute("data-theme","dark");}
    else{root.classList.remove("dark");root.setAttribute("data-theme","light");}
    var top=document.getElementById("az-safari-chrome-top");
    var bottom=document.getElementById("az-safari-chrome-bottom");
    if(top)top.style.backgroundColor=color;
    if(bottom)bottom.style.backgroundColor=color;
  }
  var ssrGlass=root.getAttribute("data-glass-effect");
  var glassOn=glass.enabled===true||ssrGlass==="liquid";
  root.setAttribute("data-glass-effect",glassOn?"liquid":"off");
  var gi=typeof glass.intensity==="number"?glass.intensity:1;
  var go=typeof glass.opacity==="number"?glass.opacity:0.45;
  root.style.setProperty("--glass-effect-intensity",String(gi));
  root.style.setProperty("--glass-effect-opacity",String(go));
  window.setTimeout(function(){try{if(!root.classList.contains("site-preloading-done")){root.classList.add("site-preloading-done");root.classList.remove("site-preloading");}}catch(e){}},${PRELOADER_HARD_CAP_MS});
}catch(e){}})();
${readThemeInitSource()}`;
}
