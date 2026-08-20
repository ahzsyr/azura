"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { MenuItem, MenuLayoutType } from "@/features/navigation/types";
import { getEffectiveMegaMenuType, getItemHref } from "@/features/navigation/resolve-href";
import { isSameInternalNavTarget } from "@/lib/navigation/internal-link";
import { cn } from "@/lib/utils";
import { MegaMenuSurface } from "./MegaMenu/MegaMenuSurface";
import { NavMenuGlyph } from "./NavMenuGlyph";

const FLYOUT_CLOSE_DELAY_MS = 220;

interface Props {
  items: MenuItem[];
  menuType: MenuLayoutType;
  localeCode: string;
  /** When false, top-nav glyphs are not rendered (desktop icon setting). */
  showIcons?: boolean;
}

function NavFlyoutItem({
  item,
  menuType,
  localeCode,
  glyph,
  closeSignal,
}: {
  item: MenuItem;
  menuType: MenuLayoutType;
  localeCode: string;
  glyph: ReactNode;
  closeSignal: number;
}) {
  const [open, setOpen] = useState(false);
  const [forceClosed, setForceClosed] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const effectiveMega = getEffectiveMegaMenuType(item, menuType);

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    clearCloseTimer();
    setForceClosed(false);
    closeTimer.current = setTimeout(() => setOpen(false), FLYOUT_CLOSE_DELAY_MS);
  }, [clearCloseTimer]);

  const closeFlyout = useCallback(() => {
    clearCloseTimer();
    setOpen(false);
    setForceClosed(true);
    (document.activeElement as HTMLElement | null)?.blur();
  }, [clearCloseTimer]);

  const closeFlyoutForSignal = useCallback(() => {
    clearCloseTimer();
    setOpen(false);
    setForceClosed(false);
  }, [clearCloseTimer]);

  const openFlyout = useCallback(() => {
    if (forceClosed) return;
    clearCloseTimer();
    setOpen(true);
  }, [clearCloseTimer, forceClosed]);

  const scheduleClose = useCallback(() => {
    handleMouseLeave();
  }, [handleMouseLeave]);

  const toggleFlyout = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      const href = getItemHref(item, localeCode);
      const navigatingAway =
        typeof window !== "undefined" &&
        !isSameInternalNavTarget(
          href,
          window.location.pathname,
          window.location.search,
          window.location.hash,
          window.location.origin,
        );
      if (navigatingAway) return;

      event.preventDefault();
      clearCloseTimer();
      setForceClosed(false);
      setOpen((prev) => !prev);
    },
    [clearCloseTimer, item, localeCode],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    closeFlyoutForSignal();
  }, [closeSignal, closeFlyoutForSignal]);

  useEffect(
    () => () => {
      clearCloseTimer();
    },
    [clearCloseTimer],
  );

  return (
    <li
      className={cn(
        "nav-item",
        open && "is-flyout-open",
        forceClosed && "nav-item--force-closed",
      )}
      data-open={open ? "true" : undefined}
      onMouseEnter={openFlyout}
      onMouseLeave={handleMouseLeave}
      onFocus={openFlyout}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          scheduleClose();
        }
      }}
    >
      <a
        href={getItemHref(item, localeCode)}
        className="nav-link"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={toggleFlyout}
      >
        {glyph}
        {glyph ? " " : null}
        {item.label}{" "}
        <i className="fas fa-chevron-down" aria-hidden />
      </a>
      <MegaMenuSurface
        item={item}
        menuType={effectiveMega}
        localeCode={localeCode}
        isOpen={open}
        onMouseEnter={openFlyout}
        onMouseLeave={scheduleClose}
        onLinkClick={closeFlyout}
      />
    </li>
  );
}

export function HeaderMenu({ items, menuType, localeCode, showIcons = true }: Props) {
  const pathname = usePathname();
  const [closeSignal, setCloseSignal] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCloseSignal((value) => value + 1);
  }, [pathname]);

  const desktopItems = items.filter(
    (item) => item.placement === "both" || item.placement === "desktop",
  );

  const navCount = desktopItems.length;

  return (
    <nav
      className="main-nav"
      aria-label="Primary"
      data-nav-count={navCount > 0 ? String(navCount) : undefined}
    >
      <ul className="nav-list">
        {desktopItems.map((item) => {
          const hasChildren = (item.children?.length ?? 0) > 0;
          const icon = item.icon?.trim();
          const glyph =
            showIcons && icon ? (
              <NavMenuGlyph icon={icon} className="hb-nav-icon" slotClassName="hb-nav-icon-slot" />
            ) : null;

          if (hasChildren) {
            return (
              <NavFlyoutItem
                key={item.id}
                item={item}
                menuType={menuType}
                localeCode={localeCode}
                glyph={glyph}
                closeSignal={closeSignal}
              />
            );
          }

          return (
            <li key={item.id} className="nav-item">
              <a href={getItemHref(item, localeCode)} className="nav-link">
                {glyph}
                {glyph ? " " : null}
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
