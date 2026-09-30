import type { LocaleBootPayload } from "@/lib/locale-boot/locale-boot-payload";

/** Apply locale shell boot hooks after React hydration (never before). */
export function applyLocaleBoot(payload: LocaleBootPayload): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const body = document.body;

  if (payload.lang) root.lang = payload.lang;
  if (payload.dir) root.dir = payload.dir;
  if (payload.locale) root.setAttribute("data-locale", payload.locale);
  else root.removeAttribute("data-locale");

  const visitor = root.getAttribute("data-visitor-theme-bootstrapped") === "true";
  if (!visitor) {
    if (payload.primary) {
      root.style.setProperty("--primary", payload.primary);
      root.style.setProperty("--p", "var(--primary)");
      root.style.setProperty("--color-primary", payload.primary);
      root.style.setProperty("--az-color-primary", payload.primary);
    }
    if (payload.accent) {
      root.style.setProperty("--accent", payload.accent);
      root.style.setProperty("--a", "var(--accent)");
      root.style.setProperty("--color-accent", payload.accent);
      root.style.setProperty("--az-color-accent", payload.accent);
    }
  }

  const attrs = payload.htmlAttributes ?? {};
  if (!visitor) {
    for (const key of Object.keys(attrs)) {
      if (!key.startsWith("data-")) continue;
      if (key === "data-theme" || key === "data-theme-mode") continue;
      root.setAttribute(key, attrs[key]!);
    }

    if (body) {
      const bg = attrs["data-preset-background"];
      if (bg) body.setAttribute("data-bg-effect", bg);
      const cursorOn = attrs["data-site-cursor-effects"] === "on";
      const cursorId = payload.cursorEffect;
      if (cursorOn && cursorId && cursorId !== "default" && cursorId !== "none") {
        body.setAttribute("data-cursor", cursorId);
      } else if (!cursorOn) {
        body.removeAttribute("data-cursor");
      }
    }
  }

  const ptAttrs = payload.pageTransition?.attrs ?? {};
  for (const key of Object.keys(ptAttrs)) {
    root.setAttribute(key, ptAttrs[key]!);
  }

  const ptVars = payload.pageTransition?.vars ?? {};
  for (const key of Object.keys(ptVars)) {
    root.style.setProperty(key, ptVars[key]!);
  }

  const maxMs =
    typeof payload.preloaderMaxMs === "number" && payload.preloaderMaxMs > 0
      ? payload.preloaderMaxMs
      : 4000;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const hideBoot = () => {
    root.classList.add("site-preloading-done");
    root.classList.remove("site-preloading");
  };

  if (reduced || !payload.preloaderActive) {
    hideBoot();
    document.dispatchEvent(new CustomEvent("azura:shell-ready"));
    return;
  }

  root.classList.add("site-preloading");
  window.setTimeout(() => {
    hideBoot();
    document.dispatchEvent(new CustomEvent("azura:shell-ready"));
  }, maxMs);
}
