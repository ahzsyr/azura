/** Client-safe helpers for header overlay (avoid importing builder from navigation). */

export function isBoxedHeaderStyle(headerStyle: string | undefined): boolean {
  return Boolean(headerStyle?.startsWith("boxed-"));
}

export function readBlockHeaderOverlayActive(): boolean {
  if (typeof document === "undefined") return false;
  const html = document.documentElement.getAttribute("data-block-header-overlay") === "true";
  const root =
    document.getElementById("headerRoot")?.getAttribute("data-block-header-overlay") === "true";
  const pageMarker = document.querySelector('[data-page-header-overlay="true"]') != null;
  return html || root || pageMarker;
}
