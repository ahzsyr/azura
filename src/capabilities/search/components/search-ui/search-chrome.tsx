"use client";

import { useEffect, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import type { SearchPanelWidth } from "./search-theme-root";
import type { SearchInputStyle } from "./search-input-shell";
import {
  resolveSearchModalStyle,
  searchModalStyleToCssVars,
  type ResolvedSearchModalStyle,
} from "./search-modal-style";
import { useIsMobileSearch } from "./use-is-mobile-search";
import "@/capabilities/search/components/search-ui/search-ui.css";
import "@/capabilities/search/components/search-ui/search-theme.css";

const PANEL_WIDTH_CLASS: Record<SearchPanelWidth, string> = {
  sm: "w-[min(96vw,32rem)]",
  md: "w-[min(96vw,36rem)]",
  lg: "w-[min(96vw,42rem)]",
  xl: "w-[min(96vw,52rem)]",
};

const DRAWER_DISMISS_PX = 72;
const DRAWER_DRAG_RESISTANCE = 0.92;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  inheritGlobalTheme?: boolean;
  inputStyle?: SearchInputStyle;
  panelWidth?: SearchPanelWidth;
  modalStyle?: ResolvedSearchModalStyle;
  children: React.ReactNode;
};

function focusTrap(container: HTMLElement, e: KeyboardEvent) {
  if (e.key !== "Tab") return;
  const sel =
    'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';
  const focusables = Array.from(container.querySelectorAll<HTMLElement>(sel)).filter(
    (el) => !el.closest('[aria-hidden="true"]')
  );
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (e.shiftKey) {
    if (document.activeElement === first) {
      e.preventDefault();
      last.focus();
    }
  } else if (document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function focusSearchInput(container: HTMLElement): boolean {
  const input = container.querySelector<HTMLInputElement>(
    'input[type="search"], input[cmdk-input], input:not([type="hidden"])',
  );
  if (!input) return false;
  input.focus({ preventScroll: true });
  return true;
}

export function SearchChrome({
  open,
  onOpenChange,
  title,
  inheritGlobalTheme = true,
  inputStyle = "glass",
  panelWidth = "lg",
  modalStyle,
  children,
}: Props) {
  const isMobile = useIsMobileSearch();
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const dragOffsetY = useRef(0);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dragClosing, setDragClosing] = useState(false);
  const [dragSnap, setDragSnap] = useState(false);
  const modal = modalStyle ?? resolveSearchModalStyle();
  const modalVars = searchModalStyleToCssVars(modal);

  useEffect(() => {
    if (!open || !panelRef.current) return;
    const el = panelRef.current;
    const onKey = (e: KeyboardEvent) => focusTrap(el, e);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) return;
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
    dragStartY.current = null;
    dragOffsetY.current = 0;
    setDragY(0);
    setDragging(false);
    setDragClosing(false);
    setDragSnap(false);
  }, [open]);

  useEffect(() => {
    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile || dragClosing) return;
    const target = e.target as HTMLElement | null;
    // Only start sheet drag from the handle / header chrome — keep results scrollable
    if (target?.closest("[data-search-scroll-area], [cmdk-list], input, textarea, button, a")) {
      dragStartY.current = null;
      return;
    }
    dragStartY.current = e.touches[0]?.clientY ?? null;
    dragOffsetY.current = 0;
    setDragging(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile || dragClosing || dragStartY.current == null) return;
    const currentY = e.touches[0]?.clientY ?? 0;
    const delta = Math.max(0, (currentY - dragStartY.current) * DRAWER_DRAG_RESISTANCE);
    dragOffsetY.current = delta;
    if (delta > 2) {
      setDragging(true);
      setDragY(delta);
    }
  };

  const handleTouchEnd = () => {
    if (!isMobile || dragClosing || dragStartY.current == null) {
      dragStartY.current = null;
      return;
    }
    const shouldClose = dragOffsetY.current > DRAWER_DISMISS_PX;
    const offset = dragOffsetY.current;
    dragStartY.current = null;
    dragOffsetY.current = 0;

    if (shouldClose) {
      setDragging(false);
      setDragClosing(true);
      setDragY(Math.max(offset + 80, typeof window !== "undefined" ? window.innerHeight * 0.45 : 320));
      dismissTimer.current = setTimeout(() => {
        dismissTimer.current = null;
        onOpenChange(false);
      }, 170);
      return;
    }

    setDragging(false);
    setDragSnap(true);
    setDragY(0);
    window.setTimeout(() => setDragSnap(false), 220);
  };

  const drawerStyle =
    isMobile && (dragY > 0 || dragClosing || dragSnap)
      ? {
          ...modalVars,
          transform: `translate3d(0, ${dragY}px, 0)`,
          opacity: String(Math.max(0.4, 1 - dragY / 480)),
        }
      : modalVars;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="sm-search-backdrop fixed inset-0 z-[10000] bg-background/70 backdrop-blur-md"
          style={modalVars}
        />
        <DialogPrimitive.Content
          ref={panelRef}
          style={drawerStyle}
          data-dragging={dragging ? "true" : undefined}
          data-drag-closing={dragClosing ? "true" : undefined}
          data-drag-snap={dragSnap ? "true" : undefined}
          onEscapeKeyDown={() => onOpenChange(false)}
          onPointerDownOutside={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest("[data-search-scroll-area]")) {
              e.preventDefault();
              return;
            }
            onOpenChange(false);
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          className={cn(
            "sm-search-root sm-search-panel fixed z-[10001] flex flex-col overflow-hidden border border-border bg-background shadow-2xl outline-none",
            inheritGlobalTheme && "sm-search-root--theme",
            `sm-search-root--modal-${modal.panelStyle}`,
            `sm-search-root--width-${panelWidth}`,
            inputStyle && `sm-search-root--input-${inputStyle}`,
            modal.panelStyle === "glass" && "az-glass-panel sm-search-panel--glass",
            modal.panelStyle !== "glass" && "sm-search-panel--solid",
            isMobile
              ? "sm-search-panel--drawer inset-x-0 bottom-0 top-auto m-0 h-[min(92dvh,40rem)] w-full max-h-[92dvh] rounded-t-3xl"
              : cn(
                  "inset-5 m-auto max-h-[calc(100dvh-2.5rem)] max-w-[calc(100vw-2.5rem)] rounded-2xl",
                  panelWidth === "xl"
                    ? "h-[min(78vh,45rem)]"
                    : "h-[min(72vh,40rem)]",
                  PANEL_WIDTH_CLASS[panelWidth]
                )
          )}
          data-search-theme={inheritGlobalTheme ? "inherit" : "standalone"}
          data-search-panel-style={modal.panelStyle}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            const container = e.currentTarget;
            if (!(container instanceof HTMLElement)) return;
            if (!focusSearchInput(container)) {
              container.focus();
            }
          }}
          onCloseAutoFocus={(e) => e.preventDefault()}
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
