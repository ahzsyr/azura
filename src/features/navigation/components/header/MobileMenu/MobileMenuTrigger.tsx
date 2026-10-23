"use client";

import { useRef, useSyncExternalStore } from "react";
import type { MobileNavType } from "@/features/navigation/types";
import type { HeaderRendererSurface } from "../HeaderRenderer";
import { prefetchSearchModal, requestOpenSearch } from "@/capabilities/search/components/search-prefetch";
import {
  isMobileMenuShown,
  requestToggleMobileMenu,
  subscribeMobileMenu,
} from "./mobile-menu-bridge";

type Props = {
  hostId: string;
  mobileType: MobileNavType;
  surface?: HeaderRendererSurface;
};

/** Header button for the mobile menu. The menu itself lives in MobileMenuHost. */
export function MobileMenuTrigger({ hostId, mobileType, surface = "site" }: Props) {
  const opensSearch = mobileType === "search" && surface !== "preview";
  const shown = useSyncExternalStore(
    subscribeMobileMenu,
    () => isMobileMenuShown(hostId),
    () => false,
  );
  const touchToggleRef = useRef(false);

  const activate = () => {
    if (opensSearch) requestOpenSearch();
    else requestToggleMobileMenu(hostId);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (opensSearch) {
      prefetchSearchModal();
      return;
    }
    // Mouse keeps the click path. Touch starts on contact so iOS doesn't wait
    // for the compatibility click, which lands after the finger lifts.
    if (event.pointerType === "mouse" || !event.isPrimary) return;
    event.preventDefault();
    touchToggleRef.current = true;
    activate();
  };

  const onClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (touchToggleRef.current) {
      touchToggleRef.current = false;
      event.preventDefault();
      return;
    }
    activate();
  };

  return (
    <button
      id="mobileTriggerBtn"
      type="button"
      className={`mobile-trigger mobile-trigger--${mobileType}`}
      aria-label={opensSearch ? "Open search" : shown ? "Close menu" : "Open menu"}
      aria-expanded={opensSearch ? undefined : shown}
      aria-haspopup="dialog"
      data-mobile-type={mobileType}
      data-mnav-trigger={hostId}
      onPointerDown={onPointerDown}
      onClick={onClick}
    >
      {mobileType === "search" ? (
        <i className="fas fa-search" aria-hidden />
      ) : (
        <span className="mobile-trigger__bars" aria-hidden>
          <span />
          <span />
          <span />
        </span>
      )}
    </button>
  );
}
