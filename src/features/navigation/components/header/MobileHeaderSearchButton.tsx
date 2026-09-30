"use client";

import { requestOpenSearch, prefetchSearchModal } from "@/capabilities/search/components/search-prefetch";

type Props = {
  label?: string;
  iconClass?: string;
};

/** Compact search control pinned in the mobile header bar (next to the menu trigger). */
export function MobileHeaderSearchButton({
  label = "Search",
  iconClass = "fa-search",
}: Props) {
  return (
    <button
      type="button"
      className="mobile-search-btn"
      aria-label={label}
      aria-haspopup="dialog"
      onPointerDown={() => prefetchSearchModal()}
      onClick={() => requestOpenSearch()}
    >
      <i className={`fas ${iconClass}`} aria-hidden />
    </button>
  );
}
