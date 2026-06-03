"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import type { MenuItem, MenuLayoutType } from "@/features/navigation/types";
import { getEffectiveMegaMenuType, getItemHref } from "@/features/navigation/resolve-href";
import { cn } from "@/lib/utils";
import { MegaMenuSurface } from "./MegaMenu/MegaMenuSurface";

const FLYOUT_CLOSE_DELAY_MS = 180;

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
}: {
  item: MenuItem;
  menuType: MenuLayoutType;
  localeCode: string;
  glyph: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const effectiveMega = getEffectiveMegaMenuType(item, menuType);

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const openFlyout = useCallback(() => {
    clearCloseTimer();
    setOpen(true);
  }, [clearCloseTimer]);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), FLYOUT_CLOSE_DELAY_MS);
  }, [clearCloseTimer]);

  return (
    <li
      className={cn("nav-item", open && "is-flyout-open")}
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
      />
    </li>
  );
}

export function HeaderMenu({ items, menuType, localeCode }: Props) {
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
