"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";
import type { MenuItem, MenuLayoutType } from "@/features/navigation/types";
import { getEffectiveMegaMenuType, getItemHref } from "@/features/navigation/resolve-href";
import { cn } from "@/lib/utils";
import { MegaMenuSurface } from "./MegaMenu/MegaMenuSurface";

const FLYOUT_CLOSE_DELAY_MS = 220;
const FLYOUT_FORCE_CLOSED_MS = 300;

interface Props {
  items: MenuItem[];
  menuType: MenuLayoutType;
  localeCode: string;
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
  const forceClosedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const effectiveMega = getEffectiveMegaMenuType(item, menuType);

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const clearForceClosedTimer = useCallback(() => {
    if (forceClosedTimer.current) {
      clearTimeout(forceClosedTimer.current);
      forceClosedTimer.current = null;
    }
  }, []);

  const closeFlyout = useCallback(() => {
    clearCloseTimer();
    setOpen(false);
    setForceClosed(true);
    clearForceClosedTimer();
    forceClosedTimer.current = setTimeout(() => {
      setForceClosed(false);
      forceClosedTimer.current = null;
    }, FLYOUT_FORCE_CLOSED_MS);
  }, [clearCloseTimer, clearForceClosedTimer]);

  const openFlyout = useCallback(() => {
    if (forceClosed) return;
    clearCloseTimer();
    setOpen(true);
  }, [clearCloseTimer, forceClosed]);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), FLYOUT_CLOSE_DELAY_MS);
  }, [clearCloseTimer]);

  const toggleFlyout = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      clearCloseTimer();
      clearForceClosedTimer();
      setForceClosed(false);
      setOpen((prev) => !prev);
    },
    [clearCloseTimer, clearForceClosedTimer],
  );

  useEffect(() => {
    closeFlyout();
  }, [closeSignal, closeFlyout]);

  useEffect(
    () => () => {
      clearCloseTimer();
      clearForceClosedTimer();
    },
    [clearCloseTimer, clearForceClosedTimer],
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
      onMouseLeave={scheduleClose}
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

export function HeaderMenu({ items, menuType, localeCode }: Props) {
  const pathname = usePathname();
  const [closeSignal, setCloseSignal] = useState(0);

  useEffect(() => {
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
          const glyph = item.icon?.trim() ? <i className={`fas ${item.icon.trim()}`} aria-hidden /> : null;

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
