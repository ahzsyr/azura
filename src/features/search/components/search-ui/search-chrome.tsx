"use client";

import { useEffect, useRef } from "react";
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
  const modal = modalStyle ?? resolveSearchModalStyle();
  const modalVars = searchModalStyleToCssVars(modal);

  useEffect(() => {
    if (!open || !panelRef.current) return;
    const el = panelRef.current;
    const onKey = (e: KeyboardEvent) => focusTrap(el, e);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="sm-search-backdrop"
          style={modalVars}
        />
        <DialogPrimitive.Content
          ref={panelRef}
          style={modalVars}
          onEscapeKeyDown={() => onOpenChange(false)}
          onPointerDownOutside={() => onOpenChange(false)}
          className={cn(
            "sm-search-root sm-search-panel",
            inheritGlobalTheme && "sm-search-root--theme",
            `sm-search-root--modal-${modal.panelStyle}`,
            `sm-search-root--width-${panelWidth}`,
            inputStyle && `sm-search-root--input-${inputStyle}`,
            modal.panelStyle === "glass" && "az-glass-panel sm-search-panel--glass",
            modal.panelStyle !== "glass" && "sm-search-panel--solid",
            isMobile && "sm-search-panel--drawer"
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
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
