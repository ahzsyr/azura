import type { ResolvedSitePreloader } from "@/features/preloader/resolve-site-preloader";

/** Removes the inline boot-time preloader injected before React hydrates. */
export function removeBootPreloader(): void {
  if (typeof document === "undefined") return;
  document.getElementById("azura-boot-preloader")?.remove();
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

function escapeJsString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n");
}

function buildBootPreloaderStyleAttr(settings: ResolvedSitePreloader): string {
  const parts = [`--pre-anim-speed:${settings.animationSpeed}`];
  if (settings.backgroundColor.trim()) {
    parts.push(`--pre-bg:${settings.backgroundColor.trim()}`);
  }
  if (settings.primaryColor.trim()) {
    parts.push(`--pre-primary:${settings.primaryColor.trim()}`);
  }
  if (settings.accentColor.trim()) {
    parts.push(`--pre-accent:${settings.accentColor.trim()}`);
  }
  return parts.join(";");
}

function buildBootIconHtml(): string {
  return `<span class="pre-icon" aria-hidden>${LOADER_ICON_SVG}</span>`;
}

export function buildBootPreloaderCenterHtml(
  settings: ResolvedSitePreloader,
  logoUrl?: string | null,
): string {
  const resolvedLogo = logoUrl ?? settings.resolvedLogoUrl;

  switch (settings.centerType) {
    case "logo":
      if (resolvedLogo) {
        return `<div class="pre-svg" aria-hidden><img src="${escapeHtml(resolvedLogo)}" alt="" width="80" height="80" /></div>`;
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

export function buildPreloaderBootScript(
  settings: ResolvedSitePreloader,
  maxDurationMs: number,
  debug = false,
  logoUrl?: string | null,
): string {
  const debugPrefix = debug
    ? `(function(){var ep="http://127.0.0.1:7300/ingest/df4ee46a-c9a3-41ec-a748-5c05bd29eec9";var sid="9fed69";var log=function(msg,data,hid){var body=JSON.stringify({sessionId:sid,timestamp:Date.now(),location:"preloader-boot-script:inline",message:msg,data:data||{},hypothesisId:hid,runId:"post-fix"});fetch(ep,{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":sid},body:body}).catch(function(){});fetch("/api/debug/flash-probe",{method:"POST",headers:{"Content-Type":"application/json"},body:body}).catch(function(){});};`
    : `(function(){var log=function(){};`;

  const animation = escapeJsString(settings.animation);
  const styleAttr = escapeJsString(buildBootPreloaderStyleAttr(settings));
  const innerHtml = escapeJsString(buildBootPreloaderInnerHtml(settings, logoUrl));
  const ariaLabel = escapeJsString(settings.message.trim() || "Loading");

  return `${debugPrefix}(function(){var removeBoot=function(){var el=document.getElementById("azura-boot-preloader");if(el)el.remove();};var reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;if(reduced){log("boot skip reduced motion",{},"H5");removeBoot();document.documentElement.classList.remove("site-preloading");document.dispatchEvent(new CustomEvent("azura:shell-ready"));return;}document.documentElement.classList.add("site-preloading");log("site-preloading added",{perfNow:performance.now()},"H2");var boot=document.createElement("div");boot.id="azura-boot-preloader";boot.className="az-preloader az-preloader--fullscreen az-preloader--${animation}";boot.setAttribute("style","${styleAttr}");boot.setAttribute("role","status");boot.setAttribute("aria-live","polite");boot.setAttribute("aria-busy","true");boot.setAttribute("aria-label","${ariaLabel}");boot.innerHTML='${innerHtml}';document.body.appendChild(boot);var cleared=false;var clear=function(reason){if(cleared)return;cleared=true;log("boot safety clear",{reason:reason,perfNow:performance.now(),preloaderMounted:!!document.querySelector(".az-preloader:not(.hidden)")},"H2");removeBoot();document.documentElement.classList.remove("site-preloading");document.dispatchEvent(new CustomEvent("azura:shell-ready"));};setTimeout(function(){clear("max-timeout");},${maxDurationMs});})();})();`;
}
