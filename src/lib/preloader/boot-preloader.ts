import type { CSSProperties } from "react";
import { normalizeLocalMediaUrl } from "@/lib/config/next-image";
import type { ResolvedSitePreloader } from "@/features/preloader/resolve-site-preloader";

/** Hides the SSR boot preloader without removing it from the React tree. */
export function removeBootPreloader(): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.add("site-preloading-done");
  document.documentElement.classList.remove("site-preloading");
  const el = document.getElementById("azura-boot-preloader");
  if (!el) return;
  el.classList.add("hidden");
  el.setAttribute("aria-hidden", "true");
  el.setAttribute("aria-busy", "false");
}

const LOADER_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Server-safe preloader CSS variables (shared with client PreloaderView). */
export function buildPreloaderStyle(settings: ResolvedSitePreloader): CSSProperties {
  const style: CSSProperties & Record<string, string> = {
    "--pre-anim-speed": String(settings.animationSpeed),
  };
  if (settings.backgroundColor.trim()) {
    style["--pre-bg"] = settings.backgroundColor.trim();
  }
  if (settings.primaryColor.trim()) {
    style["--pre-primary"] = settings.primaryColor.trim();
  }
  if (settings.accentColor.trim()) {
    style["--pre-accent"] = settings.accentColor.trim();
  }
  return style;
}

function buildBootIconHtml(): string {
  return `<span class="pre-icon" aria-hidden>${LOADER_ICON_SVG}</span>`;
}

/** CSS-mask tint matching BrandLogoImage so the boot overlay tracks --primary. */
export function buildBootTintedLogoHtml(src: string, width = 80, height = 80): string {
  const normalized = normalizeLocalMediaUrl(src);
  const escapedSrc = escapeHtml(normalized);
  const mask = `url(${escapeHtml(JSON.stringify(normalized))})`;
  return `<div class="pre-svg" aria-hidden style="--pre-logo-mask:${mask}"><span class="brand-logo-tint" role="img" aria-hidden="true" data-skip-img-fade><img src="${escapedSrc}" alt="" width="${width}" height="${height}" class="brand-logo-tint__sizer" decoding="async" draggable="false" /></span></div>`;
}

export function buildBootPreloaderCenterHtml(
  settings: ResolvedSitePreloader,
  logoUrl?: string | null,
): string {
  const resolvedLogo = logoUrl ?? settings.resolvedLogoUrl;

  switch (settings.centerType) {
    case "logo":
      if (resolvedLogo) {
        return buildBootTintedLogoHtml(resolvedLogo);
      }
      if (settings.centerText.trim()) {
        return `<span class="pre-text">${escapeHtml(settings.centerText.trim())}</span>`;
      }
      return buildBootIconHtml();
    case "text":
      return `<span class="pre-text">${escapeHtml(settings.centerText.trim() || "Loading")}</span>`;
    case "emoji":
      return `<span class="pre-emoji">${escapeHtml(settings.centerEmoji || "✨")}</span>`;
    case "icon":
      return buildBootIconHtml();
    case "svg":
      if (settings.centerSvgUrl.trim()) {
        return `<div class="pre-svg" aria-hidden><img src="${escapeHtml(settings.centerSvgUrl.trim())}" alt="" /></div>`;
      }
      return `<span class="pre-emoji">${escapeHtml(settings.centerEmoji || "✨")}</span>`;
    default:
      return buildBootIconHtml();
  }
}

export function buildBootPreloaderInnerHtml(
  settings: ResolvedSitePreloader,
  logoUrl?: string | null,
): string {
  const center = buildBootPreloaderCenterHtml(settings, logoUrl);
  const message = settings.message.trim()
    ? `<p class="pre-message">${escapeHtml(settings.message.trim())}</p>`
    : "";
  return `<div class="pre-bg" aria-hidden></div><div class="pre-stage"><div class="pre-center">${center}</div>${message}</div>`;
}
