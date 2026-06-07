/** Update the address bar without triggering a Next.js RSC navigation (keeps client form state). */
export function replaceBrowserUrl(url: string) {
  if (typeof window === "undefined") return;
  window.history.replaceState(window.history.state, "", url);
}
