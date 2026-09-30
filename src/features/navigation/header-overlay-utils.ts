/** Client-safe helpers for header overlay (avoid importing builder from navigation). */

export function isBoxedHeaderStyle(headerStyle: string | undefined): boolean {
  return Boolean(headerStyle?.startsWith("boxed-"));
}

/**
 * Live storefront header — skips the hidden SSR shell (`data-header-shell`).
 * Duplicate `#headerRoot` ids used to make getElementById target the placeholder,
 * so shrink/sticky classes never reached the visible header.
 */
export function getLiveHeaderRoot(doc: Document = document): HTMLElement | null {
  const live = doc.querySelector<HTMLElement>(
    "#headerRoot:not([data-header-shell]), .header-root:not([data-header-shell])",
  );
  if (live) return live;
  return doc.getElementById("headerRoot") ?? doc.querySelector<HTMLElement>(".header-root");
}

export function readBlockHeaderOverlayActive(): boolean {
  if (typeof document === "undefined") return false;
  const html = document.documentElement.getAttribute("data-block-header-overlay") === "true";
  const root = getLiveHeaderRoot()?.getAttribute("data-block-header-overlay") === "true";
  const pageMarker = document.querySelector('[data-page-header-overlay="true"]') != null;
  return html || root || pageMarker;
}
