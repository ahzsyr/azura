"use client";

/** Warm the search modal chunk before the first open (pointerdown / hover). */
let prefetched = false;

export function prefetchSearchModal(): void {
  if (prefetched || typeof window === "undefined") return;
  prefetched = true;
  void import("@/capabilities/search/components/search-command");
}

export function requestOpenSearch(): void {
  prefetchSearchModal();
  document.dispatchEvent(new CustomEvent("sm:open-search", { bubbles: true }));
}
